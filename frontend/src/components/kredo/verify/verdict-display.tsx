import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Info, ShieldCheck, AlertTriangle, ShieldQuestion,
    Languages, ImageOff, Copy, Check, Download, ExternalLink, Globe
} from 'lucide-react';
import { StreamResult } from '../../../hooks/useAgentStream';
import { translateToEnglish } from '../../../services/api';
import TruthMeter from '../shared/truth-meter';
import VerdictBadge from '../shared/verdict-badge';

interface VerdictDisplayProps {
    result: StreamResult;
}

export default function VerdictDisplay({ result }: VerdictDisplayProps) {
    const verdicts = result?.verdicts || [];
    const explanations = result?.explanations || {};
    const byClaimExplanations = explanations?.by_claim || {};
    const localizedOutput = result?.localizedOutput || null;
    const isTranslated = result?.isTranslated || false;
    const sourceLanguageName = localizedOutput?.language_name || result?.sourceLanguage || '';
    const mediaRiskLevel = result?.mediaRiskLevel || '';
    const mediaVerdicts = result?.mediaVerdicts || [];
    const imageUrls = result?.imageUrls || [];
    const hasTamper = mediaVerdicts.some((v: any) => v.exif_tamper_flag);
    const hasOcrText = mediaVerdicts.some((v: any) => v.ocr_text);

    const [translatedClaims, setTranslatedClaims] = useState<Record<string, string | null>>({});
    const [translatingClaims, setTranslatingClaims] = useState<Set<string>>(new Set());
    const [showEnglish, setShowEnglish] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);

    // Score calculations
    const scores = verdicts.map((v: any) => v.truth_score ?? 50);
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

    const overallCredibility = explanations?.overall_credibility || (() => {
        if (averageScore >= 70) return 'CREDIBLE';
        if (averageScore >= 50) return 'MIXED';
        if (averageScore >= 30) return 'LOW CREDIBILITY';
        return 'UNRELIABLE';
    })();

    const bottomLine = explanations?.bottom_line || '';

    // Handle translation toggle
    const handleTranslate = useCallback(async (claimText: string) => {
        if (translatedClaims[claimText] !== undefined) {
            setShowEnglish(prev => {
                const next = new Set(prev);
                next.has(claimText) ? next.delete(claimText) : next.add(claimText);
                return next;
            });
            return;
        }
        setTranslatingClaims(prev => new Set(prev).add(claimText));
        try {
            const res = await translateToEnglish(claimText);
            setTranslatedClaims(prev => ({ ...prev, [claimText]: res.translated_text }));
            setShowEnglish(prev => new Set(prev).add(claimText));
        } catch {
            setTranslatedClaims(prev => ({ ...prev, [claimText]: null }));
        } finally {
            setTranslatingClaims(prev => {
                const s = new Set(prev);
                s.delete(claimText);
                return s;
            });
        }
    }, [translatedClaims]);

    const hasNonAscii = (text: string) => /[^\x00-\x7F]/.test(text);

    // Clipboard copy action
    const handleCopy = async () => {
        const lines: string[] = [
            `KREDO — Fact Check Report`,
            `Generated: ${new Date().toLocaleString()}`,
            ``,
            `OVERALL VERDICT : ${overallCredibility}`,
            `Trust Score     : ${averageScore}/100`,
        ];

        if (bottomLine) {
            lines.push(``, `>> ${bottomLine}`);
        }

        if (verdicts.length > 0) {
            lines.push(``, `=== CLAIM ANALYSIS ===`);
            verdicts.forEach((v: any, i: number) => {
                const byClaimExpl: any = byClaimExplanations[v.claim_text] || {};
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
            // silent fail
        }
    };

    const handleDownloadMockPDF = () => {
        alert('Downloading PDF report... (Feature mock-up)');
    };

    if (verdicts.length === 0 && !mediaRiskLevel && mediaVerdicts.length === 0) return null;

    // Image-only scan with no verdicts
    if (verdicts.length === 0) {
        return (
            <div className="space-y-4">
                {mediaRiskLevel && (
                    <div className={`flex items-start gap-3 p-4 rounded-xl ring-1 ring-inset ${
                        mediaRiskLevel === 'HIGH'
                            ? 'bg-rose-500/10 ring-rose-500/30'
                            : 'bg-emerald-500/10 ring-emerald-500/30'
                    }`}>
                        <span className={`flex-shrink-0 rounded-full p-1 ${
                            mediaRiskLevel === 'HIGH' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                            <ImageOff className="h-4 w-4" />
                        </span>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-foreground">
                                {mediaRiskLevel === 'HIGH' ? 'Media Integrity Alert' : 'Image Scan Complete'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {hasTamper && 'Image editing software detected in EXIF metadata. '}
                                {hasOcrText ? 'Text found in image — no checkable claims detected. ' : 'No checkable text found in image. '}
                                {imageUrls.length > 0 && `${imageUrls.length} image(s) scanned.`}
                            </div>
                        </div>
                    </div>
                )}
                {!mediaRiskLevel && (
                    <div className="rounded-2xl bg-card/60 ring-1 ring-inset ring-border p-5 lg:p-6 flex flex-col items-center justify-center text-center">
                        <ShieldQuestion className="h-10 w-10 text-muted-foreground/60 mb-2" />
                        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground/80">No Claims Found</span>
                        <p className="text-sm text-muted-foreground/60 mt-1">No verifiable claims were extracted from this image submission.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <section className="space-y-6 animate-kredo-fade-in-up">
            {/* Language badge */}
            {isTranslated && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 ring-1 ring-inset ring-violet-500/25">
                    <Languages className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-violet-300">
                        Analysed in {sourceLanguageName || 'Indic language'} · translated via Sarvam AI
                    </span>
                </div>
            )}

            {/* Media risk banner */}
            {mediaRiskLevel === 'HIGH' && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 ring-1 ring-inset ring-rose-500/30">
                    <ImageOff className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="text-xs font-bold text-rose-300 uppercase tracking-wider">Media Integrity Alert</div>
                        <div className="text-[11px] text-rose-300/80 leading-relaxed mt-1">
                            {hasTamper && 'Image editing software (Photoshop/GIMP tags) detected in EXIF metadata. '}
                            {hasOcrText && 'Text extracted from images was successfully fed back into analysis pipelines. '}
                            {imageUrls.length > 0 && `${imageUrls.length} image(s) scanned.`}
                        </div>
                    </div>
                </div>
            )}

            {/* Overall Verdict Hero Block */}
            <div className="rounded-2xl bg-card/60 ring-1 ring-inset ring-border p-5 lg:p-6 kredo-gradient-border">
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    {/* Radial Truth Meter */}
                    <div className="flex-shrink-0">
                        <TruthMeter score={averageScore} size={140} label="Trust Score" sublabel={`${verdicts.length} claim${verdicts.length !== 1 ? 's' : ''}`} />
                    </div>

                    {/* Right text layout */}
                    <div className="flex-1 text-center lg:text-left space-y-3 w-full">
                        <div className="flex flex-col sm:flex-row items-center gap-2 lg:items-baseline">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                                Overall Verdict:
                            </span>
                            <VerdictBadge size="lg" verdict={overallCredibility} />
                        </div>

                        {bottomLine && (
                            <p className="text-sm text-foreground/90 font-sans leading-relaxed border-l-2 border-primary/40 pl-3">
                                {bottomLine}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-center lg:justify-start gap-2 pt-1.5">
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium text-foreground transition cursor-pointer select-none ring-1 ring-border"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>Copied Report</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Copy Report</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleDownloadMockPDF}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium text-foreground transition cursor-pointer select-none ring-1 ring-border"
                            >
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Export PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Per-claim Analysis */}
            <div className="space-y-4 pt-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                    Detailed Claim Analysis · {verdicts.length} claim{verdicts.length !== 1 ? 's' : ''}
                </div>

                <div className="space-y-3">
                    {verdicts.map((v: any, idx: number) => {
                        const localizedClaim = localizedOutput?.by_claim?.[v.claim_text];
                        const englishClaim = byClaimExplanations[v.claim_text] || {};
                        const explanation = localizedClaim ?? englishClaim;

                        const isNonEnglish = hasNonAscii(v.claim_text);
                        const isShowingEnglish = showEnglish.has(v.claim_text);
                        const isTranslatingThis = translatingClaims.has(v.claim_text);
                        const englishClaimText = translatedClaims[v.claim_text];

                        // Verdict colors
                        const verdictStyles = {
                            SUPPORTED: { bg: 'bg-emerald-500/5', ring: 'ring-emerald-500/15', text: 'text-emerald-300' },
                            CONTRADICTED: { bg: 'bg-rose-500/5', ring: 'ring-rose-500/15', text: 'text-rose-300' },
                            MISLEADING: { bg: 'bg-amber-500/5', ring: 'ring-amber-500/15', text: 'text-amber-300' },
                            UNVERIFIED: { bg: 'bg-slate-400/5', ring: 'ring-slate-400/15', text: 'text-slate-300' },
                        };
                        const vUpper = (v.verdict || '').toUpperCase();
                        const cardTheme = verdictStyles[vUpper as keyof typeof verdictStyles] || verdictStyles.UNVERIFIED;

                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08 }}
                                className="rounded-xl bg-card/40 ring-1 ring-inset ring-border p-4 space-y-3 overflow-hidden hover:bg-card/50 transition duration-150"
                            >
                                {/* Index & Claim Text row */}
                                <div className="flex items-start gap-2.5">
                                    <span className="font-mono text-xs text-muted-foreground/60 tabular-nums select-none mt-0.5">
                                        {(idx + 1).toString().padStart(2, '0')}
                                    </span>
                                    <div className="flex-1 space-y-1.5">
                                        <p className="text-sm text-foreground leading-relaxed italic font-sans">
                                            "{isShowingEnglish && englishClaimText ? englishClaimText : v.claim_text}"
                                        </p>
                                        {isNonEnglish && (
                                            <button
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/10 hover:bg-violet-500/15 text-violet-300 font-mono text-[10px] ring-1 ring-inset ring-violet-500/20 cursor-pointer select-none transition"
                                                onClick={() => handleTranslate(v.claim_text)}
                                                disabled={isTranslatingThis}
                                            >
                                                <Globe className="h-3 w-3" />
                                                {isTranslatingThis
                                                    ? 'Translating…'
                                                    : isShowingEnglish
                                                    ? '← Original'
                                                    : 'Translate to English'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0 mt-0.5">
                                        <VerdictBadge size="sm" verdict={v.verdict} />
                                    </div>
                                </div>

                                {/* Plain English Block */}
                                {explanation.plain_english && (
                                    <div className={`p-3 rounded-lg ${cardTheme.bg} ring-1 ring-inset ${cardTheme.ring} text-xs text-muted-foreground leading-relaxed`}>
                                        <span className="font-semibold block text-foreground mb-0.5">Explanation</span>
                                        {explanation.plain_english}
                                    </div>
                                )}

                                {/* Meta note blocks */}
                                <div className="space-y-1.5 pt-0.5 pl-5">
                                    {explanation.confidence_statement && (
                                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                            <Info className="h-3.5 w-3.5 text-muted-foreground/80 flex-shrink-0 mt-0.5" />
                                            <span>{explanation.confidence_statement}</span>
                                        </div>
                                    )}

                                    {explanation.source_quality_note && (
                                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            <span>{explanation.source_quality_note}</span>
                                        </div>
                                    )}

                                    {explanation.reader_advisory && (
                                        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/5 ring-1 ring-inset ring-amber-500/15 text-xs text-amber-200">
                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                            <span>{explanation.reader_advisory}</span>
                                        </div>
                                    )}

                                    {explanation.evidence_gaps_plain && (
                                        <div className="flex items-start gap-1.5 text-xs text-amber-300/80">
                                            <ShieldQuestion className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                            <span>Gap: {explanation.evidence_gaps_plain}</span>
                                        </div>
                                    )}

                                    {isTranslated && (
                                        <p className="text-[10px] text-muted-foreground/40 italic font-mono pl-5">
                                            * Translation accuracy may vary for regional terms
                                        </p>
                                    )}
                                </div>

                                {/* Citations list */}
                                {v.citations && v.citations.length > 0 && (
                                    <div className="pt-2 pl-5 space-y-1">
                                        <div className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">Citations</div>
                                        <ul className="space-y-1">
                                            {v.citations.map((cit: string, cIdx: number) => {
                                                return (
                                                    <li key={cIdx} className="group/cit">
                                                        <a
                                                            href={cit}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition"
                                                        >
                                                            <span>[{cIdx + 1}]</span>
                                                            <span className="underline decoration-emerald-500/20 group-hover/cit:decoration-emerald-400/50 truncate max-w-sm sm:max-w-md md:max-w-xl">
                                                                {cit}
                                                            </span>
                                                            <ExternalLink className="h-3 w-3 opacity-0 group-hover/cit:opacity-100 transition-opacity" />
                                                        </a>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
