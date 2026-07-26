const availableList = document.querySelector("#availableList");
const windowTitlebar = document.querySelector("#windowTitlebar");
const windowMinimizeButton = document.querySelector("#windowMinimizeButton");
const windowCloseButton = document.querySelector("#windowCloseButton");
const gameSwitcher = document.querySelector("#gameSwitcher");
const gameSwitcherButton = document.querySelector("#gameSwitcherButton");
const gameSwitcherMenu = document.querySelector("#gameSwitcherMenu");
const gameMark = document.querySelector("#gameMark");
const gameHeading = document.querySelector("#gameHeading");
const activeList = document.querySelector("#activeList");
const availableEmpty = document.querySelector("#availableEmpty");
const activeEmpty = document.querySelector("#activeEmpty");
const pathLine = document.querySelector("#pathLine");
const gameState = document.querySelector("#gameState");
const activeCount = document.querySelector("#activeCount");
const availableCount = document.querySelector("#availableCount");
const workshopCount = document.querySelector("#workshopCount");
const statusStrip = document.querySelector(".statusStrip");
const nativeRuntimeStatusItem = document.querySelector("#nativeRuntimeStatusItem");
const nativeRuntimeState = document.querySelector("#nativeRuntimeState");
const activeColumnCount = document.querySelector("#activeColumnCount");
const availableColumnCount = document.querySelector("#availableColumnCount");
const availableColumnTitle = document.querySelector("#availableColumnTitle");
const availableColumnHint = document.querySelector("#availableColumnHint");
const activeColumnTitle = document.querySelector("#activeColumnTitle");
const activeColumnHint = document.querySelector("#activeColumnHint");
const refreshButton = document.querySelector("#refreshButton");
const folderButton = document.querySelector("#folderButton");
const launchButton = document.querySelector("#launchButton");
const continueButton = document.querySelector("#continueButton");
const searchInput = document.querySelector("#searchInput");
const presetSelect = document.querySelector("#presetSelect");
const savePresetButton = document.querySelector("#savePresetButton");
const loadPresetButton = document.querySelector("#loadPresetButton");
const sharePresetButton = document.querySelector("#sharePresetButton");
const importPresetButton = document.querySelector("#importPresetButton");
const deletePresetButton = document.querySelector("#deletePresetButton");
const aboutMaker = document.querySelector("#aboutMaker");
const appVersion = document.querySelector("#appVersion");
const updateButton = document.querySelector("#updateButton");
const updateAvailabilityBadge = document.querySelector("#updateAvailabilityBadge");
const donateButton = document.querySelector("#donateButton");
const discordButton = document.querySelector("#discordButton");
const updateProgress = document.querySelector("#updateProgress");
const updateProgressTitle = document.querySelector("#updateProgressTitle");
const updateProgressPercent = document.querySelector("#updateProgressPercent");
const updateProgressBar = document.querySelector("#updateProgressBar");
const updateProgressMessage = document.querySelector("#updateProgressMessage");
const modalBackdrop = document.querySelector("#modalBackdrop");
const modalTitle = document.querySelector("#modalTitle");
const modalMessage = document.querySelector("#modalMessage");
const modalInput = document.querySelector("#modalInput");
const modalCancelButton = document.querySelector("#modalCancelButton");
const modalConfirmButton = document.querySelector("#modalConfirmButton");
const shareModalBackdrop = document.querySelector("#shareModalBackdrop");
const shareModalCloseButton = document.querySelector("#shareModalCloseButton");
const shareModalCancelButton = document.querySelector("#shareModalCancelButton");
const sharePreviewButton = document.querySelector("#sharePreviewButton");
const shareImportButton = document.querySelector("#shareImportButton");
const shareCodeInput = document.querySelector("#shareCodeInput");
const sharePreview = document.querySelector("#sharePreview");
const sharePreviewName = document.querySelector("#sharePreviewName");
const sharePreviewCounts = document.querySelector("#sharePreviewCounts");
const sharePreviewWarning = document.querySelector("#sharePreviewWarning");
const shareModList = document.querySelector("#shareModList");
const settingsModalBackdrop = document.querySelector("#settingsModalBackdrop");
const settingsModalTitle = document.querySelector("#settingsModalTitle");
const settingsModalModName = document.querySelector("#settingsModalModName");
const settingsModalCloseButton = document.querySelector("#settingsModalCloseButton");
const settingsModalCancelButton = document.querySelector("#settingsModalCancelButton");
const settingsModalApplyButton = document.querySelector("#settingsModalApplyButton");
const settingsModalWarning = document.querySelector("#settingsModalWarning");
const settingsFields = document.querySelector("#settingsFields");
const toast = document.querySelector("#toast");
const conflictTooltip = document.querySelector("#conflictTooltip");
const dropColumns = [...document.querySelectorAll(".modColumn")];

let state = null;
let presets = [];
let busy = false;
let toastTimer = null;
let conflictTooltipHideTimer = null;
let pendingModal = null;
let pendingGameRunningState = null;
let gameStateRefreshRunning = false;
let inspectedShareCode = null;
let settingsModalMod = null;
let launcherUpdateSupported = false;
let launcherUpdateRepo = "GitHub";
let latestNativeRuntime = null;
let nativeRuntimeRevision = 0;
let games = [];

const icons = {
  power: '<svg viewBox="0 0 24 24"><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.8 0" /></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14" /><path d="M16 5v14" /></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6" /></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>',
  external: '<svg viewBox="0 0 24 24"><path d="M15 3h6v6" /><path d="m10 14 11-11" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>'
  ,settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>'
};

function currentGame() {
  return state?.game || {
    id: "bellwright",
    label: "Bellwright",
    launcherTitle: "Bellwright Mod Launcher",
    logoAsset: "./assets/games/bellwright-icon.png",
    accent: "#d9b45f",
    accentSecondary: "#7fb0a4",
    capabilities: {},
    labels: {}
  };
}

function supports(capability) {
  return Boolean(currentGame().capabilities?.[capability]);
}

function gameLogoHtml(game) {
  const fallback = game.id === "warhammer3" ? "III" : "BW";
  return `<span class="gameLogoAsset" data-game-id="${escapeHtml(game.id)}">
    <img src="${escapeHtml(game.logoAsset || "")}" alt="" />
    <span class="gameLogoFallback">${fallback}</span>
  </span>`;
}

function bindLogoFallbacks(root) {
  root.querySelectorAll(".gameLogoAsset img").forEach((image) => {
    const markMissing = () => image.closest(".gameLogoAsset")?.classList.add("logoMissing");
    image.addEventListener("error", markMissing, { once: true });
    if (image.complete && image.naturalWidth === 0) {
      markMissing();
    }
  });
}

