# PulseFlow AI — Start Frontend
Set-Location "$PSScriptRoot\frontend"

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..."
    npm install
}

Write-Host ""
Write-Host "Starting PulseFlow AI Frontend on http://localhost:3000"
Write-Host ""
npm run dev
