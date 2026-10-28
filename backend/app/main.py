"""
WindSight FastAPI Application
=============================
Main application entrypoint with lifespan event management,
CORS middleware, error handlers, and route aggregation.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

from backend.app.config import settings
from backend.app.db.database import get_db
from backend.app.db.seed import seed_database_if_empty
from backend.app.api.routes import router as api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("windsight.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database schema and populates seed data on startup if needed."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}...")
    db = get_db()
    if settings.auto_seed_on_startup:
        logger.info("Checking seed data on startup...")
        seed_result = seed_database_if_empty(db)
        logger.info(f"Seed startup status: {seed_result}")
    yield
    logger.info("Shutting down WindSight application...")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Intelligence platform for UK wholesale electricity day-ahead procurement. Evaluates wind generation forecasts and actuals from Elexon BMRS.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API router
app.include_router(api_router)

# Determine static frontend directory (configurable via STATIC_DIR env var)
default_static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
STATIC_DIR = os.getenv("STATIC_DIR", default_static_dir)

if os.path.exists(STATIC_DIR):
    logger.info(f"Production static assets detected at: {STATIC_DIR}")
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_frontend(full_path: str):
        # Prevent intercepting unknown API routes with HTML
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "API endpoint not found."})

        # Return exact static file if it exists (e.g., favicon.svg)
        candidate = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)

        # Fallback to index.html for SPA client-side routing
        index_file = os.path.join(STATIC_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Frontend assets not found."})

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error_type": type(exc).__name__}
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port)
