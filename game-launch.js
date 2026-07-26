const path = require("node:path");
const { buildWarhammer3ContinueArgs } = require("./warhammer3-saves");

async function launchDetachedExecutable({ childProcess, fs, executablePath, args = [], cwd }) {
  await fs.access(executablePath);
  const workingDirectory = cwd || path.dirname(executablePath);

  return new Promise((resolve, reject) => {
    let settled = false;
    let child;
    try {
      child = childProcess.spawn(executablePath, args, {
        cwd: workingDirectory,
        detached: true,
        stdio: "ignore",
        windowsHide: false
      });
    } catch (error) {
      reject(error);
      return;
    }

    child.once("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    child.once("spawn", () => {
      if (settled) {
        return;
      }
      settled = true;
      child.unref();
      resolve({
        executablePath,
        args: [...args],
        cwd: workingDirectory,
        pid: child.pid || null
      });
    });
  });
}

async function launchWarhammer3({ childProcess, fs, gameRoot }) {
  const executablePath = path.join(gameRoot, "Warhammer3.exe");
  return launchDetachedExecutable({
    childProcess,
    fs,
    executablePath,
    args: ["used_mods.txt;"],
    cwd: gameRoot
  });
}

async function launchWarhammer3Continue({ childProcess, fs, gameRoot, saveName }) {
  const executablePath = path.join(gameRoot, "Warhammer3.exe");
  const result = await launchDetachedExecutable({
    childProcess,
    fs,
    executablePath,
    args: buildWarhammer3ContinueArgs(saveName),
    cwd: gameRoot
  });
  return { ...result, saveName };
}

module.exports = {
  launchDetachedExecutable,
  launchWarhammer3,
  launchWarhammer3Continue
};
