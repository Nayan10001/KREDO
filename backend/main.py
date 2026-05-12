"""
main.py — FastAPI app entry point.

This file:
  1. Creates the FastAPI app
  2. Configures CORS for React frontend + Chrome Extension
  3. Defines the streaming and simple analysis endpoints
  4. Uses the compiled LangGraph pipeline from claim_extraction
       claim_extraction → evidence_retrieval → fact_checker
  5. Runs uvicorn
"""

import asyncio
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, File, Request, UploadFile
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

# ── Logging setup ────────────────────────────────────────────────────────────
# Must be called before any logger.getLogger() so handlers are in place for
# ALL modules (uvicorn reloader spawns a child process; without this, every
# logger.info / logger.warning call in the pipeline is silently dropped).
import sys as _sys
import os as _os

# Force stdout to line-buffered mode so every print() / log record
# appears immediately in the terminal. Must use reconfigure() because
# os.environ["PYTHONUNBUFFERED"] is too late once the interpreter starts.
try:
    _sys.stdout.reconfigure(line_buffering=True)
except AttributeError:
    pass  # Python < 3.7 or non-TextIOWrapper stdout — safe to ignore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(_sys.stdout)],
    force=True,   # overrides any handlers uvicorn already attached
)

# Silence noisy third-party loggers you don't need
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("langchain").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

# ── Route all print() calls from pipeline modules through the logger ─────────
# Pipeline nodes (evidence_retrieval, fact_checker, etc.) use print() for
# status output. On Windows with uvicorn --reload the worker stdout can be
# swallowed. Patching builtins.print sends everything through logging instead,
# which is guaranteed to reach the terminal via our StreamHandler above.
import builtins as _builtins
_pipeline_logger = logging.getLogger("pipeline")

_original_print = _builtins.print

def _logging_print(*args, **kwargs):
    sep = kwargs.get("sep", " ")
    end = kwargs.get("end", "")   # absorbed — logger adds its own newline
    msg = sep.join(str(a) for a in args)
    if msg.strip():               # skip blank print() calls
        _pipeline_logger.info(msg)
    # Always flush so output appears immediately on Windows
    _sys.stdout.flush()

_builtins.print = _logging_print


try:
    from agents.agent0_multilingual import SUPPORTED_LANGUAGES as _MULTILINGUAL_LANGUAGES
except Exception:  # noqa: BLE001
    _MULTILINGUAL_LANGUAGES: dict = {}


MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB


def _json_default(value):
    """Fallback encoder so SSE payload serialization doesn't crash the stream."""
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _sse_data(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=_json_default)}\n\n"


