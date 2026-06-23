import sys
from pathlib import Path

# Ensure the backend directory is in the python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.markdown import generate_evidence_report


def test_generate_evidence_report_empty():
    res = generate_evidence_report({})
    assert "No evidence was retrieved" in res

def test_generate_evidence_report_no_snippets():
    evidence_map = {
        "Claim A": []
    }
    res = generate_evidence_report(evidence_map)
    assert "Claim 1: \"Claim A\"" in res
    assert "No evidence found for this claim" in res

def test_generate_evidence_report_with_snippets():
    evidence_map = {
        "Claim A": [
            {"url": "https://reuters.com/news", "content": "Reuters says true"}
        ]
    }
    res = generate_evidence_report(evidence_map)
    assert "Claim 1: \"Claim A\"" in res
    assert "https://reuters.com/news" in res
    assert "Reuters says true" in res

def test_generate_evidence_report_long_snippet():
    long_content = "a" * 600
    evidence_map = {
        "Claim B": [
            {"url": "https://apnews.com", "content": long_content}
        ]
    }
    res = generate_evidence_report(evidence_map)
    assert "apnews.com" in res
    assert len(long_content) > 500
    assert "…" in res
