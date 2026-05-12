import { useState, useEffect, useRef, type ComponentType } from 'react';
import {
    Zap, Globe, FileSearch, Search, Shield, Scale,
    MessageSquare, Image as ImageIcon, ChevronDown,
    CheckCircle2, XCircle, AlertTriangle, HelpCircle, Brain,
} from 'lucide-react';
import { AgentThought } from '../hooks/useAgentStream';

// ── Types ──────────────────────────────────────────────────────────────────
type LucideIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

type AgentId =
    | 'init' | 'multilingual' | 'claim_extraction' | 'evidence_retrieval'
    | 'source_credibility' | 'fact_checker' | 'explanation_generator' | 'image_integrity';

type StepState = 'pending' | 'active' | 'done';

interface VerdictCot {
    claim_text: string;
    verdict: string;
    truth_score: number;
    confidence_level: string;
    reasoning_text?: string;
    reasoning_summary?: string;
    evidence_gaps?: string[];
}

interface SubItem {
    text: string;
    kind: 'info' | 'search' | 'score' | 'verdict-cot' | 'final' | 'warn';
    visible: boolean;
    cot?: VerdictCot;
}

interface AgentSection {
    id: AgentId;
    label: string;
    Icon: LucideIcon;
    state: StepState;
    items: SubItem[];
}

interface Props {
    thoughts: AgentThought[];
    isComplete: boolean;
    isHistory?: boolean;
}

const STAGE_ORDER: AgentId[] = [
    'init', 'multilingual', 'claim_extraction', 'evidence_retrieval',
    'source_credibility', 'fact_checker', 'explanation_generator', 'image_integrity',
];

function initialSections(): AgentSection[] {
    return [
        { id: 'init',                  label: 'Initialising Pipeline',   Icon: Zap,          state: 'pending', items: [] },
        { id: 'multilingual',          label: 'Language Detection',      Icon: Globe,        state: 'pending', items: [] },
        { id: 'claim_extraction',      label: 'Claim Extraction',        Icon: FileSearch,   state: 'pending', items: [] },
        { id: 'evidence_retrieval',    label: 'Evidence Retrieval',      Icon: Search,       state: 'pending', items: [] },
        { id: 'source_credibility',    label: 'Source Credibility',      Icon: Shield,       state: 'pending', items: [] },
        { id: 'fact_checker',          label: 'Fact Checker',            Icon: Scale,        state: 'pending', items: [] },
        { id: 'explanation_generator', label: 'Explanation Generator',   Icon: MessageSquare,state: 'pending', items: [] },
        { id: 'image_integrity',       label: 'Image Integrity',         Icon: ImageIcon,    state: 'pending', items: [] },
    ];
}

// ── Reasoning text parser ──────────────────────────────────────────────────
function parseReasoningText(text: string): { heading: string; body: string }[] {
    const lines = text.split('\n');
    const sections: { heading: string; body: string }[] = [];
    let heading = '';
    let bodyLines: string[] = [];
    for (const line of lines) {
        const m = line.match(/^(\d+)\.\s+(.+)$/);
        if (m) {
            if (heading || bodyLines.length) sections.push({ heading, body: bodyLines.join('\n').trim() });
            heading = m[2];
            bodyLines = [];
        } else {
            bodyLines.push(line);
        }
    }
    if (heading || bodyLines.length) sections.push({ heading, body: bodyLines.join('\n').trim() });
    return sections.filter(s => s.heading || s.body);
}

// ── VerdictCoTCard ─────────────────────────────────────────────────────────
const VERDICT_META: Record<string, { color: string; Icon: LucideIcon }> = {
    SUPPORTED:    { color: '#16a34a', Icon: CheckCircle2 },
    CONTRADICTED: { color: '#dc2626', Icon: XCircle },
    MISLEADING:   { color: '#d97706', Icon: AlertTriangle },
    UNVERIFIED:   { color: '#6b7280', Icon: HelpCircle },
};

