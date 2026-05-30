# PulseFlow AI — Start Backend
Set-Location "$PSScriptRoot\backend"

# Create .env if it doesn't exist
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
}

# Ollama hint
Write-Host ""
Write-Host "AI Copilot uses Ollama (local, free, offline)."
Write-Host "If not installed: https://ollama.com"
Write-Host "Then run:  ollama pull llama3.2"
Write-Host "(The platform works without it — AI features fall back to built-in text)"
Write-Host ""

# Create virtual environment if needed
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv venv
}

# Activate venv
& "venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "Installing Python dependencies..."
pip install -r requirements.txt --quiet

# Start server
Write-Host ""
Write-Host "Starting PulseFlow AI Backend on http://localhost:8000"
Write-Host "API Docs: http://localhost:8000/docs"
Write-Host "WebSocket: ws://localhost:8000/ws"
Write-Host ""
python run.py
