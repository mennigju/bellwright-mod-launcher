const path = require("node:path");
const { selectHighestPriorityMod } = require("./priority-order");

const PACK_HEADER_SIZE = 28;
const MAX_PACK_INDEX_BYTES = 64 * 1024 * 1024;
const MAX_PACK_FILES = 1_000_000;
const MAX_INTERNAL_PATH_BYTES = 32 * 1024;
const DEFAULT_MAX_CONFLICT_FILES = 80;

async function readFully(fileHandle, buffer, position) {
  let offset = 0;
  while (offset < buffer.length) {
    const { bytesRead } = await fileHandle.read(
      buffer,
      offset,
      buffer.length - offset,
      position + offset
    );
    if (!bytesRead) {
      break;
    }
    offset += bytesRead;
  }
  return offset;
}

function normalizeInternalPath(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\//g, "\\")
    .replace(/\\+/g, "\\")
    .replace(/^\\+/, "")
    .trim();
}

function classifyConflictResolution(filePath, hasMoviePack = false) {
  if (hasMoviePack) {
    return "movie-pack";
  }
  return normalizeInternalPath(filePath).toLowerCase().startsWith("db\\")
    ? "database-internal-name"
    : "load-order";
}

function getPairResolution(pair) {
  const activeRules = [
    pair.loadOrderFileCount > 0 ? "load-order" : null,
    pair.databaseFileCount > 0 ? "database-internal-name" : null,
    pair.movieFileCount > 0 ? "movie-pack" : null
  ].filter(Boolean);
  return activeRules.length === 1 ? activeRules[0] : "mixed";
}

function getResolutionNote(resolution) {
  if (resolution === "load-order") {
    return "Load order applies to these matching files; priority #1 is highest.";
  }
  if (resolution === "database-internal-name") {
    return "Database data uses internal table-file priority; mod position does not establish one winner.";
  }
  if (resolution === "movie-pack") {
    return "Movie-pack conflicts do not have a dependable manual load-order winner.";
  }
  return "This conflict mixes file types with different priority rules, so there is no single winner.";
}

function parsePackIndexBuffer(indexBuffer, fileCount) {
  const files = [];
  let position = 0;

  for (let index = 0; index < fileCount; index += 1) {
    if (position + 6 > indexBuffer.length) {
      throw new Error("The pack file index is truncated.");
    }
    const size = indexBuffer.readUInt32LE(position);
    position += 4;
    const compressed = indexBuffer[position] === 1;
    position += 1;
    const terminator = indexBuffer.indexOf(0, position);
    if (terminator < 0 || terminator - position > MAX_INTERNAL_PATH_BYTES) {
      throw new Error("The pack file index contains an invalid internal path.");
    }
    const name = normalizeInternalPath(indexBuffer.toString("utf8", position, terminator));
    position = terminator + 1;
    if (!name || name.toLowerCase().endsWith(".rpfm_reserved")) {
      continue;
    }
    files.push({ name, size, compressed });
  }

  return files;
}

async function readWarhammer3PackIndex({ fs, packPath, knownStats = null }) {
  const fileHandle = await fs.open(packPath, "r");
  try {
    const stats = knownStats || (await fileHandle.stat());
    if (!stats.isFile() || stats.size < PACK_HEADER_SIZE) {
      throw new Error("The pack file is too small.");
    }

    const header = Buffer.alloc(PACK_HEADER_SIZE);
    if ((await readFully(fileHandle, header, 0)) !== PACK_HEADER_SIZE) {
      throw new Error("The pack header is truncated.");
    }

    const format = header.toString("ascii", 0, 4);
    if (format !== "PFH5") {
      throw new Error(`Unsupported pack format ${format || "(empty)"}.`);
    }

    const byteMask = header.readInt32LE(4);
    const dependencyIndexSize = header.readInt32LE(12);
    const fileCount = header.readInt32LE(16);
    const fileIndexSize = header.readInt32LE(20);
    if (
      dependencyIndexSize < 0 ||
      fileCount < 0 ||
      fileCount > MAX_PACK_FILES ||
      fileIndexSize < 0 ||
      fileIndexSize > MAX_PACK_INDEX_BYTES ||
      PACK_HEADER_SIZE + dependencyIndexSize + fileIndexSize > stats.size
    ) {
      throw new Error("The pack header contains unsafe index sizes.");
    }
    if (fileCount > 0 && fileIndexSize < fileCount * 6) {
      throw new Error("The pack file index is smaller than its declared file count.");
    }

    const indexBuffer = Buffer.alloc(fileIndexSize);
    const indexPosition = PACK_HEADER_SIZE + dependencyIndexSize;
    if ((await readFully(fileHandle, indexBuffer, indexPosition)) !== fileIndexSize) {
      throw new Error("The pack file index could not be read completely.");
    }

    return {
      packPath,
      format,
      byteMask,
      isMovie: byteMask === 4,
      files: parsePackIndexBuffer(indexBuffer, fileCount),
      size: stats.size,
      mtimeMs: stats.mtimeMs
    };
  } finally {
    await fileHandle.close();
  }
}