function renderGameMenu() {
  const selectedId = currentGame().id;
  gameSwitcherMenu.innerHTML = "";
  for (const game of games) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "gameSwitcherOption";
    option.setAttribute("role", "menuitemradio");
    option.setAttribute("aria-checked", String(game.id === selectedId));
    option.setAttribute("aria-current", String(game.id === selectedId));
    option.dataset.gameId = game.id;
    option.innerHTML = `${gameLogoHtml(game)}<span>${escapeHtml(game.label)}</span>`;
    option.addEventListener("click", () => selectGame(game.id));
    gameSwitcherMenu.appendChild(option);
  }
  bindLogoFallbacks(gameSwitcherMenu);
}

function closeGameMenu() {
  gameSwitcherMenu.hidden = true;
  gameSwitcherButton.setAttribute("aria-expanded", "false");
}

async function selectGame(gameId) {
  if (busy || gameId === currentGame().id) {
    closeGameMenu();
    return;
  }
  try {
    setBusy(true);
    closeGameMenu();
    hideModTooltip();
    state = await window.bellwrightMods.selectGame(gameId);
    latestNativeRuntime = state.nativeRuntime;
    nativeRuntimeRevision += 1;
    searchInput.value = "";
    presets = [];
    render();
    await loadPresets();
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setBusy(false);
  }
}

async function loadGames() {
  try {
    games = await window.bellwrightMods.listGames();
    renderGameMenu();
  } catch (error) {
    showToast(error.message || String(error), true);
  }
}

function closeSettingsModal() {
  settingsModalBackdrop.hidden = true;
  settingsFields.innerHTML = "";
  settingsModalMod = null;
}

function openSettingsModal(mod) {
  const groups = mod.launcherSettings?.groups || [];
  if (!groups.length) {
    return;
  }
  settingsModalMod = mod;
  settingsModalTitle.textContent = "Mod settings";
  settingsModalModName.textContent = mod.title;
  settingsFields.innerHTML = "";
  for (const group of groups) {
    const field = document.createElement("label");
    field.className = "settingsField";
    const title = document.createElement("strong");
    title.textContent = group.label;
    const description = document.createElement("span");
    description.textContent = group.description;
    const select = document.createElement("select");
    select.dataset.groupId = group.id;
    for (const option of group.options) {
      const element = document.createElement("option");
      element.value = option.id;
      element.textContent = option.description ? `${option.label} — ${option.description}` : option.label;
      element.selected = option.id === group.selectedOption;
      select.appendChild(element);
    }
    field.append(title, description, select);
    settingsFields.appendChild(field);
  }
  settingsModalWarning.hidden = !state.gameRunning;
  settingsModalWarning.textContent = state.gameRunning ? "Close Bellwright before changing mod settings." : "";
  settingsModalApplyButton.disabled = busy || state.gameRunning;
  settingsModalBackdrop.hidden = false;
}

async function applySettingsModal() {
  if (!settingsModalMod || busy || state.gameRunning) {
    return;
  }
  const mod = settingsModalMod;
  const changes = [...settingsFields.querySelectorAll("select")]
    .map((select) => ({ groupId: select.dataset.groupId, optionId: select.value }))
    .filter(({ groupId, optionId }) => mod.launcherSettings.groups.find((group) => group.id === groupId)?.selectedOption !== optionId);
  if (!changes.length) {
    closeSettingsModal();
    return;
  }
  try {
    setBusy(true);
    for (const change of changes) {
      state = await window.bellwrightMods.setVariant({
        source: mod.source,
        folderName: mod.folderName,
        ...change
      });
    }
    closeSettingsModal();
    render();
    showToast(`${mod.title} settings applied.`);
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setBusy(false);
  }
}

