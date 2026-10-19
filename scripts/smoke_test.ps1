param([Parameter(Mandatory)][string]$Executable)
$ErrorActionPreference = 'Stop'
$testDirectory = Join-Path $env:TEMP ('yay-smoke-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $testDirectory | Out-Null
# Run without loose web files so a folder mapping cannot hide an embedding failure.
$appDirectory = Join-Path $testDirectory 'app'
New-Item -ItemType Directory -Force $appDirectory | Out-Null
$executableDirectory = Split-Path -Parent (Resolve-Path -LiteralPath $Executable).Path
Copy-Item -LiteralPath $Executable -Destination (Join-Path $appDirectory 'yay.exe')
Get-ChildItem -LiteralPath $executableDirectory -Filter '*.dll' -File | Copy-Item -Destination $appDirectory
foreach ($directory in @('assets', 'bin', 'licenses')) {
    Copy-Item -LiteralPath (Join-Path $executableDirectory $directory) -Destination $appDirectory -Recurse
}
$Executable = Join-Path $appDirectory 'yay.exe'
$reportPath = Join-Path $testDirectory 'report.json'
$arguments = @('--data-dir', ('"' + (Join-Path $testDirectory 'profile') + '"'), '--smoke-report', ('"' + $reportPath + '"'))
$process = Start-Process -FilePath $Executable -ArgumentList $arguments -WindowStyle Hidden -PassThru
if (-not $process.WaitForExit(45000)) {
    Stop-Process -Id $process.Id
    throw "Native UI smoke test timed out. Artifacts: $testDirectory"
}
if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $reportPath)) {
    throw "Native UI smoke test failed. Artifacts: $testDirectory"
}
$report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json -AsHashtable
$expected = @{ main=@(380,500); settings=@(610,520); setup=@(500,300); updater=@(800,500); 'global-menu'=@(210,110) }
foreach ($name in $expected.Keys) {
    $window = $report[$name]
    if (-not $window.rendered -or -not $window.captured -or $window.viewport.width -ne $expected[$name][0] -or $window.viewport.height -ne $expected[$name][1]) {
        throw "Window '$name' failed rendering or geometry checks. Artifacts: $testDirectory"
    }
    if ($window.ipc.Values -contains $false) { throw "IPC checks failed in '$name'." }
}
foreach ($tab in @('Downloads','YouTube','Advanced','About','Application')) {
    if ([string]::IsNullOrEmpty($report.settings.tabs[$tab])) { throw "Settings tab '$tab' did not render." }
}
if ($report.main.assets.Count -lt 5 -or $report.main.assets.Values -contains $false) {
    throw "Embedded asset checks failed. Artifacts: $testDirectory"
}
Write-Output "Embedded assets, all five native windows, six settings tabs, IPC, and viewport checks passed. Artifacts: $testDirectory"