function VerdictCoTCard({ cot }: { cot: VerdictCot }) {
    const [open, setOpen] = useState(false);
    const { color, Icon: VIcon } = VERDICT_META[cot.verdict] ?? VERDICT_META.UNVERIFIED;
    const sections = cot.reasoning_text ? parseReasoningText(cot.reasoning_text) : [];
    const gaps = cot.evidence_gaps ?? [];

    return (
        <div className="cot-card">
            {/* Verdict header row */}
            <div className="cot-header">
                <VIcon size={12} strokeWidth={2.5} style={{ color, flexShrink: 0 }} />
                <span className="cot-verdict" style={{ color }}>{cot.verdict}</span>
                <span className="cot-score">{cot.truth_score}/100</span>
                <span className="cot-conf">[{cot.confidence_level}]</span>
            </div>

            {/* Claim text */}
            <div className="cot-claim">
                "{cot.claim_text.length > 120 ? cot.claim_text.slice(0, 120) + '…' : cot.claim_text}"
            </div>

            {/* Reasoning summary — always visible */}
            {cot.reasoning_summary && (
                <div className="cot-rsum">
                    <Brain size={10} strokeWidth={2} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                    <span>{cot.reasoning_summary}</span>
                </div>
            )}

            {/* Evidence gaps */}
            {gaps.length > 0 && (
                <div className="cot-gaps">
                    {gaps.slice(0, 2).map((g, i) => (
                        <div key={i} className="cot-gap">
                            <AlertTriangle size={9} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                            <span>Gap: {g}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Chain-of-thought toggle */}
            {cot.reasoning_text && (
                <button className="cot-toggle" onClick={() => setOpen(o => !o)}>
                    <ChevronDown
                        size={10}
                        strokeWidth={3}
                        style={{
                            transform: open ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.18s',
                            flexShrink: 0,
                        }}
                    />
                    {open ? 'Hide' : 'View'} chain of thought
                </button>
            )}

            {/* Expanded reasoning panel */}
            {open && cot.reasoning_text && (
                <div className="cot-panel">
                    {sections.length > 1 ? (
                        sections.map((sec, i) => (
                            <div key={i} className="cot-section">
                                {sec.heading && <p className="cot-section-h">{sec.heading}</p>}
                                {sec.body    && <p className="cot-section-b">{sec.body}</p>}
                            </div>
                        ))
                    ) : (
                        <p className="cot-section-b">{cot.reasoning_text}</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ── AgentChain ─────────────────────────────────────────────────────────────
export default function AgentChain({ thoughts, isComplete, isHistory }: Props) {
    const [sections, setSections] = useState<AgentSection[]>(initialSections);
    const [visibleItems, setVisibleItems] = useState<Record<AgentId, number>>(
        () => Object.fromEntries(STAGE_ORDER.map(id => [id, 0])) as Record<AgentId, number>
    );
    const bottomRef    = useRef<HTMLDivElement>(null);
    const animTimers   = useRef<ReturnType<typeof setInterval>[]>([]);
    const processed    = useRef(new Set<string>());
    const prevLogCount = useRef(0);

    // Stagger-animate N new items for a section
    const animateItems = (id: AgentId, count: number) => {
        let i = 0;
        const timer = setInterval(() => {
            setVisibleItems(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
            if (++i >= count) clearInterval(timer);
        }, 130);
        animTimers.current.push(timer);
    };

    // Append items to a section
    const addItems = (id: AgentId, items: SubItem[]) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, items: [...s.items, ...items] } : s));
    };

    // ── Init ──────────────────────────────────────────────────────────────
    useEffect(() => {
        setSections(prev => prev.map(s => s.id === 'init' ? { ...s, state: 'active' } : s));
        const t = setTimeout(() => {
            setSections(prev => prev.map(s => {
                if (s.id === 'init')
                    return { ...s, state: 'done', items: [{ text: 'Scraping article via Jina Reader', kind: 'info', visible: true }] };
                if (s.id === 'multilingual') return { ...s, state: 'active' };
                return s;
            }));
            setVisibleItems(prev => ({ ...prev, init: 9999 }));
        }, 380);
        return () => clearTimeout(t);
    }, []);

    // ── Agent 0 — accumulate agent_log lines into multilingual ────────────
    useEffect(() => {
        const logs = thoughts.filter(t => t.agent === 'agent_log');
        if (logs.length <= prevLogCount.current) return;
        const newMsgs = logs.slice(prevLogCount.current)
            .map(l => l.data?.message as string).filter(Boolean);
        prevLogCount.current = logs.length;
        if (newMsgs.length === 0) return;
        const items: SubItem[] = newMsgs.map(m => ({ text: m, kind: 'info', visible: false }));
        addItems('multilingual', items);
        animateItems('multilingual', items.length);
    }, [thoughts]);

    // ── Agent 0 — advance to claim_extraction when agent0_pre fires ───────
    useEffect(() => {
        const pre = thoughts.find(t => t.agent === 'agent0_pre');
        if (!pre || processed.current.has('multilingual')) return;
        processed.current.add('multilingual');
        // If no logs were emitted (English article), add a brief note
        setSections(prev => {
            const ml = prev.find(s => s.id === 'multilingual');
            const noLogs = !ml || ml.items.length === 0;
            return prev.map(s => {
                if (s.id === 'multilingual') {
                    const extra: SubItem[] = noLogs
                        ? [{ text: 'English detected — no translation needed', kind: 'info', visible: false }]
                        : [];
                    const items = [...s.items, ...extra];
                    setTimeout(() => {
                        if (noLogs) setVisibleItems(p => ({ ...p, multilingual: 9999 }));
                    }, 0);
                    return { ...s, state: 'done', items };
                }
                if (s.id === 'claim_extraction') return { ...s, state: 'active' };
                return s;
            });
        });
    }, [thoughts]);

    // ── Agent 1 — Claim Extraction ────────────────────────────────────────
    useEffect(() => {
        const t = [...thoughts].reverse().find(t => t.agent === 'claim_extraction');
        if (!t?.data || processed.current.has('claim_extraction')) return;
        processed.current.add('claim_extraction');

        const claims: any[] = t.data.claims || [];
        const newItems: SubItem[] = [
            { text: `Extracted ${claims.length} checkable claim${claims.length !== 1 ? 's' : ''}`, kind: 'info', visible: false },
            ...claims.map(c => ({
                text: `"${(c.claim_text || c.claim || '').slice(0, 90)}…"`,
                kind: 'search' as const, visible: false,
            })),
        ];
        setSections(prev => prev.map(s => {
            if (s.id === 'claim_extraction')   return { ...s, state: 'done',   items: [...s.items, ...newItems] };
            if (s.id === 'evidence_retrieval') return { ...s, state: 'active' };
            return s;
        }));
        animateItems('claim_extraction', newItems.length);
    }, [thoughts]);

    // ── Agent 2 — Evidence Retrieval ──────────────────────────────────────
    useEffect(() => {
        const t = [...thoughts].reverse().find(t => t.agent === 'evidence_retrieval');
        if (!t?.data || processed.current.has('evidence_retrieval')) return;
        processed.current.add('evidence_retrieval');

        const evMap: Record<string, any[]> = t.data.evidence_map || {};
        const total = Object.values(evMap).reduce((a, b) => a + b.length, 0);
        const newItems: SubItem[] = [
            { text: `${total} snippet${total !== 1 ? 's' : ''} retrieved across ${Object.keys(evMap).length} claim${Object.keys(evMap).length !== 1 ? 's' : ''}`, kind: 'info', visible: false },
            ...Object.entries(evMap).map(([claim, snips]) => ({
                text: `${snips.length} result${snips.length !== 1 ? 's' : ''} → "${claim.slice(0, 65)}…"`,
                kind: 'search' as const, visible: false,
            })),
        ];
        setSections(prev => prev.map(s => {
            if (s.id === 'evidence_retrieval')  return { ...s, state: 'done',   items: [...s.items, ...newItems] };
            if (s.id === 'source_credibility')  return { ...s, state: 'active' };
            return s;
        }));
        animateItems('evidence_retrieval', newItems.length);
    }, [thoughts]);

    // ── Agent 3 — Source Credibility ──────────────────────────────────────
    useEffect(() => {
        const t = [...thoughts].reverse().find(t => t.agent === 'source_credibility');
        if (!t?.data || processed.current.has('source_credibility')) return;
        processed.current.add('source_credibility');

        const credMap: Record<string, any[]> = t.data.credibility_map || {};
        const topSources = Object.values(credMap).flatMap(e => e.slice(0, 1)).filter(Boolean).slice(0, 4);
        const newItems: SubItem[] = [
            { text: `Scored & re-ranked sources for ${Object.keys(credMap).length} claim${Object.keys(credMap).length !== 1 ? 's' : ''}`, kind: 'info', visible: false },
            ...topSources.map(e => ({
                text: `${e.domain} — ${e.score}/100 · ${e.label}`,
                kind: 'score' as const, visible: false,
            })),
        ];
        setSections(prev => prev.map(s => {
            if (s.id === 'source_credibility') return { ...s, state: 'done',   items: [...s.items, ...newItems] };
            if (s.id === 'fact_checker')       return { ...s, state: 'active' };
            return s;
        }));
        animateItems('source_credibility', newItems.length);
    }, [thoughts]);

    // ── Agent 4 — Fact Checker (with CoT cards) ───────────────────────────
    useEffect(() => {
        const t = [...thoughts].reverse().find(t => t.agent === 'fact_checker');
        if (!t?.data || processed.current.has('fact_checker')) return;
        processed.current.add('fact_checker');

        const verdicts: any[] = t.data.verdicts || [];
        const newItems: SubItem[] = [
            { text: `2-step chain-of-thought reasoning · ${verdicts.length} verdict${verdicts.length !== 1 ? 's' : ''}`, kind: 'info', visible: false },
            ...verdicts.map(v => ({
                text: v.claim_text || '',
                kind: 'verdict-cot' as const,
                visible: false,
                cot: {
                    claim_text:       v.claim_text,
                    verdict:          v.verdict,
                    truth_score:      v.truth_score,
                    confidence_level: v.confidence_level || 'MEDIUM',
                    reasoning_text:   v.reasoning_text,
                    reasoning_summary:v.reasoning_summary,
                    evidence_gaps:    v.evidence_gaps || [],
                },
            })),
        ];
        setSections(prev => prev.map(s => {
            if (s.id === 'fact_checker')          return { ...s, state: 'done',   items: [...s.items, ...newItems] };
            if (s.id === 'explanation_generator') return { ...s, state: 'active' };
            return s;
        }));
        animateItems('fact_checker', newItems.length);
    }, [thoughts]);

    // ── Agent 5 — Explanation Generator ──────────────────────────────────
    useEffect(() => {
        const t = [...thoughts].reverse().find(t => t.agent === 'explanation_generator');
        if (!t?.data || processed.current.has('explanation_generator')) return;
        processed.current.add('explanation_generator');

        const expl = t.data.explanations || {};
        const newItems: SubItem[] = [
            { text: 'Plain-English explanations generated', kind: 'info', visible: false },
            ...(expl.overall_credibility ? [{ text: `Overall: ${expl.overall_credibility}`, kind: 'final' as const, visible: false }] : []),
            ...(expl.bottom_line         ? [{ text: expl.bottom_line,                        kind: 'final' as const, visible: false }] : []),
        ];
        setSections(prev => prev.map(s => {
            if (s.id === 'explanation_generator') return { ...s, state: 'done',   items: [...s.items, ...newItems] };
            if (s.id === 'image_integrity')       return { ...s, state: 'active' };
            return s;
        }));
        animateItems('explanation_generator', newItems.length);
    }, [thoughts]);

    // ── Agent 6 — Image Integrity ─────────────────────────────────────────
    useEffect(() => {
        const t = thoughts.find(t => t.agent === 'image_integrity');
        if (!t?.data || processed.current.has('image_integrity')) return;
        processed.current.add('image_integrity');

        const numImages = (t.data.image_urls || []).length;
        const risk: string = t.data.media_risk_level || 'LOW';
        const tampered = (t.data.media_verdicts || []).some((v: any) => v.exif_tamper_flag);
        const newItems: SubItem[] = [
            { text: `Scanned ${numImages} image${numImages !== 1 ? 's' : ''} · Media risk: ${risk}`, kind: risk === 'HIGH' ? 'warn' : 'info', visible: false },
            ...(tampered ? [{ text: 'Editing software in EXIF — possible manipulation', kind: 'warn' as const, visible: false }] : []),
        ];
        setSections(prev => prev.map(s =>
            s.id === 'image_integrity' ? { ...s, state: 'done', items: [...s.items, ...newItems] } : s
        ));
        animateItems('image_integrity', newItems.length);
    }, [thoughts]);

    // ── Pipeline complete ─────────────────────────────────────────────────
    useEffect(() => {
        if (!isComplete) return;
        animTimers.current.forEach(clearInterval);
        setSections(prev => prev.map(s => ({ ...s, state: s.state === 'pending' ? 'pending' : 'done' })));
        setVisibleItems(prev => {
            const all = { ...prev };
            for (const id of STAGE_ORDER) all[id] = 9999;
            return all;
        });
    }, [isComplete]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [visibleItems]);

    // ── Render ────────────────────────────────────────────────────────────
    const activeSections = sections.filter(s => s.state !== 'pending');

    const panel = (
        <div className="pipeline-panel">
            {!isComplete && <div className="pipeline-progress-bar" />}
            <div className="pipeline-sections">
                {activeSections.map(section => {
                    const count = isHistory ? section.items.length : (visibleItems[section.id] || 0);
                    return (
                        <div key={section.id} className={`pipeline-section pipeline-section--${section.state}`}>
                            {/* Header */}
                            <div className="pipeline-section-header">
                                <span className="pipeline-section-icon">
                                    <section.Icon size={13} strokeWidth={2} />
                                </span>
                                <span className="pipeline-section-label">{section.label}</span>
                                <span className="pipeline-section-badge">
                                    {section.state === 'active' && !isComplete && <span className="pipeline-spinner" />}
                                    {section.state === 'done' && <span className="pipeline-check">✓</span>}
                                </span>
                            </div>

                            {/* Items */}
                            {section.items.length > 0 && (
                                <ul className="pipeline-items">
                                    {section.items.slice(0, count).map((item, i) => {
                                        if (item.kind === 'verdict-cot' && item.cot) {
                                            return (
                                                <li key={i} className="pipeline-item pipeline-item--cot pipeline-item--enter">
                                                    <VerdictCoTCard cot={item.cot} />
                                                </li>
                                            );
                                        }
                                        return (
                                            <li key={i} className={`pipeline-item pipeline-item--${item.kind} pipeline-item--enter`}>
                                                <span className="pipeline-item-dot" />
                                                <span className="pipeline-item-text">{item.text}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {/* Thinking placeholder */}
                            {section.state === 'active' && !isComplete && section.items.length === 0 && (
                                <div className="pipeline-thinking">
                                    <span className="thinking-dots">
                                        <span>.</span><span>.</span><span>.</span>
                                    </span>
                                    <span>Processing</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div ref={bottomRef} />
        </div>
    );

    if (isComplete) {
        return (
            <details className="agent-logs-accordion" open={false}>
                <summary className="agent-logs-summary">
                    <span className="pipeline-check" style={{ marginRight: '0.4rem' }}>✓</span>
                    Pipeline checkpoints · Completed
                </summary>
                <div className="agent-logs-content">{panel}</div>
            </details>
        );
    }

    return panel;
}