function showToast(message, error = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.hidden = false;
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function showUpdateProgress(progress) {
  updateProgress.hidden = false;
  updateProgressTitle.textContent = progress.phase === "done" ? "Launcher update" : "Updating launcher";
  updateProgressMessage.textContent = progress.message || "Working...";

  const percent = Number.isFinite(progress.percent) ? Math.max(0, Math.min(progress.percent, 100)) : 8;
  updateProgressPercent.textContent = Number.isFinite(progress.percent) ? `${percent}%` : "";
  updateProgressBar.style.width = `${percent}%`;
}

function hideUpdateProgressSoon() {
  setTimeout(() => {
    updateProgress.hidden = true;
  }, 1800);
}

function closeModal(result) {
  if (!pendingModal) {
    return;
  }
  const { resolve } = pendingModal;
  pendingModal = null;
  modalBackdrop.hidden = true;
  modalInput.value = "";
  modalInput.hidden = false;
  resolve(result);
}

function openModal({ title, message, input = false, defaultValue = "", confirmText = "OK" }) {
  if (pendingModal) {
    closeModal(null);
  }

  modalTitle.textContent = title;
  modalMessage.textContent = message || "";
  modalInput.hidden = !input;
  modalInput.value = defaultValue || "";
  modalConfirmButton.textContent = confirmText;
  modalBackdrop.hidden = false;

  return new Promise((resolve) => {
    pendingModal = { resolve, input };
    requestAnimationFrame(() => {
      if (input) {
        modalInput.focus();
        modalInput.select();
      } else {
        modalConfirmButton.focus();
      }
    });
  });
}

function askPresetName(defaultValue) {
  return openModal({
    title: "Save preset",
    message: "Preset name",
    input: true,
    defaultValue,
    confirmText: "Save"
  });
}

function askConfirm(title, message, confirmText = "OK") {
  return openModal({
    title,
    message,
    input: false,
    confirmText
  });
}

function setBusy(value) {
  busy = value;
  refreshButton.disabled = value;
  folderButton.disabled = value || !supports("openModsFolder");
  launchButton.disabled = value || !supports("launch") || Boolean(state?.gameRunning);
  continueButton.disabled =
    value ||
    !supports("continueFromLastSave") ||
    Boolean(state?.gameRunning) ||
    !state?.latestSave;
  savePresetButton.disabled = value || !supports("presets");
  updateButton.disabled = value;
  loadPresetButton.disabled = value || !supports("presets") || !presetSelect.value || !state || state.gameRunning;
  sharePresetButton.disabled = value || !supports("presets") || !presetSelect.value;
  importPresetButton.disabled = value || !supports("presets");
  deletePresetButton.disabled = value || !supports("presets") || !presetSelect.value;
  presetSelect.disabled = value || !supports("presets") || presets.length === 0;
  searchInput.disabled = value || !supports("modManagement");
  document.querySelectorAll(".toggleButton").forEach((button) => {
    button.disabled =
      value || !supports("activation") || state?.gameRunning || button.dataset.blocked === "true";
  });
  document.querySelectorAll(".orderButton").forEach((button) => {
    button.disabled = value || !supports("loadOrder") || state?.gameRunning || button.dataset.blocked === "true";
  });
  document.querySelectorAll(".settingsButton").forEach((button) => {
    button.disabled = value || !supports("modSettings");
  });
  document.querySelectorAll(".modCard").forEach((card) => {
    card.draggable = !(value || !supports("activation") || state?.gameRunning);
  });
  if (!value && pendingGameRunningState !== null) {
    queueMicrotask(flushPendingGameRunningState);
  }
}

function getStatusLabel(mod) {
  if (currentGame().id === "warhammer3") {
    return {
      text: mod.status === "active" ? "Selected" : "Not selected",
      className: mod.status === "active" ? "workshop" : "disabled"
    };
  }
  if (mod.source === "workshop") {
    return {
      text: mod.status === "active" ? "Workshop On" : "Workshop Off",
      className: "workshop"
    };
  }
  return {
    text: mod.status === "active" ? "Active" : "Disabled",
    className: mod.status
  };
}

function getNativeBadge(mod) {
  if (!mod.nativeRuntime) {
    return "";
  }
  const errorPhases = new Set(["invalid", "missing", "blocked", "incompatible", "failed"]);
  const warningPhases = new Set(["selection-required", "approval-required"]);
  const className = errorPhases.has(mod.nativeRuntime.phase)
    ? "nativeError"
    : warningPhases.has(mod.nativeRuntime.phase) || !mod.nativeRuntime.verified
      ? "nativeCommunity"
      : "native";
  const label = escapeHtml(mod.nativeRuntime.label || "Native runtime");
  return `<span class="nativeStateBadge ${className}" title="${escapeHtml(mod.nativeRuntime.message || "Native runtime mod")}" aria-label="${label}">N</span>`;
}

function renderNativeRuntime(runtime) {
  const value = runtime || { phase: "idle", label: "Idle", message: "No active native mods" };
  nativeRuntimeState.textContent = value.label || "Idle";
  nativeRuntimeState.title = value.message || "";
  nativeRuntimeState.style.color = ["blocked", "failed", "incompatible"].includes(value.phase)
    ? "var(--danger)"
    : value.phase === "loaded"
      ? "var(--ok)"
      : "var(--accent)";
}

function showModTooltip(mod, anchorElement) {
  const rect = anchorElement.getBoundingClientRect();
  window.bellwrightMods
    .showTooltip({
      mod,
      anchorRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    })
    .catch(() => {});
}

function hideModTooltip() {
  window.bellwrightMods.hideTooltip().catch(() => {});
}

async function loadState() {
  try {
    setBusy(true);
    hideModTooltip();
    const nativeRevisionAtStart = nativeRuntimeRevision;
    const nextState = await window.bellwrightMods.getState();
    if (nativeRuntimeRevision !== nativeRevisionAtStart && latestNativeRuntime) {
      mergeNativeRuntimeIntoState(nextState, latestNativeRuntime);
    } else {
      latestNativeRuntime = nextState.nativeRuntime;
    }
    state = nextState;
    render();
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setBusy(false);
  }
}

async function flushPendingGameRunningState() {
  if (busy || gameStateRefreshRunning || pendingGameRunningState === null) {
    return;
  }

  gameStateRefreshRunning = true;
  try {
    while (!busy && pendingGameRunningState !== null) {
      const gameRunning = pendingGameRunningState;
      pendingGameRunningState = null;
      if (!state || gameRunning !== state.gameRunning) {
        await loadState();
      }
    }
  } finally {
    gameStateRefreshRunning = false;
    if (!busy && pendingGameRunningState !== null) {
      queueMicrotask(flushPendingGameRunningState);
    }
  }
}

function handleGameRunningChanged(gameRunning) {
  pendingGameRunningState = Boolean(gameRunning);
  flushPendingGameRunningState();
}

function mergeNativeRuntimeIntoState(targetState, runtime) {
  targetState.nativeRuntime = runtime;
  const runtimeById = new Map((runtime?.mods || []).map((mod) => [mod.identity || mod.id, mod]));
  for (const mod of targetState.mods || []) {
    const runtimeKey = mod.nativeRuntime?.identity || mod.nativeRuntime?.id;
    if (runtimeKey && runtimeById.has(runtimeKey)) {
      mod.nativeRuntime = { ...mod.nativeRuntime, ...runtimeById.get(runtimeKey) };
    }
  }
}

function handleNativeRuntimeChanged(runtime) {
  latestNativeRuntime = runtime;
  nativeRuntimeRevision += 1;
  if (!supports("nativeRuntime")) {
    return;
  }
  if (state) {
    mergeNativeRuntimeIntoState(state, runtime);
    render();
    return;
  }
  renderNativeRuntime(runtime);
}

function renderLauncherUpdateAvailability(result = null) {
  const updateAvailable = launcherUpdateSupported && result?.status === "available";
  const latestVersion = updateAvailable ? String(result.latestVersion || "").trim() : "";
  updateButton.classList.toggle("updateAvailable", updateAvailable);
  updateAvailabilityBadge.hidden = !updateAvailable;

  if (updateAvailable) {
    const versionLabel = latestVersion ? ` v${latestVersion}` : "";
    updateButton.title = `Update${versionLabel} is available - click to install`;
    updateButton.setAttribute("aria-label", `Launcher update${versionLabel} is available`);
  } else if (launcherUpdateSupported) {
    updateButton.title = `Check for updates from ${launcherUpdateRepo}`;
    updateButton.setAttribute("aria-label", "Check for launcher updates");
  } else {
    updateButton.title = "Updates are applied from the packaged launcher";
    updateButton.setAttribute("aria-label", "Launcher updates require the packaged application");
  }
}

async function checkLauncherUpdateAvailability() {
  if (!launcherUpdateSupported) {
    renderLauncherUpdateAvailability();
    return;
  }

  try {
    const result = await window.bellwrightMods.checkLauncherUpdate();
    renderLauncherUpdateAvailability(result);
  } catch {
    // A background network failure means the update state is unknown, not available.
    renderLauncherUpdateAvailability();
  }
}

async function loadAppInfo() {
  try {
    const appInfo = await window.bellwrightMods.getAppInfo();
    aboutMaker.textContent = appInfo.maker || "ExcelsiorOne";
    appVersion.textContent = `v${appInfo.version || "0.1.0"}`;
    donateButton.disabled = !appInfo.donateUrl;
    donateButton.title = appInfo.donateUrl ? "Support ExcelsiorOne" : "Ko-fi link is not configured";
    discordButton.disabled = !appInfo.discordUrl;
    discordButton.title = appInfo.discordUrl ? "Join the Bellwright Discord section" : "Discord link is not configured";
    launcherUpdateSupported = Boolean(appInfo.updateSupported);
    launcherUpdateRepo = appInfo.updateRepo || "GitHub";
    renderLauncherUpdateAvailability();
    void checkLauncherUpdateAvailability();
  } catch (error) {
    showToast(error.message || String(error), true);
  }
}

function getSelectedPreset() {
  return presets.find((preset) => preset.id === presetSelect.value) || null;
}

function renderPresets(selectedId = presetSelect.value) {
  presetSelect.innerHTML = "";

  if (presets.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No presets";
    presetSelect.appendChild(option);
  } else {
    for (const preset of presets) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = `${preset.name} (${preset.activeCount})`;
      presetSelect.appendChild(option);
    }
    presetSelect.value = presets.some((preset) => preset.id === selectedId) ? selectedId : presets[0].id;
  }

  setBusy(busy);
}

