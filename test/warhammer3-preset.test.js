const assert = require("node:assert/strict");
const test = require("node:test");
const { buildWarhammer3PresetSelection } = require("../warhammer3-preset");

function workshop(folderName, status, packFiles) {
  return {
    source: "workshop",
    folderName,
    status,
    packFiles,
    availablePackFiles: packFiles,
    path: `C:\\Workshop\\${folderName}`
  };
}

test("WH3 preset applies the Workshop selection and order while preserving additional local packs", () => {
  const state = {
    mods: [
      workshop("111", "active", ["one.pack"]),
      workshop("222", "disabled", ["two.pack", "two_audio.pack"]),
      {
        source: "local",
        folderName: "data-local.pack",
        status: "active",
        packFiles: ["local.pack"],
        availablePackFiles: ["local.pack"]
      }
    ]
  };
  const preset = {
    activeMods: [
      {
        source: "workshop",
        folderName: "222",
        packFiles: ["two_audio.pack", "two.pack"]
      }
    ]
  };

  const result = buildWarhammer3PresetSelection(state, preset);

  assert.deepEqual(result.missing, []);
  assert.equal(result.changed, 2);
  assert.equal(result.orderChanged, true);
  assert.deepEqual(
    result.desiredMods.map((mod) => `${mod.source}:${mod.folderName}`),
    ["workshop:222", "local:data-local.pack"]
  );
  assert.deepEqual(result.desiredMods[0].packFiles, ["two_audio.pack", "two.pack"]);
});

test("WH3 preset refuses missing mods instead of partially changing used_mods.txt", () => {
  const result = buildWarhammer3PresetSelection(
    { mods: [workshop("111", "active", ["one.pack"])] },
    { activeMods: [{ source: "workshop", folderName: "999", packFiles: ["missing.pack"] }] }
  );

  assert.equal(result.missing.length, 1);
  assert.deepEqual(result.desiredMods, []);
  assert.equal(result.changed, 0);
});

test("WH3 preset detects pack order changes inside one multi-pack Workshop item", () => {
  const state = {
    mods: [workshop("222", "active", ["two.pack", "two_audio.pack"])]
  };
  const preset = {
    activeMods: [
      {
        source: "workshop",
        folderName: "222",
        packFiles: ["two_audio.pack", "two.pack"]
      }
    ]
  };

  const result = buildWarhammer3PresetSelection(state, preset);

  assert.equal(result.changed, 0);
  assert.equal(result.orderChanged, true);
  assert.deepEqual(result.desiredMods[0].packFiles, ["two_audio.pack", "two.pack"]);
});
