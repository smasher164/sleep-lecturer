# ── Stage 1: build frontend ───────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend + built frontend ──────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Install runtime dependencies
RUN pip install --no-cache-dir \
    "fastapi>=0.111.0" \
    "uvicorn[standard]>=0.29.0" \
    "openai>=1.30.0" \
    "elevenlabs>=1.2.0" \
    "pydantic>=2.7.0" \
    "pydantic-settings>=2.2.0" \
    "python-dotenv>=1.0.0" \
    "httpx>=0.27.0" \
    "aiofiles>=23.2.1"

COPY backend/app/ ./app/
COPY --from=frontend /app/frontend/dist ./static

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