async function loadPresets(selectedId = presetSelect.value) {
  if (!supports("presets")) {
    presets = [];
    renderPresets();
    return;
  }
  try {
    presets = await window.bellwrightMods.listPresets();
    renderPresets(selectedId);
  } catch (error) {
    showToast(error.message || String(error), true);
  }
}

function resetSharePreview() {
  inspectedShareCode = null;
  sharePreview.hidden = true;
  shareImportButton.hidden = true;
  shareModList.innerHTML = "";
}

function openShareImportModal() {
  shareCodeInput.value = "";
  resetSharePreview();
  shareModalBackdrop.hidden = false;
  requestAnimationFrame(() => shareCodeInput.focus());
}

function closeShareImportModal() {
  shareModalBackdrop.hidden = true;
  shareCodeInput.value = "";
  resetSharePreview();
}

function setShareModalBusy(value) {
  shareCodeInput.disabled = value;
  sharePreviewButton.disabled = value;
  shareImportButton.disabled = value;
  shareModalCancelButton.disabled = value;
  shareModalCloseButton.disabled = value;
}

function getSharedModStatus(mod) {
  if (!mod.installed) {
    return mod.source === "workshop" ? "Workshop missing" : "Local missing";
  }
  return mod.status === "active" ? "Active" : "Available";
}

function renderSharePreview(inspection) {
  sharePreviewName.textContent = inspection.name;
  sharePreviewCounts.textContent = `${inspection.activeCount} mod${inspection.activeCount === 1 ? "" : "s"} · ${inspection.installedCount} installed`;
  const missingCount = inspection.missingWorkshopCount + inspection.missingLocalCount;
  sharePreviewWarning.hidden = missingCount === 0;
  sharePreviewWarning.textContent = missingCount ? `${missingCount} missing` : "";
  shareModList.innerHTML = "";

  for (const mod of inspection.mods) {
    const row = document.createElement("li");
    row.className = "shareModRow";

    const order = document.createElement("span");
    order.className = "shareModOrder";
    order.textContent = String(mod.order).padStart(2, "0");

    const identity = document.createElement("div");
    identity.className = "shareModIdentity";
    const title = document.createElement("strong");
    title.textContent = mod.title;
    const modName = document.createElement("span");
    modName.textContent = mod.modName;
    identity.append(title, modName);

    const status = document.createElement("span");
    status.className = `shareModStatus${mod.installed ? "" : " missing"}`;
    status.textContent = getSharedModStatus(mod);

    row.append(order, identity, status);
    if (!mod.installed && mod.source === "workshop" && mod.workshopId) {
      const workshopButton = document.createElement("button");
      workshopButton.className = "openWorkshopButton";
      workshopButton.type = "button";
      workshopButton.title = "Open in Steam Workshop";
      workshopButton.setAttribute("aria-label", `Open ${mod.title} in Steam Workshop`);
      workshopButton.innerHTML = icons.external;
      workshopButton.addEventListener("click", async () => {
        try {
          workshopButton.disabled = true;
          await window.bellwrightMods.openWorkshopItem(mod.workshopId);
        } catch (error) {
          showToast(error.message || String(error), true);
        } finally {
          workshopButton.disabled = false;
        }
      });
      row.appendChild(workshopButton);
    }
    shareModList.appendChild(row);
  }

  sharePreview.hidden = false;
  shareImportButton.hidden = false;
}

async function previewSharedPreset() {
  const code = shareCodeInput.value.trim();
  if (!code) {
    showToast(`Paste a ${currentGame().id === "warhammer3" ? "EX1W3" : "BWL1"} preset code first.`, true);
    shareCodeInput.focus();
    return;
  }

  try {
    setShareModalBusy(true);
    const inspection = await window.bellwrightMods.inspectPresetShareCode(code);
    inspectedShareCode = code;
    renderSharePreview(inspection);
  } catch (error) {
    resetSharePreview();
    showToast(error.message || String(error), true);
  } finally {
    setShareModalBusy(false);
  }
}

async function importSharedPreset() {
  const code = shareCodeInput.value.trim();
  if (!inspectedShareCode || inspectedShareCode !== code) {
    await previewSharedPreset();
    return;
  }

  try {
    setShareModalBusy(true);
    const result = await window.bellwrightMods.importPresetShareCode(code);
    presets = result.presets || [];
    renderPresets(result.preset?.id);
    closeShareImportModal();
    showToast(`${result.preset?.name || "Shared preset"} imported.`);
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setShareModalBusy(false);
  }
}

async function copySelectedPresetShareCode() {
  if (busy) {
    return;
  }
  const preset = getSelectedPreset();
  if (!preset) {
    showToast("Choose a preset first.", true);
    return;
  }

  try {
    setBusy(true);
    await window.bellwrightMods.copyPresetShareCode(preset.id);
    showToast(`${preset.name} share code copied.`);
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setBusy(false);
  }
}

function render() {
  if (!state) {
    return;
  }

  const game = currentGame();
  const labels = game.labels || {};
  const query = searchInput.value.trim().toLowerCase();
  const activeMods = state.mods.filter((mod) => mod.status === "active");
  const availableMods = state.mods.filter((mod) => mod.status === "disabled");
  const workshopMods = state.mods.filter((mod) => mod.source === "workshop");

  document.documentElement.style.setProperty("--accent", game.accent || "#d9b45f");
  document.documentElement.style.setProperty("--accent-2", game.accentSecondary || "#7fb0a4");
  gameMark.dataset.gameId = game.id;
  gameMark.innerHTML = gameLogoHtml(game);
  bindLogoFallbacks(gameMark);
  gameHeading.textContent = game.launcherTitle;
  availableColumnTitle.textContent = labels.available || "Available";
  availableColumnHint.textContent = labels.availableHint || "Installed but not active";
  activeColumnTitle.textContent = labels.active || "Active";
  activeColumnHint.textContent = labels.activeHint || "Loaded by Bellwright";
  searchInput.placeholder = labels.searchPlaceholder || "Search mods";
  folderButton.title = labels.folderTitle || "Open mods folder";
  folderButton.setAttribute("aria-label", folderButton.title);
  launchButton.lastChild.textContent = ` ${labels.launch || "Launch"}`;
  launchButton.title = state.gameRunning ? `${game.label} is already running` : `Launch ${game.label}`;
  continueButton.hidden = !supports("continueFromLastSave");
  continueButton.lastChild.textContent = ` ${labels.continueFromLastSave || "Continue from last save"}`;
  continueButton.title = state.gameRunning
    ? `${game.label} is already running`
    : state.latestSave
      ? `Continue ${state.latestSave.name}`
      : `No ${game.label} saves found`;
  shareCodeInput.placeholder = game.id === "warhammer3" ? "Paste EX1W3 preset code" : "Paste BWL1 preset code";
  shareCodeInput.setAttribute("aria-label", `${game.label} preset share code`);
  pathLine.textContent = state.pathSummary || `Local: ${state.modsRoot} | Workshop: ${state.workshopRoot}`;
  gameState.textContent = state.gameRunning ? "Running" : "Closed";
  gameState.style.color = state.gameRunning ? "var(--danger)" : "var(--ok)";
  activeCount.textContent = activeMods.length;
  availableCount.textContent = availableMods.length;
  workshopCount.textContent = workshopMods.length;
  const nativeRuntimeSupported = supports("nativeRuntime");
  statusStrip.classList.toggle("statusStripFourColumns", !nativeRuntimeSupported);
  nativeRuntimeStatusItem.hidden = !nativeRuntimeSupported;
  renderNativeRuntime(state.nativeRuntime);

  const visibleActive = filterMods(activeMods, query);
  const visibleAvailable = filterMods(availableMods, query);

  activeColumnCount.textContent = visibleActive.length;
  availableColumnCount.textContent = visibleAvailable.length;

  renderColumn(activeList, activeEmpty, visibleActive);
  renderColumn(availableList, availableEmpty, visibleAvailable);
  availableEmpty.textContent = game.id === "warhammer3" ? "All discovered Workshop mods are selected" : "No inactive mods";
  activeEmpty.textContent = game.id === "warhammer3" ? "No selected mods found in used_mods.txt" : "Drop mods here to activate";
  renderGameMenu();
  setBusy(busy);
}

