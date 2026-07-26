const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const {
  getWarhammer3SaveRoot,
  findLatestWarhammer3Save,
  buildWarhammer3ContinueArgs
} = require("../warhammer3-saves");

function fileEntry(name) {
  return { name, isFile: () => true };
}

test("WH3 latest save matches WH3 Mod Manager's newest-modification selection", async () => {
  const appDataPath = "C:\\Users\\Tester\\AppData\\Roaming";
  const saveRoot = getWarhammer3SaveRoot(appDataPath);
  const times = new Map([
    [path.join(saveRoot, "older.save"), 100],
    [path.join(saveRoot, "Wissenland & Nuln_Quick Save.121311096706.save"), 300],
    [path.join(saveRoot, "middle.SAVE"), 200]
  ]);
  const fs = {
    async readdir(requestedRoot, options) {
      assert.equal(requestedRoot, saveRoot);
      assert.deepEqual(options, { withFileTypes: true });
      return [
        fileEntry("older.save"),
        fileEntry("Wissenland & Nuln_Quick Save.121311096706.save"),
        fileEntry("middle.SAVE"),
        fileEntry("notes.txt"),
        { name: "folder.save", isFile: () => false }
      ];
    },
    async stat(savePath) {
      return { mtimeMs: times.get(savePath) };
    }
  };

  assert.deepEqual(await findLatestWarhammer3Save({ fs, appDataPath }), {
    name: "Wissenland & Nuln_Quick Save.121311096706.save",
    path: path.join(saveRoot, "Wissenland & Nuln_Quick Save.121311096706.save"),
    lastChanged: 300
  });
});

test("WH3 latest-save discovery reports no saves without creating files", async () => {
  const missingError = Object.assign(new Error("missing"), { code: "ENOENT" });
  const fs = {
    async readdir() {
      throw missingError;
    },
    async stat() {
      throw new Error("stat should not be called");
    }
  };

  assert.equal(
    await findLatestWarhammer3Save({ fs, appDataPath: "C:\\Users\\Tester\\AppData\\Roaming" }),
    null
  );
});

test("WH3 continue arguments reproduce WH3 Mod Manager v2.19.1 exactly", () => {
  assert.deepEqual(buildWarhammer3ContinueArgs("Wissenland & Nuln_Quick Save.121311096706.save"), [
    "game_startup_mode",
    "campaign_load",
    "Wissenland & Nuln_Quick Save.121311096706.save",
    ";",
    "used_mods.txt;"
  ]);
  assert.throws(() => buildWarhammer3ContinueArgs("..\\outside.save"), /Invalid WARHAMMER III save name/);
  assert.throws(() => buildWarhammer3ContinueArgs("not-a-save.txt"), /Invalid WARHAMMER III save name/);
});
