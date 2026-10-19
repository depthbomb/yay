$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$dependencyCache = Join-Path $env:LOCALAPPDATA 'yay-build-deps'
$sdkDirectory = Join-Path $dependencyCache 'webview2-1.0.4258.31'
if (-not (Test-Path -LiteralPath (Join-Path $sdkDirectory 'build/native/include/WebView2.h'))) {
    New-Item -ItemType Directory -Force $dependencyCache | Out-Null
    $archive = Join-Path $env:TEMP 'yay-webview2-1.0.4258.31.zip'
    Invoke-WebRequest 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.4258.31/microsoft.web.webview2.1.0.4258.31.nupkg' -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $sdkDirectory -Force
}
Push-Location (Join-Path $projectRoot 'ui')
try {
    bun install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'UI dependency restore failed.' }
}
finally { Pop-Location }
