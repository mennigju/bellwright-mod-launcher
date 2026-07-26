const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const path = require("node:path");
const test = require("node:test");
const { launchWarhammer3, launchWarhammer3Continue } = require("../game-launch");

test("WH3 launch uses its installed executable and used_mods.txt without Steam Workshop file operations", async () => {
  const calls = [];
  let unrefCalled = false;
  const childProcess = {
    spawn(executablePath, args, options) {
      calls.push({ executablePath, args, options });
      const child = new EventEmitter();
      child.pid = 321;
      child.unref = () => {
        unrefCalled = true;
      };
      queueMicrotask(() => child.emit("spawn"));
      return child;
    }
  };
  const accessed = [];
  const fs = {
    async access(filePath) {
      accessed.push(filePath);
    }
  };
  const gameRoot = "C:\\Steam\\steamapps\\common\\Total War WARHAMMER III";

  const result = await launchWarhammer3({ childProcess, fs, gameRoot });

  const executablePath = path.join(gameRoot, "Warhammer3.exe");
  assert.deepEqual(accessed, [executablePath]);
  assert.deepEqual(calls, [
    {
      executablePath,
      args: ["used_mods.txt;"],
      options: {
        cwd: gameRoot,
        detached: true,
        stdio: "ignore",
        windowsHide: false
      }
    }
  ]);
  assert.equal(unrefCalled, true);
  assert.equal(result.pid, 321);
});

test("WH3 launch reports an executable start failure", async () => {
  const childProcess = {
    spawn() {
      const child = new EventEmitter();
      child.unref = () => {};
      queueMicrotask(() => child.emit("error", new Error("launch failed")));
      return child;
    }
  };
  const fs = { async access() {} };

  await assert.rejects(
    () => launchWarhammer3({ childProcess, fs, gameRoot: "C:\\Missing WH3" }),
    /launch failed/
  );
});

test("WH3 Continue launches the exact newest-save argument sequence without a command shell", async () => {
  const calls = [];
  const childProcess = {
    spawn(executablePath, args, options) {
      calls.push({ executablePath, args, options });
      const child = new EventEmitter();
      child.pid = 654;
      child.unref = () => {};
      queueMicrotask(() => child.emit("spawn"));
      return child;
    }
  };
  const fs = { async access() {} };
  const gameRoot = "C:\\Steam\\steamapps\\common\\Total War WARHAMMER III";
  const saveName = "Wissenland & Nuln_Quick Save.121311096706.save";

  const result = await launchWarhammer3Continue({ childProcess, fs, gameRoot, saveName });

  assert.equal(result.saveName, saveName);
  assert.deepEqual(calls, [
    {
      executablePath: path.join(gameRoot, "Warhammer3.exe"),
      args: ["game_startup_mode", "campaign_load", saveName, ";", "used_mods.txt;"],
      options: {
        cwd: gameRoot,
        detached: true,
        stdio: "ignore",
        windowsHide: false
      }
    }
  ]);
});
