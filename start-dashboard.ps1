# Start Nexus Homelab Dashboard
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

Write-Host "Starting Nexus Homelab Dashboard on http://localhost:3000 ..." -ForegroundColor Cyan

if (Get-Command node -ErrorAction SilentlyContinue) {
    node server.js
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\antigravity\Antigravity.exe") {
    $env:ELECTRON_RUN_AS_NODE = "1"
    & "$env:LOCALAPPDATA\Programs\antigravity\Antigravity.exe" server.js
} else {
    Write-Error "Node.js runtime not found. Install Node.js (https://nodejs.org) or run 'docker compose up -d'."
}
