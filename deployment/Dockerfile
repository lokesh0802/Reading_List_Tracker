# Production image for the Reading List Tracker FastAPI backend.
# Build context must be the repository root, e.g.:
#   docker build -f deployment/Dockerfile -t reading-list-backend .
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first for better layer caching.
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the backend application code.
COPY backend backend

# Render (and most PaaS providers) inject the port to bind to via $PORT.
ENV PORT=8000
EXPOSE 8000

# Production start command: no --reload, binds to 0.0.0.0 and $PORT.
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
