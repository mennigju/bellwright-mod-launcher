const DEFAULT_GAME_ID = "bellwright";

const GAMES = Object.freeze({
  bellwright: Object.freeze({
    id: "bellwright",
    label: "Bellwright",
    launcherTitle: "Bellwright Mod Launcher",
    logoAsset: "./assets/games/bellwright-icon.png",
    accent: "#d9b45f",
    accentSecondary: "#7fb0a4",
    capabilities: Object.freeze({
      modManagement: true,
      activation: true,
      loadOrder: true,
      presets: true,
      modSettings: true,
      nativeRuntime: true,
      openModsFolder: true,
      launch: true,
      continueFromLastSave: false
    }),
    labels: Object.freeze({
      available: "Available",
      availableHint: "Installed but not active",
      active: "Active",
      activeHint: "Loaded by Bellwright · #1 is highest priority",
      searchPlaceholder: "Search mods",
      folderTitle: "Open Bellwright mods folder",
      launch: "Launch",
      launchToast: "Launching Bellwright through Steam."
    })
  }),
  warhammer3: Object.freeze({
    id: "warhammer3",
    label: "Total War: WARHAMMER III",
    launcherTitle: "WARHAMMER III Mod Launcher",
    logoAsset: "./assets/games/warhammer3-icon.png",
    accent: "#b7524a",
    accentSecondary: "#b9a06a",
    capabilities: Object.freeze({
      modManagement: true,
      activation: true,
      loadOrder: true,
      presets: true,
      modSettings: false,
      nativeRuntime: false,
      openModsFolder: true,
      launch: true,
      continueFromLastSave: true
    }),
    labels: Object.freeze({
      available: "Workshop mods",
      availableHint: "Subscribed in Steam Workshop, not selected",
      active: "Selected mods",
      activeHint: "Priority: #1 at the top wins conflicts",
      searchPlaceholder: "Search Workshop mods",
      folderTitle: "Open WARHAMMER III Workshop folder",
      launch: "Launch",
      launchToast: "Launching WARHAMMER III with the selected mods.",
      continueFromLastSave: "Continue from last save",
      continueToast: "Continuing the latest WARHAMMER III save with the selected mods."
    }),
    runtimeMessage: "WH3 uses its own pack loader; Bellwright native runtime integration is not applicable."
  })
});

function getGame(gameId) {
  return GAMES[gameId] || GAMES[DEFAULT_GAME_ID];
}

function isKnownGame(gameId) {
  return Object.hasOwn(GAMES, gameId);
}

function listGames() {
  return Object.values(GAMES);
}

function publicGame(game) {
  return {
    id: game.id,
    label: game.label,
    launcherTitle: game.launcherTitle,
    logoAsset: game.logoAsset,
    accent: game.accent,
    accentSecondary: game.accentSecondary,
    capabilities: { ...game.capabilities },
    labels: { ...game.labels },
    runtimeMessage: game.runtimeMessage || ""
  };
}

module.exports = { DEFAULT_GAME_ID, GAMES, getGame, isKnownGame, listGames, publicGame };
