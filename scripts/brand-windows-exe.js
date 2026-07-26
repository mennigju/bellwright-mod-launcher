const fs = require("node:fs/promises");
const path = require("node:path");
const { rcedit } = require("rcedit");

const [
  ,
  ,
  executableArgument,
  iconArgument,
  versionArgument,
  originalFilenameArgument = "ExOneModLauncher.exe",
  internalNameArgument = "ExOneModLauncher",
  fileDescriptionArgument = "ExOne Mod Launcher"
] = process.argv;

async function main() {
  if (process.platform !== "win32") {
    throw new Error("Windows executable branding can only run on Windows.");
  }
  if (!executableArgument || !iconArgument || !/^\d+\.\d+\.\d+$/.test(versionArgument || "")) {
    throw new Error(
      "Usage: node brand-windows-exe.js <exe> <icon.ico> <version> [original filename] [internal name] [description]"
    );
  }

  const executablePath = path.resolve(executableArgument);
  const iconPath = path.resolve(iconArgument);
  await Promise.all([fs.access(executablePath), fs.access(iconPath)]);

  await rcedit(executablePath, {
    icon: iconPath,
    "file-version": versionArgument,
    "product-version": versionArgument,
    "version-string": {
      CompanyName: "ExcelsiorOne",
      FileDescription: fileDescriptionArgument,
      InternalName: internalNameArgument,
      LegalCopyright: "Copyright (c) 2026 ExcelsiorOne",
      OriginalFilename: originalFilenameArgument,
      ProductName: "ExOne Mod Launcher"
    }
  });

  const stat = await fs.stat(executablePath);
  process.stdout.write(`${executablePath} ${stat.size}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
