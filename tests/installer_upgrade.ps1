param([Parameter(Mandatory)][string]$Compiler)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('yay-installer-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null

function Write-FixtureFile([string]$Path, [string]$Contents) {
    New-Item -ItemType Directory -Path (Split-Path $Path -Parent) -Force | Out-Null
    [IO.File]::WriteAllText($Path, $Contents)
}

function Get-InstallerSection([string]$Source, [string]$Name) {
    $section = [regex]::Match($Source, '(?ms)^\[' + [regex]::Escape($Name) + '\]\s*\r?\n(.*?)(?=^\[|\z)')
    if (-not $section.Success) { throw "Missing installer section: $Name" }

    return $section.Groups[1].Value
}

$installerSource = Get-Content -LiteralPath (Join-Path $projectRoot 'scripts/installer/yay.iss') -Raw
$cleanup = Get-InstallerSection $installerSource 'InstallDelete'
foreach ($line in $cleanup -split '\r?\n') {
    if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith(';')) { continue }

    # Refuse wildcards, parent paths, or external locations before executing any deletion rules.
    $entry = [regex]::Match($line.Trim(), '^Type: (?:files|filesandordirs|dirifempty); Name: "\{app\}\\([A-Za-z0-9_.-]+)"$')
    if (-not $entry.Success -or $entry.Groups[1].Value -in @('.', '..')) {
        throw "Cleanup must name individual files or directories directly under {app}: $line"
    }
}

$files = Get-InstallerSection $installerSource 'Files'
$icons = Get-InstallerSection $installerSource 'Icons'
$startMenuIcon = @($icons -split '\r?\n' | Where-Object { $_.Contains('{autoprograms}') })
if ($startMenuIcon.Count -ne 1) { throw 'Expected one Start Menu shortcut.' }

# Exercise the production sections with a tiny package. No registry entries, launches, or real shortcuts.
$fixtureScript = @'
#include "PRODUCT_DEFINITIONS"
#define PackageDir "PACKAGE_DIRECTORY"
[Setup]
AppId=yay-installer-test
AppName=yay installer test
AppVersion=1.0
DefaultDirName=INSTALL_DIRECTORY
OutputDir=OUTPUT_DIRECTORY
OutputBaseFilename=installer-fixture
PrivilegesRequired=lowest
SetupArchitecture=x64
Uninstallable=no
UsePreviousAppDir=no
CloseApplications=no
DisableDirPage=yes
DisableProgramGroupPage=yes
Compression=none
[InstallDelete]
CLEANUP_ENTRIES
[Files]
FILE_ENTRIES
[Icons]
ICON_ENTRY
'@
$fixtureScript = $fixtureScript.Replace('PRODUCT_DEFINITIONS', (Join-Path $projectRoot 'scripts/installer/product.generated.iss'))
$fixtureScript = $fixtureScript.Replace('PACKAGE_DIRECTORY', (Join-Path $testRoot 'package'))
$fixtureScript = $fixtureScript.Replace('INSTALL_DIRECTORY', (Join-Path $testRoot 'install'))
$fixtureScript = $fixtureScript.Replace('OUTPUT_DIRECTORY', $testRoot)
$fixtureScript = $fixtureScript.Replace('CLEANUP_ENTRIES', $cleanup).Replace('FILE_ENTRIES', $files)
$fixtureScript = $fixtureScript.Replace('ICON_ENTRY', $startMenuIcon[0].Replace('{autoprograms}', '{app}\Start Menu\Programs'))
$fixturePath = Join-Path $testRoot 'fixture.iss'
[IO.File]::WriteAllText($fixturePath, $fixtureScript)

$packageFiles = @('yay.exe', 'bin/7za.exe', 'assets/tray/default.ico', 'licenses/webview2.txt', 'vcruntime140.dll')
foreach ($file in $packageFiles) {
    Write-FixtureFile (Join-Path $testRoot "package/$file") "v2 payload: $file"
}

$compileLog = Join-Path $testRoot 'compile.log'
& $Compiler --quiet --no-ide-signtools $fixturePath *> $compileLog
if ($LASTEXITCODE -ne 0) { throw "Installer fixture compilation failed. See $compileLog" }

