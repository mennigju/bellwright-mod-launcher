const statusElement = document.querySelector("#status");
const titleElement = document.querySelector("#title");
const descriptionElement = document.querySelector("#description");
const thumbnailFrameElement = document.querySelector("#thumbnailFrame");
const thumbnailElement = document.querySelector("#thumbnail");
const thumbnailFallbackElement = document.querySelector("#thumbnailFallback");
const thumbnailFallbackTextElement = document.querySelector("#thumbnailFallbackText");
const sourceElement = document.querySelector("#source");
const folderElement = document.querySelector("#folder");
const authorElement = document.querySelector("#author");
const versionElement = document.querySelector("#version");
const packagesElement = document.querySelector("#packages");
const pathElement = document.querySelector("#path");
const steamPreviewUrlPattern = /^https:\/\/images\.steamusercontent\.com\/ugc\/\d+\/[a-f0-9]{40}\/$/i;
let thumbnailRenderToken = 0;

function isSafeThumbnailUrl(value) {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "file:" || steamPreviewUrlPattern.test(value);
  } catch {
    return false;
  }
}

function showThumbnailFallback(text) {
  thumbnailElement.hidden = true;
  thumbnailElement.removeAttribute("src");
  thumbnailFallbackTextElement.textContent = text;
  thumbnailFallbackElement.hidden = false;
  thumbnailFrameElement.classList.add("fallback");
}

function renderThumbnail(mod) {
  const token = ++thumbnailRenderToken;
  const thumbnail = mod?.thumbnail;
  if (!thumbnail || !isSafeThumbnailUrl(thumbnail.url)) {
    showThumbnailFallback("Workshop thumbnail unavailable");
    return;
  }

  thumbnailFrameElement.classList.add("fallback");
  thumbnailElement.hidden = true;
  thumbnailFallbackElement.hidden = false;
  thumbnailFallbackTextElement.textContent = "Loading Workshop thumbnail…";
  thumbnailElement.alt = `${mod.title || mod.folderName || "Mod"} Workshop thumbnail`;
  thumbnailElement.onload = () => {
    if (token !== thumbnailRenderToken) {
      return;
    }
    thumbnailFrameElement.classList.remove("fallback");
    thumbnailElement.hidden = false;
    thumbnailFallbackElement.hidden = true;
  };
  thumbnailElement.onerror = () => {
    if (token === thumbnailRenderToken) {
      showThumbnailFallback("Workshop thumbnail unavailable");
    }
  };
  thumbnailElement.src = thumbnail.url;
}

function getStatusLabel(mod) {
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

function render(mod) {
  const status = getStatusLabel(mod);
  statusElement.textContent = status.text;
  statusElement.className = `pill ${status.className}`;
  titleElement.textContent = mod.title || mod.folderName;
  renderThumbnail(mod);
  descriptionElement.textContent = mod.description || "No description in modinfo.json.";
  sourceElement.textContent = mod.workshopId ? `${mod.sourceLabel} #${mod.workshopId}` : mod.sourceLabel;
  folderElement.textContent = mod.displayFolderName || mod.folderName;
  authorElement.textContent = mod.author || "Unknown";
  versionElement.textContent = mod.version || "Not listed";
  packagesElement.textContent = String(mod.packageCount ?? 0);
  pathElement.textContent = mod.path || "";
}

window.bellwrightMods?.onTooltip(render);
window.__renderModTooltipForTest = render;