def _require_non_empty_input(value: str | None, field_name: str = "user_input") -> str:
    text = str(value or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail=f"{field_name} is required and must not be empty")
    return text


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Lifespan — startup / shutdown hooks
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@asynccontextmanager
async def lifespan(app: FastAPI):
    from services.history_store import history_store
    from services.history_store import HistoryStoreError

    try:
        history_store.initialize()
    except HistoryStoreError as exc:
        logger.warning("History store unavailable at startup: %s", exc)
    logger.info("🚀 Fake News Detector API starting up...")
    yield
    logger.info("🛑 Fake News Detector API shutting down...")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# App instance
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app = FastAPI(
    title="Fake News Detector API",
    version="1.0.0",
    lifespan=lifespan,
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CORS — allow React frontend + Chrome Extension origins
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# History — Supabase-backed store
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _make_history_entry(url: str, result: dict, source: str = "webapp") -> dict:
    verdicts = result.get("verdicts") or []
    explanations = result.get("explanations") or {}
    scores = [v.get("truth_score", 50) for v in verdicts if isinstance(v, dict)]
    avg_score = round(sum(scores) / len(scores)) if scores else 0
    overall = explanations.get("overall_credibility")
    if not overall:
        overall = (
            "CREDIBLE" if avg_score >= 70
            else "MIXED" if avg_score >= 50
            else "LOW CREDIBILITY" if avg_score >= 30
            else "UNRELIABLE"
        )
    return {
        "id": str(uuid.uuid4()),
        "url": url,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "overall_credibility": overall,
        "avg_score": avg_score,
        "bottom_line": explanations.get("bottom_line", ""),
        "verdicts": verdicts,
        "explanations": explanations,
        "source": source,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Helper: build initial state and invoke graph
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _build_initial_state(user_input: str, top_n: int = 3) -> dict:
    """Build a fresh AgentState dict for the LangGraph pipeline."""
    return {
        "user_input": user_input,
        "raw_markdown": "",
        "claims": [],
        "evidence_map": {},
        "credibility_map": {},
        "explanations": {},
        "verdicts": [],
        "top_n": top_n,
        "pub_date": None,
        "author": None,
        "source_domain": None,
        "error": "",
    }


def run_pipeline(user_input: str, top_n: int = 3) -> dict:
    """
    Run the full 5-agent LangGraph pipeline synchronously.
      1. claim_extraction     → "What should we fact-check?"
      2. evidence_retrieval   → "What evidence do we have?"
      3. source_credibility   → "How trustworthy are these sources?"
      4. fact_checker          → "Given this evidence, what is the verdict?"
      5. explanation_generator → "How do we explain this to a human?"
    """
    from agents.claim_extraction import claim_extraction_graph

    initial_state = _build_initial_state(user_input, top_n=top_n)
    result = claim_extraction_graph.invoke(initial_state)
    return result


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@app.get("/api/analyze-stream")
async def analyze_stream(user_input: str | None = None):
    """
    Streaming endpoint for the website (shows chain of thought).
    Returns SSE stream of agent execution events.
    """
    from agents.claim_extraction import claim_extraction_graph
    clean_input = _require_non_empty_input(user_input)
    logger.info("[/api/analyze-stream] request received (input_len=%d)", len(clean_input))

    async def event_generator():
        completed_successfully = False
        try:
            initial_state = _build_initial_state(clean_input)
            _detected_lang_name: str | None = None  # track across agent0_pre → agent0_post
            # Stream events from the compiled LangGraph
            for event in claim_extraction_graph.stream(initial_state):
                if not isinstance(event, dict):
                    logger.warning("[/api/analyze-stream] unexpected event type: %s", type(event).__name__)
                    continue

                for node_name, node_output in event.items():
                    node_data = node_output if isinstance(node_output, dict) else {}
                    payload = {
                        "agent": node_name,
                        "status": "error" if node_data.get("error") else "success",
                        "data": node_data,
                    }
                    yield _sse_data(payload)

                    # Agent 0 pre — emit language detection log
                    if node_name == "agent0_pre" and node_data.get("is_translated"):
                        src_lang = node_data.get("source_language", "")
                        _detected_lang_name = _MULTILINGUAL_LANGUAGES.get(src_lang, src_lang)
                        yield _sse_data({'type': 'agent_log', 'symbol': '→', 'message': f'Detected {_detected_lang_name} — translating to English via Sarvam AI'})

                    # Agent 0 post — emit localization log
                    if node_name == "agent0_post" and node_data.get("localized_output") and _detected_lang_name:
                        yield _sse_data({'type': 'agent_log', 'symbol': '\u2713', 'message': f'Verdicts localized back to {_detected_lang_name}'})
                    # Agent 6 — image integrity log events
                    if node_name == "image_integrity":
                        num_images = len(node_data.get("image_urls") or [])
                        tamper = any(v.get("exif_tamper_flag") for v in (node_data.get("media_verdicts") or []))
                        ocr_found = bool(node_data.get("ocr_text"))
                        risk = node_data.get("media_risk_level", "")
                        if num_images > 0:
                            yield _sse_data({'type': 'agent_log', 'symbol': '→', 'message': f'Agent 6: Analysed {num_images} image(s) — risk level {risk}'})
                        if tamper:
                            yield _sse_data({'type': 'agent_log', 'symbol': '⚠', 'message': 'Agent 6: Editing software (Photoshop/GIMP) detected in image EXIF metadata'})
                        if ocr_found:
                            yield _sse_data({'type': 'agent_log', 'symbol': '→', 'message': 'Agent 6: Text found in images — re-running pipeline with OCR content'})
                        if node_data.get("is_second_pass") is False and node_data.get("images_processed"):
                            yield _sse_data({'type': 'agent_log', 'symbol': '✓', 'message': 'Agent 6: Second-pass verification complete'})
            completed_successfully = True
        except Exception as exc:  # noqa: BLE001
            logger.exception("[/api/analyze-stream] pipeline failed")
            yield _sse_data({'status': 'error', 'error': str(exc)})
        finally:
            yield _sse_data({'status': 'complete' if completed_successfully else 'failed'})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )


@app.post("/api/analyze-image-stream")
async def analyze_image_stream_endpoint(file: UploadFile = File(...)):
    """
    Upload an image to check EXIF metadata for editing software and run
    Sarvam OCR. If text is found the full fact-check pipeline runs on it.
    Returns an SSE stream of agent events in the same format as
    /api/analyze-stream so the frontend can reuse the same hook.
    """
    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large. Max allowed size is {MAX_IMAGE_UPLOAD_BYTES // (1024 * 1024)}MB",
        )
    filename = file.filename or "uploaded_image"

    async def event_generator():
        from agents.image_integrity import _check_exif, _run_sarvam_ocr, _translate_ocr_to_english
        from agents.claim_extraction import claim_extraction_graph
        completed_successfully = False
        try:
            # ── Step 1: EXIF check ────────────────────────────────────────────
            yield _sse_data({'type': 'agent_log', 'symbol': '→', 'message': f'Scanning EXIF metadata for {filename}...'})
            exif_result = await asyncio.to_thread(_check_exif, image_bytes)
            exif_flag = exif_result.get("exif_tamper_flag", False)
            exif_software = exif_result.get("exif_software", "") or ""
            if exif_flag:
                yield _sse_data({'type': 'agent_log', 'symbol': '⚠', 'message': f'Editing software detected in EXIF: {exif_software}'})
            else:
                yield _sse_data({'type': 'agent_log', 'symbol': '✓', 'message': 'No editing software detected in EXIF metadata'})

            # ── Step 2: OCR ───────────────────────────────────────────────────
            yield _sse_data({'type': 'agent_log', 'symbol': '→', 'message': 'Running Sarvam OCR to extract text from image...'})
            ocr_text = await asyncio.to_thread(_run_sarvam_ocr, image_bytes)

            image_result = {
                "image_urls": [f"upload:{filename}"],
                "media_verdicts": [{"url": filename, "exif_tamper_flag": exif_flag, "exif_software": exif_software, "ocr_text": ocr_text}],
                "ocr_text": ocr_text,
                "media_risk_level": "HIGH" if exif_flag else "LOW",
            }

            if ocr_text:
                yield _sse_data({'type': 'agent_log', 'symbol': '✓', 'message': f'Text extracted ({len(ocr_text)} chars) — translating...'})
                translated = await asyncio.to_thread(_translate_ocr_to_english, ocr_text)
                pipeline_input = translated if translated else ocr_text
                yield _sse_data({'type': 'agent_log', 'symbol': '→', 'message': 'Running full fact-check pipeline on extracted image text...'})

                # ── Step 3: full pipeline on OCR text ─────────────────────────
                _detected_lang_name: str | None = None
                pipeline_events = await asyncio.to_thread(
                    lambda: list(claim_extraction_graph.stream(_build_initial_state(pipeline_input)))
                )
                for event in pipeline_events:
                    if not isinstance(event, dict):
                        logger.warning("[/api/analyze-image-stream] unexpected event type: %s", type(event).__name__)
                        continue

                    for node_name, node_output in event.items():
                        node_data = node_output if isinstance(node_output, dict) else {}
                        payload = {
                            "agent": node_name,
                            "status": "error" if node_data.get("error") else "success",
                            "data": node_data,
                        }
                        yield _sse_data(payload)
                        if node_name == "agent0_pre" and node_data.get("is_translated"):
                            src_lang = node_data.get("source_language", "")
                            _detected_lang_name = _MULTILINGUAL_LANGUAGES.get(src_lang, src_lang)
                            yield _sse_data({'type': 'agent_log', 'symbol': '→', 'message': f'Detected {_detected_lang_name} — translating via Sarvam AI'})
                        if node_name == "agent0_post" and node_data.get("localized_output") and _detected_lang_name:
                            yield _sse_data({'type': 'agent_log', 'symbol': '✓', 'message': f'Verdicts localized back to {_detected_lang_name}'})
            else:
                yield _sse_data({'type': 'agent_log', 'symbol': '·', 'message': 'No text found in image — EXIF analysis complete'})

            yield _sse_data({'type': 'image_result', 'data': image_result})
            completed_successfully = True
        except Exception as exc:  # noqa: BLE001
            logger.exception("[/api/analyze-image-stream] pipeline failed")
            yield _sse_data({'status': 'error', 'error': str(exc)})
        finally:
            yield _sse_data({'status': 'complete' if completed_successfully else 'failed'})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )


