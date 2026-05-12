"""Supabase-backed history persistence service."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any

from core.config import settings

logger = logging.getLogger(__name__)

try:
	from postgrest.exceptions import APIError
except Exception:  # pragma: no cover
	APIError = Exception  # type: ignore[assignment]

try:
	from supabase import create_client
except Exception:  # pragma: no cover
	create_client = None  # type: ignore[assignment]


class HistoryStoreError(RuntimeError):
	"""Raised for history persistence failures."""


class SupabaseHistoryStore:
	TABLE_NAME = "history_entries"

	def __init__(self) -> None:
		self._client: Any = None

	def initialize(self) -> None:
		url = settings.supabase_url.strip()
		key = settings.supabase_service_key.strip()
		if not url or not key:
			raise HistoryStoreError(
				"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env"
			)
		if create_client is None:
			raise HistoryStoreError("Supabase dependency missing. Install with: pip install supabase")
		self._client = create_client(url, key)

	def _client_or_raise(self) -> Any:
		if self._client is None:
			raise HistoryStoreError("Supabase history store is not initialized")
		return self._client

	@staticmethod
	def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
		required = [
			"url",
			"timestamp",
			"overall_credibility",
			"avg_score",
			"bottom_line",
			"verdicts",
			"explanations",
		]
		missing = [key for key in required if key not in payload]
		if missing:
			raise HistoryStoreError(f"Payload missing required keys: {missing}")

		row = {
			"id": payload.get("id") or str(uuid.uuid4()),
			"url": str(payload["url"]),
			"timestamp": payload["timestamp"],
			"overall_credibility": str(payload["overall_credibility"]),
			"avg_score": int(payload["avg_score"]),
			"bottom_line": str(payload.get("bottom_line", "")),
			"verdicts": payload.get("verdicts", []),
			"explanations": payload.get("explanations", {}),
			"source": str(payload.get("source", "webapp")),
		}

		try:
			datetime.fromisoformat(str(row["timestamp"]).replace("Z", "+00:00"))
		except Exception as exc:
			raise HistoryStoreError(f"Invalid timestamp format: {row['timestamp']}") from exc

		return row

	@staticmethod
	def _to_history_error(exc: Exception) -> HistoryStoreError:
		if isinstance(exc, APIError):
			code = getattr(exc, "code", "") or ""
			message = getattr(exc, "message", str(exc))
			if code == "PGRST205":
				return HistoryStoreError(
					"Table public.history_entries not found. Run backend/supabase_schema.sql first."
				)
			return HistoryStoreError(f"Supabase API failed. code={code}, message={message}")
		return HistoryStoreError(f"Unexpected history storage failure: {exc}")

	def list_history(self, limit: int = 100) -> list[dict[str, Any]]:
		client = self._client_or_raise()
		try:
			response = (
				client.table(self.TABLE_NAME)
				.select("*")
				.order("timestamp", desc=True)
				.limit(limit)
				.execute()
			)
			return response.data or []
		except Exception as exc:
			raise self._to_history_error(exc) from exc

	def insert_history(self, payload: dict[str, Any], max_rows: int = 100) -> dict[str, Any]:
		client = self._client_or_raise()
		row = self._normalize_payload(payload)
		try:
			response = client.table(self.TABLE_NAME).insert(row).execute()
			inserted = (response.data or [None])[0]
			if not inserted:
				raise HistoryStoreError("Insert returned no data")
			self.prune_old_history(max_rows=max_rows)
			return inserted
		except Exception as exc:
			if isinstance(exc, HistoryStoreError):
				raise
			raise self._to_history_error(exc) from exc

	def upsert_history(self, payload: dict[str, Any]) -> dict[str, Any]:
		client = self._client_or_raise()
		row = self._normalize_payload(payload)
		try:
			response = client.table(self.TABLE_NAME).upsert(row, on_conflict="id").execute()
			upserted = (response.data or [None])[0]
			if not upserted:
				raise HistoryStoreError("Upsert returned no data")
			return upserted
		except Exception as exc:
			if isinstance(exc, HistoryStoreError):
				raise
			raise self._to_history_error(exc) from exc

	def delete_history(self, entry_id: str) -> None:
		client = self._client_or_raise()
		try:
			client.table(self.TABLE_NAME).delete().eq("id", entry_id).execute()
		except Exception as exc:
			raise self._to_history_error(exc) from exc

	def prune_old_history(self, max_rows: int = 100) -> None:
		client = self._client_or_raise()
		try:
			# Safety cap prevents a bad delete response from causing an infinite loop.
			max_iterations = 10
			iterations = 0
			while iterations < max_iterations:
				response = (
					client.table(self.TABLE_NAME)
					.select("id")
					.order("timestamp", desc=True)
					.range(max_rows, max_rows + 1000)
					.execute()
				)
				rows = response.data or []
				stale_ids = [row["id"] for row in rows if isinstance(row, dict) and row.get("id")]
				if not stale_ids:
					break
				client.table(self.TABLE_NAME).delete().in_("id", stale_ids).execute()
				iterations += 1

			if iterations == max_iterations:
				logger.warning(
					"History prune reached max iterations (%d). Some old rows may remain.",
					max_iterations,
				)
		except Exception as exc:
			raise self._to_history_error(exc) from exc


history_store = SupabaseHistoryStore()
