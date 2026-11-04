param([Parameter(Mandatory=$true)][string]$OutputPath)
$repoRoot = Split-Path $PSScriptRoot -Parent
$sourceRoot = Join-Path $repoRoot 'extension-insurer'
$files = @('manifest.json','background.js','bridge.js','portalJourney.js','oldMutualJourney.js','interfaceMonitor.js','icon.png') | ForEach-Object { Join-Path $sourceRoot $_ }
foreach($file in $files) { if(-not (Test-Path -LiteralPath $file)) { throw "Missing package file: $file" } }
Compress-Archive -LiteralPath $files -DestinationPath $OutputPath -Force
Write-Output "Companion store package created: $OutputPath"
