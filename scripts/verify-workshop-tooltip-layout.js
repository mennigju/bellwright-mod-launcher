const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");
const { createWorkshopThumbnailResolver } = require("../steam-workshop-thumbnails");

const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.resolve(projectRoot, "..", "_build", "LauncherLayoutTests");
const steamRoot = path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Steam");
let verificationStage = "startup";

function workshopFolder(appId, workshopId) {
  return path.join(steamRoot, "steamapps", "workshop", "content", appId, workshopId);
}

function modFixture({ title, workshopId, appId, thumbnail }) {
  return {
    folderName: workshopId,
    displayFolderName: workshopId,
    title,
    description: `Representative ${appId === "1142710" ? "WARHAMMER III" : "Bellwright"} Workshop mod.`,
    source: "workshop",
    sourceLabel: "Steam Workshop",
    workshopId,
    status: "active",
    author: "Workshop author",
    version: "1.0",
    packageCount: 1,
    path: workshopFolder(appId, workshopId),
    thumbnail
  };
}

async function waitForImage(window, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const state = await window.webContents.executeJavaScript(`({
      loaded: !document.querySelector("#thumbnail").hidden && document.querySelector("#thumbnail").naturalWidth > 0,
      failed: document.querySelector("#thumbnailFallbackText").textContent === "Workshop thumbnail unavailable"
    })`);
    if (state.loaded || state.failed) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return { loaded: false, failed: false };
}

app.whenReady().then(async () => {
  verificationStage = "resolving local metadata";
  const resolver = createWorkshopThumbnailResolver({ fs, steamRoots: [steamRoot] });
  const samples = [
    {
      name: "warhammer3",
      appId: "1142710",
      workshopId: "2789845079",
      title: "Double Skill Points"
    },
    {
      name: "bellwright",
      appId: "1812450",
      workshopId: "3762938235",
      title: "Settlement Immigration"
    }
  ];

  const window = new BrowserWindow({
    width: 380,
    height: 568,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await window.loadFile(path.join(projectRoot, "renderer", "tooltip.html"));
  window.showInactive();
  await new Promise((resolve) => setTimeout(resolve, 100));
  verificationStage = "loaded tooltip document";
  await fs.mkdir(outputRoot, { recursive: true });
  const results = [];

  for (const sample of samples) {
    verificationStage = `resolving ${sample.name}`;
    const folderPath = workshopFolder(sample.appId, sample.workshopId);
    const thumbnail = await resolver.resolve({
      appId: sample.appId,
      workshopId: sample.workshopId,
      folderPath
    });
    assert.ok(thumbnail, `${sample.name} representative thumbnail was not resolved`);
    await window.webContents.executeJavaScript(
      `window.__renderModTooltipForTest(${JSON.stringify(modFixture({ ...sample, thumbnail }))})`
    );
    verificationStage = `waiting for ${sample.name} image`;
    const loadState = await waitForImage(window);
    assert.equal(loadState.loaded, true, `${sample.name} representative thumbnail did not render`);

    const metrics = await window.webContents.executeJavaScript(`(() => {
      const image = document.querySelector("#thumbnail");
      const frame = document.querySelector("#thumbnailFrame");
      const tooltip = document.querySelector(".tooltip");
      const imageRect = image.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      return {
        imageUrl: image.src,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        objectFit: getComputedStyle(image).objectFit,
        objectPosition: getComputedStyle(image).objectPosition,
        imageRect: {
          left: imageRect.left,
          top: imageRect.top,
          right: imageRect.right,
          bottom: imageRect.bottom,
          width: imageRect.width,
          height: imageRect.height
        },
        frameRect: {
          left: frameRect.left,
          top: frameRect.top,
          right: frameRect.right,
          bottom: frameRect.bottom,
          width: frameRect.width,
          height: frameRect.height
        },
        title: document.querySelector("#title").textContent,
        description: document.querySelector("#description").textContent,
        source: document.querySelector("#source").textContent,
        folder: document.querySelector("#folder").textContent,
        author: document.querySelector("#author").textContent,
        version: document.querySelector("#version").textContent,
        packages: document.querySelector("#packages").textContent,
        path: document.querySelector("#path").textContent,
        contentFits: tooltip.scrollHeight <= tooltip.clientHeight
      };
    })()`);
    verificationStage = `asserting ${sample.name} layout`;
    assert.equal(metrics.objectFit, "contain");
    assert.equal(metrics.objectPosition, "50% 50%");
    assert.ok(metrics.imageRect.left >= metrics.frameRect.left);
    assert.ok(metrics.imageRect.top >= metrics.frameRect.top);
    assert.ok(metrics.imageRect.right <= metrics.frameRect.right);
    assert.ok(metrics.imageRect.bottom <= metrics.frameRect.bottom);
    assert.equal(metrics.title, sample.title);
    assert.match(metrics.description, /Representative/);
    assert.match(metrics.source, new RegExp(sample.workshopId));
    assert.equal(metrics.folder, sample.workshopId);
    assert.equal(metrics.author, "Workshop author");
    assert.equal(metrics.version, "1.0");
    assert.equal(metrics.packages, "1");
    assert.equal(metrics.path, folderPath);
    assert.equal(metrics.contentFits, true);
    assert.ok(metrics.naturalWidth > 0 && metrics.naturalHeight > 0);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await fs.writeFile(
      path.join(outputRoot, `workshop-tooltip-${sample.name}.png`),
      (await window.webContents.capturePage()).toPNG()
    );
    results.push({ ...sample, thumbnail, metrics });
  }

  await window.webContents.executeJavaScript(
    `window.__renderModTooltipForTest(${JSON.stringify(
      modFixture({
        title: "No Preview Available",
        workshopId: "9999999999",
        appId: "1812450",
        thumbnail: null
      })
    )})`
  );
  const fallbackMetrics = await window.webContents.executeJavaScript(`({
    fallbackVisible: !document.querySelector("#thumbnailFallback").hidden,
    fallbackText: document.querySelector("#thumbnailFallbackText").textContent,
    imageHidden: document.querySelector("#thumbnail").hidden,
    description: document.querySelector("#description").textContent,
    path: document.querySelector("#path").textContent
  })`);
  assert.equal(fallbackMetrics.fallbackVisible, true);
  assert.equal(fallbackMetrics.imageHidden, true);
  assert.equal(fallbackMetrics.fallbackText, "Workshop thumbnail unavailable");
  assert.match(fallbackMetrics.description, /Representative/);
  assert.match(fallbackMetrics.path, /9999999999/);
  await new Promise((resolve) => setTimeout(resolve, 200));
  await fs.writeFile(
    path.join(outputRoot, "workshop-tooltip-fallback.png"),
    (await window.webContents.capturePage()).toPNG()
  );

  console.log(JSON.stringify({ outputRoot, results, fallbackMetrics }, null, 2));
  window.destroy();
  app.quit();
}).catch((error) => {
  console.error(`${verificationStage}: ${error?.stack || error}`);
  app.exit(1);
});
