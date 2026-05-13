"""Fact-checking decision node for claim verification.

This module consumes claims with retrieved evidence snippets and emits strict,
UI-ready verdict objects for downstream presentation.
"""

from __future__ import annotations

import os
import importlib
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from enum import Enum
from typing import TYPE_CHECKING, Any
from urllib.parse import urlparse

from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field, field_validator

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

_fc_cfg: dict = pipeline_config.get("fact_checker", {})
MAX_CITATIONS: int = _fc_cfg.get("max_citations", 3)

try:
    from utils.helpers import read_env_var as _read_env_var
except ModuleNotFoundError:
    import sys as _sys2
    from pathlib import Path as _Path2
    _sys2.path.insert(0, str(_Path2(__file__).resolve().parent.parent))
    from utils.helpers import read_env_var as _read_env_var
NO_EVIDENCE_EXPLANATION = (
    "Insufficient reliable evidence was retrieved for this claim. "
    "The claim remains unverified at this time."
)
LLM_ERROR_EXPLANATION = (
    "The model could not produce a reliable fact-check verdict for this claim. "
    "The claim is marked unverified pending further evidence."
)


class VerdictLabel(str, Enum):
    SUPPORTED = "SUPPORTED"
    CONTRADICTED = "CONTRADICTED"
    MISLEADING = "MISLEADING"
    UNVERIFIED = "UNVERIFIED"


class FactCheckVerdict(BaseModel):
    claim_text: str = Field(min_length=1)
    verdict: VerdictLabel
    truth_score: int = Field(ge=0, le=100)
    explanation: str = Field(min_length=1)
    citations: list[str] = Field(default_factory=list)
    reasoning_summary: str = Field(
        default="",
        description="Key points from the reasoning process",
    )
    confidence_level: str = Field(
        default="MEDIUM",
        description="HIGH / MEDIUM / LOW based on evidence coverage",
    )
    evidence_gaps: list[str] = Field(
        default_factory=list,
        description="Sub-parts of the claim not addressed by evidence",
    )

    @field_validator("evidence_gaps", "citations", mode="before")
    @classmethod
    def _coerce_str_to_list(cls, value: object) -> object:
        """Allow the model to return a plain string instead of a JSON array."""
        if isinstance(value, str):
            stripped = value.strip()
            return [stripped] if stripped else []
        return value


REASONING_PROMPT = """
You are a fact-checking analyst. Analyze the claim against the provided evidence snippets only — do not use outside knowledge.

Rules:
- Only cite information present in the snippets
- Mark anything absent from evidence as "Gap"
- Do NOT output a JSON or a verdict label

CRITICAL DISTINCTION — read this before starting:
Direct evidence: A snippet that explicitly states, confirms, or contradicts the
specific people, numbers, and action in the claim.
Contextual evidence: A snippet about the broader situation, background, or related
topic but does NOT directly address the specific claim.

Example:
    Claim: "Iran allowed two Indian LPG carriers through the Strait of Hormuz"
    Direct:  "Iran lets two gas tankers sail to India through Hormuz" ← confirms claim
    Context: "Hormuz blockade disrupts 40% of global LPG supply" ← background only

Your output must cover these steps IN ORDER:

STEP 1 — Classify each snippet:
For every snippet write one line:
    "[Domain] (score/100): DIRECT or CONTEXT — <one sentence of what it says>"

STEP 2 — Sub-claim check (using DIRECT evidence only):
Break the claim into its checkable parts. For each part mark:
    CONFIRMED / CONTRADICTED / INFERRED / GAP
Only use DIRECT evidence snippets for this step. CONTEXT snippets cannot confirm
or contradict specific claims — do not use them for sub-claim verdicts.

STEP 3 — Contradictions (DIRECT snippets only):
Note any conflicting DIRECT snippets. Higher credibility score wins.
If no DIRECT snippets conflict, write "No direct contradictions found."

STEP 4 — Contextual notes (CONTEXT snippets):
Briefly note what the context snippets add about the broader situation.
These affect evidence_gaps but NOT the verdict label or truth_score.

STEP 5 — Verdict reasoning:
2-3 sentences covering:
    - What the DIRECT evidence confirms or denies
    - What gaps remain in the DIRECT evidence
    - What verdict and confidence level this points to
    - Do NOT reduce confidence because CONTEXT snippets are ambiguous
""".strip()


