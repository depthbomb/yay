param(
    [switch]$SkipBuild,
    [string]$BuildDirectory
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$product = Get-Content -LiteralPath (Join-Path $projectRoot 'protocol/product.json') -Raw | ConvertFrom-Json
$distributionDirectory = Join-Path $projectRoot 'dist'
$packageDirectory = Join-Path $distributionDirectory $product.directoryName
if (-not $BuildDirectory) { $BuildDirectory = Join-Path $projectRoot 'build/distribution' }
$BuildDirectory = [IO.Path]::GetFullPath($BuildDirectory, $projectRoot)
$compilerCommand = Get-Command ISCC.exe -CommandType Application -ErrorAction SilentlyContinue
if (-not $compilerCommand) { throw 'Inno Setup 7.1 or later must be on PATH to build the installer.' }
$compiler = $compilerCommand.Source
$compilerVersion = & $compiler --version 2>&1
$parsedVersion = $null
if ($LASTEXITCODE -ne 0 -or
    -not [version]::TryParse(($compilerVersion -join '').Trim(), [ref]$parsedVersion) -or
    $parsedVersion -lt [version]'7.1.0') {
    throw "Inno Setup 7.1 or later is required. PATH currently selects $compiler."
}

Push-Location $projectRoot
try {
    if (-not $SkipBuild) {
        cmake --preset distribution
        if ($LASTEXITCODE -ne 0) { throw 'Release configuration failed.' }
        cmake --build --preset distribution --parallel
        if ($LASTEXITCODE -ne 0) { throw 'Release build failed.' }

        return
    }

    bun scripts/generate_product.mjs --check
    if ($LASTEXITCODE -ne 0) { throw 'Product metadata needs regenerating. Run bun scripts/generate_product.mjs.' }

    ctest --test-dir $BuildDirectory -C Release --output-on-failure
    if ($LASTEXITCODE -ne 0) { throw 'Release tests failed.' }

    if (Test-Path -LiteralPath $packageDirectory) {
        $resolvedPackage = (Resolve-Path -LiteralPath $packageDirectory).Path
        $resolvedDistribution = (Resolve-Path -LiteralPath $distributionDirectory).Path
        if (-not $resolvedPackage.StartsWith($resolvedDistribution + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Package directory must be inside the project dist directory.'
        }
        Remove-Item -LiteralPath $resolvedPackage -Recurse -Force
    }

    cmake --install $BuildDirectory --config Release --prefix $packageDirectory
    if ($LASTEXITCODE -ne 0) { throw 'Package staging failed.' }
    bun scripts/verify_release.mjs Release (Join-Path $packageDirectory $product.executable) (Join-Path $BuildDirectory 'web/Release')
    if ($LASTEXITCODE -ne 0) { throw 'The staged release contains debug/test code or could not be verified.' }

    $compilerMessages = Join-Path $BuildDirectory 'installer-messages.jsonl'
    & $compiler --quiet --messages-jsonl --no-ide-signtools `
        "--define=PackageDir=$packageDirectory" `
        "--output-dir=$distributionDirectory" `
        'scripts/installer/yay.iss' 2> $compilerMessages
    $compilerExitCode = $LASTEXITCODE
    if ((Get-Item -LiteralPath $compilerMessages).Length -gt 0) {
        Get-Content -LiteralPath $compilerMessages | Write-Host
    }
    if ($compilerExitCode -ne 0) { throw "Installer compilation failed. See $compilerMessages." }
    Write-Host "Built the installer with Inno Setup $compilerVersion."
    $installer = Join-Path $distributionDirectory $product.installerAsset
    $digest = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
    "$digest *$($product.installerAsset)" | Set-Content -LiteralPath "$installer.sha256" -Encoding ascii
}
finally {
    Pop-Location
}