function filterMods(mods, query) {
  if (!query) {
    return mods;
  }
  return mods.filter((mod) => {
    const haystack =
      `${mod.title} ${mod.folderName} ${mod.displayFolderName} ${mod.modName || ""} ${mod.description} ${mod.author} ${mod.tag} ${mod.workshopId || ""} ${mod.steamId || ""}`.toLowerCase();
    return haystack.includes(query);
  });
}

function compareActiveOrder(left, right) {
  const leftOrder = Number.isInteger(left.loadOrderIndex) ? left.loadOrderIndex : Number.MAX_SAFE_INTEGER;
  const rightOrder = Number.isInteger(right.loadOrderIndex) ? right.loadOrderIndex : Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
}

function getOrderedActiveMods() {
  return [...(state?.mods || []).filter((mod) => mod.status === "active")].sort(compareActiveOrder);
}

function clearDropIndicator() {
  document.querySelectorAll(".modCard.dropBefore, .modCard.dropAfter").forEach((card) => {
    card.classList.remove("dropBefore", "dropAfter");
  });
}

function getDropPlacement(event, column) {
  const cards = [...column.querySelectorAll(".modCard:not(.dragging)")];
  if (!cards.length) {
    return null;
  }

  const directCard = event.target.closest?.(".modCard:not(.dragging)");
  if (directCard && column.contains(directCard)) {
    const bounds = directCard.getBoundingClientRect();
    return {
      referenceKey: directCard.dataset.key,
      position: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after",
      card: directCard
    };
  }

  for (const card of cards) {
    const bounds = card.getBoundingClientRect();
    if (event.clientY < bounds.top + bounds.height / 2) {
      return { referenceKey: card.dataset.key, position: "before", card };
    }
  }
  const lastCard = cards[cards.length - 1];
  return { referenceKey: lastCard.dataset.key, position: "after", card: lastCard };
}

function showDropIndicator(placement) {
  clearDropIndicator();
  placement?.card?.classList.add(placement.position === "before" ? "dropBefore" : "dropAfter");
}

