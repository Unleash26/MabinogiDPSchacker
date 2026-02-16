
# Build Script for Mabinogi Damage Tracker
# Cleans previous builds and creates a fresh publish folder

# Stop on first error
$ErrorActionPreference = "Stop"

$rootDir = Get-Location
$serverDir = "$rootDir\Mabinogi_Damage_Tracker.Server"
$clientDir = "$rootDir\Mabinogi_Damage_Tracker.client"
$overlayDir = "$rootDir\OverlayApp"
$publishDir = "$serverDir\publish"

# --- 0. KILL RUNNING PROCESSES ---
Write-Host ">>> CLEAN: Killing running processes if any..." -ForegroundColor Cyan
$processes = "Mabinogi_Damage_Tracker.Server", "OverlayApp", "dotnet"
foreach ($proc in $processes) {
    if (Get-Process -Name $proc -ErrorAction SilentlyContinue) {
        Write-Host "Killing $proc..." -ForegroundColor Yellow
        Stop-Process -Name $proc -Force -ErrorAction SilentlyContinue
        
        # Wait until it's actually gone
        $timeout = 0
        while ((Get-Process -Name $proc -ErrorAction SilentlyContinue) -and ($timeout -lt 10)) {
            Start-Sleep -Milliseconds 500
            $timeout++
        }
    }
}
Start-Sleep -Seconds 2

# --- 1. CLEAN PREVIOUS BUILDS ---
Write-Host ">>> API: Cleaning previous publish folder..." -ForegroundColor Cyan
if (Test-Path $publishDir) {
    # Use cmd rmdir for better handling of deep paths/locks
    cmd /c "rmdir /s /q ""$publishDir"""
}

$overlayPublish = "$overlayDir\publish_final"
if (Test-Path $overlayPublish) {
    Write-Host ">>> OVERLAY: Cleaning previous publish folder..." -ForegroundColor Cyan
    cmd /c "rmdir /s /q ""$overlayPublish"""
}

# --- 2. BUILD CLIENT (REACT) ---
Write-Host ">>> CLIENT: Building React App..." -ForegroundColor Cyan
Push-Location $clientDir
try {
    # Delete old build folder for safety
    if (Test-Path "build") { cmd /c "rmdir /s /q build" }
    
    # Ensure npm install if needed
    if (-not (Test-Path "node_modules")) {
        cmd /c "npm install"
    }
    cmd /c "npm run build"
}
finally {
    Pop-Location
}

# --- 3. BUILD OVERLAY APP (WPF) ---
Write-Host ">>> OVERLAY: Building WPF App..." -ForegroundColor Cyan
Push-Location $overlayDir
try {
    dotnet publish "OverlayApp.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o "publish_final"
}
finally {
    Pop-Location
}

# --- 4. BUILD SERVER (API) ---
Write-Host ">>> SERVER: Building API Server..." -ForegroundColor Cyan
Push-Location $serverDir
try {
    dotnet publish "Mabinogi_Damage_Tracker.Server.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o "publish"
}
finally {
    Pop-Location
}

# --- 5. ASSEMBLE ---
Write-Host ">>> ASSEMBLING: Organizing artifacts into clean structure..." -ForegroundColor Cyan

# Define paths
$internalDir = "$publishDir\_internal"
$clientDest = "$internalDir\client"

# Create directories
New-Item -ItemType Directory -Force -Path $internalDir | Out-Null
New-Item -ItemType Directory -Force -Path $clientDest | Out-Null

# 1. Copy Server Build (Output to publish folder from step 4)
# Nothing to do, files are already in $publishDir
# We need to MOVE everything except .exe to treated internal folder

$items = Get-ChildItem -Path $publishDir -Exclude "Mabinogi_Damage_Tracker.Server.exe", "_internal"
foreach ($item in $items) {
    Move-Item -Path $item.FullName -Destination $internalDir -Force
}


# 2. Copy Overlay App
# Contains OverlayApp.exe and dependencies
# We want OverlayApp.exe in ROOT
# 2. Copy Overlay App
# Contains OverlayApp.exe and dependencies
# We want OverlayApp.exe in ROOT
$overlayItems = Get-ChildItem -Path "$overlayDir\publish_final"
foreach ($item in $overlayItems) {
    if ($item.Name -like "*.exe") {
        Copy-Item -Path $item.FullName -Destination $publishDir -Force
    }
    else {
        Copy-Item -Path $item.FullName -Destination $internalDir -Recurse -Force
    }
}

# 3. Copy Client Build -> _internal/client
Copy-Item "$clientDir\build\*" -Destination $clientDest -Recurse -Force

# 4. Copy Troubleshooting Guide
if (Test-Path "$rootDir\TROUBLESHOOTING.txt") {
    Copy-Item "$rootDir\TROUBLESHOOTING.txt" -Destination $publishDir -Force
}

Write-Host ">>> Build Complete! Artifacts are in: $publishDir" -ForegroundColor Green
Write-Host ">>> Executable: Mabinogi_Damage_Tracker.Server.exe (Root)" -ForegroundColor Green
Write-Host ">>> Executable: OverlayApp.exe (Root)" -ForegroundColor Green
Write-Host ">>> Please include TROUBLESHOOTING.txt in the distribution zip." -ForegroundColor Yellow
