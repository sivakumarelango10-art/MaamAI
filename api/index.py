import sys
from pathlib import Path

# Resolve directory structure
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
BACKEND_DIR = ROOT_DIR / "backend"

# Ensure backend directory is in sys.path so 'app.*' imports resolve cleanly
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import the FastAPI application
from app.main import app

# Export for Vercel Serverless Function runtime
# Vercel's Python runtime natively detects ASGI applications exposed as 'app'
__all__ = ["app"]
