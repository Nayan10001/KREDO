import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

# Ensure the backend directory is in the python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from routes.analyze import run_pipeline


def extract_domain(url: str) -> str:
    """Extract bare domain (no www., lowercase) from a URL string."""
    try:
        netloc = urlparse(url.strip()).netloc.lower()
        return netloc.removeprefix("www.")
    except Exception:
        return ""

def calculate_token_overlap(str1: str, str2: str) -> float:
    """Calculate token overlap (Jaccard similarity) between two strings."""
    def tokenize(text):
        return set(re.findall(r'\w+', text.lower()))
    
    tokens1 = tokenize(str1)
    tokens2 = tokenize(str2)
    
    if not tokens1 or not tokens2:
        return 0.0
    
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)

def run_eval(subset_limit=None):
    dataset_path = Path(__file__).resolve().parent.parent / "data" / "eval_dataset.json"
    if not dataset_path.exists():
        print(f"[-] Evaluation dataset not found at: {dataset_path}")
        sys.exit(1)
        
    with open(dataset_path, "r", encoding="utf-8") as f:
        test_cases = json.load(f)
        
    if subset_limit:
        test_cases = test_cases[:subset_limit]
        
    print("=" * 80)
    print(f"RUNNING KREDO EVALUATION HARNESS ({len(test_cases)} test cases)")
    print("=" * 80)
    
    total_expected_claims = 0
    matched_claims = 0
    correct_verdicts = 0
    
    domain_precision_sum = 0.0
    domain_recall_sum = 0.0
    domain_match_attempts = 0
    
    detailed_results = []
    
    for case_idx, case in enumerate(test_cases, start=1):
        input_text = case.get("input_text", "")
        expected_claims = case.get("expected_claims", [])
        total_expected_claims += len(expected_claims)
        
        print(f"\n[{case_idx}/{len(test_cases)}] Input: {input_text[:60]}...")
        
        # Run pipeline
        try:
            result = run_pipeline(input_text, top_n=5)
            actual_verdicts = result.get("verdicts", [])
            error = result.get("error", "")
            if error:
                print(f"  [!] Pipeline returned error field: {error}")
        except Exception as e:
            print(f"  [X] Pipeline execution crashed: {e}")
            actual_verdicts = []
            
        print(f"  [i] Extracted {len(actual_verdicts)} claims from pipeline.")
        
        case_report = {
            "input": input_text,
            "claims": []
        }
        
        # Match each expected claim to actual verdict
        for exp_claim in expected_claims:
            exp_text = exp_claim.get("claim_text", "")
            exp_verdict = exp_claim.get("verdict", "")
            exp_domains = [d.lower() for d in exp_claim.get("domains", [])]
            
            # Find best overlap match
            best_match = None
            best_score = 0.0
            
            for act in actual_verdicts:
                score = calculate_token_overlap(exp_text, act.get("claim_text", ""))
                if score > best_score:
                    best_score = score
                    best_match = act
                    
            from typing import Any

            claim_data: dict[str, Any] = {
                "expected_text": exp_text,
                "expected_verdict": exp_verdict,
                "best_match_text": None,
                "best_match_score": best_score,
                "actual_verdict": None,
                "verdict_matched": False,
                "citation_precision": 0.0,
                "citation_recall": 0.0
            }
            
            if best_match and best_score >= 0.25:
                matched_claims += 1
                raw_verdict = best_match.get("verdict", "UNVERIFIED")
                act_verdict = raw_verdict.value if hasattr(raw_verdict, "value") else str(raw_verdict)
                act_citations = best_match.get("citations", [])
                act_domains = [extract_domain(url) for url in act_citations if url]
                
                claim_data["best_match_text"] = best_match.get("claim_text")
                claim_data["actual_verdict"] = act_verdict

                
                # Check verdict
                if act_verdict == exp_verdict:
                    correct_verdicts += 1
                    claim_data["verdict_matched"] = True
                    print(f"  [✓] Claim Match: '{exp_text[:40]}...' -> Verdict: {act_verdict} (Correct)")
                else:
                    print(f"  [X] Claim Match: '{exp_text[:40]}...' -> Expected: {exp_verdict}, Got: {act_verdict}")
                    
                # Evaluate Citations Domain Heuristic
                if exp_domains:
                    domain_match_attempts += 1
                    matched_domains = [d for d in act_domains if any(exp_d in d for exp_d in exp_domains)]
                    
                    precision = len(matched_domains) / len(act_domains) if act_domains else 0.0
                    recall = len(matched_domains) / len(exp_domains)
                    
                    domain_precision_sum += precision
                    domain_recall_sum += recall
                    
                    claim_data["citation_precision"] = precision
                    claim_data["citation_recall"] = recall
                    print(f"      Citations: Precision={precision:.2f}, Recall={recall:.2f}")
            else:
                print(f"  [-] No match found for expected claim: '{exp_text[:45]}...' (Overlap: {best_score:.2f})")
                
            case_report["claims"].append(claim_data)
            
        detailed_results.append(case_report)
        
    # Calculate global metrics
    claim_extraction_rate = matched_claims / total_expected_claims if total_expected_claims else 0.0
    verdict_accuracy = correct_verdicts / matched_claims if matched_claims else 0.0
    avg_citation_precision = domain_precision_sum / domain_match_attempts if domain_match_attempts else 1.0
    avg_citation_recall = domain_recall_sum / domain_match_attempts if domain_match_attempts else 1.0
    
    print("\n" + "=" * 80)
    print("EVALUATION HARNESS METRICS SUMMARY")
    print("=" * 80)
    print(f"Total Expected Claims:      {total_expected_claims}")
    print(f"Matched/Extracted Claims:    {matched_claims} ({claim_extraction_rate * 100:.1f}%)")
    print(f"Verdict Accuracy:            {verdict_accuracy * 100:.1f}% ({correct_verdicts}/{matched_claims})")
    print(f"Avg Citation Domain Precision: {avg_citation_precision * 100:.1f}%")
    print(f"Avg Citation Domain Recall:    {avg_citation_recall * 100:.1f}%")
    print("=" * 80)
    
    # Save Report
    report_path = Path(__file__).resolve().parent.parent / "data" / "eval_report.md"
    with open(report_path, "w", encoding="utf-8") as rf:
        rf.write("# KREDO Agent Pipeline Evaluation Report\n\n")
        rf.write("## Global Metrics\n")
        rf.write(f"- **Verdict Accuracy**: {verdict_accuracy * 100:.1f}% ({correct_verdicts}/{matched_claims})\n")
        rf.write(f"- **Claim Match Rate**: {claim_extraction_rate * 100:.1f}% ({matched_claims}/{total_expected_claims})\n")
        rf.write(f"- **Heuristic Citation Domain Precision**: {avg_citation_precision * 100:.1f}%\n")
        rf.write(f"- **Heuristic Citation Domain Recall**: {avg_citation_recall * 100:.1f}%\n\n")
        
        rf.write("## Detailed Test Case Run Output\n")
        for idx, report in enumerate(detailed_results, start=1):
            rf.write(f"### Test Case {idx}: {report['input'][:100]}\n")
            for c in report["claims"]:
                status = "✓ CORRECT" if c["verdict_matched"] else "✗ MISMATCH"
                rf.write(f"- **Expected Claim**: \"{c['expected_text']}\"\n")
                rf.write(f"  - Match: {status} (Expected: `{c['expected_verdict']}`, Actual: `{c['actual_verdict']}`)\n")
                rf.write(f"  - Token Match score: {c['best_match_score']:.2f}\n")
                rf.write(f"  - Citations: Precision `{c['citation_precision']:.2f}`, Recall `{c['citation_recall']:.2f}`\n\n")
                
    print(f"[+] Evaluation report successfully written to {report_path}")

if __name__ == "__main__":
    limit = None
    if len(sys.argv) > 1:
        if sys.argv[1].isdigit():
            limit = int(sys.argv[1])
        elif "--subset" in sys.argv[1] and len(sys.argv) > 2:
            limit = int(sys.argv[2])
            
    run_eval(subset_limit=limit)
