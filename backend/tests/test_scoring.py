import sys
from pathlib import Path

# Ensure the backend directory is in the python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.scoring import aggregate_verdicts


def test_aggregate_verdicts_empty():
    res = aggregate_verdicts([])
    assert res["overall_score"] == 50
    assert res["overall_verdict"] == "UNVERIFIED"
    assert res["total_claims"] == 0
    assert res["verdict_breakdown"] == {}

def test_aggregate_verdicts_single():
    verdicts = [
        {"claim_text": "Claim 1", "verdict": "SUPPORTED", "truth_score": 85}
    ]
    res = aggregate_verdicts(verdicts)
    assert res["overall_score"] == 85
    assert res["overall_verdict"] == "SUPPORTED"
    assert res["total_claims"] == 1
    assert res["verdict_breakdown"] == {"SUPPORTED": 1}

def test_aggregate_verdicts_multiple():
    verdicts = [
        {"claim_text": "Claim 1", "verdict": "SUPPORTED", "truth_score": 90},
        {"claim_text": "Claim 2", "verdict": "CONTRADICTED", "truth_score": 10},
        {"claim_text": "Claim 3", "verdict": "SUPPORTED", "truth_score": 80}
    ]
    res = aggregate_verdicts(verdicts)
    # Average of 90, 10, 80 = 60
    assert res["overall_score"] == 60
    # Majority verdict is SUPPORTED (2 vs 1)
    assert res["overall_verdict"] == "SUPPORTED"
    assert res["total_claims"] == 3
    assert res["verdict_breakdown"] == {"SUPPORTED": 2, "CONTRADICTED": 1}

def test_aggregate_verdicts_bounds():
    verdicts = [
        {"claim_text": "Claim 1", "verdict": "SUPPORTED", "truth_score": 150},
        {"claim_text": "Claim 2", "verdict": "CONTRADICTED", "truth_score": -10}
    ]
    res = aggregate_verdicts(verdicts)
    # Average is 70
    assert res["overall_score"] == 70
    assert res["total_claims"] == 2
