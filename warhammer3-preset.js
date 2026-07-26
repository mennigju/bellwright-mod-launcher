function modKey(mod) {
  return `${mod?.source || "local"}:${mod?.folderName || ""}`;
}

function selectSavedPackFiles(candidate, savedMod) {
  const available = new Set(
    (candidate.availablePackFiles || candidate.packFiles || []).map((packName) => packName.toLowerCase())
  );
  const saved = (savedMod.packFiles || []).filter((packName) => available.has(packName.toLowerCase()));
  return saved.length ? saved : candidate.packFiles;
}

function selectionSignature(mod) {
  return `${modKey(mod)}|${(mod.packFiles || []).map((packName) => packName.toLowerCase()).join(",")}`;
}

function buildWarhammer3PresetSelection(state, preset) {
  const installedByKey = new Map(state.mods.map((mod) => [modKey(mod), mod]));
  const missing = preset.activeMods.filter((savedMod) => !installedByKey.has(modKey(savedMod)));
  if (missing.length) {
    return { missing, desiredMods: [], changed: 0, orderChanged: false };
  }

  const desiredMods = [];
  const desiredKeys = new Set();
  for (const savedMod of preset.activeMods) {
    const candidate = installedByKey.get(modKey(savedMod));
    if (!candidate || desiredKeys.has(modKey(candidate))) {
      continue;
    }
    desiredMods.push({
      ...candidate,
      packFiles: selectSavedPackFiles(candidate, savedMod)
    });
    desiredKeys.add(modKey(candidate));
  }

  for (const mod of state.mods.filter((candidate) => candidate.status === "active" && candidate.source === "local")) {
    if (!desiredKeys.has(modKey(mod))) {
      desiredMods.push(mod);
      desiredKeys.add(modKey(mod));
    }
  }

  const currentActive = state.mods.filter((mod) => mod.status === "active");
  const currentKeys = currentActive.map(modKey);
  const nextKeys = desiredMods.map(modKey);
  const currentKeySet = new Set(currentKeys);
  const nextKeySet = new Set(nextKeys);
  const changed =
    currentKeys.filter((key) => !nextKeySet.has(key)).length +
    nextKeys.filter((key) => !currentKeySet.has(key)).length;
  const orderChanged =
    currentActive.length !== desiredMods.length ||
    currentActive.some((mod, index) => selectionSignature(mod) !== selectionSignature(desiredMods[index]));

  return { missing, desiredMods, changed, orderChanged };
}

module.exports = {
  buildWarhammer3PresetSelection,
  modKey,
  selectionSignature,
  selectSavedPackFiles
};
