# Center the running Android emulator window on the primary screen.
#
# Why: the emulator (Qt frontend) can come up with saved geometry that is
# larger than the display or pushed above the top edge (e.g. y = -841), so
# the phone screen looks cut off. This helper resizes the window to fit the
# work area (keeping the phone aspect ratio), centers it and raises it.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\center-emulator.ps1
# ASCII-only on purpose (Windows PowerShell 5.1 reads .ps1 files as ANSI).

$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class EmuWin32 {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, out RECT pvParam, uint fWinIni);
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int nIndex);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@

# --- locate the emulator main window ---------------------------------------
$candidates = Get-Process -Name 'qemu-system-x86_64', 'emulator' -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like 'Android Emulator*' }
if (-not $candidates) {
  Write-Error 'No running Android emulator window found. Start the emulator first.'
}
$proc = $candidates | Select-Object -First 1
$h = $proc.MainWindowHandle
Write-Host "Emulator window : $($proc.MainWindowTitle) (PID $($proc.Id), hwnd $h)"

# --- measure the work area (falls back to the full screen) ------------------
$work = New-Object EmuWin32+RECT
$hasWork = [EmuWin32]::SystemParametersInfo(0x0030, 0, [ref]$work, 0)
if ($hasWork) {
  $sw = $work.Right - $work.Left; $sh = $work.Bottom - $work.Top
  $sx = $work.Left; $sy = $work.Top
} else {
  $sw = [EmuWin32]::GetSystemMetrics(0); $sh = [EmuWin32]::GetSystemMetrics(1)
  $sx = 0; $sy = 0
}

$r = New-Object EmuWin32+RECT
[void][EmuWin32]::GetWindowRect($h, [ref]$r)
$w = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top
Write-Host "Current         : $($r.Left),$($r.Top) ${w}x${ht}  (screen work area ${sw}x${sh})"

# --- fit inside the work area (8 px margin), keep the phone aspect ratio ----
$targetH = $sh - 8
$targetW = [int][Math]::Round($targetH * $w / $ht)
if ($targetW -gt ($sw - 8)) {
  $targetW = $sw - 8
  $targetH = [int][Math]::Round($targetW * $ht / $w)
}
$x = $sx + [int](($sw - $targetW) / 2)
$y = $sy + [int](($sh - $targetH) / 2)

# --- position + raise --------------------------------------------------------
if ([EmuWin32]::IsIconic($h)) { [void][EmuWin32]::ShowWindow($h, 9) }  # SW_RESTORE
$SWP_NOZORDER = 0x4; $SWP_NOACTIVATE = 0x10
[void][EmuWin32]::SetWindowPos($h, [IntPtr]::Zero, $x, $y, $targetW, $targetH, $SWP_NOZORDER -bor $SWP_NOACTIVATE)
[void][EmuWin32]::BringWindowToTop($h)
[void][EmuWin32]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 400

if ([EmuWin32]::GetForegroundWindow() -ne $h) {
  # Windows may refuse the foreground change; a minimize/restore flash forces it.
  [void][EmuWin32]::ShowWindow($h, 6)   # SW_MINIMIZE
  Start-Sleep -Milliseconds 600
  [void][EmuWin32]::ShowWindow($h, 9)   # SW_RESTORE
  Start-Sleep -Milliseconds 600
  [void][EmuWin32]::SetWindowPos($h, [IntPtr]::Zero, $x, $y, $targetW, $targetH, $SWP_NOZORDER -bor $SWP_NOACTIVATE)
}

# --- verify ------------------------------------------------------------------
$r2 = New-Object EmuWin32+RECT
[void][EmuWin32]::GetWindowRect($h, [ref]$r2)
$cx = $r2.Left + ($r2.Right - $r2.Left) / 2
$cy = $r2.Top + ($r2.Bottom - $r2.Top) / 2
Write-Host "Centered        : $($r2.Left),$($r2.Top) $($r2.Right - $r2.Left)x$($r2.Bottom - $r2.Top)"
Write-Host "Window center   : $([int]$cx),$([int]$cy)  (screen center: $($sx + [int]($sw / 2)),$($sy + [int]($sh / 2)))"
