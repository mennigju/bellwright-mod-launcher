const assert = require("node:assert/strict");
const fsNative = require("node:fs");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const {
  isAllowedSteamPreviewUrl,
  normalizeWorkshopTitle,
  parseSteamUgcCache,
  findWorkshopContentThumbnail,
  createWorkshopThumbnailResolver
} = require("../steam-workshop-thumbnails");

function encodeVarint(value) {
  const bytes = [];
  let remaining = value;
  do {
    let byte = remaining % 128;
    remaining = Math.floor(remaining / 128);
    if (remaining) {
      byte |= 0x80;
    }
    bytes.push(byte);
  } while (remaining);
  return Buffer.from(bytes);
}

function varintField(fieldNumber, value) {
  return Buffer.concat([encodeVarint(fieldNumber * 8), encodeVarint(value)]);
}

function bytesField(fieldNumber, value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return Buffer.concat([encodeVarint(fieldNumber * 8 + 2), encodeVarint(buffer.length), buffer]);
}

function buildCacheFixture({
  appId = 1812450,
  workshopId = 3762938235,
  previewUrl = "https://images.steamusercontent.com/ugc/12345678901234567890/0123456789ABCDEF0123456789ABCDEF01234567/",
  title = "Settlement Immigration",
  updatedAt = 100
} = {}) {
  const item = Buffer.concat([
    varintField(2, workshopId),
    varintField(4, appId),
    bytesField(11, previewUrl),
    bytesField(16, title),
    varintField(20, updatedAt)
  ]);
  const message = bytesField(1, item);
  const frame = Buffer.alloc(4);
  frame.writeUInt32LE(message.length);
  return Buffer.concat([frame, message]);
}

async function withTempDirectory(callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "exone-thumbnail-test-"));
  try {
    return await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("Steam UGC cache parser maps Workshop ID and app ID to an official preview URL", () => {
  const records = parseSteamUgcCache(buildCacheFixture());
  assert.deepEqual(records, [
    {
      workshopId: "3762938235",
      appId: "1812450",
      previewUrl:
        "https://images.steamusercontent.com/ugc/12345678901234567890/0123456789ABCDEF0123456789ABCDEF01234567/",
      title: "Settlement Immigration",
      updatedAt: 100
    }
  ]);
});

test("Steam UGC cache parser rejects non-Steam and malformed image URLs", () => {
  assert.equal(isAllowedSteamPreviewUrl("https://example.com/image.png"), false);
  assert.equal(isAllowedSteamPreviewUrl("https://images.steamusercontent.com/ugc/not-an-id/hash/"), false);
  assert.deepEqual(parseSteamUgcCache(buildCacheFixture({ previewUrl: "https://example.com/image.png" })), []);
});

test("Workshop titles are normalized without changing visible punctuation", () => {
  assert.equal(normalizeWorkshopTitle("  Mixu's   Legendary  Lords\r\n"), "Mixu's Legendary Lords");
});

test("Workshop content image wins and is returned as a local file URL", async () => {
  await withTempDirectory(async (folderPath) => {
    await fs.writeFile(path.join(folderPath, "mod.pack"), "pack");
    await fs.writeFile(path.join(folderPath, "preview.jpg"), "jpg");
    await fs.writeFile(path.join(folderPath, "preview.png"), "png");

    assert.deepEqual(await findWorkshopContentThumbnail({ fs, folderPath }), {
      url: pathToFileURL(path.join(folderPath, "preview.png")).href,
      source: "workshop-content"
    });
  });
});

test("resolver uses read-only Steam UGC metadata when a Workshop folder has no image", async () => {
  await withTempDirectory(async (steamRoot) => {
    const workshopFolder = path.join(steamRoot, "steamapps", "workshop", "content", "1812450", "3762938235");
    const cacheRoot = path.join(steamRoot, "userdata", "12345", "ugcmsgcache");
    await fs.mkdir(workshopFolder, { recursive: true });
    await fs.mkdir(cacheRoot, { recursive: true });
    await fs.writeFile(path.join(workshopFolder, "mod.pak"), "pak");
    await fs.writeFile(path.join(cacheRoot, "ugc.cachedmsg"), buildCacheFixture());
    const before = fsNative.statSync(path.join(workshopFolder, "mod.pak")).mtimeMs;

    const resolver = createWorkshopThumbnailResolver({ fs, steamRoots: [steamRoot] });
    assert.deepEqual(
      await resolver.resolveDetails({
        appId: "1812450",
        workshopId: "3762938235",
        folderPath: workshopFolder
      }),
      {
        title: "Settlement Immigration",
        thumbnail: {
          url: "https://images.steamusercontent.com/ugc/12345678901234567890/0123456789ABCDEF0123456789ABCDEF01234567/",
          source: "steam-ugc-cache"
        }
      }
    );
    assert.deepEqual(
      await resolver.resolve({
        appId: "1812450",
        workshopId: "3762938235",
        folderPath: workshopFolder
      }),
      {
        url: "https://images.steamusercontent.com/ugc/12345678901234567890/0123456789ABCDEF0123456789ABCDEF01234567/",
        source: "steam-ugc-cache"
      }
    );
    assert.equal(fsNative.statSync(path.join(workshopFolder, "mod.pak")).mtimeMs, before);
  });
});

test("official cached title is retained when a local Workshop image has priority", async () => {
  await withTempDirectory(async (steamRoot) => {
    const workshopFolder = path.join(steamRoot, "steamapps", "workshop", "content", "1142710", "3762938235");
    const cacheRoot = path.join(steamRoot, "userdata", "12345", "ugcmsgcache");
    await fs.mkdir(workshopFolder, { recursive: true });
    await fs.mkdir(cacheRoot, { recursive: true });
    await fs.writeFile(path.join(workshopFolder, "internal_name.pack"), "pack");
    await fs.writeFile(path.join(workshopFolder, "preview.png"), "png");
    await fs.writeFile(
      path.join(cacheRoot, "ugc.cachedmsg"),
      buildCacheFixture({ appId: 1142710, title: "Official Workshop Name" })
    );

    const resolver = createWorkshopThumbnailResolver({ fs, steamRoots: [steamRoot] });
    assert.deepEqual(
      await resolver.resolveDetails({
        appId: "1142710",
        workshopId: "3762938235",
        folderPath: workshopFolder
      }),
      {
        title: "Official Workshop Name",
        thumbnail: {
          url: pathToFileURL(path.join(workshopFolder, "preview.png")).href,
          source: "workshop-content"
        }
      }
    );
  });
});

test("resolver returns a clear no-image state when neither local source exists", async () => {
  await withTempDirectory(async (steamRoot) => {
    const workshopFolder = path.join(steamRoot, "empty-mod");
    await fs.mkdir(workshopFolder);
    const resolver = createWorkshopThumbnailResolver({ fs, steamRoots: [steamRoot] });
    assert.equal(
      await resolver.resolve({ appId: "1142710", workshopId: "3727310475", folderPath: workshopFolder }),
      null
    );
  });
});
