# ==============================================================================
# Multi-Stage Dockerfile for WindSight
# Stage 1: Build the React TypeScript frontend with Vite & Tailwind CSS
# Stage 2: Production Python runtime serving FastAPI and static frontend assets
# ==============================================================================

# --- Stage 1: Frontend Build ---
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --prefer-offline

# Copy frontend source and build production bundle
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Final Production Runtime ---
FROM python:3.10-slim AS runner

# Security and Python runtime optimization
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    STATIC_DIR=/app/static \
    DATABASE_PATH=/app/data/wind_data.db \
    SEED_DATA_DIR=/app/backend/app/db/seed_data \
    AUTO_SEED_ON_STARTUP=true

# Install system dependencies (curl for container healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root application user
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/bash -m appuser

WORKDIR /app

# Install Python backend dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy compiled frontend from Stage 1 into /app/static
COPY --from=frontend-builder /frontend/dist /app/static

# Copy backend source code and seed data
COPY backend/ /app/backend/

# Create data directory, pre-seed SQLite database from bundled seed files, and set permissions
RUN mkdir -p /app/data && \
    python -c "import sys; sys.path.insert(0, '/app'); from backend.app.db.database import get_db; from backend.app.db.seed import seed_database_if_empty; seed_database_if_empty(get_db('/app/data/wind_data.db'))" && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 8000

# Container healthcheck against /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start Uvicorn ASGI server with signal forwarding
CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
