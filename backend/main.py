"""
Entrypoint for Vercel Serverless Function & local execution.
Exposes the FastAPI 'app' instance from app.main.
"""

import sys
from pathlib import Path

# Ensure backend directory is in sys.path so 'app.*' imports resolve cleanly
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
