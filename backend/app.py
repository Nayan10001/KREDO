import logging
import os
import time
from contextlib import asynccontextmanager

# Initialize logging configuration before logger imports
from core.logging import setup_logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

setup_logging()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from services.history_store import HistoryStoreError, history_store

    try:
        history_store.initialize()
    except HistoryStoreError as exc:
        logger.warning("History store unavailable at startup: %s", exc)
    logger.info("🚀 Fake News Detector API starting up...")
    yield
    logger.info("🛑 Fake News Detector API shutting down...")


app = FastAPI(
    title="Fake News Detector API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS — allow React frontend + Chrome Extension origins ───────────────────
cors_origins_str = os.getenv("CORS_ORIGINS", "*").strip()
if cors_origins_str == "*":
    cors_origins = ["*"]
else:
    cors_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True if cors_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Always log request start/end, including status code and latency."""
    started = time.perf_counter()
    logger.info("➡ %s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.exception("✖ %s %s -> 500 (%.1f ms)", request.method, request.url.path, elapsed_ms)
        raise

    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info("⬅ %s %s -> %d (%.1f ms)", request.method, request.url.path, response.status_code, elapsed_ms)
    return response


# ── Router Registrations ─────────────────────────────────────────────────────
from routes.analyze import router as analyze_router
from routes.health import router as health_router
from routes.history import router as history_router

app.include_router(health_router)
app.include_router(history_router)
app.include_router(analyze_router)
