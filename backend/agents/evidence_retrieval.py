"""Evidence Retrieval Node for claim verification support.

This module queries Tavily for the top claims and returns compact evidence
payloads suitable for downstream fact-checking.
"""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from typing import TYPE_CHECKING, Any

from dotenv import load_dotenv
from langchain_community.tools.tavily_search import TavilySearchResults

if TYPE_CHECKING:
	from agents.claim_extraction import AgentState

load_dotenv()

try:
	from core.config import pipeline_config
except ModuleNotFoundError:
	import sys as _sys
	from pathlib import Path as _Path
	_sys.path.insert(0, str(_Path(__file__).resolve().parent.parent))
	from core.config import pipeline_config

_er_cfg: dict = pipeline_config.get("evidence_retrieval", {})
MAX_CLAIMS_PER_RUN: int = _er_cfg.get("max_claims_per_run", 3)
MAX_SNIPPET_CHARS: int = _er_cfg.get("max_snippet_chars", 500)

try:
	from utils.helpers import read_env_var as _read_env_var
except ModuleNotFoundError:
	import sys as _sys2
	from pathlib import Path as _Path2
	_sys2.path.insert(0, str(_Path2(__file__).resolve().parent.parent))
	from utils.helpers import read_env_var as _read_env_var





def _truncate_snippet(content: str, limit: int = MAX_SNIPPET_CHARS) -> str:
	return content[:limit].strip()


def _normalize_results(raw_response: Any) -> list[dict[str, str]]:
	if isinstance(raw_response, list):
		candidates = raw_response
	elif isinstance(raw_response, dict) and isinstance(raw_response.get("results"), list):
		candidates = raw_response["results"]
	else:
		candidates = []

	normalized: list[dict[str, str]] = []
	for item in candidates:
		if not isinstance(item, dict):
			continue

		url = str(item.get("url", "")).strip()
		content = str(item.get("content", "")).strip()
		if not url or not content:
			continue

		normalized.append({"url": url, "content": _truncate_snippet(content)})

	return normalized


def _build_enriched_query(claim_text: str) -> str:
	"""
	Use llama-3.1-8b-instant to convert a raw claim into a
	web-search-optimised query with named entities + temporal context.
	Falls back to original claim on any error.
	"""
	from langchain_groq import ChatGroq
	try:
		groq_api_key = _read_env_var("GROQ_API_KEY", "groq_api_key")
		if not groq_api_key:
			return claim_text

		llm = ChatGroq(
			model="llama-3.1-8b-instant",
			api_key=groq_api_key,
			temperature=0,
		)
		prompt = (
			"Convert this claim into the best possible web search query.\n"
			"Rules:\n"
			"- Keep all named entities: people, places, organisations, numbers\n"
			"- Add the most likely year if the claim implies recent news\n"
			"- Remove filler words and conjunctions\n"
			"- Maximum 12 words\n"
			"- Return ONLY the query string, no explanation, no quotes\n\n"
			f"Claim: {claim_text}\n"
			"Query:"
		)
		response = llm.invoke(prompt)
		enriched = response.content.strip().strip('"').strip("'")
		print(f"[QUERY ENRICHMENT] '{claim_text[:55]}' → '{enriched}'")
		return enriched if enriched else claim_text
	except Exception as exc:  # noqa: BLE001
		print(
			f"[QUERY ENRICHMENT] failed for '{claim_text[:55]}' — {exc}; using original claim"
		)
		return claim_text


def _run_tavily_query(query: str) -> list[dict[str, str]]:
	"""Run a single Tavily query and return normalised results."""
	clean_query = str(query or "").strip()
	if not clean_query:
		return []

	tavily_api_key = _read_env_var("TAVILY_API_KEY", "tavily_api_key")
	if not tavily_api_key:
		return []

	os.environ["TAVILY_API_KEY"] = tavily_api_key

	try:
		tool = TavilySearchResults(
			search_depth=_er_cfg.get("tavily_search_depth", "basic"),
			max_results=_er_cfg.get("tavily_max_results", 5),
		)
		raw_response = tool.invoke(clean_query)
		return _normalize_results(raw_response)
	except Exception as exc:  # noqa: BLE001
		print(f"[TAVILY ERROR] query='{clean_query[:50]}' — {exc}")
		return []


def get_evidence_for_claim(claim_text: str) -> list[dict[str, str]]:
	print(f"--- SEARCHING WEB FOR: {claim_text} ---")

	clean_claim = str(claim_text or "").strip()
	if not clean_claim:
		print("--- EVIDENCE RESULTS: 0 ---")
		return []

	# Build enriched query
	enriched_query = _build_enriched_query(clean_claim)

	# Run both queries; deduplicate by URL preserving enriched-first order
	all_results: list[dict[str, str]] = []
	seen_urls: set[str] = set()

	for query in dict.fromkeys([enriched_query, clean_claim]):  # preserves order, deduplicates queries
		for result in _run_tavily_query(query):
			url = result.get("url", "")
			if url and url not in seen_urls:
				seen_urls.add(url)
				all_results.append(result)

	final = all_results[:_er_cfg.get("tavily_max_results", 5)]
	print(f"--- EVIDENCE RESULTS: {len(final)} ---")
	return final


def _claim_sort_key(claim: dict[str, Any]) -> int:
	try:
		return int(claim.get("checkworthiness_score", 0))
	except (TypeError, ValueError):
		return 0


def evidence_retrieval_node(state: "AgentState") -> "AgentState":
	try:
		claims = state.get("claims", [])
		sorted_claims = sorted(claims, key=_claim_sort_key, reverse=True)
		selected_claims = sorted_claims[:MAX_CLAIMS_PER_RUN]

		selected_claim_texts = [str(claim.get("claim_text", "")).strip() for claim in selected_claims]

		evidence_map: dict[str, list[dict[str, str]]] = {}
		futures_by_claim: dict[str, Any] = {}

		with ThreadPoolExecutor(max_workers=_er_cfg.get("max_parallel_workers", 2)) as executor:
			for claim_text in selected_claim_texts:
				if claim_text:
					futures_by_claim[claim_text] = executor.submit(get_evidence_for_claim, claim_text)

			# Preserve deterministic order for the resulting map.
			for claim_text in selected_claim_texts:
				if not claim_text:
					continue
				future = futures_by_claim.get(claim_text)
				if future is None:
					evidence_map[claim_text] = []
					continue
				try:
					evidence_map[claim_text] = future.result()
				except Exception as exc:  # noqa: BLE001
					print(
						f"[EVIDENCE ERROR] claim='{claim_text[:55]}' failed during retrieval — {exc}"
					)
					evidence_map[claim_text] = []

		updated_state = dict(state)
		updated_state["evidence_map"] = evidence_map
		return updated_state
	except Exception as exc:  # noqa: BLE001
		updated_state = dict(state)
		updated_state["evidence_map"] = updated_state.get("evidence_map", {})
		updated_state["error"] = str(exc)
		return updated_state
