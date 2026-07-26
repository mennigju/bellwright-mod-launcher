const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const renderer = fs.readFileSync(path.join(root, "renderer", "renderer.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "renderer", "styles.css"), "utf8");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");
const packageScript = fs.readFileSync(path.join(root, "scripts", "package-windows.ps1"), "utf8");
const iconScript = fs.readFileSync(path.join(root, "scripts", "brand-windows-exe.js"), "utf8");
const index = fs.readFileSync(path.join(root, "renderer", "index.html"), "utf8");
const gameRegistry = fs.readFileSync(path.join(root, "game-registry.js"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const license = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
const updater = fs.readFileSync(path.join(root, "runtime", "apply-update.ps1"), "utf8");
const handoffSource = fs.readFileSync(path.join(root, "runtime", "update-handoff.cs"), "utf8");
const updateCleanup = fs.readFileSync(path.join(root, "update-cleanup.js"), "utf8");
const preload = fs.readFileSync(path.join(root, "preload.js"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const thirdPartyNotices = fs.readFileSync(path.join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
const tooltipHtml = fs.readFileSync(path.join(root, "renderer", "tooltip.html"), "utf8");
const tooltipJs = fs.readFileSync(path.join(root, "renderer", "tooltip.js"), "utf8");
const tooltipCss = fs.readFileSync(path.join(root, "renderer", "tooltip.css"), "utf8");

test("updater uses Node crypto instead of Electron's Web Crypto global", () => {
  assert.match(main, /const nodeCrypto = require\("node:crypto"\);/);
  assert.match(main, /nodeCrypto\.randomBytes\(4\)/);
  assert.doesNotMatch(main, /(?<!nodeCrypto\.)crypto\.randomBytes\(/);
});

test("updater is relaunched through a GUI-safe handoff after Electron exits", () => {
  const handoff = main.match(/async function startUpdaterAndQuit[\s\S]*?\r?\n}\r?\n\r?\nasync function updateLauncher/)?.[0] || "";
  assert.match(handoff, /app\.relaunch\(\{/);
  assert.match(handoff, /execPath: handoffPath/);
  assert.match(handoff, /"--log",\s*logPath,\s*powershellPath/s);
  assert.doesNotMatch(handoff, /execPath: powershellPath/);
  assert.match(handoff, /app\.exit\(0\)/);
  assert.doesNotMatch(handoff, /childProcess\.spawn/);
  assert.match(handoffSource, /CreateNoWindow\s*=\s*0x08000000/);
  assert.match(handoffSource, /false,\s*CreateNoWindow,/s);
  assert.match(handoffSource, /hStdInput\s*=\s*IntPtr\.Zero/);
  assert.match(handoffSource, /hStdOutput\s*=\s*IntPtr\.Zero/);
  assert.match(handoffSource, /hStdError\s*=\s*IntPtr\.Zero/);
});

test("updater leaves the installation and staging directories before cleanup", () => {
  assert.match(updater, /Set-Location -LiteralPath \$update/);
  assert.match(updater, /Set-Location -LiteralPath \(\[System\.IO\.Path\]::GetTempPath\(\)\)/);
  const successCleanup = updater.match(/Remove-DirectoryWithRetry \$replacement[\s\S]*?Remove-DirectoryWithRetry \$update/)?.[0] || "";
  assert.match(successCleanup, /Set-Location -LiteralPath \(\[System\.IO\.Path\]::GetTempPath\(\)\)/);
});

test("updater replaces contents without renaming the stable installation folder", () => {
  assert.doesNotMatch(updater, /Rename-Item -LiteralPath \$install/);
  assert.match(updater, /Clearing the current installation/);
  assert.match(updater, /Copy-DirectoryContents \$replacement \$install "Activating the new installation"/);
  assert.match(updater, /Copy-DirectoryContents \$install \$backup "Backing up the current installation"/);
});

test("successful updates verify restart and remove every disposable artifact", () => {
  assert.match(main, /verifyDownloadedAsset\(asset, zipPath\)/);
  assert.match(main, /"-WindowStyle",\s*"Hidden"/s);
  assert.match(main, /"-UserDataDir",\s*app\.getPath\("userData"\)/s);
  assert.match(updater, /Get-PackageVersion \$install/);
  assert.match(updater, /Updated launcher exited before restart verification completed/);
  assert.match(updater, /Remove-DirectoryWithRetry \$replacement "Removing prepared replacement"/);
  assert.match(updater, /Remove-DirectoryWithRetry \$update "Removing downloaded update files"/);
  assert.match(updater, /Remove-DirectoryWithRetry \$backup "Removing previous launcher version"/);
  assert.match(main, /cleanupStaleLauncherUpdates/);
  assert.match(main, /currentExecutablePath: process\.execPath/);
  assert.match(main, /if \(updateInProgress\) \{\s*scheduleStaleUpdateCleanup\(5000, retryAttempt\)/s);
  assert.match(main, /scheduleStaleUpdateCleanup\(retryDelayMs, retryAttempt \+ 1\)/);
  assert.match(updateCleanup, /maxRetries: 8/);
  assert.match(updateCleanup, /RETRYABLE_REMOVAL_CODES/);
  assert.match(main, /function scheduleActiveUpdateSessionCleanup\(\)/);
  assert.match(updateCleanup, /Wait-Process -Id \$launcherProcessId/);
  const deferredCleanup = main.match(/function scheduleActiveUpdateSessionCleanup[\s\S]*?\r?\n}\r?\n\r?\nfunction scheduleStaleUpdateCleanup/)?.[0] || "";
  assert.match(deferredCleanup, /"-WindowStyle",\s*"Hidden"/s);
  assert.match(deferredCleanup, /windowsHide: true/);
  assert.match(packageScript, /update-cleanup\.js/);
  assert.match(packageScript, /game-registry\.js/);
  assert.match(packageScript, /game-selection\.js/);
  assert.match(packageScript, /game-launch\.js/);
  assert.match(packageScript, /warhammer3-saves\.js/);
  assert.match(packageScript, /warhammer3-selection\.js/);
  assert.match(packageScript, /warhammer3-preset\.js/);
  assert.match(packageScript, /steam-workshop-thumbnails\.js/);
  assert.match(packageScript, /warhammer3-conflicts\.js/);
  assert.match(packageScript, /native-signature\.js/);
  assert.match(packageScript, /native-discovery\.js/);
  assert.match(packageScript, /THIRD_PARTY_NOTICES\.md/);
  assert.match(packageScript, /build-update-handoff\.ps1/);
  assert.match(packageScript, /build-legacy-launcher\.ps1/);
  assert.match(packageScript, /brand-windows-exe\.js/);
});

test("hover preview preserves existing metadata and fits Workshop thumbnails without cropping", () => {
  assert.match(tooltipHtml, /id="thumbnail"/);
  assert.match(tooltipHtml, /id="thumbnailFallback"/);
  assert.match(tooltipHtml, /id="description"/);
  assert.match(tooltipHtml, /id="source"/);
  assert.match(tooltipHtml, /id="folder"/);
  assert.match(tooltipHtml, /id="author"/);
  assert.match(tooltipHtml, /id="version"/);
  assert.match(tooltipHtml, /id="packages"/);
  assert.match(tooltipHtml, /id="path"/);
  assert.match(tooltipCss, /\.tooltipThumbnail img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(tooltipCss, /\.tooltipThumbnail img\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0[^}]*object-position:\s*center/s);
  assert.match(tooltipJs, /images\\\.steamusercontent\\\.com/);
  assert.match(tooltipJs, /Workshop thumbnail unavailable/);
  assert.doesNotMatch([tooltipHtml, tooltipJs].join("\n"), /Local Workshop image|Steam Workshop image|thumbnailSource/);
  assert.match(main, /resolveWorkshopDetails\(GAME_APP_ID, workshopId, folderPath\)/);
  assert.match(main, /modInfo\?\.title \|\| workshopDetails\.title \|\| modInfo\?\.folderName/);
  assert.match(main, /resolveWorkshopDetails\(WARHAMMER3_APP_ID, folderName, folderPath\)/);
  assert.match(main, /title:\s*workshopTitle \|\| titleFromPackName\(preferredPack\)/);
});

test("recoverable update failures restore, restart, and clean up", () => {
  assert.match(updater, /Copy-DirectoryContents \$backup \$install "Restoring the previous installation"/);
  assert.match(updater, /Start-Process -FilePath \(Join-Path \$install \$ExeName\)/);
  assert.match(updater, /Show-UpdateFailure \$message/);
  assert.match(updater, /foreach \(\$artifact in @\(\$replacement, \$backup, \$update\)\)/);
  assert.match(updater, /Recovery files were preserved to avoid data loss/);
});

test("portable archive is versioned but its application folder is stable", () => {
  assert.match(packageScript, /\$archiveName = "ExOneModLauncher-v\$version-win-x64-portable"/);
  assert.match(packageScript, /\$appFolderName = "ExOneModLauncher"/);
  assert.match(packageScript, /\$exeName = "ExOneModLauncher\.exe"/);
  assert.match(packageScript, /\$legacyExeName = "BellwrightModLauncher\.exe"/);
  assert.match(packageScript, /runtime\\\$legacyExeName/);
  assert.match(packageScript, /\$zipPath = Join-Path \$releaseRoot "\$archiveName\.zip"/);
  assert.doesNotMatch(packageScript, /\$outDir = Join-Path \$distRoot \$archiveName/);
  assert.match(packageScript, /Remove-Item -LiteralPath \$defaultElectronApp -Force/);
});

test("public launcher branding uses ExOne and preserves the existing ExcelsiorOne identity", () => {
  const retiredBrand = ["FSD", "Software"].join(" ");
  assert.equal(packageJson.productName, "ExOne Mod Launcher");
  assert.match(main, /const APP_NAME = "ExOne Mod Launcher"/);
  assert.match(main, /app\.setName\(APP_NAME\)/);
  assert.match(main, /app\.setPath\("userData", path\.join\(app\.getPath\("appData"\), APP_USER_DATA_NAME\)\)/);
  assert.match(index, /<title>ExOne Mod Launcher<\/title>/);
  assert.match(index, /<span>ExOne Mod Launcher<\/span>/);
  assert.match(index, /assets\/branding\/exone-lion-titlebar-24\.png/);
  assert.match(main, /maker: "ExcelsiorOne"/);
  assert.match(renderer, /Support ExcelsiorOne/);
  assert.match(index, /aria-label="ExcelsiorOne"/);
  assert.match(license, /Copyright \(c\) 2026 ExcelsiorOne/);
  assert.doesNotMatch([main, renderer, index, license].join("\n"), new RegExp(retiredBrand, "i"));
});

test("update badge appears only after a confirmed background release check", () => {
  assert.match(index, /id="updateAvailabilityBadge"[^>]*aria-hidden="true"[^>]*hidden/);
  assert.match(styles, /\.updateAvailabilityBadge\s*\{[^}]*position:\s*absolute[^}]*border-radius:\s*50%/s);
  assert.match(styles, /\.updateAvailabilityBadge\[hidden\]\s*\{[^}]*display:\s*none/s);
  assert.match(preload, /checkLauncherUpdate:\s*\(\)\s*=>\s*ipcRenderer\.invoke\("app:checkLauncherUpdate"\)/);
  assert.match(main, /async function checkLauncherUpdate\(\)[\s\S]*?status:\s*"unsupported"[\s\S]*?fetchLatestRelease\(\)/);
  assert.match(main, /result\.status === "available" && !findUpdateAsset\(release\)\?\.browser_download_url/);
  assert.match(renderer, /result\?\.status === "available"/);
  assert.match(renderer, /void checkLauncherUpdateAvailability\(\)/);
  assert.match(renderer, /background network failure means the update state is unknown, not available/);
});

test("never scales the complete launcher to fit the mod count", () => {
  assert.doesNotMatch(renderer, /\.style\.zoom|fitContentToWindow|--content-scale/);
  assert.doesNotMatch(renderer, /devicePixelRatio/);
});

test("large mod lists scroll independently without shrinking cards", () => {
  assert.match(styles, /\.shell\s*\{[^}]*height:\s*calc\(100vh\s*-\s*50px\)/s);
  assert.match(styles, /\.board\s*\{[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
  assert.match(styles, /\.modColumn\s*\{[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
  assert.match(styles, /\.columnList\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(styles, /\.modCard\s*\{[^}]*min-height:\s*42px/s);
  assert.match(styles, /\.topbar,[\s\S]*\.statusStrip,[\s\S]*\.controls,[\s\S]*\.updateProgress\s*\{[^}]*flex:\s*0\s+0\s+auto/s);
});

test("search filters both columns while drag placement targets the complete active order", () => {
  const dragOrder = fs.readFileSync(path.join(root, "renderer", "drag-order.js"), "utf8");
  assert.match(renderer, /visibleActive = filterMods\(activeMods, query\)/);
  assert.match(renderer, /visibleAvailable = filterMods\(availableMods, query\)/);
  assert.match(renderer, /function getDropPlacement\(event, column\)/);
  assert.match(renderer, /window\.dragOrder\.reorderKeys\(currentKeys, modKey\(mod\), placement\)/);
  assert.match(renderer, /state = await applyActivePlacement\(mod, placement\)/);
  assert.match(dragOrder, /placement\.position === "before"/);
  assert.match(styles, /\.modCard\.dropBefore[\s\S]*\.modCard\.dropAfter/);
});

test("real WH3 continue action sits immediately after Launch and uses the newest save", () => {
  const continueHandler = renderer.match(
    /continueButton\.addEventListener\("click"[\s\S]*?\r?\n}\);/
  )?.[0] || "";
  assert.match(index, /id="launchButton"[\s\S]*?<\/button>\s*<button id="continueButton"/);
  assert.match(index, /id="continueButton"[^>]*>[\s\S]*?Continue from last save[\s\S]*?<\/button>/);
  assert.match(preload, /continueGame:\s*\(\)\s*=>\s*ipcRenderer\.invoke\("mods:continueGame"\)/);
  assert.match(continueHandler, /state\?\.latestSave/);
  assert.match(continueHandler, /window\.bellwrightMods\.continueGame\(\)/);
  assert.doesNotMatch(continueHandler, /askConfirm|continuePrompt|normally|game menu/i);
  assert.match(renderer, /continueButton\.hidden = !supports\("continueFromLastSave"\)/);
  assert.match(main, /async function launchSelectedGame\(\)[\s\S]*?launchWarhammer3SelectedGame\(\)[\s\S]*?launchBellwrightSelectedGame\(\)/);
  assert.match(main, /ipcMain\.handle\("mods:launchGame",[\s\S]*?launchSelectedGame\(\)/);
  assert.match(main, /ipcMain\.handle\("mods:continueGame",[\s\S]*?findLatestWarhammer3Save[\s\S]*?launchWarhammer3Continue[\s\S]*?directResume:\s*true/);
  assert.match(main, /latestSave = await findLatestWarhammer3Save/);
  assert.match(gameRegistry, /bellwright:[\s\S]*?continueFromLastSave:\s*false/);
  assert.match(gameRegistry, /warhammer3:[\s\S]*?continueFromLastSave:\s*true/);
  assert.match(thirdPartyNotices, /WH3 Mod Manager[\s\S]*v2\.19\.1[\s\S]*MIT License[\s\S]*Copyright \(c\) 2022 Shazbot/);
  assert.match(styles, /\.continueButton\s*\{[^}]*white-space:\s*nowrap/s);
});

test("Native Runtime status is shown only for games that support it", () => {
  assert.match(index, /id="nativeRuntimeStatusItem" class="statusItem"/);
  assert.match(renderer, /const nativeRuntimeSupported = supports\("nativeRuntime"\)/);
  assert.match(renderer, /statusStrip\.classList\.toggle\("statusStripFourColumns", !nativeRuntimeSupported\)/);
  assert.match(renderer, /nativeRuntimeStatusItem\.hidden = !nativeRuntimeSupported/);
  assert.match(styles, /\.statusStrip\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(styles, /\.statusStrip\.statusStripFourColumns\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(gameRegistry, /bellwright:[\s\S]*?nativeRuntime:\s*true/);
  assert.match(gameRegistry, /warhammer3:[\s\S]*?nativeRuntime:\s*false/);
});

test("game selection keeps titlebar branding and uses bundled executable icons without a content frame", () => {
  const bellwrightLogo = fs.readFileSync(path.join(root, "renderer", "assets", "games", "bellwright-icon.png"));
  const warhammerLogo = fs.readFileSync(path.join(root, "renderer", "assets", "games", "warhammer3-icon.png"));
  const appLogo = fs.readFileSync(path.join(root, "renderer", "assets", "branding", "exone-lion.png"));
  const titlebarLogo1x = fs.readFileSync(
    path.join(root, "renderer", "assets", "branding", "exone-lion-titlebar-24.png")
  );
  const titlebarLogo2x = fs.readFileSync(
    path.join(root, "renderer", "assets", "branding", "exone-lion-titlebar-48.png")
  );
  const appIcon = fs.readFileSync(path.join(root, "renderer", "assets", "branding", "exone-lion.ico"));
  assert.match(index, /id="gameHeading" class="gameHeading">Bellwright Mod Launcher<\/span>/);
  assert.match(gameRegistry, /launcherTitle: "Bellwright Mod Launcher"/);
  assert.match(gameRegistry, /launcherTitle: "WARHAMMER III Mod Launcher"/);
  assert.match(index, /id="gameSwitcherButton"/);
  assert.match(index, /id="gameMark" class="mark"/);
  assert.match(index, /id="gameSwitcher" class="gameSwitcher"/);
  assert.match(renderer, /function gameLogoHtml\(game\)/);
  assert.match(renderer, /gameMark\.innerHTML = gameLogoHtml\(game\)/);
  assert.match(renderer, /state = await window\.bellwrightMods\.selectGame\(gameId\)/);
  assert.match(preload, /listGames:\s*\(\)\s*=>\s*ipcRenderer\.invoke\("games:list"\)/);
  assert.match(main, /ipcMain\.handle\("games:select"/);
  assert.doesNotMatch([index, renderer].join("\n"), /https?:\/\//i);
  assert.deepEqual([...bellwrightLogo.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([...warhammerLogo.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([...appLogo.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([...titlebarLogo1x.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([...titlebarLogo2x.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([...appIcon.subarray(0, 4)], [0, 0, 1, 0]);
  assert.match(index, /src="\.\/assets\/branding\/exone-lion-titlebar-24\.png"/);
  assert.match(index, /srcset="\.\/assets\/branding\/exone-lion-titlebar-48\.png 2x"/);
  assert.match(styles, /\.windowIdentity img\s*\{[^}]*width:\s*24px[^}]*height:\s*24px/s);
  assert.match(iconScript, /ProductName: "ExOne Mod Launcher"/);
  assert.match(iconScript, /originalFilenameArgument = "ExOneModLauncher\.exe"/);
  assert.match(iconScript, /OriginalFilename: originalFilenameArgument/);
  assert.match(iconScript, /CompanyName: "ExcelsiorOne"/);
  assert.match(styles, /\.mark\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
  assert.match(styles, /\.gameLogoAsset\[data-game-id="bellwright"\] img\s*\{[^}]*mix-blend-mode:\s*screen/s);
  assert.match(styles, /\.gameHeading\s*\{[^}]*padding-bottom:\s*3px/s);
});

test("WH3 is fully operable through used_mods.txt without reaching Bellwright folder operations", () => {
  const discovery = main.match(/async function getWarhammer3State\(game\)[\s\S]*?\r?\n}\r?\n\r?\nasync function getState/)?.[0] || "";
  const updates = main.match(/async function getWarhammer3ModUpdateContext\(\)[\s\S]*?(?=\r?\nasync function moveDirectory)/)?.[0] || "";
  const presetHandlers = main.match(/ipcMain\.handle\("presets:list"[\s\S]*?(?=ipcMain\.handle\("app:updateLauncher")/)?.[0] || "";
  assert.match(main, /async function getWarhammer3State\(game\)/);
  assert.match(main, /if \(game\.id !== "bellwright"\) \{\s*return getWarhammer3State\(game\);/s);
  assert.match(discovery, /readWarhammer3Selection\(usedModsPath\)/);
  assert.match(discovery, /getWarhammer3Running\(\)/);
  assert.match(discovery, /findLatestWarhammer3Save/);
  assert.match(discovery, /warhammer3ConflictAnalyzer\.analyze\(mods\)/);
  assert.match(discovery, /conflicts:\s*conflictResult\.conflicts/);
  assert.match(discovery, /activeConflictCount:\s*conflictResult\.activeConflictCount/);
  assert.match(main, /selectedGameId === "warhammer3" \? await getWarhammer3Running\(\) : bellwrightRunning/);
  assert.match(discovery, /fs\.readdir\(folderPath/);
  assert.doesNotMatch(discovery, /fs\.(writeFile|rename|rm|unlink)|moveDirectory|ensureDirectory/);
  assert.match(updates, /writeWarhammer3Selection\(\{ fs, filePath: usedModsPath, mods \}\)/);
  assert.match(updates, /source !== "workshop"/);
  assert.doesNotMatch(updates, /moveDirectory|replaceDirectory|workshopDisabledRoot|setModActiveFlag/);
  assert.match(main, /function assertBellwrightSelected\(\)/);
  assert.match(main, /ipcMain\.handle\("mods:enable",[\s\S]*?selectedGameId === "warhammer3"[\s\S]*?enableWarhammer3Mod\(payload\)[\s\S]*?assertBellwrightSelected\(\)/);
  assert.match(main, /ipcMain\.handle\("mods:disable",[\s\S]*?selectedGameId === "warhammer3"[\s\S]*?disableWarhammer3Mod\(payload\)[\s\S]*?assertBellwrightSelected\(\)/);
  assert.match(main, /ipcMain\.handle\("mods:setLoadOrder",[\s\S]*?selectedGameId === "warhammer3"[\s\S]*?setWarhammer3LoadOrder\(payload\)[\s\S]*?assertBellwrightSelected\(\)/);
  assert.match(main, /ipcMain\.handle\("mods:openModsFolder",[\s\S]*?selectedGameId === "warhammer3"[\s\S]*?workshopRoot[\s\S]*?assertBellwrightSelected\(\)/);
  assert.match(main, /async function launchWarhammer3SelectedGame\(\)[\s\S]*?launchWarhammer3\(\{ childProcess, fs, gameRoot \}\)/);
  assert.match(main, /async function launchBellwrightSelectedGame\(\)[\s\S]*?assertBellwrightSelected\(\)[\s\S]*?steam:\/\/rungameid\/\$\{GAME_APP_ID\}/);
  assert.match(main, /async function launchSelectedGame\(\)[\s\S]*?selectedGameId === "warhammer3"[\s\S]*?launchWarhammer3SelectedGame\(\)[\s\S]*?launchBellwrightSelectedGame\(\)/);
  assert.doesNotMatch(presetHandlers, /assertBellwrightSelected\(\)/);
  assert.match(main, /const WARHAMMER3_PRESET_SHARE_PREFIX = "EX1W3:"/);
  assert.match(main, /gameId: isKnownGame\(preset\.gameId\) \? preset\.gameId : DEFAULT_GAME_ID/);
  assert.match(main, /\.filter\(\(preset\) => preset\.gameId === selectedGameId\)/);
  assert.match(main, /buildWarhammer3PresetSelection\(\s*currentState,\s*preset\s*\)/s);
  assert.match(renderer, /supports\("activation"\)/);
  assert.match(renderer, /Local data packs stay selected/);
  assert.match(renderer, /Active file overlap/);
  assert.match(renderer, /Priority winner/);
  assert.match(renderer, /resolutionNote/);
});

test("each game maps visible priority one to its verified native order", () => {
  const priorityOrder = fs.readFileSync(path.join(root, "priority-order.js"), "utf8");
  const wh3Selection = fs.readFileSync(path.join(root, "warhammer3-selection.js"), "utf8");
  const wh3Conflicts = fs.readFileSync(path.join(root, "warhammer3-conflicts.js"), "utf8");

  assert.match(main, /return bellwrightLoadOrderToPriorityOrder\(gameLoadOrder\)/);
  assert.match(main, /const gameLoadOrder = bellwrightPriorityOrderToLoadOrder\(cleanEntries\)/);
  assert.match(main, /const winner = bothActive \? selectHighestPriorityMod\(left, right\) : null/);
  assert.match(wh3Selection, /warhammer3LoadOrderToPriorityOrder\(gamePackOrder\)/);
  assert.match(wh3Selection, /warhammer3PriorityOrderToLoadOrder\(desired\.packOrder\)/);
  assert.match(wh3Conflicts, /selectHighestPriorityMod\(left, right\)/);
  assert.match(priorityOrder, /left\.loadOrderIndex < right\.loadOrderIndex \? left : right/);
});

test("conflict details accept independent mouse scrolling", () => {
  assert.match(styles, /\.conflictTooltip\s*\{[^}]*overflow:\s*auto[^}]*overscroll-behavior:\s*contain[^}]*pointer-events:\s*auto/s);
  assert.doesNotMatch(styles, /\.conflictTooltip\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(renderer, /conflictTooltip\.addEventListener\("mouseenter", cancelConflictTooltipHide\)/);
  assert.match(renderer, /conflictTooltip\.addEventListener\("mouseleave", scheduleConflictTooltipHide\)/);
  assert.doesNotMatch(renderer, /conflictBadgeElement\.addEventListener\("mousemove"/);
});

test("large-list visual fixture exercises 200 active mods", () => {
  const fixture = fs.readFileSync(path.join(__dirname, "fixtures", "large-list.html"), "utf8");
  assert.match(fixture, /activeCount\s*=\s*Number\(params\.get\("active"\)\s*\|\|\s*200\)/);
});

test("public release copy documents the ExOne transition and verified WH3 order", () => {
  assert.match(readme, /ExOne v0\.7\.2 reuses the existing `bellwright-mod-launcher` user-data directory/);
  assert.match(readme, /v0\.5\.8 or newer can use the normal Update/);
  assert.match(readme, /`BellwrightModLauncher\.exe` compatibility[\s\S]*?launcher/);
  assert.match(readme, /at the top is written first in `used_mods\.txt`/);
  assert.doesNotMatch(readme, /local candidate|has not been published/i);
});

test("persistent native trust explicitly covers future replacement DLLs", () => {
  assert.match(main, /buttons: \["Cancel", "Allow this DLL", "Trust future updates"\]/);
  assert.match(main, /"Allow this DLL" approves only this exact file/);
  assert.match(main, /"Trust future updates" also approves replacement DLLs downloaded later for this same mod/);
});

test("a stale state refresh cannot overwrite a newer native-runtime event", () => {
  assert.match(renderer, /let nativeRuntimeRevision = 0/);
  assert.match(renderer, /const nativeRevisionAtStart = nativeRuntimeRevision/);
  assert.match(renderer, /nativeRuntimeRevision !== nativeRevisionAtStart && latestNativeRuntime/);
  assert.match(renderer, /mergeNativeRuntimeIntoState\(nextState, latestNativeRuntime\)/);
  assert.match(renderer, /function handleNativeRuntimeChanged\(runtime\) \{\s*latestNativeRuntime = runtime;\s*nativeRuntimeRevision \+= 1;/s);
});