function renderColumn(list, empty, mods) {
  list.innerHTML = "";
  empty.hidden = mods.length !== 0;
  const orderedActiveMods = getOrderedActiveMods();
  const activeIndexByKey = new Map(orderedActiveMods.map((mod, index) => [modKey(mod), index]));

  for (const mod of mods) {
    const card = document.createElement("article");
    card.className = "modCard";
    card.draggable = !(busy || state.gameRunning);
    card.dataset.folder = mod.folderName;
    card.dataset.source = mod.source;
    card.dataset.status = mod.status;
    card.dataset.key = modKey(mod);
    card.tabIndex = 0;

    const inPlaceGame = currentGame().id === "warhammer3";
    const toggleAllowed = !(inPlaceGame && mod.source !== "workshop");
    const actionLabel = toggleAllowed ? (mod.status === "active" ? "Deactivate" : "Activate") : "Order only";
    const actionClass = mod.status === "active" ? "disable" : "enable";
    const actionIcon = mod.status === "active" ? icons.pause : icons.power;
    const status = getStatusLabel(mod);
    const nativeBadge = getNativeBadge(mod);
    const activeIndex = activeIndexByKey.get(modKey(mod));
    const loadOrderText = Number.isInteger(activeIndex) ? String(activeIndex + 1).padStart(2, "0") : "";
    const conflictCount = mod.status === "active" ? mod.activeConflictCount : mod.conflictCount;
    const conflictClass = mod.conflictSeverity ? ` ${mod.conflictSeverity}` : "";
    const conflictBadge = conflictCount
      ? `<button class="conflictBadge${conflictClass}" type="button" aria-label="${mod.status === "active" ? "Active conflict" : "Potential conflict"}">${icons.alert}<span>${conflictCount}</span></button>`
      : "";
    const orderControls =
      mod.status === "active" && supports("loadOrder")
        ? `<div class="orderControls" aria-label="Load priority; number 1 is highest">
            <button class="orderButton" type="button" data-direction="-1" data-blocked="${activeIndex <= 0}" title="Move up — higher priority" aria-label="Move up to higher priority">${icons.up}</button>
            <button class="orderButton" type="button" data-direction="1" data-blocked="${activeIndex >= orderedActiveMods.length - 1}" title="Move down — lower priority" aria-label="Move down to lower priority">${icons.down}</button>
          </div>`
        : "";
    const settingsGroup = mod.launcherSettings?.groups?.[0];
    const selectedSetting = settingsGroup?.options.find((option) => option.id === settingsGroup.selectedOption);
    const settingsButton = settingsGroup
      ? `<button class="settingsButton" type="button" title="Mod settings: ${escapeHtml(selectedSetting?.label || settingsGroup.selectedOption)}" aria-label="Open mod settings">${icons.settings}</button>`
      : "";
    const note = mod.nativeRuntime && ["invalid", "missing", "blocked", "incompatible", "selection-required", "approval-required", "failed"].includes(mod.nativeRuntime.phase)
      ? mod.nativeRuntime.message
      : state.gameRunning
        ? "Close game first"
      : mod.activeConflictCount
        ? `${mod.activeConflictCount} active conflict${mod.activeConflictCount === 1 ? "" : "s"}`
      : mod.source === "workshop"
        ? inPlaceGame
          ? "Workshop content stays in place"
          : "Steam may restore on update"
        : inPlaceGame
          ? "Local pack: order only"
          : "";

    card.innerHTML = `
      <div class="modHeader">
        ${loadOrderText ? `<span class="loadOrderBadge" title="Priority #${activeIndex + 1}${activeIndex === 0 ? " — highest" : ""}">${loadOrderText}</span>` : ""}
        <div class="modTitle">
          <h2>${escapeHtml(mod.title)}</h2>
          <div class="folderName">${escapeHtml(mod.modName || mod.displayFolderName || mod.folderName)}</div>
        </div>
      </div>
      <div class="modBadges">
        ${conflictBadge}
        ${nativeBadge}
        ${settingsButton}
        <span class="pill ${status.className}">${status.text}</span>
      </div>
      <div class="cardActions">
        ${orderControls}
        <button class="toggleButton ${actionClass}" data-blocked="${!toggleAllowed}" title="${toggleAllowed ? actionLabel : "Local data packs can only be reordered"}">
          ${actionIcon}
          <span>${actionLabel}</span>
        </button>
        <span class="note">${escapeHtml(note)}</span>
      </div>
    `;

    card.addEventListener("mouseenter", () => showModTooltip(mod, card));
    card.addEventListener("mouseleave", () => {
      hideModTooltip();
      scheduleConflictTooltipHide();
    });
    card.addEventListener("focus", () => showModTooltip(mod, card));
    card.addEventListener("blur", () => {
      hideModTooltip();
      scheduleConflictTooltipHide();
    });

    const conflictBadgeElement = card.querySelector(".conflictBadge");
    if (conflictBadgeElement) {
      conflictBadgeElement.addEventListener("mouseenter", (event) => {
        event.stopPropagation();
        hideModTooltip();
        showConflictTooltip(mod, event);
      });
      conflictBadgeElement.addEventListener("mouseleave", scheduleConflictTooltipHide);
      conflictBadgeElement.addEventListener("focus", (event) => {
        hideModTooltip();
        showConflictTooltip(mod, event);
      });
      conflictBadgeElement.addEventListener("blur", scheduleConflictTooltipHide);
    }

    card.addEventListener("dragstart", (event) => {
      if (busy || !supports("activation") || state.gameRunning) {
        event.preventDefault();
        return;
      }
      hideModTooltip();
      hideConflictTooltip();
      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          folderName: mod.folderName,
          source: mod.source,
          sourceRoot: mod.sourceRoot,
          status: mod.status
        })
      );
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      clearDropIndicator();
      dropColumns.forEach((column) => column.classList.remove("dragOver"));
    });

    const button = card.querySelector(".toggleButton");
    button.disabled = busy || state.gameRunning || !supports("activation") || !toggleAllowed;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!toggleAllowed) {
        return;
      }
      moveMod(mod, mod.status === "active" ? "available" : "active");
    });

    const settingsElement = card.querySelector(".settingsButton");
    if (settingsElement) {
      settingsElement.disabled = busy;
      settingsElement.addEventListener("click", (event) => {
        event.stopPropagation();
        openSettingsModal(mod);
      });
    }

    card.querySelectorAll(".orderButton").forEach((orderButton) => {
      orderButton.disabled = busy || state.gameRunning || orderButton.dataset.blocked === "true";
      orderButton.addEventListener("click", (event) => {
        event.stopPropagation();
        moveLoadOrder(mod, Number(orderButton.dataset.direction));
      });
    });

    list.appendChild(card);
  }
}

async function applyActivePlacement(mod, placement) {
  const currentKeys = getOrderedActiveMods().map(modKey);
  const nextKeys = window.dragOrder.reorderKeys(currentKeys, modKey(mod), placement);
  if (currentKeys.every((key, index) => key === nextKeys[index])) {
    return state;
  }
  return window.bellwrightMods.setLoadOrder({ keys: nextKeys });
}

async function moveMod(mod, targetColumn, placement = null) {
  if (busy) {
    return;
  }
  hideModTooltip();
  if (currentGame().id === "warhammer3" && mod.source !== "workshop" && targetColumn === "available") {
    showToast("Local data packs stay selected because they cannot be rediscovered safely after removal.", true);
    return;
  }
  if (state?.gameRunning) {
    showToast(`Close ${currentGame().label} before changing enabled mods.`, true);
    return;
  }
  if (targetColumn === "available" && mod.status === "disabled") {
    return;
  }

  try {
    setBusy(true);
    if (targetColumn === "active") {
      if (mod.status !== "active") {
        state = await window.bellwrightMods.enable({
          folderName: mod.folderName,
          sourceRoot: mod.sourceRoot,
          source: mod.source
        });
      }
      state = await applyActivePlacement(mod, placement);
      showToast(mod.status === "active" ? "Load order updated." : `${mod.title} activated and positioned.`);
    } else {
      state = await window.bellwrightMods.disable({
        folderName: mod.folderName,
        source: mod.source
      });
      showToast(`${mod.title} deactivated.`);
    }
    render();
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setBusy(false);
  }
}

async function moveLoadOrder(mod, direction) {
  if (busy || !direction) {
    return;
  }
  hideModTooltip();
  if (state?.gameRunning) {
    showToast(`Close ${currentGame().label} before changing load order.`, true);
    return;
  }

  const activeMods = getOrderedActiveMods();
  const currentIndex = activeMods.findIndex((candidate) => modKey(candidate) === modKey(mod));
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= activeMods.length) {
    return;
  }

  const nextOrder = [...activeMods];
  [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];

  try {
    setBusy(true);
    state = await window.bellwrightMods.setLoadOrder({ keys: nextOrder.map(modKey) });
    render();
    showToast("Load order updated.");
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setBusy(false);
  }
}

function modKey(mod) {
  return modKeyFromParts(mod.source, mod.folderName);
}

function modKeyFromParts(source, folderName) {
  return `${source}:${folderName}`;
}

function getSeverityText(severity) {
  if (severity === "high") {
    return "High";
  }
  if (severity === "medium") {
    return "Warning";
  }
  return "Notice";
}

function formatOperations(operations) {
  return (operations || [])
    .map((operation) => operation.charAt(0).toUpperCase() + operation.slice(1))
    .join(", ");
}

function getConflictsForMod(mod) {
  const conflicts = Array.isArray(state?.conflicts) ? state.conflicts : [];
  const key = modKey(mod);
  return conflicts.filter((conflict) => conflict.mods?.some((conflictMod) => conflictMod.key === key));
}

function getOtherConflictMod(conflict, mod) {
  const key = modKey(mod);
  return conflict.mods?.find((conflictMod) => conflictMod.key !== key) || null;
}

