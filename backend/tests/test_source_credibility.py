import sys
from pathlib import Path

# Ensure the backend directory is in the python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.source_credibility import (
    _extract_domain,
    _score_snippet,
    score_domain,
    source_credibility_node,
)


def test_extract_domain():
    assert _extract_domain("https://reuters.com/some/path") == "reuters.com"
    assert _extract_domain("http://www.apnews.com/index") == "apnews.com"
    assert _extract_domain("invalid-url") == ""
    assert _extract_domain("") == ""

def test_score_domain_registered():
    from agents.source_credibility import TIER_SCORES
    res = score_domain("reuters.com")
    assert res["domain"] == "reuters.com"
    assert res["tier"] == 1
    assert res["score"] == TIER_SCORES[1]
    
    res = score_domain("theguardian.com")
    assert res["tier"] == 2
    assert res["score"] == TIER_SCORES[2]
    assert res["bias"] == "centre-left"

def test_score_domain_heuristics():
    # .gov domain
    res = score_domain("state.gov")
    assert res["tier"] == 3
    assert res["score"] == 80
    assert res["bias"] == "neutral"
    
    # .edu domain
    res = score_domain("mit.edu")
    assert res["tier"] == 3
    assert res["score"] == 75
    
    # .org domain
    res = score_domain("charity.org")
    assert res["tier"] == 4
    assert res["score"] == 45
    
    # other domains
    res = score_domain("unknownblog.xyz")
    assert res["tier"] == 4
    assert res["score"] == 35
    assert res["bias"] == "unknown"

def test_score_snippet():
    from agents.source_credibility import TIER_SCORES
    snippet = {"url": "https://reuters.com/news", "content": "Sample content"}
    res = _score_snippet(snippet)
    assert "credibility" in res
    assert res["credibility"]["domain"] == "reuters.com"
    assert res["credibility"]["score"] == TIER_SCORES[1]

def test_source_credibility_node():
    from agents.source_credibility import TIER_SCORES
    from agents.claim_extraction import AgentState
    from typing import cast
    state = cast(AgentState, {
        "evidence_map": {
            "Claim 1": [
                {"url": "https://unknown.com/blog", "content": "low quality"},
                {"url": "https://reuters.com/story", "content": "high quality"}
            ]
        }
    })
    
    res = source_credibility_node(state)
    assert "evidence_map" in res
    assert "credibility_map" in res
    
    # Check that it re-ranked high quality reuters above unknown
    ranked_snippets = res["evidence_map"]["Claim 1"]
    assert len(ranked_snippets) == 2
    assert _extract_domain(ranked_snippets[0]["url"]) == "reuters.com"
    assert _extract_domain(ranked_snippets[1]["url"]) == "unknown.com"
    
    # Check credibility_map output structure
    cred_list = res["credibility_map"]["Claim 1"]
    assert len(cred_list) == 2
    assert cred_list[0]["domain"] == "reuters.com"
    assert cred_list[0]["score"] == TIER_SCORES[1]
