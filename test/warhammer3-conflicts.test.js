const assert = require("node:assert/strict");
const fsNative = require("node:fs");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  readWarhammer3PackIndex,
  createWarhammer3ConflictAnalyzer
} = require("../warhammer3-conflicts");

function buildPack(files, { format = "PFH5", byteMask = 3 } = {}) {
  const indexParts = [];
  const payloadParts = [];
  for (const file of files) {
    const payload = Buffer.from(file.contents || file.name, "utf8");
    const entry = Buffer.alloc(5);
    entry.writeUInt32LE(payload.length, 0);
    entry[4] = 0;
    indexParts.push(entry, Buffer.from(`${file.name}\0`, "utf8"));
    payloadParts.push(payload);
  }
  const index = Buffer.concat(indexParts);
  const header = Buffer.alloc(28);
  header.write(format, 0, 4, "ascii");
  header.writeInt32LE(byteMask, 4);
  header.writeInt32LE(0, 8);
  header.writeInt32LE(0, 12);
  header.writeInt32LE(files.length, 16);
  header.writeInt32LE(index.length, 20);
  header.writeUInt32LE(0x7fffffff, 24);
  return Buffer.concat([header, index, ...payloadParts]);
}

async function withTempDirectory(callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "exone-wh3-conflict-test-"));
  try {
    return await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function workshop(folderName, status, packFiles, loadOrderIndex) {
  return {
    source: "workshop",
    folderName,
    title: `Mod ${folderName}`,
    status,
    path: "",
    packFiles,
    availablePackFiles: packFiles,
    loadOrderIndex,
    sourceLabel: "Steam Workshop"
  };
}

test("PFH5 reader returns only the internal index without changing the pack", async () => {
  await withTempDirectory(async (directory) => {
    const packPath = path.join(directory, "sample.pack");
    const pack = buildPack([
      { name: "script/campaign/mod.lua", contents: "print('one')" },
      { name: "db\\units_tables\\example", contents: "row" },
      { name: "ignored.rpfm_reserved", contents: "reserved" }
    ]);
    await fs.writeFile(packPath, pack);
    const before = fsNative.readFileSync(packPath);

    const index = await readWarhammer3PackIndex({ fs, packPath });

    assert.equal(index.format, "PFH5");
    assert.equal(index.isMovie, false);
    assert.deepEqual(
      index.files.map((file) => file.name),
      ["script\\campaign\\mod.lua", "db\\units_tables\\example"]
    );
    assert.deepEqual(fsNative.readFileSync(packPath), before);
  });
});

test("PFH5 reader rejects unsupported or unsafe headers", async () => {
  await withTempDirectory(async (directory) => {
    const packPath = path.join(directory, "unsafe.pack");
    await fs.writeFile(packPath, buildPack([], { format: "PFH4" }));
    await assert.rejects(
      readWarhammer3PackIndex({ fs, packPath }),
      /Unsupported pack format PFH4/
    );
  });
});

test("WH3 analyzer marks active and potential file overlaps and reports priority number one as winner", async () => {
  await withTempDirectory(async (directory) => {
    const firstFolder = path.join(directory, "111");
    const secondFolder = path.join(directory, "222");
    const thirdFolder = path.join(directory, "333");
    await fs.mkdir(firstFolder);
    await fs.mkdir(secondFolder);
    await fs.mkdir(thirdFolder);
    await fs.writeFile(
      path.join(firstFolder, "first.pack"),
      buildPack([
        { name: "script\\campaign\\shared.lua" },
        { name: "variantmeshes\\shared.model" }
      ])
    );
    await fs.writeFile(
      path.join(secondFolder, "second.pack"),
      buildPack([{ name: "SCRIPT\\CAMPAIGN\\SHARED.LUA" }])
    );
    await fs.writeFile(
      path.join(thirdFolder, "third.pack"),
      buildPack([{ name: "variantmeshes\\shared.model" }])
    );

    const mods = [
      { ...workshop("111", "active", ["first.pack"], 0), path: firstFolder },
      { ...workshop("222", "active", ["second.pack"], 1), path: secondFolder },
      { ...workshop("333", "disabled", ["third.pack"], null), path: thirdFolder }
    ];
    const readOnlyFs = {
      stat: fs.stat.bind(fs),
      open: fs.open.bind(fs)
    };
    const result = await createWarhammer3ConflictAnalyzer({ fs: readOnlyFs }).analyze(mods);

    assert.equal(result.conflicts.length, 2);
    assert.equal(result.activeConflictCount, 1);
    assert.equal(result.analysis.scannedPacks, 3);
    const active = result.conflicts.find((conflict) => conflict.bothActive);
    assert.equal(active.kind, "pack-file-overlap");
    assert.equal(active.severity, "medium");
    assert.equal(active.assetCount, 1);
    assert.equal(active.resolution, "load-order");
    assert.deepEqual(active.resolutionCounts, { loadOrder: 1, database: 0, movie: 0 });
    assert.equal(active.assets[0].path.toLowerCase(), "script\\campaign\\shared.lua");
    assert.equal(active.winner.title, "Mod 111");
    const potential = result.conflicts.find((conflict) => !conflict.bothActive);
    assert.equal(potential.severity, "low");
    assert.equal(potential.assets[0].path, "variantmeshes\\shared.model");
    assert.deepEqual(
      mods.map((mod) => ({
        total: mod.conflictCount,
        active: mod.activeConflictCount,
        severity: mod.conflictSeverity
      })),
      [
        { total: 2, active: 1, severity: "medium" },
        { total: 1, active: 1, severity: "medium" },
        { total: 1, active: 0, severity: "low" }
      ]
    );
  });
});

test("WH3 analyzer does not invent a load-order winner for database overlaps", async () => {
  await withTempDirectory(async (directory) => {
    const firstFolder = path.join(directory, "111");
    const secondFolder = path.join(directory, "222");
    await fs.mkdir(firstFolder);
    await fs.mkdir(secondFolder);
    const databasePath = "db\\main_units_tables\\shared";
    await fs.writeFile(
      path.join(firstFolder, "first.pack"),
      buildPack([{ name: databasePath }])
    );
    await fs.writeFile(
      path.join(secondFolder, "second.pack"),
      buildPack([{ name: databasePath }])
    );

    const mods = [
      { ...workshop("111", "active", ["first.pack"], 0), path: firstFolder },
      { ...workshop("222", "active", ["second.pack"], 1), path: secondFolder }
    ];
    const result = await createWarhammer3ConflictAnalyzer({
      fs: { stat: fs.stat.bind(fs), open: fs.open.bind(fs) }
    }).analyze(mods);
    const conflict = result.conflicts[0];

    assert.equal(conflict.resolution, "database-internal-name");
    assert.equal(conflict.winner, null);
    assert.match(conflict.resolutionNote, /mod position does not establish one winner/i);
    assert.deepEqual(conflict.resolutionCounts, { loadOrder: 0, database: 1, movie: 0 });
  });
});

test("WH3 analyzer does not invent a winner when a movie pack is involved", async () => {
  await withTempDirectory(async (directory) => {
    const firstFolder = path.join(directory, "111");
    const secondFolder = path.join(directory, "222");
    await fs.mkdir(firstFolder);
    await fs.mkdir(secondFolder);
    const moviePath = "movies\\shared.ca_vp8";
    await fs.writeFile(
      path.join(firstFolder, "first.pack"),
      buildPack([{ name: moviePath }], { byteMask: 4 })
    );
    await fs.writeFile(
      path.join(secondFolder, "second.pack"),
      buildPack([{ name: moviePath }])
    );

    const mods = [
      { ...workshop("111", "active", ["first.pack"], 0), path: firstFolder },
      { ...workshop("222", "active", ["second.pack"], 1), path: secondFolder }
    ];
    const result = await createWarhammer3ConflictAnalyzer({
      fs: { stat: fs.stat.bind(fs), open: fs.open.bind(fs) }
    }).analyze(mods);
    const conflict = result.conflicts[0];

    assert.equal(conflict.resolution, "movie-pack");
    assert.equal(conflict.winner, null);
    assert.match(conflict.resolutionNote, /do not have a dependable manual load-order winner/i);
    assert.deepEqual(conflict.resolutionCounts, { loadOrder: 0, database: 0, movie: 1 });
  });
});
