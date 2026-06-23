import asyncio
import json
import logging
import threading
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

try:
    from agents.agent0_multilingual import SUPPORTED_LANGUAGES as _MULTILINGUAL_LANGUAGES
except Exception:  # noqa: BLE001
    _MULTILINGUAL_LANGUAGES: dict = {}


MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB
MAX_ANALYZE_INPUT_CHARS = 20_000           # ~5000 tokens; guards URL query param length


# ── Internal Helpers ───────────────────────────────────────────────────────

def _json_default(value):
    """Fallback encoder so SSE payload serialization doesn't crash the stream."""
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _sse_data(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=_json_default)}\n\n"


def _require_non_empty_input(value: str | None, field_name: str = "user_input") -> str:
    text = (value or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail=f"{field_name} is required and must not be empty")
    return text


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
    """Run the full 5-agent LangGraph pipeline synchronously."""
    from agents.claim_extraction import claim_extraction_graph

    initial_state = _build_initial_state(user_input, top_n=top_n)
    result = claim_extraction_graph.invoke(initial_state)
    return result


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("/api/analyze-stream")
async def analyze_stream(user_input: str | None = None):
    """
    Streaming endpoint for the website (shows chain of thought).
    Returns SSE stream of agent execution events.
    """
    from agents.claim_extraction import claim_extraction_graph
    clean_input = _require_non_empty_input(user_input)
    if len(clean_input) > MAX_ANALYZE_INPUT_CHARS:
        raise HTTPException(
            status_code=413,
            detail=f"Input too large. Max allowed size is {MAX_ANALYZE_INPUT_CHARS} characters.",
        )
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
                        yield _sse_data({'type': 'agent_log', 'symbol': '✓', 'message': f'Verdicts localized back to {_detected_lang_name}'})
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


@router.post("/api/analyze-image-stream")
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
        from agents.claim_extraction import claim_extraction_graph
        from agents.image_integrity import _check_exif, _run_sarvam_ocr, _translate_ocr_to_english
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

                # ── Step 3: stream pipeline events in real-time via queue ──────
                _detected_lang_name: str | None = None
                _event_queue: asyncio.Queue = asyncio.Queue()
                _loop = asyncio.get_event_loop()

                def _run_pipeline_thread():
                    try:
                        for _ev in claim_extraction_graph.stream(_build_initial_state(pipeline_input)):
                            _loop.call_soon_threadsafe(_event_queue.put_nowait, _ev)
                    except Exception as _exc:  # noqa: BLE001
                        _loop.call_soon_threadsafe(_event_queue.put_nowait, _exc)
                    finally:
                        _loop.call_soon_threadsafe(_event_queue.put_nowait, None)

                _pipeline_thread = threading.Thread(target=_run_pipeline_thread, daemon=True)
                _pipeline_thread.start()

                while True:
                    item = await _event_queue.get()
                    if item is None:
                        break
                    if isinstance(item, Exception):
                        raise item
                    event = item
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

                _pipeline_thread.join(timeout=5)
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


@router.post("/api/analyze-simple")
async def analyze_simple(user_input: str | None = None, req: AnalyzeSimpleRequest | None = None):
    """
    Simple endpoint for Chrome extension (no streaming).
    Returns the full pipeline result and auto-saves to history.
    """
    from services.history_store import HistoryStoreError, history_store

    from routes.history import make_history_entry

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
        history_store.insert_history(make_history_entry(resolved_input, result, source="extension"))
    except HistoryStoreError as exc:
        logger.warning("[/api/analyze-simple] history save failed: %s", exc)

    return result


class TranslateRequest(BaseModel):
    text: str
    source_language: str = ""  # optional: if empty, auto-detected via Sarvam


@router.post("/api/translate")
async def translate_to_english(req: TranslateRequest):
    """
    Translate arbitrary text to English using Sarvam AI.
    Auto-detects source language if not provided.
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
            if source_lang.startswith("en"):
                return {"translated_text": text, "source_language": source_lang}
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
