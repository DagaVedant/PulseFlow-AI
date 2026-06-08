"""Run the PulseFlow AI backend server."""
import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    env = os.environ.get("ENVIRONMENT", "development")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=(env == "development"),
        log_level="info",
    )
