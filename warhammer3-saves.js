const path = require("node:path");

const WARHAMMER3_SAVE_FOLDER = path.join("The Creative Assembly", "Warhammer3", "save_games");

function getWarhammer3SaveRoot(appDataPath) {
  if (!appDataPath || typeof appDataPath !== "string") {
    throw new Error("The Windows AppData path is unavailable.");
  }
  return path.join(appDataPath, WARHAMMER3_SAVE_FOLDER);
}

function assertSafeSaveName(saveName) {
  if (
    !saveName ||
    typeof saveName !== "string" ||
    path.basename(saveName) !== saveName ||
    !/\.save$/i.test(saveName) ||
    /[\0\r\n]/.test(saveName)
  ) {
    throw new Error("Invalid WARHAMMER III save name.");
  }
}

async function findLatestWarhammer3Save({ fs, appDataPath }) {
  const saveRoot = getWarhammer3SaveRoot(appDataPath);
  let entries;
  try {
    entries = await fs.readdir(saveRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const saves = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/\.save$/i.test(entry.name)) {
      continue;
    }
    const savePath = path.join(saveRoot, entry.name);
    try {
      const stats = await fs.stat(savePath);
      saves.push({
        name: entry.name,
        path: savePath,
        lastChanged: Number.isFinite(stats.mtimeMs) ? stats.mtimeMs : 0
      });
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  saves.sort(
    (left, right) =>
      right.lastChanged - left.lastChanged ||
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  );
  return saves[0] || null;
}

function buildWarhammer3ContinueArgs(saveName, modsListFileName = "used_mods.txt") {
  assertSafeSaveName(saveName);
  if (
    !modsListFileName ||
    typeof modsListFileName !== "string" ||
    path.basename(modsListFileName) !== modsListFileName ||
    !/\.txt$/i.test(modsListFileName)
  ) {
    throw new Error("Invalid WARHAMMER III mod-list file name.");
  }
  return ["game_startup_mode", "campaign_load", saveName, ";", `${modsListFileName};`];
}

module.exports = {
  WARHAMMER3_SAVE_FOLDER,
  getWarhammer3SaveRoot,
  findLatestWarhammer3Save,
  buildWarhammer3ContinueArgs
};
