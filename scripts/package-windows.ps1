Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$packageJson = Get-Content -Raw -LiteralPath (Join-Path $projectRoot "package.json") | ConvertFrom-Json
$version = $packageJson.version
$electronDist = Join-Path $projectRoot "node_modules\electron\dist"
$distRoot = Join-Path $projectRoot "dist"
$releaseRoot = Join-Path $projectRoot "release"
$archiveName = "ExOneModLauncher-v$version-win-x64-portable"
$appFolderName = "ExOneModLauncher"
$exeName = "ExOneModLauncher.exe"
$legacyExeName = "BellwrightModLauncher.exe"
$iconPath = Join-Path $projectRoot "renderer\assets\branding\exone-lion.ico"
$outDir = Join-Path $distRoot $appFolderName
$zipPath = Join-Path $releaseRoot "$archiveName.zip"

& (Join-Path $PSScriptRoot "build-update-handoff.ps1")
& (Join-Path $PSScriptRoot "build-legacy-launcher.ps1")

if (-not (Test-Path -LiteralPath (Join-Path $electronDist "electron.exe"))) {
  throw "Electron runtime not found. Run npm install first."
}

$projectRootPath = $projectRoot.Path.TrimEnd('\')
foreach ($candidate in @($distRoot, $releaseRoot, $outDir)) {
  $full = [System.IO.Path]::GetFullPath($candidate)
  if (-not $full.StartsWith($projectRootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to write outside project root: $full"
  }
}

New-Item -ItemType Directory -Force -Path $distRoot, $releaseRoot | Out-Null
if (Test-Path -LiteralPath $outDir) {
  Remove-Item -LiteralPath $outDir -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Copy-Item -LiteralPath $electronDist -Destination $outDir -Recurse
Rename-Item -LiteralPath (Join-Path $outDir "electron.exe") -NewName $exeName
& node (Join-Path $PSScriptRoot "brand-windows-exe.js") `
  (Join-Path $outDir $exeName) `
  $iconPath `
  $version
if ($LASTEXITCODE -ne 0) {
  throw "Windows executable branding failed with exit code $LASTEXITCODE"
}
Copy-Item -LiteralPath (Join-Path $projectRoot "runtime\$legacyExeName") -Destination (Join-Path $outDir $legacyExeName)
& node (Join-Path $PSScriptRoot "brand-windows-exe.js") `
  (Join-Path $outDir $legacyExeName) `
  $iconPath `
  $version `
  $legacyExeName `
  "ExOneLegacyLauncher" `
  "ExOne Mod Launcher compatibility launcher"
if ($LASTEXITCODE -ne 0) {
  throw "Legacy Windows executable branding failed with exit code $LASTEXITCODE"
}

# Electron's fallback app is not used when resources\app is present. Leaving it
# in update archives lets an older Electron handoff keep the extracted copy open,
# which prevents the new launcher from removing that legacy update session.
$defaultElectronApp = Join-Path $outDir "resources\default_app.asar"
if (Test-Path -LiteralPath $defaultElectronApp) {
  Remove-Item -LiteralPath $defaultElectronApp -Force
}

$appRoot = Join-Path $outDir "resources\app"
New-Item -ItemType Directory -Force -Path $appRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "main.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "game-registry.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "game-selection.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "game-launch.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "warhammer3-saves.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "warhammer3-selection.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "warhammer3-preset.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "priority-order.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "steam-workshop-thumbnails.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "warhammer3-conflicts.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "native-runtime.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "native-discovery.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "native-signature.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "variant-settings.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "update-cleanup.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "linux-support.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "linux-proton.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "preload.js") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "package.json") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "package-lock.json") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "LICENSE") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "THIRD_PARTY_NOTICES.md") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "renderer") -Destination $appRoot -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot "runtime") -Destination $appRoot -Recurse

$zipSafeDate = [DateTime]"2026-01-01T00:00:00"
Get-ChildItem -LiteralPath $outDir -Recurse -Force | ForEach-Object {
  if ($_.LastWriteTime -lt [DateTime]"1980-01-01T00:00:00") {
    $_.LastWriteTime = $zipSafeDate
  }
}

Compress-Archive -LiteralPath $outDir -DestinationPath $zipPath -CompressionLevel Optimal
Get-Item -LiteralPath $zipPath | Select-Object FullName, Length
