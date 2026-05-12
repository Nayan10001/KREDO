"""Source Credibility Agent — LangGraph node.

Scores every evidence snippet by domain-tier registry + TLD heuristic,
re-ranks snippets best-first, and enriches each snippet with a `credibility`
key so the downstream fact-checker can weight sources intelligently.

Zero external API calls — pure dict lookup + urlparse.

Pipeline position:  evidence_retrieval → source_credibility → fact_checker
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from urllib.parse import urlparse

if TYPE_CHECKING:
    from agents.claim_extraction import AgentState

try:
    from core.config import pipeline_config
except ModuleNotFoundError:
    import sys as _sys
    from pathlib import Path as _Path
    _sys.path.insert(0, str(_Path(__file__).resolve().parent.parent))
    from core.config import pipeline_config

_sc_cfg: dict = pipeline_config.get("source_credibility", {})

# ---------------------------------------------------------------------------
# Tier score / label tables
# ---------------------------------------------------------------------------

TIER_SCORES: dict[int, int] = _sc_cfg.get(
    "tier_scores",
    {1: 95, 2: 82, 3: 70, 4: 35, 5: 10},
)

TIER_LABELS: dict[int, str] = {
    1: "Highly Credible",
    2: "Generally Credible",
    3: "Moderately Credible",
    4: "Low Credibility",
    5: "Social Media / Unverified",
}

# ---------------------------------------------------------------------------
# Domain registry  (60 entries)
# Each entry: {"tier": int, "bias": str}
# bias values: "neutral", "centre-left", "centre-right", "left", "right",
#               "pro-government", "tabloid"
# ---------------------------------------------------------------------------

DOMAIN_REGISTRY: dict[str, dict[str, Any]] = {
    # ── Tier 1 — Wire services & major fact-checkers ─────────────────────
    "reuters.com":         {"tier": 1, "bias": "neutral"},
    "apnews.com":          {"tier": 1, "bias": "neutral"},
    "afp.com":             {"tier": 1, "bias": "neutral"},
    "ptinews.com":         {"tier": 1, "bias": "neutral"},
    "ians.in":             {"tier": 1, "bias": "neutral"},
    "snopes.com":          {"tier": 1, "bias": "neutral"},
    "factcheck.org":       {"tier": 1, "bias": "neutral"},
    "politifact.com":      {"tier": 1, "bias": "neutral"},
    "fullfact.org":        {"tier": 1, "bias": "neutral"},
    "boomlive.in":         {"tier": 1, "bias": "neutral"},
    "altnews.in":          {"tier": 1, "bias": "neutral"},
    "thequint.com":        {"tier": 1, "bias": "neutral"},

    # ── Tier 2 — Major international newspapers & broadcasters ───────────
    "bbc.com":             {"tier": 2, "bias": "centre-left"},
    "bbc.co.uk":           {"tier": 2, "bias": "centre-left"},
    "theguardian.com":     {"tier": 2, "bias": "centre-left"},
    "nytimes.com":         {"tier": 2, "bias": "centre-left"},
    "washingtonpost.com":  {"tier": 2, "bias": "centre-left"},
    "economist.com":       {"tier": 2, "bias": "centre-right"},
    "ft.com":              {"tier": 2, "bias": "centre-right"},
    "wsj.com":             {"tier": 2, "bias": "centre-right"},
    "npr.org":             {"tier": 2, "bias": "centre-left"},
    "aljazeera.com":       {"tier": 2, "bias": "centre-left"},
    "dw.com":              {"tier": 2, "bias": "neutral"},
    "theatlantic.com":     {"tier": 2, "bias": "centre-left"},
    "time.com":            {"tier": 2, "bias": "centre-left"},
    "foreignpolicy.com":   {"tier": 2, "bias": "neutral"},

    # ── Tier 2 — Indian quality press ────────────────────────────────────
    "thehindu.com":        {"tier": 2, "bias": "centre-left"},
    "indianexpress.com":   {"tier": 2, "bias": "centre-left"},
    "livemint.com":        {"tier": 2, "bias": "neutral"},
    "hindustantimes.com":  {"tier": 2, "bias": "neutral"},
    "scroll.in":           {"tier": 2, "bias": "centre-left"},
    "thewire.in":          {"tier": 2, "bias": "left"},
    "ndtv.com":            {"tier": 2, "bias": "neutral"},
    "theprint.in":         {"tier": 2, "bias": "neutral"},
    "business-standard.com": {"tier": 2, "bias": "neutral"},
    "economictimes.indiatimes.com": {"tier": 2, "bias": "neutral"},

    # ── Tier 3 — Specialist, government-adjacent, or regional ────────────
    "eia.gov":             {"tier": 3, "bias": "neutral"},
    "who.int":             {"tier": 3, "bias": "neutral"},
    "worldbank.org":       {"tier": 3, "bias": "neutral"},
    "imf.org":             {"tier": 3, "bias": "neutral"},
    "statista.com":        {"tier": 3, "bias": "neutral"},
    "visualcapitalist.com": {"tier": 3, "bias": "neutral"},
    "ourworldindata.org":  {"tier": 3, "bias": "neutral"},
    "pewresearch.org":     {"tier": 3, "bias": "neutral"},
    "science.org":         {"tier": 3, "bias": "neutral"},
    "nature.com":          {"tier": 3, "bias": "neutral"},
    "msn.com":             {"tier": 3, "bias": "neutral"},
    "firstpost.com":       {"tier": 3, "bias": "centre-right"},
    "moneycontrol.com":    {"tier": 3, "bias": "neutral"},
    "newslaundry.com":     {"tier": 3, "bias": "centre-left"},

    # ── Tier 4 — Aggregators, partisan, low editorial standards ──────────
    "opindia.com":         {"tier": 4, "bias": "right"},
    "swarajyamag.com":     {"tier": 4, "bias": "right"},
    "postcard.news":       {"tier": 4, "bias": "right"},
    "sudarshannews.in":    {"tier": 4, "bias": "right"},
    "thefederal.com":      {"tier": 4, "bias": "left"},
    "republic.ru":         {"tier": 4, "bias": "pro-government"},
    "rt.com":              {"tier": 4, "bias": "pro-government"},
    "newsweek.com":        {"tier": 4, "bias": "neutral"},

    # ── Tier 1 — Additional wire services + financial terminals ──────────
    "bloomberg.com":              {"tier": 1, "bias": "neutral"},
    "bloombergnews.com":          {"tier": 1, "bias": "neutral"},

    # ── Tier 2 — Major broadcast + financial news (missing from registry) ─
    "cnbc.com":                   {"tier": 2, "bias": "neutral"},
    "thehill.com":                {"tier": 2, "bias": "neutral"},
    "axios.com":                  {"tier": 2, "bias": "neutral"},
    "vox.com":                    {"tier": 2, "bias": "centre-left"},
    "forbes.com":                 {"tier": 2, "bias": "centre-right"},
    "thetimes.co.uk":             {"tier": 2, "bias": "centre-right"},

    # ── Tier 2 — Geopolitics + foreign affairs specialists ────────────────
    "cfr.org":                    {"tier": 2, "bias": "neutral"},
    "brookings.edu":              {"tier": 2, "bias": "centre-left"},
    "carnegieendowment.org":      {"tier": 2, "bias": "neutral"},
    "middleeasteye.net":          {"tier": 2, "bias": "centre-left"},
    "arabnews.com":               {"tier": 2, "bias": "neutral"},
    "dawn.com":                   {"tier": 2, "bias": "neutral"},
    "thedailystar.net":           {"tier": 2, "bias": "neutral"},

    # ── Tier 2 — Energy + commodities trade press ─────────────────────────
    "oilprice.com":               {"tier": 2, "bias": "neutral"},
    "spglobal.com":               {"tier": 2, "bias": "neutral"},
    "platts.com":                 {"tier": 2, "bias": "neutral"},
    "argusmedia.com":             {"tier": 2, "bias": "neutral"},
    "energymonitor.ai":           {"tier": 2, "bias": "neutral"},
    "offshore-technology.com":    {"tier": 2, "bias": "neutral"},

    # ── Tier 2 — Indian government + regulatory (authoritative) ──────────
    "pib.gov.in":                 {"tier": 2, "bias": "pro-government"},
    "mea.gov.in":                 {"tier": 2, "bias": "pro-government"},
    "rbi.org.in":                 {"tier": 2, "bias": "neutral"},
    "sebi.gov.in":                {"tier": 2, "bias": "neutral"},
    "mospi.gov.in":               {"tier": 2, "bias": "neutral"},

    # ── Tier 3 — Regional energy + shipping trade publications ────────────
    "egyptoil-gas.com":           {"tier": 3, "bias": "neutral"},
    "tankeroperators.com":        {"tier": 3, "bias": "neutral"},
    "hellenicshippingnews.com":   {"tier": 3, "bias": "neutral"},
    "maritimeexecutive.com":      {"tier": 3, "bias": "neutral"},
    "upstreamonline.com":         {"tier": 3, "bias": "neutral"},

    # ── Tier 3 — Indian regional + petroleum ministry ────────────────────
    "petroleum.nic.in":           {"tier": 3, "bias": "pro-government"},
    "ppac.gov.in":                {"tier": 3, "bias": "neutral"},
    "tribuneindia.com":           {"tier": 3, "bias": "neutral"},
    "deccanherald.com":           {"tier": 3, "bias": "neutral"},
    "newindianexpress.com":       {"tier": 3, "bias": "neutral"},
    "telanganatoday.com":         {"tier": 3, "bias": "neutral"},
    "sentinelassam.com":          {"tier": 3, "bias": "neutral"},
    "eastmojo.com":               {"tier": 3, "bias": "neutral"},
    "nenow.in":                   {"tier": 3, "bias": "neutral"},
    "nagalandpost.com":           {"tier": 3, "bias": "neutral"},

    # ── Tier 3 — Middle East + South Asia regional press ─────────────────
    "dailysabah.com":             {"tier": 3, "bias": "neutral"},
    "khaleejtimes.com":           {"tier": 3, "bias": "neutral"},
    "gulfnews.com":               {"tier": 3, "bias": "neutral"},
    "thenationalnews.com":        {"tier": 3, "bias": "neutral"},

    # ── Tier 4 — State-controlled foreign media ───────────────────────────
    "tehrantimes.com":            {"tier": 4, "bias": "pro-government"},
    "irna.ir":                    {"tier": 4, "bias": "pro-government"},
    "xinhua.net":                 {"tier": 4, "bias": "pro-government"},
    "globaltimes.cn":             {"tier": 4, "bias": "pro-government"},
    "tass.com":                   {"tier": 4, "bias": "pro-government"},
    "presstv.ir":                 {"tier": 5, "bias": "pro-government"},
    
    # ── Tier 2/3/4 — Added Indian Regional & State Channels ───────────────
    # Andhra Pradesh & Telangana
    "tv9telugu.com":          {"tier": 3, "bias": "neutral"},
    "ntvtelugu.com":          {"tier": 3, "bias": "neutral"},
    "sakshi.com":             {"tier": 4, "bias": "centre-left"}, 
    "abnandhrajyothy.com":    {"tier": 4, "bias": "centre-right"},
    "etvbharat.com":          {"tier": 2, "bias": "neutral"},
    "v6velugu.com":           {"tier": 3, "bias": "neutral"},
    "10tv.in":                {"tier": 3, "bias": "neutral"},
    "tnewstelugu.com":        {"tier": 4, "bias": "pro-government"}, 
    # Assam & North East
    "newslivetv.com":         {"tier": 3, "bias": "centre-right"},
    "pragnews.com":           {"tier": 3, "bias": "neutral"},
    "pratidintime.com":       {"tier": 3, "bias": "centre-left"},
    "dy365.in":               {"tier": 3, "bias": "neutral"},
    "nktv.in":                {"tier": 3, "bias": "neutral"},
    "arunachaltimes.in":      {"tier": 3, "bias": "neutral"},
    "hornbeilltv.com":        {"tier": 3, "bias": "neutral"},
    "theshillongtimes.com":   {"tier": 3, "bias": "neutral"},
    "syandanpatrika.com":     {"tier": 3, "bias": "neutral"},
    "vanglaini.org":          {"tier": 3, "bias": "neutral"},
    # Bihar & Jharkhand
    "livecities.in":          {"tier": 3, "bias": "neutral"},
    "kashishnews.com":        {"tier": 3, "bias": "neutral"},
    "lagatar.in":             {"tier": 3, "bias": "neutral"},
    "news11bharat.com":       {"tier": 3, "bias": "neutral"},
    "aryannews.in":           {"tier": 4, "bias": "neutral"},
    # Chhattisgarh & Madhya Pradesh
    "ibc24.in":               {"tier": 3, "bias": "neutral"},
    "bansalnews.com":         {"tier": 3, "bias": "neutral"},
    "inhnews.in":             {"tier": 3, "bias": "neutral"},
    "lalluram.com":           {"tier": 3, "bias": "neutral"},
    # Goa
    "prudentmedia.in":        {"tier": 3, "bias": "neutral"},
    "heraldgoa.in":           {"tier": 3, "bias": "neutral"},
    "goa365.tv":              {"tier": 3, "bias": "neutral"},
    # Gujarat
    "tv9gujarati.com":        {"tier": 3, "bias": "neutral"},
    "sandesh.com":            {"tier": 2, "bias": "neutral"},
    "vtvgujarati.com":        {"tier": 3, "bias": "neutral"},
    "gujaratsamachar.com":    {"tier": 2, "bias": "neutral"},
    "mantavyanews.com":       {"tier": 3, "bias": "neutral"},
    # Haryana, Punjab & Himachal Pradesh
    "ptcnews.tv":             {"tier": 3, "bias": "centre-right"}, 
    "mhonenews.com":          {"tier": 3, "bias": "neutral"},
    "jantatv.com":            {"tier": 3, "bias": "neutral"},
    "himachalabhiabhi.com":   {"tier": 3, "bias": "neutral"},
    "divyahimachal.com":      {"tier": 3, "bias": "neutral"},
    "rozanaspokesman.in":     {"tier": 3, "bias": "centre-left"},
    # Karnataka
    "tv9kannada.com":         {"tier": 3, "bias": "neutral"},
    "publictv.in":            {"tier": 3, "bias": "neutral"},
    "asianetnews.com":        {"tier": 2, "bias": "neutral"}, 
    "btvnewslive.com":        {"tier": 3, "bias": "neutral"},
    "prajavani.net":          {"tier": 2, "bias": "neutral"},
    # Kerala
    "mathrubhumi.com":        {"tier": 2, "bias": "neutral"},
    "manoramaonline.com":     {"tier": 2, "bias": "neutral"},
    "mediaoneonline.com":     {"tier": 3, "bias": "centre-left"},
    "twentyfournews.com":     {"tier": 3, "bias": "neutral"},
    "janamtv.com":            {"tier": 4, "bias": "right"},
    "kairalinewsonline.com":  {"tier": 4, "bias": "left"}, 
    "reporterlive.com":       {"tier": 3, "bias": "neutral"},
    # Maharashtra
    "abplive.com":            {"tier": 2, "bias": "neutral"}, 
    "tv9marathi.com":         {"tier": 3, "bias": "neutral"},
    "saamana.com":            {"tier": 4, "bias": "right"}, 
    "lokmat.com":             {"tier": 2, "bias": "neutral"},
    "pudhari.news":           {"tier": 3, "bias": "neutral"},
    "jaimaharashtranews.com": {"tier": 3, "bias": "neutral"},
    # Odisha
    "otvkhabar.in":           {"tier": 2, "bias": "neutral"},
    "kalingatv.com":          {"tier": 3, "bias": "neutral"},
    "kanaknews.com":          {"tier": 3, "bias": "neutral"},
    "argusnews.in":           {"tier": 4, "bias": "right"},
    "nandighoshatv.com":      {"tier": 4, "bias": "pro-government"}, 
    # Rajasthan
    "firstindianews.com":     {"tier": 3, "bias": "neutral"},
    "patrika.com":            {"tier": 2, "bias": "neutral"},
    "sachbedhadak.com":       {"tier": 3, "bias": "neutral"},
    # Tamil Nadu
    "polimernews.com":        {"tier": 3, "bias": "neutral"},
    "puthiyathalaimurai.com": {"tier": 2, "bias": "neutral"},
    "thanthitv.com":          {"tier": 2, "bias": "neutral"},
    "sunnews.in":             {"tier": 4, "bias": "centre-left"}, 
    "kalaignarseithigal.com": {"tier": 4, "bias": "centre-left"}, 
    "jayanewslive.com":       {"tier": 4, "bias": "centre-right"}, 
    # Uttar Pradesh & Uttarakhand
    "bharatsamachartv.in":    {"tier": 3, "bias": "neutral"},
    "hindikhabar.com":        {"tier": 3, "bias": "neutral"},
    "samacharplus.com":       {"tier": 3, "bias": "neutral"},
    "hnn24x7.com":            {"tier": 3, "bias": "neutral"},
    # West Bengal
    "anandabazar.com":        {"tier": 2, "bias": "neutral"}, 
    "tv9bangla.com":          {"tier": 3, "bias": "neutral"},
    "republicbangla.com":     {"tier": 4, "bias": "right"},
    "kolkatatv.org":          {"tier": 3, "bias": "centre-left"},
    "sangbadpratidin.in":     {"tier": 3, "bias": "centre-left"}, 
    # State Broadcasters (Doordarshan Regional) 
    "ddnews.gov.in":          {"tier": 2, "bias": "pro-government"},
    "newsonair.gov.in":       {"tier": 2, "bias": "pro-government"},
    # Major National Networks (Parent domains)
    "news18.com":             {"tier": 2, "bias": "centre-right"},
    "zeenews.india.com":      {"tier": 3, "bias": "centre-right"},
    "aajtak.in":              {"tier": 3, "bias": "centre-right"},
    "indiatvnews.com":        {"tier": 3, "bias": "centre-right"},
    "saharasamay.com":        {"tier": 4, "bias": "neutral"},

    # ── Tier 5 — Social media (no editorial control) ─────────────────────
    "twitter.com":         {"tier": 5, "bias": "neutral"},
    "x.com":               {"tier": 5, "bias": "neutral"},
    "facebook.com":        {"tier": 5, "bias": "neutral"},
    "instagram.com":       {"tier": 5, "bias": "neutral"},
    "youtube.com":         {"tier": 5, "bias": "neutral"},
    "tiktok.com":          {"tier": 5, "bias": "neutral"},
    "reddit.com":          {"tier": 5, "bias": "neutral"},
    "t.me":                {"tier": 5, "bias": "neutral"},
    "whatsapp.com":        {"tier": 5, "bias": "neutral"},
    "telegram.org":        {"tier": 5, "bias": "neutral"},
}
# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _extract_domain(url: str) -> str:
    """Extract bare domain (no www., lowercase) from a URL string."""
    try:
        netloc = urlparse(str(url).strip()).netloc.lower()
        return netloc.removeprefix("www.")
    except Exception:
        return ""


def _heuristic_score(domain: str) -> dict[str, Any]:
    """Fall-back scoring based on TLD when domain not in registry."""
    if domain.endswith(".gov") or ".gov." in domain:
        return {"tier": 3, "score": 80, "label": TIER_LABELS[3], "bias": "neutral"}
    if domain.endswith(".edu") or ".edu." in domain:
        return {"tier": 3, "score": 75, "label": TIER_LABELS[3], "bias": "neutral"}
    if domain.endswith(".org"):
        return {"tier": 4, "score": 45, "label": TIER_LABELS[4], "bias": "neutral"}
    return {"tier": 4, "score": 35, "label": TIER_LABELS[4], "bias": "unknown"}


def score_domain(domain: str) -> dict[str, Any]:
    """Return a credibility dict for *domain* (bare, no www. prefix).

    Keys returned: domain, tier, score, label, bias
    """
    bare = domain.lower().removeprefix("www.")
    if bare in DOMAIN_REGISTRY:
        entry = DOMAIN_REGISTRY[bare]
        tier = entry["tier"]
        return {
            "domain": bare,
            "tier": tier,
            "score": TIER_SCORES[tier],
            "label": TIER_LABELS[tier],
            "bias": entry.get("bias", "unknown"),
        }
    # Not in registry — use heuristic
    result = _heuristic_score(bare)
    return {"domain": bare, **result}


def _score_snippet(snippet: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of *snippet* with a ``credibility`` key added."""
    url = str(snippet.get("url", ""))
    domain = _extract_domain(url)
    credibility = score_domain(domain)
    return {**snippet, "credibility": credibility}


