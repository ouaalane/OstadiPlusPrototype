<#
.SYNOPSIS
  OstadiPlus - one-shot Android build & verify script.

.DESCRIPTION
  Automates the steps that were hand-run on the original build machine
  (see CONTEXT.md Sec.4/Sec.6):

    1. locates a JDK 17 (JAVA_HOME override respected),
    2. locates the Android SDK (ANDROID_HOME override respected),
    3. runs `expo prebuild` when apps/student-app/android is missing,
    4. builds app-debug.apk with Gradle (:app:assembleDebug),
    5. optionally installs + launches the APK on whatever `adb` sees.

.EXAMPLE
  .\scripts\verify-android.ps1                 # build only
  .\scripts\verify-android.ps1 -Install -Launch # build, install, launch
  .\scripts\verify-android.ps1 -SkipBuild       # install + launch only
#>
[CmdletBinding()]
param(
  [switch]$Install,
  [switch]$Launch,
  [switch]$SkipBuild,
  [string]$Jdk,
  [string]$Sdk
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$app  = Join-Path $root 'apps\student-app'

function Find-Jdk17 {
  if ($Jdk) { return $Jdk }
  # Prefer a Gradle-compatible JDK (17-21) even when JAVA_HOME points elsewhere:
  # Gradle 8.14 + the React Native AGP cannot run on very new JDKs.
  $candidates = @(
    'C:\Program Files\Eclipse Adoptium',
    'C:\Program Files\Java',
    'C:\Program Files\Microsoft',
    'C:\Program Files\Zulu'
  ) | Where-Object { Test-Path $_ }
  foreach ($dir in $candidates) {
    $hit = Get-ChildItem $dir -Directory -ErrorAction SilentlyContinue |
      Where-Object Name -match 'jdk-(17|18|19|20|21)' |
      Sort-Object Name -Descending | Select-Object -First 1
    if ($hit -and (Test-Path (Join-Path $hit.FullName 'bin\javac.exe'))) { return $hit.FullName }
  }
  # fall back to JAVA_HOME only when it is itself a compatible JDK
  if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\javac.exe')) -and
      $env:JAVA_HOME -match 'jdk-(17|18|19|20|21)') { return $env:JAVA_HOME }
  throw 'No JDK 17-21 found. Install one (e.g. winget install EclipseAdoptium.Temurin.17.JDK) or pass -Jdk.'
}

function Find-AndroidSdk {
  if ($Sdk) { return $Sdk }
  foreach ($envKey in 'ANDROID_HOME', 'ANDROID_SDK_ROOT') {
    $v = [Environment]::GetEnvironmentVariable($envKey)
    if ($v -and (Test-Path $v)) { return $v }
  }
  $local = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path $local) { return $local }
  throw 'Android SDK not found. Pass -Sdk or set ANDROID_HOME.'
}

# --- 1. JDK ------------------------------------------------------------------
$javaHome = Find-Jdk17
$env:JAVA_HOME = $javaHome
Write-Host "JAVA_HOME = $javaHome"

# --- 2. SDK ------------------------------------------------------------------
$sdkRoot = Find-AndroidSdk
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
Write-Host "ANDROID_HOME = $sdkRoot"

$adb = Join-Path $sdkRoot 'platform-tools\adb.exe'
if (-not (Test-Path $adb)) {
  $fallback = 'C:\platform-tools\adb.exe'
  if (Test-Path $fallback) { $adb = $fallback }
  else { throw "adb.exe not found under $sdkRoot (and no C:\platform-tools fallback)." }
}

# --- 3. prebuild -------------------------------------------------------------
if (-not (Test-Path (Join-Path $app 'android\build.gradle'))) {
  Write-Host 'android/ project missing - running expo prebuild...'
  Push-Location $app
  try {
    npx expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed (exit code $LASTEXITCODE)" }
  }
  finally { Pop-Location }
}

# --- 3b. make the debug APK standalone ---------------------------------------
# Expo/RN skip JS bundling for debuggable variants by default, which leaves a
# debug APK that can only run against Metro. The demo must run standalone, so
# debuggableVariants is emptied (JS bundle + assets get embedded). Re-apply
# after every `expo prebuild` - this block is the guard.
$appGradle = Join-Path $app 'android\app\build.gradle'
$gradleText = Get-Content $appGradle -Raw
if ($gradleText -notmatch 'debuggableVariants\s*=\s*\[\s*\]') {
  Write-Host 'patching build.gradle: debuggableVariants = [] (embed JS bundle in debug APK)...'
  $patched = $gradleText -replace '(?m)^(\s*)// debuggableVariants = \[.*?\]$', "`$1debuggableVariants = []"
  if ($patched -eq $gradleText) { throw 'could not patch debuggableVariants in app\build.gradle - apply it manually.' }
  Set-Content -Path $appGradle -Value $patched -NoNewline
}

# --- 4. gradle build ---------------------------------------------------------
$apk = Join-Path $app 'android\app\build\outputs\apk\debug\app-debug.apk'
if (-not $SkipBuild) {
  Push-Location (Join-Path $app 'android')
  try {
    .\gradlew.bat :app:assembleDebug
    if ($LASTEXITCODE -ne 0) {
      throw "Gradle build failed (exit code $LASTEXITCODE) -- APK NOT updated."
    }
  }
  finally { Pop-Location }
}
if (-not (Test-Path $apk)) { throw "APK not produced: $apk" }
Write-Host ("APK OK: {0} ({1:N1} MB)" -f $apk, ((Get-Item $apk).Length / 1MB))

# --- 5. install / launch -----------------------------------------------------
if ($Install -or $Launch) {
  & $adb start-server | Out-Null
  $devices = & $adb devices
  if (($devices | Select-String -Pattern "`tdevice$").Count -eq 0) {
    throw 'No device/emulator attached (adb devices is empty). Boot one first.'
  }
}
if ($Install) {
  & $adb install -r $apk
  if ($LASTEXITCODE -ne 0) { throw "adb install failed ($LASTEXITCODE)" }
}
if ($Launch) {
  & $adb shell am start -n ma.atlas.ostadiplus.student/.MainActivity
  if ($LASTEXITCODE -ne 0) { throw "am start failed ($LASTEXITCODE)" }
}

Write-Host 'verify-android: DONE'
