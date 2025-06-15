#!/usr/bin/env python3
"""
Startup script for the FastAPI application.
This script properly sets up the Python path and runs the application.
"""

import sys
import os
from pathlib import Path

# Add the api directory to the Python path
api_dir = Path(__file__).parent
sys.path.insert(0, str(api_dir))

# Now we can import and run the app
if __name__ == "__main__":
    import uvicorn
    from app.core.config import get_settings

    settings = get_settings()

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
