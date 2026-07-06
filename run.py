"""Run the PulseFlow AI backend and frontend together.

Usage: python run.py
Assumes one-time setup is already done:
  backend:  cd backend && python -m venv venv && pip install -r requirements.txt
  frontend: cd frontend && npm install
"""

import os
import subprocess
import sys
import shutil
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")

IS_WINDOWS = sys.platform == "win32"


def backend_python():
    venv_python = os.path.join(
        BACKEND_DIR,
        "venv",
        "Scripts" if IS_WINDOWS else "bin",
        "python.exe" if IS_WINDOWS else "python",
    )
    return venv_python if os.path.exists(venv_python) else sys.executable


def start(cmd, cwd):
    kwargs = {"cwd": cwd}
    if IS_WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    return (
        subprocess.Popen(cmd, cwd=cwd, shell=IS_WINDOWS)
        if IS_WINDOWS
        else subprocess.Popen(cmd, cwd=cwd)
    )


def stop(proc, name):
    if proc.poll() is not None:
        return
    print(f"stopping {name}...")
    if IS_WINDOWS:
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


def main():
    # avoid the OneDrive .next placeholder crash mentioned in the README
    next_dir = os.path.join(FRONTEND_DIR, ".next")
    if os.path.exists(next_dir):
        shutil.rmtree(next_dir, ignore_errors=True)

    print("starting backend on http://localhost:8000 ...")
    backend = start([backend_python(), "run.py"], cwd=BACKEND_DIR)

    time.sleep(1)

    print("starting frontend on http://localhost:3000 ...")
    frontend = start(["npm", "run", "dev"], cwd=FRONTEND_DIR)

    try:
        while True:
            if backend.poll() is not None:
                print("backend exited unexpectedly")
                break
            if frontend.poll() is not None:
                print("frontend exited unexpectedly")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nshutting down...")
    finally:
        stop(frontend, "frontend")
        stop(backend, "backend")


if __name__ == "__main__":
    main()