function modKey(mod) {
  return `${mod?.source || "local"}:${mod?.folderName || ""}`;
}

function getModPackPaths(mod) {
  if (mod.source === "local") {
    return /\.pack$/i.test(mod.path || "") ? [mod.path] : [];
  }
  if (mod.source !== "workshop" || !mod.path) {
    return [];
  }
  const packNames =
    mod.status === "active" && Array.isArray(mod.packFiles) && mod.packFiles.length
      ? mod.packFiles
      : mod.availablePackFiles || mod.packFiles || [];
  return [
    ...new Set(
      packNames
        .map((packName) => path.basename(String(packName || "")))
        .filter((packName) => /\.pack$/i.test(packName))
        .map((packName) => path.join(mod.path, packName))
    )
  ];
}

function publicConflictMod(mod) {
  return {
    key: modKey(mod),
    title: mod.title,
    source: mod.source,
    workshopId: mod.workshopId,
    loadOrderIndex: mod.loadOrderIndex,
    operationsLabel: mod.sourceLabel
  };
}

function resetConflictCounts(mods) {
  for (const mod of mods) {
    mod.conflictCount = 0;
    mod.activeConflictCount = 0;
    mod.conflictSeverity = null;
  }
}

function createWarhammer3ConflictAnalyzer({
  fs,
  maxConflictFiles = DEFAULT_MAX_CONFLICT_FILES
}) {
  const cache = new Map();

  async function readCached(packPath) {
    const stats = await fs.stat(packPath);
    const signature = `${stats.size}:${stats.mtimeMs}`;
    const normalizedPath = path.normalize(packPath).toLowerCase();
    const cached = cache.get(normalizedPath);
    if (cached?.signature === signature) {
      return cached.index;
    }
    const index = await readWarhammer3PackIndex({ fs, packPath, knownStats: stats });
    cache.set(normalizedPath, { signature, index });
    return index;
  }

  async function scanMod(mod, modIndex) {
    const internalPaths = new Map();
    let scannedPacks = 0;
    let failedPacks = 0;
    let indexedFiles = 0;

    for (const packPath of getModPackPaths(mod)) {
      try {
        const packIndex = await readCached(packPath);
        scannedPacks += 1;
        indexedFiles += packIndex.files.length;
        for (const file of packIndex.files) {
          const normalized = file.name.toLowerCase();
          if (!internalPaths.has(normalized)) {
            internalPaths.set(normalized, {
              displayPath: file.name,
              isMovie: packIndex.isMovie
            });
          } else if (packIndex.isMovie) {
            internalPaths.get(normalized).isMovie = true;
          }
        }
      } catch {
        failedPacks += 1;
      }
    }

    return { mod, modIndex, internalPaths, scannedPacks, failedPacks, indexedFiles };
  }

  return {
    async analyze(mods) {
      resetConflictCounts(mods);
      const scans = await Promise.all(mods.map((mod, index) => scanMod(mod, index)));
      const ownersByPath = new Map();

      for (const scan of scans) {
        for (const [normalizedPath, internalPath] of scan.internalPaths) {
          if (!ownersByPath.has(normalizedPath)) {
            ownersByPath.set(normalizedPath, {
              displayPath: internalPath.displayPath,
              owners: []
            });
          }
          ownersByPath.get(normalizedPath).owners.push({
            modIndex: scan.modIndex,
            isMovie: internalPath.isMovie
          });
        }
      }

      const pairs = new Map();
      for (const { displayPath, owners } of ownersByPath.values()) {
        if (owners.length < 2) {
          continue;
        }
        for (let leftOwner = 0; leftOwner < owners.length; leftOwner += 1) {
          for (let rightOwner = leftOwner + 1; rightOwner < owners.length; rightOwner += 1) {
            const leftIndex = owners[leftOwner].modIndex;
            const rightIndex = owners[rightOwner].modIndex;
            const pairKey = `${leftIndex}:${rightIndex}`;
            if (!pairs.has(pairKey)) {
              pairs.set(pairKey, {
                leftIndex,
                rightIndex,
                fileCount: 0,
                loadOrderFileCount: 0,
                databaseFileCount: 0,
                movieFileCount: 0,
                files: []
              });
            }
            const pair = pairs.get(pairKey);
            const resolution = classifyConflictResolution(
              displayPath,
              owners[leftOwner].isMovie || owners[rightOwner].isMovie
            );
            pair.fileCount += 1;
            if (resolution === "load-order") {
              pair.loadOrderFileCount += 1;
            } else if (resolution === "database-internal-name") {
              pair.databaseFileCount += 1;
            } else {
              pair.movieFileCount += 1;
            }
            if (pair.files.length < maxConflictFiles) {
              pair.files.push({ path: displayPath, resolution });
            }
          }
        }
      }

      const conflicts = [];
      for (const pair of pairs.values()) {
        const left = mods[pair.leftIndex];
        const right = mods[pair.rightIndex];
        const bothActive = left.status === "active" && right.status === "active";
        const severity = bothActive ? "medium" : "low";
        const resolution = getPairResolution(pair);
        const winner =
          bothActive &&
          resolution === "load-order" &&
          Number.isFinite(left.loadOrderIndex) &&
          Number.isFinite(right.loadOrderIndex) &&
          left.loadOrderIndex !== right.loadOrderIndex
            ? selectHighestPriorityMod(left, right)
            : null;
        const conflict = {
          id: `${modKey(left)}|${modKey(right)}`,
          kind: "pack-file-overlap",
          severity,
          bothActive,
          duplicateInstall: false,
          assetCount: pair.fileCount,
          resolution,
          resolutionNote: getResolutionNote(resolution),
          resolutionCounts: {
            loadOrder: pair.loadOrderFileCount,
            database: pair.databaseFileCount,
            movie: pair.movieFileCount
          },
          assets: pair.files
            .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }))
            .map((file) => ({
              path: file.path,
              resolution: file.resolution,
              leftOperations: ["packed file"],
              rightOperations: ["packed file"]
            })),
          hasMoreAssets: pair.fileCount > pair.files.length,
          mods: [publicConflictMod(left), publicConflictMod(right)],
          winner: winner
            ? {
                key: modKey(winner),
                title: winner.title,
                loadOrderIndex: winner.loadOrderIndex
              }
            : null
        };
        conflicts.push(conflict);

        for (const mod of [left, right]) {
          mod.conflictCount += 1;
          if (bothActive) {
            mod.activeConflictCount += 1;
          }
          if (mod.conflictSeverity !== "medium") {
            mod.conflictSeverity = severity;
          }
        }
      }

      conflicts.sort((left, right) => {
        if (left.bothActive !== right.bothActive) {
          return left.bothActive ? -1 : 1;
        }
        return right.assetCount - left.assetCount;
      });

      return {
        conflicts,
        activeConflictCount: conflicts.filter((conflict) => conflict.bothActive).length,
        analysis: {
          scannedPacks: scans.reduce((total, scan) => total + scan.scannedPacks, 0),
          failedPacks: scans.reduce((total, scan) => total + scan.failedPacks, 0),
          indexedFiles: scans.reduce((total, scan) => total + scan.indexedFiles, 0)
        }
      };
    }
  };
}

module.exports = {
  PACK_HEADER_SIZE,
  normalizeInternalPath,
  classifyConflictResolution,
  parsePackIndexBuffer,
  readWarhammer3PackIndex,
  getModPackPaths,
  createWarhammer3ConflictAnalyzer
};
