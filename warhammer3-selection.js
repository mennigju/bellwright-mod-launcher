const path = require("node:path");
const {
  warhammer3LoadOrderToPriorityOrder,
  warhammer3PriorityOrderToLoadOrder
} = require("./priority-order");

const WORKING_DIRECTORY_PATTERN = /^\s*add_working_directory\s+"([^"]+)"\s*;\s*$/i;
const MOD_PATTERN = /^\s*mod\s+"([^"]+)"\s*;\s*$/i;

function parseWarhammer3Selection(text = "") {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const gameWorkingDirectories = [];
  const gamePackOrder = [];
  const preservedLines = [];

  for (const line of text.split(/\r?\n/)) {
    const workingDirectory = line.match(WORKING_DIRECTORY_PATTERN);
    if (workingDirectory) {
      gameWorkingDirectories.push(path.normalize(workingDirectory[1]));
      continue;
    }
    const mod = line.match(MOD_PATTERN);
    if (mod) {
      gamePackOrder.push(path.basename(mod[1]));
      continue;
    }
    if (line.trim()) {
      preservedLines.push(line);
    }
  }

  // WH3 Mod Manager and the game-facing used_mods.txt convention keep the
  // highest-priority (lowest order number) pack first. Preserve that order so
  // visible item #1 maps directly to the first mod line.
  return {
    newline,
    workingDirectories: warhammer3LoadOrderToPriorityOrder(gameWorkingDirectories),
    packOrder: warhammer3LoadOrderToPriorityOrder(gamePackOrder),
    preservedLines
  };
}

function selectionFromMods(mods) {
  const workingDirectories = [];
  const packOrder = [];
  const seenDirectories = new Set();
  const seenPacks = new Set();

  for (const mod of mods) {
    if (mod.source === "workshop" && mod.path) {
      const directory = path.normalize(mod.path);
      const key = directory.toLowerCase();
      if (!seenDirectories.has(key)) {
        workingDirectories.push(directory);
        seenDirectories.add(key);
      }
    }
    for (const packName of mod.packFiles || []) {
      const normalizedPack = path.basename(packName);
      const key = normalizedPack.toLowerCase();
      if (!seenPacks.has(key)) {
        packOrder.push(normalizedPack);
        seenPacks.add(key);
      }
    }
  }

  return { workingDirectories, packOrder };
}

function serializeWarhammer3Selection(base, desired) {
  const newline = base.newline || "\n";
  // Keep ExOne's high-to-low priority list in the same order used by WH3:
  // the first mod line has the lowest order number and highest pack priority.
  const lines = [
    ...warhammer3PriorityOrderToLoadOrder(desired.workingDirectories).map(
      (directory) => `add_working_directory "${directory}";`
    ),
    ...warhammer3PriorityOrderToLoadOrder(desired.packOrder).map(
      (packName) => `mod "${packName}";`
    )
  ];
  if (base.preservedLines.length) {
    if (lines.length) {
      lines.push("");
    }
    lines.push(...base.preservedLines);
  }
  return lines.length ? `${lines.join(newline)}${newline}` : "";
}

function selectionsEqual(left, right) {
  return (
    left.workingDirectories.length === right.workingDirectories.length &&
    left.packOrder.length === right.packOrder.length &&
    left.workingDirectories.every((value, index) => value.toLowerCase() === right.workingDirectories[index].toLowerCase()) &&
    left.packOrder.every((value, index) => value.toLowerCase() === right.packOrder[index].toLowerCase())
  );
}

async function pathExists(fs, filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeWarhammer3Selection({ fs, filePath, mods }) {
  const existingText = await fs.readFile(filePath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") {
      return "";
    }
    throw error;
  });
  const base = parseWarhammer3Selection(existingText);
  const desired = selectionFromMods(mods);
  const nextText = serializeWarhammer3Selection(base, desired);
  if (nextText === existingText) {
    return false;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const suffix = `${process.pid}-${Date.now()}`;
  const temporaryPath = `${filePath}.launcher-new-${suffix}`;
  const backupPath = `${filePath}.launcher-backup-${suffix}`;
  let originalMoved = false;

  try {
    await fs.writeFile(temporaryPath, nextText, "utf8");
    const verification = parseWarhammer3Selection(await fs.readFile(temporaryPath, "utf8"));
    if (!selectionsEqual(verification, desired)) {
      throw new Error("The WH3 mod selection failed verification before activation.");
    }
    if (await pathExists(fs, filePath)) {
      await fs.rename(filePath, backupPath);
      originalMoved = true;
    }
    await fs.rename(temporaryPath, filePath);
    if (originalMoved) {
      await fs.rm(backupPath, { force: true }).catch(() => {});
    }
    return true;
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    if (originalMoved && !(await pathExists(fs, filePath)) && (await pathExists(fs, backupPath))) {
      await fs.rename(backupPath, filePath).catch(() => {});
    }
    throw error;
  }
}

module.exports = {
  parseWarhammer3Selection,
  selectionFromMods,
  serializeWarhammer3Selection,
  writeWarhammer3Selection
};