VERDICT_PROMPT = """
You are a fact-check verdict recorder.

A senior analyst has already completed the reasoning process.
Your job is to convert that reasoning into a precise structured verdict.

Rules:
- Base your verdict ONLY on the reasoning document provided
- Do not add new analysis or override the analyst's conclusions
- Return output as a valid JSON object only — no markdown, no prose, no code fences
- IMPORTANT: Base confidence_level and truth_score ONLY on DIRECT evidence
    from Step 2 of the reasoning. Do NOT reduce scores because contextual
    background articles are ambiguous or incomplete.

Truth score calibration:
    DIRECT evidence confirms claim + HIGH credibility source  → 82-100
    DIRECT evidence confirms claim + MEDIUM credibility source → 65-81
    DIRECT evidence partially confirms claim                  → 50-64
    No DIRECT evidence either way                             → 40-55
    DIRECT evidence contradicts claim                         → 0-35

Confidence level calibration:
    2+ DIRECT sources confirm     → HIGH
    1 DIRECT source confirms      → MEDIUM (raise to HIGH if source is Tier 1 or Tier 2)
    0 DIRECT sources, only CONTEXT → LOW
    Direct contradiction found    → HIGH (for CONTRADICTED verdict)

Verdict label guide:
    SUPPORTED:     Direct evidence confirms the core claim
    CONTRADICTED:  Direct evidence explicitly denies the claim
    MISLEADING:    Direct evidence confirms part but the framing distorts meaning
    UNVERIFIED:    No direct evidence found either way

evidence_gaps should list things NOT covered by direct evidence.
Do NOT list contextual uncertainties as gaps unless the claim explicitly asserts them.

YOU MUST OUTPUT EXACTLY THIS JSON STRUCTURE — use these exact field names:
{{
    "claim_text": "<copy the exact claim text from the Claim field above>",
    "verdict": "<SUPPORTED|CONTRADICTED|MISLEADING|UNVERIFIED>",
    "truth_score": <integer 0-100>,
    "explanation": "<2-3 sentences explaining the verdict in plain language>",
    "confidence_level": "<HIGH|MEDIUM|LOW>",
    "reasoning_summary": "<1-2 sentences summarising the key reasoning points>",
    "citations": ["<url1>", "<url2>"],
    "evidence_gaps": ["<gap1>", "<gap2>"]
}}

CRITICAL: The field names must be exactly as shown above.
Do NOT use "verdict_label" — use "verdict".
Do NOT use "confidence" — use "confidence_level".
Do NOT omit "claim_text" or "explanation" — both are required.
""".strip()





def _build_fact_checker_llm(model: str | None = None) -> Any:
    from langchain_groq import ChatGroq

    groq_api_key = _read_env_var("GROQ_API_KEY", "groq_api_key")
    if not groq_api_key:
        raise RuntimeError("Missing Groq API key. Set GROQ_API_KEY in .env")

    chosen_model = model or _fc_cfg.get("verdict_model", "llama-3.3-70b-versatile")
    llm = ChatGroq(
        model=chosen_model,
        api_key=groq_api_key,
        temperature=_fc_cfg.get("verdict_temperature", 0),
    )
    return llm.with_structured_output(
        FactCheckVerdict,
        method=_fc_cfg.get("verdict_method", "json_mode"),
    )


