import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { StreamResult } from '../hooks/useAgentStream';

interface Props {
    result: StreamResult;
}

export default function ExportReport({ result }: Props) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const verdicts = result?.verdicts || [];
        const explanations = result?.explanations || {};
        const scores = verdicts.map((v: any) => v.truth_score ?? 50);
        const avgScore = scores.length
            ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
            : 0;
        const overall = explanations?.overall_credibility || 'N/A';
        const bottomLine = explanations?.bottom_line || '';

        const lines: string[] = [
            `KREDO — Fact Check Report`,
            `Generated: ${new Date().toLocaleString()}`,
            ``,
            `OVERALL VERDICT : ${overall}`,
            `Trust Score     : ${avgScore}/100`,
        ];

        if (bottomLine) {
            lines.push(``, `>> ${bottomLine}`);
        }

        if (verdicts.length > 0) {
            lines.push(``, `=== CLAIM ANALYSIS ===`);
            verdicts.forEach((v: any, i: number) => {
                const byClaimExpl: any = explanations?.by_claim?.[v.claim_text] || {};
                lines.push(
                    ``,
                    `[${i + 1}] "${v.claim_text}"`,
                    `    Verdict     : ${v.verdict} (${v.truth_score}/100)`,
                );
                if (byClaimExpl.plain_english) {
                    lines.push(`    Explanation : ${byClaimExpl.plain_english}`);
                }
                if (v.citations?.length) {
                    lines.push(`    Sources     :`);
                    v.citations.forEach((c: string, ci: number) => {
                        lines.push(`      [${ci + 1}] ${c}`);
                    });
                }
            });
        }

        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard unavailable — silent fail
        }
    };

    return (
        <div className="export-report">
            <button
                type="button"
                className="export-button"
                onClick={handleCopy}
                title="Copy report to clipboard"
            >
                {copied
                    ? <><Check size={13} style={{ marginRight: '0.35rem' }} />Copied!</>
                    : <><Copy size={13} style={{ marginRight: '0.35rem' }} />Copy Report</>}
            </button>
        </div>
    );
}
