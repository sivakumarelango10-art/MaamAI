"""
Entrypoint for Vercel Serverless Function (index.py).
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