def _log_rerank(
    original: list[dict[str, Any]],
    ranked: list[dict[str, Any]],
    claim_text: str,
) -> None:
    """Print a one-line rerank notice for observability."""
    if not original or not ranked:
        return
    orig_domain = _extract_domain(str(original[0].get("url", "")))
    ranked_domain = _extract_domain(str(ranked[0].get("url", "")))
    if orig_domain != ranked_domain:
        print(
            f"[CREDIBILITY RERANK] '{claim_text[:60]}' — "
            f"moved '{ranked_domain}' above '{orig_domain}'"
        )
    else:
        print(
            f"[CREDIBILITY] '{claim_text[:60]}' — "
            f"'{orig_domain}' already leads (no rerank needed)"
        )


# ---------------------------------------------------------------------------
# LangGraph node
# ---------------------------------------------------------------------------

def source_credibility_node(state: "AgentState") -> dict[str, Any]:
    """Score, re-rank and enrich evidence snippets by domain credibility.

    Reads  ``state["evidence_map"]``
    Writes ``state["evidence_map"]``  (enriched + re-ranked, in-place replacement)
           ``state["credibility_map"]``  (same structure, always present after node)

    On any unexpected error the original ``evidence_map`` is preserved and
    ``credibility_map`` is set to an empty dict so the pipeline can continue.
    """
    try:
        evidence_map: dict[str, list[dict[str, Any]]] = state.get("evidence_map", {})

        enriched_evidence_map: dict[str, list[dict[str, Any]]] = {}
        credibility_map: dict[str, list[dict[str, Any]]] = {}

        for claim_text, snippets in evidence_map.items():
            if not snippets:
                enriched_evidence_map[claim_text] = []
                credibility_map[claim_text] = []
                continue

            # Score every snippet
            scored: list[dict[str, Any]] = [_score_snippet(s) for s in snippets]

            # Sort descending by credibility score (stable sort preserves
            # original order for ties so highest-quality lead snippet wins)
            ranked = sorted(
                scored,
                key=lambda s: s.get("credibility", {}).get("score", 0),
                reverse=True,
            )

            _log_rerank(scored, ranked, claim_text)

            enriched_evidence_map[claim_text] = ranked
            credibility_map[claim_text] = [
                s["credibility"] for s in ranked
            ]

        return {
            "evidence_map": enriched_evidence_map,
            "credibility_map": credibility_map,
        }

    except Exception as exc:  # noqa: BLE001
        print(f"[source_credibility_node] ERROR — pipeline continues: {exc}")
        return {
            "credibility_map": {},
        }
