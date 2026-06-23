import logging
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from services.history_store import HistoryStoreError, history_store

logger = logging.getLogger(__name__)
router = APIRouter()


# ── History auth dependency ───────────────────────────────────────────────
def require_history_key(request: Request) -> None:
    required_key = os.getenv("HISTORY_API_KEY", "").strip()
    if not required_key:
        return
    provided = request.headers.get("X-API-Key", "")
    if provided != required_key:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key header")


# ── Helper: build history entry payload ────────────────────────────────────
def make_history_entry(url: str, result: dict, source: str = "webapp") -> dict:
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


class HistorySaveRequest(BaseModel):
    url: str
    verdicts: list = Field(default_factory=list)
    explanations: dict = Field(default_factory=dict)
    source: str = "webapp"


@router.get("/api/history")
async def get_history(_: None = Depends(require_history_key)):
    """Return all saved analysis history entries."""
    try:
        return history_store.list_history(limit=100)
    except HistoryStoreError as exc:
        logger.warning("[/api/history] list failed: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/api/history")
async def save_history(req: HistorySaveRequest, _: None = Depends(require_history_key)):
    """Save a history entry (called by frontend after stream completes)."""
    entry = make_history_entry(
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


@router.delete("/api/history/{entry_id}")
async def delete_history_entry(entry_id: str, _: None = Depends(require_history_key)):
    """Delete a single history entry by ID."""
    try:
        history_store.delete_history(entry_id)
    except HistoryStoreError as exc:
        logger.warning("[/api/history/%s] delete failed: %s", entry_id, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"ok": True}
