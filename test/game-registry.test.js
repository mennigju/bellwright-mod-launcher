const assert = require("node:assert/strict");
const test = require("node:test");
const { DEFAULT_GAME_ID, getGame, isKnownGame, listGames, publicGame } = require("../game-registry");
const { createGameSelectionStore } = require("../game-selection");

test("game registry keeps Bellwright intact and enables every applicable WH3 capability", () => {
  assert.equal(DEFAULT_GAME_ID, "bellwright");
  assert.deepEqual(listGames().map((game) => game.id), ["bellwright", "warhammer3"]);
  assert.equal(getGame("bellwright").capabilities.activation, true);
  assert.equal(getGame("warhammer3").capabilities.activation, true);
  assert.equal(getGame("warhammer3").capabilities.loadOrder, true);
  assert.equal(getGame("warhammer3").capabilities.modManagement, true);
  assert.equal(getGame("warhammer3").capabilities.presets, true);
  assert.equal(getGame("warhammer3").capabilities.openModsFolder, true);
  assert.equal(getGame("warhammer3").capabilities.launch, true);
  assert.equal(getGame("bellwright").capabilities.continueFromLastSave, false);
  assert.equal(getGame("warhammer3").capabilities.continueFromLastSave, true);
  assert.equal(getGame("bellwright").labels.continueFromLastSave, undefined);
  assert.match(getGame("warhammer3").labels.continueToast, /continuing the latest/i);
  assert.match(getGame("warhammer3").runtimeMessage, /own pack loader/i);
  assert.equal(isKnownGame("not-a-game"), false);
  assert.equal(getGame("not-a-game").id, DEFAULT_GAME_ID);
});

test("public game descriptors do not expose mutable registry objects", () => {
  const descriptor = publicGame(getGame("bellwright"));
  descriptor.capabilities.activation = false;
  assert.equal(getGame("bellwright").capabilities.activation, true);
});

test("game selection store defaults safely and persists only known game ids", async () => {
  const files = new Map();
  const fakeFs = {
    async readFile(filePath) {
      if (!files.has(filePath)) {
        const error = new Error("not found");
        error.code = "ENOENT";
        throw error;
      }
      return files.get(filePath);
    },
    async mkdir() {},
    async writeFile(filePath, value) {
      files.set(filePath, value);
    }
  };
  const store = createGameSelectionStore({ filePath: "C:\\launcher\\game-selection.json", fs: fakeFs });
  assert.equal(await store.load(), "bellwright");
  assert.equal(await store.set("warhammer3"), "warhammer3");
  assert.deepEqual(JSON.parse(files.get("C:\\launcher\\game-selection.json")), { selectedGameId: "warhammer3" });
  await assert.rejects(() => store.set("unknown"), /Unknown game selection/);
});
