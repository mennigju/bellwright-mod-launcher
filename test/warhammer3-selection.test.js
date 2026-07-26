const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  parseWarhammer3Selection,
  selectionFromMods,
  serializeWarhammer3Selection,
  writeWarhammer3Selection
} = require("../warhammer3-selection");

test("WH3 selection treats the first visible mod as highest priority without moving content", () => {
  const mods = [
    {
      source: "workshop",
      path: "C:\\Steam\\steamapps\\workshop\\content\\1142710\\111",
      packFiles: ["first.pack"]
    },
    {
      source: "workshop",
      path: "C:\\Steam\\steamapps\\workshop\\content\\1142710\\222",
      packFiles: ["second.pack", "second_audio.pack"]
    }
  ];
  assert.deepEqual(selectionFromMods(mods), {
    workingDirectories: [
      "C:\\Steam\\steamapps\\workshop\\content\\1142710\\111",
      "C:\\Steam\\steamapps\\workshop\\content\\1142710\\222"
    ],
    packOrder: ["first.pack", "second.pack", "second_audio.pack"]
  });
});

test("WH3 used_mods.txt keeps its first-is-highest priority order", () => {
  const parsed = parseWarhammer3Selection(
    [
      'add_working_directory "C:\\Workshop\\high";',
      'add_working_directory "C:\\Workshop\\low";',
      'mod "high.pack";',
      'mod "low.pack";',
      ""
    ].join("\r\n")
  );

  assert.deepEqual(parsed.workingDirectories, ["C:\\Workshop\\high", "C:\\Workshop\\low"]);
  assert.deepEqual(parsed.packOrder, ["high.pack", "low.pack"]);
});

test("WH3 writer serializes top priority first like the reference manager", () => {
  const desired = {
    workingDirectories: ["C:\\Workshop\\high", "C:\\Workshop\\low"],
    packOrder: ["high.pack", "low.pack"]
  };
  const text = serializeWarhammer3Selection(
    { newline: "\r\n", preservedLines: [] },
    desired
  );

  assert.equal(
    text,
    [
      'add_working_directory "C:\\Workshop\\high";',
      'add_working_directory "C:\\Workshop\\low";',
      'mod "high.pack";',
      'mod "low.pack";',
      ""
    ].join("\r\n")
  );
  assert.deepEqual(parseWarhammer3Selection(text).packOrder, desired.packOrder);
});

test("atomic WH3 writer updates only used_mods.txt and removes staging artifacts", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "wh3-selection-test-"));
  const filePath = path.join(root, "used_mods.txt");
  try {
    await fs.writeFile(filePath, 'mod "old.pack";\r\n# preserved comment\r\n', "utf8");
    await writeWarhammer3Selection({
      fs,
      filePath,
      mods: [
        {
          source: "workshop",
          path: "C:\\Workshop\\123",
          packFiles: ["new.pack"]
        }
      ]
    });
    const text = await fs.readFile(filePath, "utf8");
    const parsed = parseWarhammer3Selection(text);
    assert.deepEqual(parsed.workingDirectories, ["C:\\Workshop\\123"]);
    assert.deepEqual(parsed.packOrder, ["new.pack"]);
    assert.match(text, /# preserved comment/);
    assert.deepEqual(await fs.readdir(root), ["used_mods.txt"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("disabling one Workshop mod leaves both Workshop folders and pack files untouched", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "wh3-workshop-safety-test-"));
  const workshopRoot = path.join(root, "workshop");
  const firstFolder = path.join(workshopRoot, "111");
  const secondFolder = path.join(workshopRoot, "222");
  const filePath = path.join(root, "used_mods.txt");
  try {
    await fs.mkdir(firstFolder, { recursive: true });
    await fs.mkdir(secondFolder, { recursive: true });
    await fs.writeFile(path.join(firstFolder, "first.pack"), "first package", "utf8");
    await fs.writeFile(path.join(secondFolder, "second.pack"), "second package", "utf8");
    await fs.writeFile(
      filePath,
      [
        `add_working_directory "${firstFolder}";`,
        `add_working_directory "${secondFolder}";`,
        'mod "first.pack";',
        'mod "second.pack";',
        ""
      ].join("\r\n"),
      "utf8"
    );

    await writeWarhammer3Selection({
      fs,
      filePath,
      mods: [{ source: "workshop", path: secondFolder, packFiles: ["second.pack"] }]
    });

    const parsed = parseWarhammer3Selection(await fs.readFile(filePath, "utf8"));
    assert.deepEqual(parsed.workingDirectories, [path.normalize(secondFolder)]);
    assert.deepEqual(parsed.packOrder, ["second.pack"]);
    assert.equal(await fs.readFile(path.join(firstFolder, "first.pack"), "utf8"), "first package");
    assert.equal(await fs.readFile(path.join(secondFolder, "second.pack"), "utf8"), "second package");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