function getConflictAssetLines(conflict, limit = 3) {
  const assets = conflict.assets || [];
  const lines = assets.slice(0, limit).map((asset) => {
    const operations = [...new Set([...(asset.leftOperations || []), ...(asset.rightOperations || [])])];
    return `<li><strong>${escapeHtml(asset.path)}</strong><span>${escapeHtml(formatOperations(operations))}</span></li>`;
  });
  if (conflict.assetCount > limit) {
    lines.push(`<li class="moreAssets">+${conflict.assetCount - limit} more shared asset${conflict.assetCount - limit === 1 ? "" : "s"}</li>`);
  }
  return lines.join("") || "<li>No shared asset path listed</li>";
}

function positionConflictTooltip(event) {
  if (conflictTooltip.hidden) {
    return;
  }

  const sourceRect = event.currentTarget?.getBoundingClientRect?.();
  const baseX = Number.isFinite(event.clientX) && event.clientX > 0 ? event.clientX : sourceRect?.right || 16;
  const baseY = Number.isFinite(event.clientY) && event.clientY > 0 ? event.clientY : sourceRect?.top || 16;
  const margin = 14;
  const rect = conflictTooltip.getBoundingClientRect();
  let left = baseX + margin;
  let top = baseY + margin;

  if (left + rect.width > window.innerWidth - margin) {
    left = Math.max(margin, baseX - rect.width - margin);
  }
  if (top + rect.height > window.innerHeight - margin) {
    top = Math.max(margin, baseY - rect.height - margin);
  }

  conflictTooltip.style.left = `${Math.round(left)}px`;
  conflictTooltip.style.top = `${Math.round(top)}px`;
}

function showConflictTooltip(mod, event) {
  cancelConflictTooltipHide();
  const conflicts = getConflictsForMod(mod);
  if (!conflicts.length) {
    hideConflictTooltip();
    return;
  }

  const rows = conflicts.slice(0, 3).map((conflict) => {
    const other = getOtherConflictMod(conflict, mod);
    const isPackFileOverlap = conflict.kind === "pack-file-overlap";
    const winner = conflict.winner
      ? `<span>${isPackFileOverlap ? "Priority winner" : "Winner now"}: ${escapeHtml(conflict.winner.title)}</span>`
      : "";
    const resolutionNote = conflict.resolutionNote
      ? `<span>${escapeHtml(conflict.resolutionNote)}</span>`
      : "";
    const duplicate = conflict.duplicateInstall ? "<span>Duplicate install</span>" : "";
    return `<section class="conflictTooltipItem ${conflict.severity || "low"}">
      <div class="conflictTooltipTitle">
        <span class="severity ${conflict.severity || "low"}">${getSeverityText(conflict.severity)}</span>
        <strong>${escapeHtml(other?.title || "Unknown mod")}</strong>
      </div>
      <div class="conflictTooltipMeta">
        <span>${isPackFileOverlap ? (conflict.bothActive ? "Active file overlap" : "Potential file overlap") : (conflict.bothActive ? "Active conflict" : "Potential conflict")}</span>
        <span>${conflict.assetCount} shared ${isPackFileOverlap ? "internal file" : "asset"}${conflict.assetCount === 1 ? "" : "s"}</span>
        ${winner}
        ${resolutionNote}
        ${duplicate}
      </div>
      <ul>${getConflictAssetLines(conflict)}</ul>
    </section>`;
  });
  if (conflicts.length > 3) {
    rows.push(`<p class="conflictTooltipMore">+${conflicts.length - 3} more conflict${conflicts.length - 3 === 1 ? "" : "s"}</p>`);
  }

  conflictTooltip.innerHTML = `<div class="conflictTooltipHeader">Conflicts for ${escapeHtml(mod.title)}</div>${rows.join("")}`;
  conflictTooltip.hidden = false;
  positionConflictTooltip(event);
}

function hideConflictTooltip() {
  cancelConflictTooltipHide();
  conflictTooltip.hidden = true;
}

function cancelConflictTooltipHide() {
  if (conflictTooltipHideTimer) {
    clearTimeout(conflictTooltipHideTimer);
    conflictTooltipHideTimer = null;
  }
}

function scheduleConflictTooltipHide() {
  cancelConflictTooltipHide();
  conflictTooltipHideTimer = setTimeout(() => {
    conflictTooltip.hidden = true;
    conflictTooltipHideTimer = null;
  }, 180);
}

conflictTooltip.addEventListener("mouseenter", cancelConflictTooltipHide);
conflictTooltip.addEventListener("mouseleave", scheduleConflictTooltipHide);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function findModByPayload(payload) {
  return state?.mods.find((mod) => mod.folderName === payload.folderName && mod.source === payload.source) || null;
}

dropColumns.forEach((column) => {
  column.addEventListener("dragover", (event) => {
    if (busy || !supports("activation") || state?.gameRunning) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    column.classList.add("dragOver");
    showDropIndicator(column.dataset.dropTarget === "active" ? getDropPlacement(event, column) : null);
  });

  column.addEventListener("dragleave", (event) => {
    if (event.relatedTarget && column.contains(event.relatedTarget)) {
      return;
    }
    column.classList.remove("dragOver");
    clearDropIndicator();
  });

  column.addEventListener("drop", async (event) => {
    event.preventDefault();
    const placement = column.dataset.dropTarget === "active" ? getDropPlacement(event, column) : null;
    column.classList.remove("dragOver");
    clearDropIndicator();
    let payload;
    try {
      payload = JSON.parse(event.dataTransfer.getData("application/json"));
    } catch {
      return;
    }
    const mod = findModByPayload(payload);
    if (!mod) {
      return;
    }
    await moveMod(mod, column.dataset.dropTarget, placement);
  });
});

modalConfirmButton.addEventListener("click", () => {
  if (!pendingModal) {
    return;
  }
  closeModal(pendingModal.input ? modalInput.value : true);
});

modalCancelButton.addEventListener("click", () => {
  if (!pendingModal) {
    return;
  }
  closeModal(pendingModal.input ? null : false);
});

modalBackdrop.addEventListener("click", (event) => {
  if (event.target !== modalBackdrop || !pendingModal) {
    return;
  }
  closeModal(pendingModal.input ? null : false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !shareModalBackdrop.hidden) {
    event.preventDefault();
    closeShareImportModal();
    return;
  }
  if (!pendingModal) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeModal(pendingModal.input ? null : false);
  } else if (event.key === "Enter") {
    event.preventDefault();
    closeModal(pendingModal.input ? modalInput.value : true);
  }
});

async function saveCurrentPreset() {
  if (busy) {
    return;
  }
  const selectedPreset = getSelectedPreset();
  const defaultName = selectedPreset?.name || "";
  const name = await askPresetName(defaultName);
  if (name === null) {
    return;
  }
  const trimmedName = name.trim().replace(/\s+/g, " ");
  if (!trimmedName) {
    showToast("Preset name is required.", true);
    return;
  }

  try {
    setBusy(true);
    const result = await window.bellwrightMods.savePreset({ name: trimmedName });
    presets = result.presets || [];
    renderPresets(result.preset?.id);
    showToast(`${result.preset?.name || trimmedName} saved.`);
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setBusy(false);
  }
}

