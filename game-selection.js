const { DEFAULT_GAME_ID, isKnownGame } = require("./game-registry");

function createGameSelectionStore({ filePath, fs }) {
  let selectedGameId = DEFAULT_GAME_ID;

  async function load() {
    try {
      const saved = JSON.parse(await fs.readFile(filePath, "utf8"));
      selectedGameId = isKnownGame(saved?.selectedGameId) ? saved.selectedGameId : DEFAULT_GAME_ID;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        selectedGameId = DEFAULT_GAME_ID;
      }
    }
    return selectedGameId;
  }

  function get() {
    return selectedGameId;
  }

  async function set(gameId) {
    if (!isKnownGame(gameId)) {
      throw new Error("Unknown game selection.");
    }
    selectedGameId = gameId;
    await fs.mkdir(require("path").dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify({ selectedGameId }, null, 2)}\n`, "utf8");
    return selectedGameId;
  }

  return { load, get, set };
}

module.exports = { createGameSelectionStore };