$legacyFiles = @(
    'resources/app.asar', 'resources/native/addon.node', 'resources/tray.asar', 'resources/notifications.asar',
    'locales/en-US.pak', 'swiftshader/libGLESv2.dll', 'chrome_100_percent.pak', 'chrome_200_percent.pak',
    'chrome_elf.dll', 'd3dcompiler_47.dll', 'dxcompiler.dll', 'dxil.dll', 'ffmpeg.dll', 'icudtl.dat',
    'libEGL.dll', 'libGLESv2.dll', 'LICENSE.electron.txt', 'LICENSES.chromium.html', 'natives_blob.bin',
    'resources.pak', 'snapshot_blob.bin', 'v8_context_snapshot.bin', 'vk_swiftshader_icd.json',
    'vk_swiftshader.dll', 'vulkan-1.dll', '7za.exe', 'yt-dlp.exe', 'deno.exe', 'ffmpeg.exe', 'ffprobe.exe'
)
$preservedFiles = @(
    'yay.cfg', 'yay.production.cfg', 'features.toml', 'media/video.mp4', 'recording.mp3', 'custom.dll',
    'unins000.exe', 'unins000.dat', 'unins001.exe', 'unins001.dat'
)
$shell = New-Object -ComObject WScript.Shell

foreach ($scenario in @('fresh', 'legacy', 'mixed')) {
    $installDirectory = Join-Path $testRoot $scenario
    $preservedHashes = @{}
    $scenarioPreservedFiles = @()
    if ($scenario -ne 'fresh') { $scenarioPreservedFiles += $preservedFiles }
    if ($scenario -eq 'mixed') { $scenarioPreservedFiles += @('bin/yt-dlp.exe', 'bin/deno.exe', 'bin/ffmpeg.exe', 'bin/ffprobe.exe') }
    foreach ($file in $scenarioPreservedFiles) {
        $path = Join-Path $installDirectory $file
        Write-FixtureFile $path "preserve: $file"
        $preservedHashes[$path] = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
    }

    # Settings and downloads normally live outside the installation directory.
    foreach ($file in @('AppData/yay.cfg', 'AppData/yay.production.cfg', 'Downloads/video.mp4')) {
        $path = Join-Path $testRoot $file
        Write-FixtureFile $path "preserve outside app: $file"
        $preservedHashes[$path] = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
    }

    if ($scenario -ne 'fresh') {
        foreach ($file in $legacyFiles) {
            Write-FixtureFile (Join-Path $installDirectory $file) "v1 payload: $file"
        }
        Write-FixtureFile (Join-Path $installDirectory 'yay.exe') 'old application'
    }

    if ($scenario -eq 'mixed') {
        foreach ($file in $packageFiles) {
            $path = Join-Path $installDirectory $file
            New-Item -ItemType Directory -Path (Split-Path $path -Parent) -Force | Out-Null
            Copy-Item -LiteralPath (Join-Path $testRoot "package/$file") -Destination $path -Force
        }
    }

    # A second install checks that cleanup is safe to repeat after a successful upgrade.
    foreach ($pass in 1..2) {
        $log = Join-Path $testRoot "$scenario-$pass.log"
        $arguments = @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', "/DIR=`"$installDirectory`"", "/LOG=`"$log`"")
        $process = Start-Process -FilePath (Join-Path $testRoot 'installer-fixture.exe') -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru
        if ($process.ExitCode -ne 0) { throw "Installer failed ($scenario, pass $pass). See $log" }

        foreach ($file in $legacyFiles + @('resources', 'locales', 'swiftshader')) {
            if (Test-Path -LiteralPath (Join-Path $installDirectory $file)) { throw "Legacy payload remains: $scenario/$file" }
        }
        foreach ($path in $preservedHashes.Keys) {
            if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $preservedHashes[$path]) {
                throw "Installer changed a preserved file: $path"
            }
        }
        foreach ($file in $packageFiles) {
            $expectedHash = (Get-FileHash -LiteralPath (Join-Path $testRoot "package/$file") -Algorithm SHA256).Hash
            if ((Get-FileHash -LiteralPath (Join-Path $installDirectory $file) -Algorithm SHA256).Hash -ne $expectedHash) {
                throw "Installed payload differs from the package: $scenario/$file"
            }
        }

        $shortcutPath = Join-Path $installDirectory 'Start Menu/Programs/Caprine Logic/yay.lnk'
        if (-not (Test-Path -LiteralPath $shortcutPath)) { throw 'Missing company-folder shortcut.' }
        $shortcut = $shell.CreateShortcut($shortcutPath)
        if ($shortcut.TargetPath -ne (Join-Path $installDirectory 'yay.exe') -or $shortcut.Arguments -ne '--from-shortcut') {
            throw 'Incorrect Start Menu shortcut target or arguments.'
        }
        if (Test-Path -LiteralPath (Join-Path $installDirectory 'Start Menu/Programs/yay.lnk')) {
            throw 'Installer created a root-level Start Menu shortcut.'
        }
    }
    Write-Host "Installer $scenario and reinstall passed."
}

Write-Host "Installer test logs: $testRoot"
