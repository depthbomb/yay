param([Parameter(Mandatory)][string]$Executable)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class WindowLifecycle {
    public delegate bool EnumProc(IntPtr window, IntPtr data);
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct HighContrast { public uint Size, Flags; public IntPtr Scheme; }
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr data);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr window, StringBuilder name, int count);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr window);
    [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] public static extern IntPtr GetWindowDC(IntPtr window);
    [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr window, IntPtr dc);
    [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr target, int x, int y, int width, int height, IntPtr source, int sx, int sy, uint operation);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string name, string title);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr window, uint message, IntPtr wparam, IntPtr lparam);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern bool SystemParametersInfo(uint action, uint parameter, ref HighContrast value, uint flags);

    public static bool IsHighContrast() {
        var contrast = new HighContrast { Size = (uint)Marshal.SizeOf<HighContrast>() };
        return SystemParametersInfo(0x42, contrast.Size, ref contrast, 0) && (contrast.Flags & 1) != 0;
    }

    public static IntPtr FindMain(uint process) {
        return FindVisible(process, "yay.WebView2.Window", 380);
    }

    public static IntPtr FindVisible(uint process, string windowClass, int width) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((window, _) => {
            uint pid;
            GetWindowThreadProcessId(window, out pid);
            if (pid != process || !IsWindowVisible(window)) { return true; }
            var name = new StringBuilder(128);
            GetClassName(window, name, name.Capacity);
            Rect client;
            GetClientRect(window, out client);
            uint dpi = GetDpiForWindow(window);
            if (name.ToString() == windowClass && (width == 0 || Math.Abs(client.Right * 96.0 / dpi - width) < 1)) {
                found = window;
                return false;
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }
}
'@

function Get-WindowBitmap([IntPtr]$Window) {
    if (-not [WindowLifecycle]::IsWindowVisible($Window)) { throw 'The reopened window is not visible.' }
    $bounds = [WindowLifecycle+Rect]::new()
    if (-not [WindowLifecycle]::GetWindowRect($Window, [ref]$bounds)) { throw 'Cannot read window bounds.' }
    $bitmap = [Drawing.Bitmap]::new($bounds.Right - $bounds.Left, $bounds.Bottom - $bounds.Top)
    try {
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        $target = $graphics.GetHdc()
        $source = [WindowLifecycle]::GetWindowDC($Window)
        try {
            # PrintWindow would repaint the host and conceal a stale backing surface.
            if (-not [WindowLifecycle]::BitBlt($target, 0, 0, $bitmap.Width, $bitmap.Height, $source, 0, 0, 0x00CC0020)) {
                throw 'Cannot capture the existing native window surface.'
            }
        } finally {
            [WindowLifecycle]::ReleaseDC($Window, $source) | Out-Null
            $graphics.ReleaseHdc($target)
            $graphics.Dispose()
        }
        return $bitmap
    } catch {
        $bitmap.Dispose()
        throw
    }
}

function Assert-Background([IntPtr]$Window, [string]$File) {
    $bitmap = Get-WindowBitmap $Window
    try {
        $bitmap.Save($File, [Drawing.Imaging.ImageFormat]::Png)
        $scale = [WindowLifecycle]::GetDpiForWindow($Window) / 96.0
        foreach ($x in @([int](20 * $scale), [int]($bitmap.Width / 2), [int]($bitmap.Width - 20 * $scale))) {
            $pixel = $bitmap.GetPixel($x, [int](40 * $scale))
            if ($pixel.R -gt 64 -or $pixel.G -gt 64 -or $pixel.B -gt 64) {
                throw "The native background turned opaque after reopening: $pixel. Capture: $File"
            }
        }
    } finally {
        $bitmap.Dispose()
    }
}

[WindowLifecycle]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null
$testDirectory = Join-Path $env:TEMP ('yay-window-lifecycle-' + [guid]::NewGuid().ToString('N'))
$profile = Join-Path $testDirectory 'profile'
New-Item -ItemType Directory -Force $profile | Out-Null
Set-Content -LiteralPath (Join-Path $profile 'yay.production.cfg') -Value @'
hide-setup-window = true
enable-new-release-toast = false
'@
$arguments = @('--skip-setup', '--show', '--data-dir', ('"' + $profile + '"'))
$process = Start-Process -FilePath $Executable -ArgumentList $arguments -WindowStyle Hidden -PassThru
try {
    $window = [IntPtr]::Zero
    for ($attempt = 0; $attempt -lt 150; ++$attempt) {
        Start-Sleep -Milliseconds 100
        $window = [WindowLifecycle]::FindMain($process.Id)
        if ($window -ne [IntPtr]::Zero) { break }
        if ($process.HasExited) { throw "The app exited before opening its main window. Artifacts: $testDirectory" }
    }
    if ($window -eq [IntPtr]::Zero) { throw "The main window did not appear. Artifacts: $testDirectory" }
    Start-Sleep -Milliseconds 500
    Assert-Background $window (Join-Path $testDirectory 'initial.png')

    for ($cycle = 1; $cycle -le 10; ++$cycle) {
        [WindowLifecycle]::PostMessage($window, 0x10, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
        Start-Sleep -Milliseconds 250
        if ([WindowLifecycle]::IsWindowVisible($window)) { throw 'The main window did not hide.' }
        $reopen = Start-Process -FilePath $Executable -ArgumentList $arguments -WindowStyle Hidden -PassThru
        if (-not $reopen.WaitForExit(10000)) {
            Stop-Process -Id $reopen.Id
            throw 'The second instance did not reopen the existing window.'
        }
        if ($reopen.ExitCode -ne 0) { throw 'The second instance failed.' }
        Start-Sleep -Milliseconds 500
        Assert-Background $window (Join-Path $testDirectory "reopened-$cycle.png")
    }
    $hostWindow = [WindowLifecycle]::FindWindow('yay.WebView2.Host', $profile)
    [WindowLifecycle]::PostMessage($window, 0x10, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
    Start-Sleep -Milliseconds 250
    for ($cycle = 1; $cycle -le 4; ++$cycle) {
        # Exercise the registered hotkey's handler without taking over a system-wide key binding.
        [WindowLifecycle]::PostMessage($hostWindow, 0x0312, [IntPtr]1, [IntPtr]::Zero) | Out-Null
        Start-Sleep -Milliseconds 500
        $globalMenu = [WindowLifecycle]::FindVisible($process.Id, 'yay.WebView2.Window', 210)
        if ($globalMenu -eq [IntPtr]::Zero) { throw 'The global menu did not show.' }
        Assert-Background $globalMenu (Join-Path $testDirectory "global-menu-$cycle.png")
        if ($cycle % 2 -eq 0) {
            [WindowLifecycle]::PostMessage($globalMenu, 0x0006, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
        } else {
            [WindowLifecycle]::PostMessage($hostWindow, 0x0312, [IntPtr]1, [IntPtr]::Zero) | Out-Null
        }
        Start-Sleep -Milliseconds 250
        if ([WindowLifecycle]::IsWindowVisible($globalMenu)) { throw 'The global menu did not hide after toggling or blurring.' }
    }

    $preference = Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -ErrorAction SilentlyContinue
    $expectDark = $null -ne $preference.AppsUseLightTheme -and $preference.AppsUseLightTheme -eq 0
    for ($cycle = 1; $cycle -le 2; ++$cycle) {
        if ($cycle -eq 2) {
            [WindowLifecycle]::PostMessage($hostWindow, 0x001A, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
        }
        [WindowLifecycle]::PostMessage($hostWindow, 0x8002, [IntPtr]::Zero, [IntPtr]0x007B) | Out-Null
        $menu = [IntPtr]::Zero
        for ($attempt = 0; $attempt -lt 50; ++$attempt) {
            Start-Sleep -Milliseconds 100
            $menu = [WindowLifecycle]::FindVisible($process.Id, '#32768', 0)
            if ($menu -ne [IntPtr]::Zero) { break }
        }
        if ($menu -eq [IntPtr]::Zero) { throw 'The tray context menu did not appear.' }
        Start-Sleep -Milliseconds 300
        $bitmap = Get-WindowBitmap $menu
        try {
            $bitmap.Save((Join-Path $testDirectory "tray-menu-$cycle.png"), [Drawing.Imaging.ImageFormat]::Png)
            $pixel = $bitmap.GetPixel($bitmap.Width - 10, 10)
            $isDark = ($pixel.R + $pixel.G + $pixel.B) / 3 -lt 128
            if (-not [WindowLifecycle]::IsHighContrast() -and $isDark -ne $expectDark) {
                throw "Tray menu does not match the Windows app theme: $pixel. Artifacts: $testDirectory"
            }
        } finally {
            $bitmap.Dispose()
            [WindowLifecycle]::PostMessage($hostWindow, 0x001F, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
        }
        Start-Sleep -Milliseconds 200
    }
    Write-Output "Main/global-menu visibility, transparency, and system-themed tray menu checks passed. Artifacts: $testDirectory"
} finally {
    $hostWindow = [WindowLifecycle]::FindWindow('yay.WebView2.Host', $profile)
    if ($hostWindow -ne [IntPtr]::Zero) {
        [WindowLifecycle]::PostMessage($hostWindow, 0x001F, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
        [WindowLifecycle]::PostMessage($hostWindow, 0x10, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
    }
    if (-not $process.WaitForExit(15000)) { Stop-Process -Id $process.Id }
}
