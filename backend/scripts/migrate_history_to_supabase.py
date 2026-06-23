"""One-time migration script: backend/history.json -> Supabase history_entries."""

from __future__ import annotations

import json
from pathlib import Path

from dotenv import load_dotenv
from services.history_store import HistoryStoreError, history_store


def migrate() -> None:
    backend_dir = Path(__file__).resolve().parent.parent
    history_file = backend_dir / "history.json"

    load_dotenv(backend_dir / ".env")

    if not history_file.exists():
        print(f"history.json not found at: {history_file}")
        return

    raw = json.loads(history_file.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise RuntimeError("history.json must contain a top-level JSON array")

    history_store.initialize()

    success = 0
    failed = 0
    for idx, row in enumerate(raw, start=1):
        if not isinstance(row, dict):
            failed += 1
            print(f"[{idx}] skipped: non-object row")
            continue
        try:
            history_store.upsert_history(row)
            success += 1
        except HistoryStoreError as exc:
            failed += 1
            print(f"[{idx}] failed: {exc}")

    print(f"Migration complete. success={success}, failed={failed}")


if __name__ == "__main__":
    migrate()