async function loadSelectedPreset() {
  if (busy) {
    return;
  }
  if (state?.gameRunning) {
    showToast(`Close ${currentGame().label} before loading a preset.`, true);
    return;
  }

  const preset = getSelectedPreset();
  if (!preset) {
    showToast("Choose a preset first.", true);
    return;
  }
  if (!(await askConfirm("Load preset", `Load "${preset.name}"? Current active mods will be changed.`, "Load"))) {
    return;
  }

  try {
    setBusy(true);
    const result = await window.bellwrightMods.loadPreset(preset.id);
    state = result.state;
    render();
    const missingText = result.missing?.length ? ` ${result.missing.length} saved mod(s) were not found.` : "";
    const orderText = result.orderChanged ? " Load order applied." : "";
    showToast(
      `${preset.name} loaded. ${result.changed} mod change(s) applied.${orderText}${missingText}`.trim(),
      Boolean(result.missing?.length)
    );
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setBusy(false);
  }
}

async function deleteSelectedPreset() {
  if (busy) {
    return;
  }
  const preset = getSelectedPreset();
  if (!preset) {
    showToast("Choose a preset first.", true);
    return;
  }
  if (!(await askConfirm("Delete preset", `Delete "${preset.name}"?`, "Delete"))) {
    return;
  }

  try {
    setBusy(true);
    presets = await window.bellwrightMods.deletePreset(preset.id);
    renderPresets();
    showToast(`${preset.name} deleted.`);
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setBusy(false);
  }
}

async function updateLauncher() {
  if (busy) {
    return;
  }

  try {
    setBusy(true);
    showUpdateProgress({ phase: "check", percent: 0, message: "Checking GitHub release..." });
    const result = await window.bellwrightMods.updateLauncher();
    if (result.status === "up-to-date") {
      renderLauncherUpdateAvailability(result);
      showToast("Launcher is up to date.");
      hideUpdateProgressSoon();
    } else if (result.status === "cancelled") {
      showToast("Update cancelled. Downloaded files were removed.");
      hideUpdateProgressSoon();
    }
  } catch (error) {
    showToast(error.message || String(error), true);
    hideUpdateProgressSoon();
  } finally {
    setBusy(false);
  }
}

refreshButton.addEventListener("click", loadState);

presetSelect.addEventListener("change", () => setBusy(busy));

savePresetButton.addEventListener("click", saveCurrentPreset);

loadPresetButton.addEventListener("click", loadSelectedPreset);

sharePresetButton.addEventListener("click", copySelectedPresetShareCode);

importPresetButton.addEventListener("click", openShareImportModal);

deletePresetButton.addEventListener("click", deleteSelectedPreset);

shareModalCloseButton.addEventListener("click", closeShareImportModal);
shareModalCancelButton.addEventListener("click", closeShareImportModal);
sharePreviewButton.addEventListener("click", previewSharedPreset);
shareImportButton.addEventListener("click", importSharedPreset);
shareCodeInput.addEventListener("input", resetSharePreview);
shareModalBackdrop.addEventListener("click", (event) => {
  if (event.target === shareModalBackdrop) {
    closeShareImportModal();
  }
});

settingsModalCloseButton.addEventListener("click", closeSettingsModal);
settingsModalCancelButton.addEventListener("click", closeSettingsModal);
settingsModalApplyButton.addEventListener("click", applySettingsModal);
settingsModalBackdrop.addEventListener("click", (event) => {
  if (event.target === settingsModalBackdrop) {
    closeSettingsModal();
  }
});

folderButton.addEventListener("click", async () => {
  if (!supports("openModsFolder")) {
    return;
  }
  try {
    await window.bellwrightMods.openModsFolder();
  } catch (error) {
    showToast(error.message || String(error), true);
  }
});

launchButton.addEventListener("click", async () => {
  if (!supports("launch")) {
    return;
  }
  if (state?.gameRunning) {
    showToast(`${currentGame().label} is already running.`, true);
    return;
  }
  try {
    await window.bellwrightMods.launchGame();
    showToast(currentGame().labels?.launchToast || "Launching game through Steam.");
    setTimeout(loadState, 2500);
  } catch (error) {
    showToast(error.message || String(error), true);
  }
});

continueButton.addEventListener("click", async () => {
  if (!supports("continueFromLastSave")) {
    return;
  }
  const game = currentGame();
  if (state?.gameRunning) {
    showToast(`${game.label} is already running.`, true);
    return;
  }
  if (!state?.latestSave) {
    showToast(`No ${game.label} save files were found.`, true);
    return;
  }
  try {
    setBusy(true);
    const result = await window.bellwrightMods.continueGame();
    showToast(result?.message || game.labels?.continueToast || `Continuing ${state.latestSave.name}.`);
    setTimeout(loadState, 2500);
  } catch (error) {
    showToast(error.message || String(error), true);
  } finally {
    setBusy(false);
  }
});

donateButton.addEventListener("click", async () => {
  if (donateButton.disabled) {
    return;
  }
  try {
    await window.bellwrightMods.openDonate();
  } catch (error) {
    showToast(error.message || String(error), true);
  }
});

discordButton.addEventListener("click", async () => {
  if (discordButton.disabled) {
    return;
  }
  try {
    await window.bellwrightMods.openDiscord();
  } catch (error) {
    showToast(error.message || String(error), true);
  }
});

updateButton.addEventListener("click", updateLauncher);

windowMinimizeButton.addEventListener("click", () => window.bellwrightMods.minimizeWindow());
windowCloseButton.addEventListener("click", () => window.bellwrightMods.closeWindow());
windowTitlebar.addEventListener("dblclick", (event) => {
  if (!event.target.closest(".windowControls, .gameSwitcher")) {
    window.bellwrightMods.toggleMaximizeWindow();
  }
});

gameSwitcherButton.addEventListener("click", () => {
  const isOpen = !gameSwitcherMenu.hidden;
  gameSwitcherMenu.hidden = isOpen;
  gameSwitcherButton.setAttribute("aria-expanded", String(!isOpen));
  if (!isOpen) {
    gameSwitcherMenu.querySelector("button")?.focus();
  }
});

document.addEventListener("click", (event) => {
  if (!gameSwitcher.contains(event.target)) {
    closeGameMenu();
  }
});

searchInput.addEventListener("input", render);

window.addEventListener("resize", () => {
  hideModTooltip();
});
window.addEventListener("scroll", hideModTooltip, true);

window.bellwrightMods.onUpdateProgress(showUpdateProgress);
window.bellwrightMods.onGameRunningChanged(handleGameRunningChanged);
window.bellwrightMods.onNativeRuntimeChanged(handleNativeRuntimeChanged);

async function initialize() {
  await loadAppInfo();
  await loadGames();
  await loadState();
  await loadPresets();
}

void initialize();
