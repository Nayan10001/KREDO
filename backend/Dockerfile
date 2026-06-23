# Stage 1: Dependency builder
FROM python:3.12-slim AS builder

# Install uv for extremely fast, reliable builds
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency specifications from root context
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --frozen

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app

# Copy virtualenv and source code
COPY --from=builder /app/.venv /app/.venv
COPY backend/ ./

# Expose virtualenv binary path and UTF-8 encoding
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONIOENCODING="utf-8"

EXPOSE 8000

CMD ["python", "main.py"]
