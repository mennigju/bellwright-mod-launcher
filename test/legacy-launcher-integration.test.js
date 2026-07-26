const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const legacyLauncher = path.join(root, "runtime", "BellwrightModLauncher.exe");

function peMetadata(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert.equal(bytes.toString("ascii", 0, 2), "MZ");
  const peOffset = bytes.readUInt32LE(0x3c);
  assert.equal(bytes.toString("ascii", peOffset, peOffset + 4), "PE\0\0");
  return {
    machine: bytes.readUInt16LE(peOffset + 4),
    subsystem: bytes.readUInt16LE(peOffset + 24 + 68)
  };
}

test("legacy Bellwright executable is a small x64 GUI compatibility launcher", { skip: process.platform !== "win32" }, () => {
  assert.equal(fs.existsSync(legacyLauncher), true, "Build runtime/BellwrightModLauncher.exe first");
  assert.deepEqual(peMetadata(legacyLauncher), { machine: 0x8664, subsystem: 2 });
  assert.ok(fs.statSync(legacyLauncher).size < 1024 * 1024);
});

test("legacy launcher forwards arguments to ExOne and waits for it", { skip: process.platform !== "win32" }, () => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "exone legacy launcher "));
  const marker = path.join(testRoot, "argument marker.json");
  const expected = ["value with spaces", "quote\"value", "trailing\\"];
  const command = "require('node:fs').writeFileSync(process.env.EXONE_LEGACY_MARKER, JSON.stringify(process.argv.slice(1)))";

  try {
    fs.copyFileSync(legacyLauncher, path.join(testRoot, "BellwrightModLauncher.exe"));
    fs.copyFileSync(process.execPath, path.join(testRoot, "ExOneModLauncher.exe"));
    const result = spawnSync(
      path.join(testRoot, "BellwrightModLauncher.exe"),
      ["-e", command, ...expected],
      {
        encoding: "utf8",
        timeout: 10000,
        env: { ...process.env, EXONE_LEGACY_MARKER: marker }
      }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    assert.deepEqual(JSON.parse(fs.readFileSync(marker, "utf8")), expected);
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
});
