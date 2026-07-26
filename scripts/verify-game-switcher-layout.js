const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.resolve(projectRoot, "..", "_build", "LauncherLayoutTests");

function stateFor(game, mods = [], conflicts = []) {
  const latestSave = game.id === "warhammer3"
    ? {
        name: "Wissenland & Nuln_Quick Save.121311096706.save",
        path: "C:\\Users\\Tester\\AppData\\Roaming\\The Creative Assembly\\Warhammer3\\save_games\\Wissenland & Nuln_Quick Save.121311096706.save",
        lastChanged: 300
      }
    : null;
  return {
    game,
    gameRoot: "",
    modsRoot: "",
    workshopRoot: "",
    modLoadOrderPath: "",
    appId: game.id === "warhammer3" ? "1142710" : "1812450",
    gameRunning: false,
    latestSave,
    nativeRuntime: { phase: "idle", label: "Idle", message: "", loaded: 0, total: 0, mods: [] },
    mods,
    conflicts,
    activeConflictCount: conflicts.filter((conflict) => conflict.bothActive).length,
    pathSummary: game.id === "warhammer3"
      ? "Workshop files stay in place | Managed through used_mods.txt"
      : "Local preview paths"
  };
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1120,
    height: 760,
    show: false,
    backgroundColor: "#101111",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await window.loadFile(path.join(projectRoot, "renderer", "index.html"));
  await new Promise((resolve) => setTimeout(resolve, 250));
  await fs.mkdir(outputRoot, { recursive: true });

  const descriptors = [
    {
      id: "bellwright",
      label: "Bellwright",
      launcherTitle: "Bellwright Mod Launcher",
      logoAsset: "./assets/games/bellwright-icon.png",
      accent: "#d9b45f",
      accentSecondary: "#7fb0a4",
      capabilities: {
        modManagement: true,
        activation: true,
        loadOrder: true,
        presets: true,
        modSettings: true,
        nativeRuntime: true,
        openModsFolder: true,
        launch: true,
        continueFromLastSave: false
      },
      labels: {
        available: "Available",
        availableHint: "Installed but not active",
        active: "Active",
        activeHint: "Loaded by Bellwright · #1 is highest priority",
        searchPlaceholder: "Search mods",
        launch: "Launch"
      }
    },
    {
      id: "warhammer3",
      label: "Total War: WARHAMMER III",
      launcherTitle: "WARHAMMER III Mod Launcher",
      logoAsset: "./assets/games/warhammer3-icon.png",
      accent: "#b7524a",
      accentSecondary: "#b9a06a",
      capabilities: {
        modManagement: true,
        activation: true,
        loadOrder: true,
        presets: true,
        modSettings: false,
        nativeRuntime: false,
        openModsFolder: true,
        launch: true,
        continueFromLastSave: true
      },
      labels: {
        available: "Workshop mods",
        availableHint: "Subscribed in Steam Workshop, not selected",
        active: "Selected mods",
        activeHint: "Priority: #1 at the top wins conflicts",
        searchPlaceholder: "Search Workshop mods",
        launch: "Launch",
        continueFromLastSave: "Continue from last save",
        continueToast: "WARHAMMER III is resuming the latest save."
      }
    }
  ];

  await window.webContents.executeJavaScript(`
    games = ${JSON.stringify(descriptors)};
    state = ${JSON.stringify(stateFor(descriptors[0]))};
    render();
  `);
  await new Promise((resolve) => setTimeout(resolve, 150));

  const bellwrightMetrics = await window.webContents.executeJavaScript(`(() => {
    const heading = document.querySelector("#gameHeading");
    const headingRect = heading.getBoundingClientRect();
    const statusStrip = document.querySelector(".statusStrip");
    const statusStripRect = statusStrip.getBoundingClientRect();
    const visibleStatusRects = [...statusStrip.querySelectorAll(".statusItem")]
      .filter((item) => !item.hidden)
      .map((item) => item.getBoundingClientRect());
    document.querySelector("#gameSwitcherButton").click();
    const menu = document.querySelector("#gameSwitcherMenu");
    const menuRect = menu.getBoundingClientRect();
    return {
      applicationTitle: document.title,
      applicationBrand: document.querySelector(".windowIdentity span")?.textContent,
      applicationIcon: document.querySelector(".windowIdentity img")?.getAttribute("src"),
      headingText: heading.textContent,
      headingHeight: headingRect.height,
      headingClientHeight: heading.clientHeight,
      headingScrollHeight: heading.scrollHeight,
      menuHidden: menu.hidden,
      menuExpanded: document.querySelector("#gameSwitcherButton").getAttribute("aria-expanded"),
      menuItemCount: menu.querySelectorAll(".gameSwitcherOption").length,
      menuBottom: menuRect.bottom,
      viewportHeight: window.innerHeight,
      nativeRuntimeHidden: document.querySelector("#nativeRuntimeStatusItem").hidden,
      visibleStatusCount: visibleStatusRects.length,
      statusColumnWidths: visibleStatusRects.map((rect) => rect.width),
      statusLastRight: visibleStatusRects.at(-1).right,
      statusStripRight: statusStripRect.right,
      continueHidden: document.querySelector("#continueButton").hidden
    };
  })()`);
  assert.equal(bellwrightMetrics.applicationTitle, "ExOne Mod Launcher");
  assert.equal(bellwrightMetrics.applicationBrand, "ExOne Mod Launcher");
  assert.equal(bellwrightMetrics.applicationIcon, "./assets/branding/exone-lion-titlebar-24.png");
  assert.equal(bellwrightMetrics.headingText, "Bellwright Mod Launcher");
  assert.ok(bellwrightMetrics.headingClientHeight >= bellwrightMetrics.headingScrollHeight);
  assert.equal(bellwrightMetrics.menuHidden, false);
  assert.equal(bellwrightMetrics.menuExpanded, "true");
  assert.equal(bellwrightMetrics.menuItemCount, 2);
  assert.ok(bellwrightMetrics.menuBottom <= bellwrightMetrics.viewportHeight);
  assert.equal(bellwrightMetrics.nativeRuntimeHidden, false);
  assert.equal(bellwrightMetrics.visibleStatusCount, 5);
  assert.ok(Math.max(...bellwrightMetrics.statusColumnWidths) - Math.min(...bellwrightMetrics.statusColumnWidths) <= 1);
  assert.ok(Math.abs(bellwrightMetrics.statusLastRight - bellwrightMetrics.statusStripRight) <= 1);
  assert.equal(bellwrightMetrics.continueHidden, true);
  await fs.writeFile(
    path.join(outputRoot, "game-switcher-bellwright.png"),
    (await window.webContents.capturePage()).toPNG()
  );

  const warhammerMods = [
    {
      folderName: "111",
      displayFolderName: "example_active.pack",
      modName: "example_active.pack",
      title: "Example Active Mod",
      description: "",
      author: "Unknown",
      tag: "Steam Workshop",
      status: "active",
      source: "workshop",
      sourceRoot: "C:\\Workshop",
      workshopId: "111",
      steamId: 111,
      loadOrderIndex: 0,
      priority: 1,
      packageCount: 1,
      activeConflictCount: 1,
      conflictCount: 1,
      conflictSeverity: "medium"
    },
    {
      folderName: "222",
      displayFolderName: "example_available.pack",
      modName: "example_available.pack",
      title: "Example Available Mod",
      description: "",
      author: "Unknown",
      tag: "Steam Workshop",
      status: "disabled",
      source: "workshop",
      sourceRoot: "C:\\Workshop",
      workshopId: "222",
      steamId: 222,
      loadOrderIndex: null,
      priority: null,
      packageCount: 1,
      activeConflictCount: 0,
      conflictCount: 0
    },
    {
      folderName: "333",
      displayFolderName: "weather_overhaul.pack",
      modName: "weather_overhaul.pack",
      title: "Weather Overhaul",
      description: "",
      author: "Unknown",
      tag: "Steam Workshop",
      status: "active",
      source: "workshop",
      sourceRoot: "C:\\Workshop",
      workshopId: "333",
      steamId: 333,
      loadOrderIndex: 1,
      priority: 2,
      packageCount: 1,
      activeConflictCount: 1,
      conflictCount: 1,
      conflictSeverity: "medium"
    }
  ];
  const warhammerConflicts = [
    {
      id: "workshop:111|workshop:333",
      kind: "pack-file-overlap",
      severity: "medium",
      bothActive: true,
      duplicateInstall: false,
      assetCount: 2,
      resolution: "load-order",
      resolutionNote: "Load order applies to these matching files; priority #1 is highest.",
      resolutionCounts: { loadOrder: 2, database: 0, movie: 0 },
      assets: [
        {
          path: "script\\campaign\\shared.lua",
          leftOperations: ["packed file"],
          rightOperations: ["packed file"]
        },
        {
          path: "variantmeshes\\shared.model",
          leftOperations: ["packed file"],
          rightOperations: ["packed file"]
        }
      ],
      mods: [
        { key: "workshop:111", title: "Example Active Mod", loadOrderIndex: 0 },
        { key: "workshop:333", title: "Weather Overhaul", loadOrderIndex: 1 }
      ],
      winner: { key: "workshop:111", title: "Example Active Mod", loadOrderIndex: 0 }
    }
  ];
  const warhammerMetrics = await window.webContents.executeJavaScript(`(() => {
    closeGameMenu();
    state = ${JSON.stringify(stateFor(descriptors[1], warhammerMods, warhammerConflicts))};
    render();
    const heading = document.querySelector("#gameHeading");
    const conflictBadge = document.querySelector("#activeList .conflictBadge");
    const firstActiveMod = state.mods.find((mod) => mod.status === "active");
    const statusStrip = document.querySelector(".statusStrip");
    const statusStripRect = statusStrip.getBoundingClientRect();
    const visibleStatusRects = [...statusStrip.querySelectorAll(".statusItem")]
      .filter((item) => !item.hidden)
      .map((item) => item.getBoundingClientRect());
    const badgeRect = conflictBadge.getBoundingClientRect();
    showConflictTooltip(firstActiveMod, {
      currentTarget: conflictBadge,
      clientX: badgeRect.right,
      clientY: badgeRect.top
    });
    return {
      headingText: heading.textContent,
      headingClientHeight: heading.clientHeight,
      headingScrollHeight: heading.scrollHeight,
      availableAction: document.querySelector("#availableList .toggleButton span")?.textContent,
      activeAction: document.querySelector("#activeList .toggleButton span")?.textContent,
      activeOrderControls: document.querySelectorAll("#activeList .orderButton").length,
      logoSource: document.querySelector("#gameMark img")?.getAttribute("src"),
      launchDisabled: document.querySelector("#launchButton")?.disabled,
      continueDisabled: document.querySelector("#continueButton")?.disabled,
      continueHidden: document.querySelector("#continueButton")?.hidden,
      continueTitle: document.querySelector("#continueButton")?.getAttribute("title"),
      nativeRuntimeHidden: document.querySelector("#nativeRuntimeStatusItem")?.hidden,
      visibleStatusCount: visibleStatusRects.length,
      statusColumnWidths: visibleStatusRects.map((rect) => rect.width),
      statusLastRight: visibleStatusRects.at(-1).right,
      statusStripRight: statusStripRect.right,
      folderDisabled: document.querySelector("#folderButton")?.disabled,
      presetDisabled: document.querySelector("#savePresetButton")?.disabled,
      conflictBadgeText: conflictBadge.textContent.trim(),
      conflictCountForFirstActive: getConflictsForMod(firstActiveMod).length,
      conflictTooltipHidden: document.querySelector("#conflictTooltip").hidden,
      conflictTooltipText: document.querySelector("#conflictTooltip").textContent
    };
  })()`);
  assert.equal(warhammerMetrics.headingText, "WARHAMMER III Mod Launcher");
  assert.ok(warhammerMetrics.headingClientHeight >= warhammerMetrics.headingScrollHeight);
  assert.equal(warhammerMetrics.availableAction, "Activate");
  assert.equal(warhammerMetrics.activeAction, "Deactivate");
  assert.equal(warhammerMetrics.activeOrderControls, 4);
  assert.equal(warhammerMetrics.logoSource, "./assets/games/warhammer3-icon.png");
  assert.equal(warhammerMetrics.launchDisabled, false);
  assert.equal(warhammerMetrics.continueDisabled, false);
  assert.equal(warhammerMetrics.continueHidden, false);
  assert.match(warhammerMetrics.continueTitle, /Wissenland & Nuln_Quick Save\.121311096706\.save/);
  assert.equal(warhammerMetrics.nativeRuntimeHidden, true);
  assert.equal(warhammerMetrics.visibleStatusCount, 4);
  assert.ok(Math.max(...warhammerMetrics.statusColumnWidths) - Math.min(...warhammerMetrics.statusColumnWidths) <= 1);
  assert.ok(Math.abs(warhammerMetrics.statusLastRight - warhammerMetrics.statusStripRight) <= 1);
  assert.equal(warhammerMetrics.folderDisabled, false);
  assert.equal(warhammerMetrics.presetDisabled, false);
  assert.equal(warhammerMetrics.conflictBadgeText, "1");
  assert.equal(warhammerMetrics.conflictCountForFirstActive, 1);
  assert.equal(warhammerMetrics.conflictTooltipHidden, false);
  assert.match(warhammerMetrics.conflictTooltipText, /Active file overlap/);
  assert.match(warhammerMetrics.conflictTooltipText, /shared internal files/);
  assert.match(warhammerMetrics.conflictTooltipText, /Priority winner: Example Active Mod/);
  assert.match(warhammerMetrics.conflictTooltipText, /priority #1 is highest/);
  window.setSize(900, 640);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const compactMetrics = await window.webContents.executeJavaScript(`(() => {
    const topbar = document.querySelector(".topbar");
    const actions = document.querySelector(".actions");
    const launch = document.querySelector("#launchButton");
    const resume = document.querySelector("#continueButton");
    const topbarRect = topbar.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    return {
      topbarClientWidth: topbar.clientWidth,
      topbarScrollWidth: topbar.scrollWidth,
      actionsRight: actionsRect.right,
      topbarRight: topbarRect.right,
      launchRight: launch.getBoundingClientRect().right,
      continueLeft: resume.getBoundingClientRect().left
    };
  })()`);
  assert.ok(compactMetrics.topbarScrollWidth <= compactMetrics.topbarClientWidth + 1);
  assert.ok(compactMetrics.actionsRight <= compactMetrics.topbarRight + 1);
  assert.ok(compactMetrics.continueLeft >= compactMetrics.launchRight);
  await new Promise((resolve) => setTimeout(resolve, 150));
  await fs.writeFile(
    path.join(outputRoot, "game-switcher-warhammer3-900.png"),
    (await window.webContents.capturePage()).toPNG()
  );

  console.log(JSON.stringify({
    bellwright: bellwrightMetrics,
    warhammer3: warhammerMetrics,
    compact: compactMetrics
  }, null, 2));
  window.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exitCode = 1;
  app.quit();
});
