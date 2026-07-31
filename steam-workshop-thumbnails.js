const path = require("node:path");
const { pathToFileURL } = require("node:url");

const MAX_CACHE_FILE_BYTES = 32 * 1024 * 1024;
const MAX_THUMBNAIL_FILE_BYTES = 32 * 1024 * 1024;
const WORKSHOP_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const STEAM_PREVIEW_URL_PATTERN =
  /^https:\/\/images\.steamusercontent\.com\/ugc\/\d+\/[a-f0-9]{40}\/$/i;

function normalizeNumericId(value) {
  const normalized = String(value ?? "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

function isAllowedSteamPreviewUrl(value) {
  return typeof value === "string" && STEAM_PREVIEW_URL_PATTERN.test(value);
}

function normalizeWorkshopTitle(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function readVarint(buffer, start, end) {
  let value = 0;
  let multiplier = 1;
  let offset = start;

  while (offset < end && multiplier <= 2 ** 49) {
    const byte = buffer[offset];
    value += (byte & 0x7f) * multiplier;
    offset += 1;
    if ((byte & 0x80) === 0) {
      return { value, offset };
    }
    multiplier *= 128;
  }
  throw new Error("Invalid protobuf varint.");
}

function parseProtobufFields(buffer, start = 0, end = buffer.length) {
  const fields = [];
  let offset = start;

  while (offset < end) {
    const key = readVarint(buffer, offset, end);
    offset = key.offset;
    const fieldNumber = Math.floor(key.value / 8);
    const wireType = key.value % 8;
    if (!fieldNumber) {
      throw new Error("Invalid protobuf field.");
    }

    if (wireType === 0) {
      const parsed = readVarint(buffer, offset, end);
      fields.push({ fieldNumber, wireType, value: parsed.value });
      offset = parsed.offset;
      continue;
    }

    if (wireType === 1) {
      if (offset + 8 > end) {
        throw new Error("Truncated protobuf fixed64 field.");
      }
      fields.push({ fieldNumber, wireType, start: offset, end: offset + 8 });
      offset += 8;
      continue;
    }

    if (wireType === 2) {
      const length = readVarint(buffer, offset, end);
      const fieldEnd = length.offset + length.value;
      if (!Number.isSafeInteger(fieldEnd) || fieldEnd > end) {
        throw new Error("Truncated protobuf byte field.");
      }
      fields.push({
        fieldNumber,
        wireType,
        start: length.offset,
        end: fieldEnd
      });
      offset = fieldEnd;
      continue;
    }

    if (wireType === 5) {
      if (offset + 4 > end) {
        throw new Error("Truncated protobuf fixed32 field.");
      }
      fields.push({ fieldNumber, wireType, start: offset, end: offset + 4 });
      offset += 4;
      continue;
    }

    throw new Error(`Unsupported protobuf wire type ${wireType}.`);
  }

  return fields;
}

function firstVarint(fields, fieldNumber) {
  return fields.find((field) => field.fieldNumber === fieldNumber && field.wireType === 0)?.value ?? null;
}

function firstString(buffer, fields, fieldNumber) {
  const field = fields.find((candidate) => candidate.fieldNumber === fieldNumber && candidate.wireType === 2);
  return field ? buffer.toString("utf8", field.start, field.end) : null;
}

function parseSteamUgcCache(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) {
    return [];
  }

  const messageLength = buffer.readUInt32LE(0);
  if (!messageLength || messageLength > buffer.length - 4) {
    return [];
  }

  let rootFields;
  try {
    rootFields = parseProtobufFields(buffer, 4, 4 + messageLength);
  } catch {
    return [];
  }

  const records = [];
  for (const rootField of rootFields) {
    if ((rootField.fieldNumber !== 1 && rootField.fieldNumber !== 2) || rootField.wireType !== 2) {
      continue;
    }

    try {
      const itemFields = parseProtobufFields(buffer, rootField.start, rootField.end);
      const workshopId = normalizeNumericId(firstVarint(itemFields, 2));
      const appId = normalizeNumericId(firstVarint(itemFields, 4));
      const previewUrl = firstString(buffer, itemFields, 11);
      if (!workshopId || !appId || !isAllowedSteamPreviewUrl(previewUrl)) {
        continue;
      }
      records.push({
        workshopId,
        appId,
        previewUrl,
        title: firstString(buffer, itemFields, 16) || "",
        updatedAt: firstVarint(itemFields, 20) || 0
      });
    } catch {
      // A corrupt cache entry must not prevent other local Steam metadata from loading.
    }
  }
  return records;
}

async function readDirectories(fs, directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function loadSteamUgcPreviewMap({ fs, steamRoots }) {
  const previewMap = new Map();
  const visitedFiles = new Set();

  for (const steamRoot of new Set(steamRoots.map((root) => path.normalize(root)))) {
    const userdataRoot = path.join(steamRoot, "userdata");
    for (const accountFolder of await readDirectories(fs, userdataRoot)) {
      if (!normalizeNumericId(accountFolder)) {
        continue;
      }
      const cacheRoot = path.join(userdataRoot, accountFolder, "ugcmsgcache");
      let cacheEntries;
      try {
        cacheEntries = await fs.readdir(cacheRoot, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const cacheEntry of cacheEntries) {
        if (!cacheEntry.isFile() || !/\.cachedmsg$/i.test(cacheEntry.name)) {
          continue;
        }
        const cachePath = path.join(cacheRoot, cacheEntry.name);
        const normalizedCachePath = path.normalize(cachePath).toLowerCase();
        if (visitedFiles.has(normalizedCachePath)) {
          continue;
        }
        visitedFiles.add(normalizedCachePath);

        try {
          const stats = await fs.stat(cachePath);
          if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_CACHE_FILE_BYTES) {
            continue;
          }
          const records = parseSteamUgcCache(await fs.readFile(cachePath));
          for (const record of records) {
            const key = `${record.appId}:${record.workshopId}`;
            const current = previewMap.get(key);
            if (!current || record.updatedAt >= current.updatedAt) {
              previewMap.set(key, record);
            }
          }
        } catch {
          // Steam can update or lock its cache while the launcher is reading it.
        }
      }
    }
  }

  return previewMap;
}

async function findWorkshopContentThumbnail({ fs, folderPath }) {
  if (!folderPath || typeof folderPath !== "string") {
    return null;
  }

  let entries;
  try {
    entries = await fs.readdir(folderPath, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const extension of WORKSHOP_IMAGE_EXTENSIONS) {
    for (const entry of entries) {
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== extension) {
        continue;
      }
      const candidatePath = path.resolve(folderPath, entry.name);
      const relativePath = path.relative(path.resolve(folderPath), candidatePath);
      if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        continue;
      }
      try {
        const stats = await fs.stat(candidatePath);
        if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_THUMBNAIL_FILE_BYTES) {
          continue;
        }
        return {
          url: pathToFileURL(candidatePath).href,
          source: "workshop-content"
        };
      } catch {
        // Try the next image if a file disappeared during Steam synchronization.
      }
    }
  }
  return null;
}

function createWorkshopThumbnailResolver({ fs, steamRoots }) {
  let previewMapPromise = null;

  async function getPreviewMap() {
    if (!previewMapPromise) {
      previewMapPromise = loadSteamUgcPreviewMap({ fs, steamRoots });
    }
    return previewMapPromise;
  }

  async function resolveDetails({ appId, workshopId, folderPath }) {
      const normalizedAppId = normalizeNumericId(appId);
      const normalizedWorkshopId = normalizeNumericId(workshopId);
      if (!normalizedAppId || !normalizedWorkshopId) {
        return { title: "", thumbnail: null };
      }

      const [localThumbnail, previewMap] = await Promise.all([
        findWorkshopContentThumbnail({ fs, folderPath }),
        getPreviewMap()
      ]);
      const record = previewMap.get(`${normalizedAppId}:${normalizedWorkshopId}`);
      return {
        title: normalizeWorkshopTitle(record?.title),
        thumbnail:
          localThumbnail ||
          (record
            ? {
                url: record.previewUrl,
                source: "steam-ugc-cache"
              }
            : null)
      };
  }

  return {
    resolveDetails,
    async resolve(options) {
      return (await resolveDetails(options)).thumbnail;
    }
  };
}

module.exports = {
  STEAM_PREVIEW_URL_PATTERN,
  isAllowedSteamPreviewUrl,
  normalizeWorkshopTitle,
  parseSteamUgcCache,
  loadSteamUgcPreviewMap,
  findWorkshopContentThumbnail,
  createWorkshopThumbnailResolver
};