class AnalyzeSimpleRequest(BaseModel):
    url: str | None = None
    user_input: str | None = None


@app.post("/api/analyze-simple")
async def analyze_simple(user_input: str | None = None, req: AnalyzeSimpleRequest | None = None):
    """
    Simple endpoint for Chrome extension (no streaming).
    Returns the full pipeline result and auto-saves to history.
    """
    from services.history_store import history_store
    from services.history_store import HistoryStoreError

    resolved_input = _require_non_empty_input(
        user_input or (req.user_input if req else None) or (req.url if req else None),
        field_name="user_input",
    )

    logger.info("[/api/analyze-simple] request received (input_len=%d)", len(resolved_input))

    try:
        result = run_pipeline(resolved_input)
    except Exception as exc:  # noqa: BLE001
        logger.exception("[/api/analyze-simple] pipeline failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc

    try:
        history_store.insert_history(_make_history_entry(resolved_input, result, source="extension"))
    except HistoryStoreError as exc:
        logger.warning("[/api/analyze-simple] history save failed: %s", exc)

    return result


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# History endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class HistorySaveRequest(BaseModel):
    url: str
    verdicts: list = Field(default_factory=list)
    explanations: dict = Field(default_factory=dict)
    source: str = "webapp"


@app.get("/api/history")
async def get_history():
    """Return all saved analysis history entries."""
    from services.history_store import history_store
    from services.history_store import HistoryStoreError

    try:
        return history_store.list_history(limit=100)
    except HistoryStoreError as exc:
        logger.warning("[/api/history] list failed: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/history")
async def save_history(req: HistorySaveRequest):
    """Save a history entry (called by frontend after stream completes)."""
    from services.history_store import history_store
    from services.history_store import HistoryStoreError

    entry = _make_history_entry(
        req.url,
        {"verdicts": req.verdicts, "explanations": req.explanations},
        source=req.source,
    )
    try:
        history_store.insert_history(entry)
    except HistoryStoreError as exc:
        logger.warning("[/api/history] save failed: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"ok": True, "id": entry["id"]}


@app.delete("/api/history/{entry_id}")
async def delete_history_entry(entry_id: str):
    """Delete a single history entry by ID."""
    from services.history_store import history_store
    from services.history_store import HistoryStoreError

    try:
        history_store.delete_history(entry_id)
    except HistoryStoreError as exc:
        logger.warning("[/api/history/%s] delete failed: %s", entry_id, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"ok": True}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Translate endpoint — used by frontend claim translate button
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TranslateRequest(BaseModel):
    text: str
    source_language: str = ""  # optional: if empty, auto-detected via Sarvam


@app.post("/api/translate")
async def translate_to_english(req: TranslateRequest):
    """
    Translate arbitrary text to English using Sarvam AI.
    Auto-detects source language if not provided.
    Used by the frontend 'Translate to English' button on claim cards.
    """
    try:
        from agents.agent0_multilingual import (
            SUPPORTED_LANGUAGES,
            _detect_language,
            _heuristic_detect,
            _translate_to_english,
        )

        text = req.text.strip()
        if not text:
            return {"translated_text": text, "source_language": "en-IN"}

        source_lang = req.source_language.strip()

        # Determine source language
        if not source_lang:
            source_lang, confidence = _detect_language(text)
            # If API + heuristic both say English or confidence too low, skip
            if source_lang.startswith("en"):
                return {"translated_text": text, "source_language": source_lang}
            # If API returned its fallback (en-IN, 1.0) but text has non-ASCII,
            # run the heuristic directly as a second opinion
            if confidence == 1.0 and source_lang == "en-IN":
                source_lang, confidence = _heuristic_detect(text)

        if source_lang.startswith("en"):
            return {"translated_text": text, "source_language": source_lang}

        translated = _translate_to_english(text, source_lang)
        lang_name = SUPPORTED_LANGUAGES.get(source_lang, source_lang)
        return {
            "translated_text": translated,
            "source_language": source_lang,
            "source_language_name": lang_name,
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("[/api/translate] error: %s", exc)
        return {"translated_text": req.text, "source_language": "", "error": str(exc)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Uvicorn entry point
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if __name__ == "__main__":
    reload_enabled = _os.getenv("UVICORN_RELOAD", "true").strip().lower() not in {"0", "false", "no"}

    uvicorn_kwargs = {
        "host": "0.0.0.0",
        "port": 8000,
        "reload": reload_enabled,
        "access_log": True,
        "log_level": "info",
        "log_config": None,
    }

    # If watchfiles is installed, enable reload include patterns; otherwise, gracefully degrade
    try:
        import watchfiles  # noqa: F401
        if reload_enabled:
            uvicorn_kwargs["reload_includes"] = ["*.yaml"]
            logger.info("watchfiles detected — reload include/exclude patterns enabled")
    except ImportError:
        if reload_enabled:
            logger.warning(
                "watchfiles not installed; reload include/exclude patterns are ignored. "
                "Install with: pip install watchfiles"
            )

    # log_config=None -> lets our basicConfig above own the root logger,
    # so pipeline print() and logger.info() both appear in the terminal.
    uvicorn.run("main:app", **uvicorn_kwargs)