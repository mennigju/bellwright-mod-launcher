Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$sourcePath = Join-Path $projectRoot "runtime\legacy-launcher.cs"
$outputPath = Join-Path $projectRoot "runtime\BellwrightModLauncher.exe"
$iconPath = Join-Path $projectRoot "renderer\assets\branding\exone-lion.ico"

foreach ($requiredPath in @($sourcePath, $iconPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Legacy launcher build input was not found: $requiredPath"
  }
}

if (Test-Path -LiteralPath $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
}

$source = Get-Content -Raw -LiteralPath $sourcePath
$provider = New-Object Microsoft.CSharp.CSharpCodeProvider
$parameters = New-Object System.CodeDom.Compiler.CompilerParameters
$parameters.GenerateExecutable = $true
$parameters.GenerateInMemory = $false
$parameters.OutputAssembly = $outputPath
$parameters.CompilerOptions = "/target:winexe /platform:x64 /optimize+ /win32icon:`"$iconPath`""
$parameters.ReferencedAssemblies.Add("System.dll") | Out-Null
$results = $provider.CompileAssemblyFromSource($parameters, $source)
$provider.Dispose()

if ($results.Errors.HasErrors) {
  $messages = @($results.Errors | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
  throw "Legacy launcher compilation failed:$([Environment]::NewLine)$messages"
}

if (-not (Test-Path -LiteralPath $outputPath)) {
  throw "Legacy launcher build did not create $outputPath"
}

Get-Item -LiteralPath $outputPath | Select-Object FullName, Length