def _build_gemini_fact_checker_llm() -> Any:
    """Gemini Flash fallback when Groq daily token quota is exhausted."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    gemini_api_key = _read_env_var("GEMINI_API_KEY", "gemini_api_key")
    if not gemini_api_key:
        raise RuntimeError("Missing Gemini API key. Set GEMINI_API_KEY in .env")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=gemini_api_key,
        temperature=0,
    )
    return llm.with_structured_output(
        FactCheckVerdict,
        method="json_mode",
    )


def _build_reasoning_llm() -> Any:
    """
    Plain LLM with no structured output constraint.
    Used for Call 1 (free-form reasoning). Intentionally unconstrained
    so the model can think in natural language without schema pressure.
    """
    from langchain_groq import ChatGroq

    groq_api_key = _read_env_var("GROQ_API_KEY", "groq_api_key")
    if not groq_api_key:
        raise RuntimeError("Missing Groq API key. Set GROQ_API_KEY in .env")

    return ChatGroq(
        model=_fc_cfg.get("reasoning_model", "llama-3.3-70b-versatile"),
        api_key=groq_api_key,
        temperature=_fc_cfg.get("reasoning_temperature", 0),
        max_tokens=_fc_cfg.get("reasoning_max_tokens", 1500),
    )


def _run_reasoning_step(
    claim_text: str,
    evidence_context: str,
    llm: Any,
) -> str:
    """
    Call 1: Free-form chain-of-thought reasoning.
    Returns reasoning document as plain text.
    Raises ValueError if output is suspiciously short (model skipped steps).
    Retries up to 3 times on 429 rate-limit errors with exponential backoff.
    """
    reasoning_prompt = ChatPromptTemplate.from_messages([
        ("system", REASONING_PROMPT),
        (
            "human",
            "Claim to analyze:\n{claim_text}\n\n"
            "Evidence snippets:\n{evidence_context}",
        ),
    ])

    chain = reasoning_prompt | llm

    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            response = chain.invoke({
                "claim_text": claim_text,
                "evidence_context": evidence_context,
            })
            reasoning_text = response.content
            if len(reasoning_text.strip()) < 100:
                raise ValueError(
                    f"Reasoning output too short — model may have skipped steps: "
                    f"{reasoning_text}"
                )
            return reasoning_text
        except Exception as exc:  # noqa: BLE001
            err_str = str(exc)
            if "429" in err_str or "rate_limit" in err_str.lower():
                wait = (2 ** attempt) * 5  # 5s, 10s, 20s
                print(f"--- RATE LIMIT (reasoning, attempt {attempt + 1}) — waiting {wait}s ---")
                time.sleep(wait)
                last_exc = exc
            else:
                raise
    raise last_exc  # type: ignore[misc]


def _is_http_url(value: str) -> bool:
    parsed = urlparse(str(value or "").strip())
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _build_claim_context(
    claim_text: str, snippets: list[dict[str, Any]]
) -> tuple[str, list[str]]:
    normalized_blocks: list[str] = []
    allowed_urls: list[str] = []

    for idx, snippet in enumerate(snippets, start=1):
        url = str(snippet.get("url", "")).strip()
        content = str(snippet.get("content", "")).strip()
        if not content or not _is_http_url(url):
            continue

        allowed_urls.append(url)
        cred: dict[str, Any] | None = snippet.get("credibility")  # type: ignore[assignment]
        if cred:
            cred_line = (
                f"Credibility: {cred.get('score', '?')}/100 "
                f"| {cred.get('label', 'Unknown')} "
                f"| Bias: {cred.get('bias', 'unknown')}"
            )
            normalized_blocks.append(
                f"Snippet {idx}:\nURL: {url}\n{cred_line}\nContent: {content}"
            )
        else:
            normalized_blocks.append(
                f"Snippet {idx}:\nURL: {url}\nContent: {content}"
            )

    evidence_context = "\n\n".join(normalized_blocks)
    return evidence_context, allowed_urls


def _canonicalize_url(url: str) -> str:
    """Normalise URL for comparison: lowercase scheme+host, strip trailing slash, drop fragment."""
    try:
        parsed = urlparse(url)
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()
        path = parsed.path.rstrip("/") or "/"
        normalized = f"{scheme}://{netloc}{path}"
        if parsed.query:
            normalized += f"?{parsed.query}"
        # Fragment intentionally dropped — #section variants should match the base URL.
        return normalized
    except Exception:  # noqa: BLE001
        return url.strip()


def _normalize_citations(citations: list[str], allowed_urls: list[str]) -> list[str]:
    # Build canonical-form → original evidence URL mapping (first occurrence wins).
    canonical_to_original: dict[str, str] = {}
    for original in allowed_urls:
        canon = _canonicalize_url(original)
        if canon not in canonical_to_original:
            canonical_to_original[canon] = original

    cleaned: list[str] = []
    seen: set[str] = set()  # tracks canonical forms already accepted

    for raw in citations:
        candidate = str(raw or "").strip()
        if not candidate or not _is_http_url(candidate):
            continue
        canon = _canonicalize_url(candidate)
        if canon not in canonical_to_original or canon in seen:
            continue
        # Emit the evidence-side URL, not the model's potentially-mutated variant.
        cleaned.append(canonical_to_original[canon])
        seen.add(canon)
        if len(cleaned) >= MAX_CITATIONS:
            break

    return cleaned


def _fallback_unverified(claim_text: str, reason: str) -> dict[str, Any]:
    explanation = NO_EVIDENCE_EXPLANATION
    if reason == "llm_error":
        explanation = LLM_ERROR_EXPLANATION

    return FactCheckVerdict(
        claim_text=str(claim_text or "").strip() or "Unknown claim",
        verdict=VerdictLabel.UNVERIFIED,
        truth_score=50,
        explanation=explanation,
        citations=[],
    ).model_dump()


def _repair_verdict_fields(raw: dict[str, Any], claim_text: str) -> dict[str, Any]:
    """
    Normalise common LLM field name variants before Pydantic validation.

    Groq/Llama models in json_mode sometimes return semantically correct
    content with wrong field names. This function repairs the most common
    variants so the pipeline never crashes on a name mismatch.
    """
    repaired = dict(raw)

    # Fix: "verdict_label" → "verdict"
    if "verdict" not in repaired and "verdict_label" in repaired:
        repaired["verdict"] = repaired.pop("verdict_label")

    # Fix: "confidence" → "confidence_level"
    if "confidence_level" not in repaired and "confidence" in repaired:
        repaired["confidence_level"] = repaired.pop("confidence")

    # Fix: missing "claim_text" — inject from context
    if not repaired.get("claim_text"):
        repaired["claim_text"] = claim_text

    # Fix: missing "explanation" — build from verdict + reasoning_summary
    if not repaired.get("explanation"):
        verdict_val = repaired.get("verdict", "UNVERIFIED")
        reasoning = repaired.get("reasoning_summary", "")
        repaired["explanation"] = (
            f"Verdict: {verdict_val}. {reasoning}" if reasoning
            else f"This claim is marked as {verdict_val} based on available evidence."
        )

    # Fix: "score" → "truth_score"
    if "truth_score" not in repaired and "score" in repaired:
        repaired["truth_score"] = repaired.pop("score")

    # Fix: "gaps" → "evidence_gaps"
    if "evidence_gaps" not in repaired and "gaps" in repaired:
        repaired["evidence_gaps"] = repaired.pop("gaps")

    # Fix: "sources" or "urls" → "citations"
    if "citations" not in repaired:
        for alt_key in ("sources", "urls", "references", "source_urls"):
            if alt_key in repaired:
                repaired["citations"] = repaired.pop(alt_key)
                break

    return repaired


def _needs_escalation(verdict: FactCheckVerdict) -> bool:
    """Return True when the verdict confidence is too low to finalise."""
    if verdict.confidence_level == "LOW":
        return True
    if verdict.confidence_level == "MEDIUM" and verdict.truth_score < 65:
        return True
    return False


def _escalation_search(claim_text: str) -> list[dict[str, str]]:
    """
    Run a targeted search for wire service coverage of the claim.
    Used when initial verdict confidence is LOW or borderline MEDIUM.

    Tries two passes:
      Pass 1 — named wire services appended to claim
      Pass 2 — shorter keyword query if Pass 1 returns nothing
    """
    try:
        # Import here to avoid circular import (evidence_retrieval imports fact_checker
        # indirectly through the graph builder in claim_extraction)
        try:
            from agents.evidence_retrieval import _run_tavily_query
        except ImportError:
            from evidence_retrieval import _run_tavily_query

        # Pass 1: wire service targeted
        wire_query = f"{claim_text[:120]} reuters OR apnews OR BBC"
        results = _run_tavily_query(wire_query)

        if results:
            print(f"[ESCALATION] Found {len(results)} wire service result(s) for '{claim_text[:50]}'")
            return results

        # Pass 2: shorter keyword-only query
        words = claim_text.split()
        short_query = " ".join(words[:8]) + " news"
        results = _run_tavily_query(short_query)
        print(f"[ESCALATION PASS 2] Found {len(results)} result(s)")
        return results

    except Exception as exc:  # noqa: BLE001
        print(f"[ESCALATION ERROR] {exc}")
        return []


def fact_checker_node(state: "AgentState") -> "AgentState":
    try:
        print("--- FACT CHECKER (with escalation enabled) ---")
        claims = state.get("claims", [])
        evidence_map = state.get("evidence_map", {})
        verdicts: list[dict[str, Any]] = []

        # Initialize LLMs once before claim loop to catch errors early
        try:
            reasoning_llm = _build_reasoning_llm()
            structured_llm = _build_fact_checker_llm()
            print("--- LLM INITIALIZATION SUCCESSFUL ---")
        except Exception as exc:  # noqa: BLE001
            print(f"--- LLM INITIALIZATION FAILED: {exc} ---")
            updated_state = dict(state)
            updated_state["verdicts"] = []
            updated_state["error"] = f"Failed to initialize LLMs: {exc}"
            return updated_state

        verdict_prompt = ChatPromptTemplate.from_messages([
            ("system", VERDICT_PROMPT),
            (
                "human",
                "Claim:\n{claim_text}\n\n"
                "Evidence snippets (for citation reference only):\n"
                "{evidence_context}\n\n"
                "Analyst reasoning document:\n{reasoning_text}\n\n"
                "Available citation URLs (use only these):\n{available_urls}",
            ),
        ])

        for claim in claims:
            claim_text = str(claim.get("claim_text", "")).strip()
            print(f"--- FACT-CHECKING CLAIM: {claim_text} ---")

            snippets = evidence_map.get(claim_text, [])
            if not snippets:
                fallback = _fallback_unverified(claim_text, reason="no_evidence")
                verdicts.append(fallback)
                print(
                    f"--- VERDICT: {fallback['verdict']} "
                    f"({fallback['truth_score']}) ---"
                )
                continue

            try:
                evidence_context, allowed_urls = _build_claim_context(
                    claim_text, snippets
                )
                if not evidence_context:
                    fallback = _fallback_unverified(claim_text, reason="no_evidence")
                    verdicts.append(fallback)
                    print(
                        f"--- VERDICT: {fallback['verdict']} "
                        f"({fallback['truth_score']}) ---"
                    )
                    continue

                # ── CALL 1: Free-form reasoning ──────────────────────────
                print("--- REASONING STEP (CALL 1) ---")
                reasoning_text = _run_reasoning_step(
                    claim_text=claim_text,
                    evidence_context=evidence_context,
                    llm=reasoning_llm,
                )
                print(
                    f"--- REASONING COMPLETE "
                    f"({len(reasoning_text)} chars) ---"
                )

                # ── CALL 2: Structured verdict using reasoning ────────────
                print("--- VERDICT STEP (CALL 2) ---")
                chain = verdict_prompt | structured_llm

                # Retry with backoff on 429; fall back to 8b if 70b daily limit exhausted
                last_exc: Exception | None = None
                response = None
                for attempt in range(3):
                    try:
                        response = chain.invoke({
                            "claim_text": claim_text,
                            "evidence_context": evidence_context,
                            "reasoning_text": reasoning_text,
                            "available_urls": "\n".join(allowed_urls),
                        })
                        break
                    except Exception as exc:  # noqa: BLE001
                        err_str = str(exc)
                        if "429" in err_str or "rate_limit" in err_str.lower():
                            if attempt < 2:
                                wait = (2 ** attempt) * 5  # 5s, 10s
                                print(f"--- RATE LIMIT (verdict, attempt {attempt + 1}) — waiting {wait}s ---")
                                time.sleep(wait)
                                last_exc = exc
                            else:
                                # Final attempt: fall back to Gemini
                                print("--- RATE LIMIT on Groq — falling back to Gemini Flash ---")
                                try:
                                    structured_llm = _build_gemini_fact_checker_llm()
                                    chain = verdict_prompt | structured_llm
                                    response = chain.invoke({
                                        "claim_text": claim_text,
                                        "evidence_context": evidence_context,
                                        "reasoning_text": reasoning_text,
                                        "available_urls": "\n".join(allowed_urls),
                                    })
                                except Exception as gemini_exc:  # noqa: BLE001
                                    print(f"--- GEMINI FALLBACK FAILED: {gemini_exc} ---")
                                    last_exc = gemini_exc
                                break
                        else:
                            raise

                if response is None:
                    if last_exc is not None:
                        raise last_exc  # type: ignore[misc]
                    raise ValueError(
                        "Structured LLM returned None — model produced no output for this claim."
                    )

                if isinstance(response, FactCheckVerdict):
                    parsed = response
                else:
                    raw_response = response if isinstance(response, dict) else vars(response)
                    repaired_response = _repair_verdict_fields(raw_response, claim_text)
                    parsed = FactCheckVerdict.model_validate(repaired_response)

                normalized = parsed.model_dump()
                normalized["claim_text"] = claim_text
                normalized["citations"] = _normalize_citations(
                    normalized.get("citations", []),
                    allowed_urls,
                )

                verdict = FactCheckVerdict.model_validate(normalized)
                final_reasoning_text = reasoning_text

                # Escalation: if confidence is low, re-search with wire service query
                # and re-run the fact check with augmented evidence
                try:
                    if _needs_escalation(verdict):
                        print(
                            f"[ESCALATION TRIGGERED] confidence={verdict.confidence_level} "
                            f"score={verdict.truth_score} — re-searching for '{claim_text[:50]}'"
                        )
                        extra_evidence = _escalation_search(claim_text)
                        if extra_evidence:
                            # Merge extra evidence into existing snippets, deduplicate by URL
                            existing_urls = {s.get("url", "") for s in snippets}
                            new_snippets = [
                                s for s in extra_evidence if s.get("url", "") not in existing_urls
                            ]
                            if new_snippets:
                                augmented_snippets = snippets + new_snippets
                                # Re-score the new snippets through source credibility
                                try:
                                    from agents.source_credibility import _score_snippet
                                except ImportError:
                                    from source_credibility import _score_snippet
                                augmented_snippets = [_score_snippet(s) for s in augmented_snippets]

                                augmented_context, augmented_allowed_urls = _build_claim_context(
                                    claim_text,
                                    augmented_snippets,
                                )
                                if augmented_context:
                                    escalation_reasoning_text = _run_reasoning_step(
                                        claim_text=claim_text,
                                        evidence_context=augmented_context,
                                        llm=reasoning_llm,
                                    )
                                    escalation_chain = verdict_prompt | structured_llm
                                    escalation_response = escalation_chain.invoke({
                                        "claim_text": claim_text,
                                        "evidence_context": augmented_context,
                                        "reasoning_text": escalation_reasoning_text,
                                        "available_urls": "\n".join(augmented_allowed_urls),
                                    })

                                    if isinstance(escalation_response, FactCheckVerdict):
                                        escalation_parsed = escalation_response
                                    else:
                                        raw_esc = escalation_response if isinstance(escalation_response, dict) else vars(escalation_response)
                                        repaired_esc = _repair_verdict_fields(raw_esc, claim_text)
                                        escalation_parsed = FactCheckVerdict.model_validate(repaired_esc)

                                    escalation_normalized = escalation_parsed.model_dump()
                                    escalation_normalized["claim_text"] = claim_text
                                    escalation_normalized["citations"] = _normalize_citations(
                                        escalation_normalized.get("citations", []),
                                        augmented_allowed_urls,
                                    )
                                    verdict = FactCheckVerdict.model_validate(escalation_normalized)
                                    final_reasoning_text = escalation_reasoning_text
                                    print(
                                        f"[ESCALATION RESULT] new verdict={verdict.verdict} "
                                        f"score={verdict.truth_score} confidence={verdict.confidence_level}"
                                    )
                except Exception as exc:  # noqa: BLE001
                    print(f"[ESCALATION ERROR] {exc}")

                verdict_payload = verdict.model_dump()
                # Include free-form chain-of-thought so the frontend can display it
                verdict_payload["reasoning_text"] = final_reasoning_text
                verdicts.append(verdict_payload)
                print(
                    f"--- VERDICT: {verdict_payload['verdict']} "
                    f"({verdict_payload['truth_score']}) "
                    f"[{verdict_payload.get('confidence_level', '?')}] ---"
                )

            except Exception:  # noqa: BLE001
                tb_str = traceback.format_exc()
                print(
                    f"--- FACT-CHECK ERROR ---\n"
                    f"  Claim: {claim_text!r}\n"
                    f"  {tb_str}"
                )
                fallback = _fallback_unverified(claim_text, reason="llm_error")
                verdicts.append(fallback)
                print(
                    f"--- VERDICT: {fallback['verdict']} "
                    f"({fallback['truth_score']}) ---"
                )

        updated_state = dict(state)
        updated_state["verdicts"] = verdicts
        return updated_state

    except Exception as exc:  # noqa: BLE001
        updated_state = dict(state)
        updated_state["verdicts"] = updated_state.get("verdicts", [])
        updated_state["error"] = str(exc)
        return updated_state
