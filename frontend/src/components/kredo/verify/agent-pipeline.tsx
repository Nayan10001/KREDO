import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Globe, FileSearch, Search, Shield, Scale,
    MessageSquare, Image as ImageIcon, ChevronDown,
    Brain, AlertTriangle, Check
} from 'lucide-react';
import { AgentThought } from '../../../hooks/useAgentStream';
import { AgentId, SubItem, VerdictCot, AgentSection } from '../../../lib/kredo/types';
import { AGENTS, AgentMetadata } from '../../../lib/kredo/agents';

interface Props {
    thoughts: AgentThought[];
    isComplete: boolean;
    isHistory?: boolean;
}

const STAGE_ORDER: AgentId[] = [
    'init', 'multilingual', 'claim_extraction', 'evidence_retrieval',
    'source_credibility', 'fact_checker', 'explanation_generator', 'image_integrity',
];

const STAGE_ICONS: Record<AgentId, any> = {
    init: Zap,
    multilingual: Globe,
    claim_extraction: FileSearch,
    evidence_retrieval: Search,
    source_credibility: Shield,
    fact_checker: Scale,
    explanation_generator: MessageSquare,
    image_integrity: ImageIcon,
};

function initialSections(): AgentSection[] {
    return STAGE_ORDER.map((id) => {
        const meta = AGENTS.find((a: AgentMetadata) => a.id === id);
        return {
            id,
            label: meta?.label || id,
            Icon: STAGE_ICONS[id],
            state: 'pending',
            items: [],
            duration: meta?.duration || '1.0s',
        };
    });
}

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

const VERDICT_META: Record<string, { colorClass: string; iconColor: string; bgClass: string; ringClass: string }> = {
    SUPPORTED:    { colorClass: 'text-emerald-300', iconColor: 'oklch(0.72 0.19 155)', bgClass: 'bg-emerald-500/12', ringClass: 'ring-emerald-500/30' },
    CONTRADICTED: { colorClass: 'text-rose-300', iconColor: 'oklch(0.64 0.22 25)', bgClass: 'bg-rose-500/12', ringClass: 'ring-rose-500/30' },
    MISLEADING:   { colorClass: 'text-amber-300', iconColor: 'oklch(0.78 0.16 75)', bgClass: 'bg-amber-500/12', ringClass: 'ring-amber-500/30' },
    UNVERIFIED:   { colorClass: 'text-slate-300', iconColor: 'oklch(0.68 0.012 250)', bgClass: 'bg-slate-400/12', ringClass: 'ring-slate-400/25' },
};

function VerdictCoTCard({ cot }: { cot: VerdictCot }) {
    const [open, setOpen] = useState(false);
    const meta = VERDICT_META[cot.verdict] || VERDICT_META.UNVERIFIED;
    const sections = cot.reasoning_text ? parseReasoningText(cot.reasoning_text) : [];
    const gaps = cot.evidence_gaps ?? [];

    return (
        <div className="rounded-xl bg-background/40 ring-1 ring-inset ring-border overflow-hidden my-2">
            {/* Header row */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-card/25 border-b border-border/40">
                <span className={`flex items-center justify-center rounded-md p-1 ${meta.bgClass} ring-1 ring-inset ${meta.ringClass}`}>
                    <Check className="h-3.5 w-3.5" style={{ color: meta.iconColor }} strokeWidth={2.5} />
                </span>
                <span className={`font-mono text-xs font-bold uppercase tracking-wider ${meta.colorClass}`}>{cot.verdict}</span>
                <span className="font-mono text-xs tabular-nums text-foreground ml-auto">{cot.truth_score}/100</span>
                <span className="font-mono text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                    [{cot.confidence_level}]
                </span>
            </div>

            {/* Content area */}
            <div className="p-3 space-y-2">
                <p className="text-sm text-foreground/90 italic leading-relaxed">
                    "{cot.claim_text.length > 160 ? cot.claim_text.slice(0, 160) + '…' : cot.claim_text}"
                </p>

                {cot.reasoning_summary && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                        <Brain className="h-3.5 w-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                        <span>{cot.reasoning_summary}</span>
                    </div>
                )}

                {gaps.length > 0 && (
                    <div className="space-y-1 mt-1">
                        {gaps.slice(0, 2).map((g: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground/80">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <span>Gap: {g}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Toggle Button */}
            {cot.reasoning_text && (
                <button
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/10 transition border-t border-border/40"
                    onClick={() => setOpen(o => !o)}
                >
                    <span className="flex items-center gap-1.5">
                        <ChevronDown
                            className={`h-3 w-3 transition-transform duration-180 ${open ? 'rotate-180' : ''}`}
                            strokeWidth={3}
                        />
                        {open ? 'Hide' : 'View'} chain of thought
                    </span>
                </button>
            )}

            {/* Expanded Reasoning Panel */}
            <AnimatePresence>
                {open && cot.reasoning_text && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="bg-background/60 border-t border-border/40 overflow-hidden"
                    >
                        <div className="p-3 space-y-2.5 max-h-72 overflow-y-auto text-xs leading-relaxed text-muted-foreground">
                            {sections.length > 1 ? (
                                sections.map((sec, i) => (
                                    <div key={i} className="space-y-1">
                                        {sec.heading && <p className="font-semibold text-foreground/80 font-mono text-[11px]">{sec.heading}</p>}
                                        {sec.body && <p className="pl-2 border-l border-border/60">{sec.body}</p>}
                                    </div>
                                ))
                            ) : (
                                <p className="whitespace-pre-wrap">{cot.reasoning_text}</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function AgentPipeline({ thoughts, isComplete, isHistory }: Props) {
    const [sections, setSections] = useState<AgentSection[]>(initialSections);
    const [visibleItems, setVisibleItems] = useState<Record<AgentId, number>>(
        () => Object.fromEntries(STAGE_ORDER.map(id => [id, 0])) as Record<AgentId, number>
    );
    const bottomRef = useRef<HTMLDivElement>(null);
    const animTimers = useRef<ReturnType<typeof setInterval>[]>([]);
    const processed = useRef(new Set<string>());
    const prevLogCount = useRef(0);

    const animateItems = (id: AgentId, count: number) => {
        let i = 0;
        const timer = setInterval(() => {
            setVisibleItems(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
            if (++i >= count) clearInterval(timer);
        }, 110);
        animTimers.current.push(timer);
    };

    const addItems = (id: AgentId, items: SubItem[]) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, items: [...s.items, ...items] } : s));
    };

    // Initialize pipeline states
    useEffect(() => {
        setSections(prev => prev.map(s => s.id === 'init' ? { ...s, state: 'active' } : s));
        const t = setTimeout(() => {
            setSections(prev => prev.map(s => {
                if (s.id === 'init') {
                    return {
                        ...s,
                        state: 'done',
                        items: [{ text: 'Scraping article via Jina Reader', kind: 'info', visible: true }]
                    };
                }
                if (s.id === 'multilingual') return { ...s, state: 'active' };
                return s;
            }));
            setVisibleItems(prev => ({ ...prev, init: 9999 }));
        }, 380);
        return () => clearTimeout(t);
    }, []);

    // Agent 0 logs (multilingual translation steps)
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

    // Agent 0 complete -> Claims Extraction
    useEffect(() => {
        const pre = thoughts.find(t => t.agent === 'agent0_pre');
        if (!pre || processed.current.has('multilingual')) return;
        processed.current.add('multilingual');

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

    // Agent 1: Claim Extraction
    useEffect(() => {
        const t = [...thoughts].reverse().find(t => t.agent === 'claim_extraction');
        if (!t?.data || processed.current.has('claim_extraction')) return;
        processed.current.add('claim_extraction');

        const claims: any[] = t.data.claims || [];
        const newItems: SubItem[] = [
            { text: `Extracted ${claims.length} checkable claim${claims.length !== 1 ? 's' : ''}`, kind: 'info', visible: false },
            ...claims.map(c => ({
                text: `"${c.claim_text || c.claim || ''}"`,
                kind: 'search' as const, visible: false,
            })),
        ];
        setSections(prev => prev.map(s => {
            if (s.id === 'claim_extraction')   return { ...s, state: 'done', items: [...s.items, ...newItems] };
            if (s.id === 'evidence_retrieval') return { ...s, state: 'active' };
            return s;
        }));
        animateItems('claim_extraction', newItems.length);
    }, [thoughts]);

    // Agent 2: Evidence Retrieval
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
            if (s.id === 'evidence_retrieval')  return { ...s, state: 'done', items: [...s.items, ...newItems] };
            if (s.id === 'source_credibility')  return { ...s, state: 'active' };
            return s;
        }));
        animateItems('evidence_retrieval', newItems.length);
    }, [thoughts]);

    // Agent 3: Source Credibility
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
            if (s.id === 'source_credibility') return { ...s, state: 'done', items: [...s.items, ...newItems] };
            if (s.id === 'fact_checker')       return { ...s, state: 'active' };
            return s;
        }));
        animateItems('source_credibility', newItems.length);
    }, [thoughts]);

    // Agent 4: Fact Checker
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
            if (s.id === 'fact_checker')          return { ...s, state: 'done', items: [...s.items, ...newItems] };
            if (s.id === 'explanation_generator') return { ...s, state: 'active' };
            return s;
        }));
        animateItems('fact_checker', newItems.length);
    }, [thoughts]);

    // Agent 5: Explanation Generator
    useEffect(() => {
        const t = [...thoughts].reverse().find(t => t.agent === 'explanation_generator');
        if (!t?.data || processed.current.has('explanation_generator')) return;
        processed.current.add('explanation_generator');

        const expl = t.data.explanations || {};
        const newItems: SubItem[] = [
            { text: 'Plain-English explanations generated', kind: 'info', visible: false },
            ...(expl.overall_credibility ? [{ text: `Overall: ${expl.overall_credibility}`, kind: 'final' as const, visible: false }] : []),
            ...(expl.bottom_line         ? [{ text: expl.bottom_line, kind: 'final' as const, visible: false }] : []),
        ];
        setSections(prev => prev.map(s => {
            if (s.id === 'explanation_generator') return { ...s, state: 'done', items: [...s.items, ...newItems] };
            if (s.id === 'image_integrity')       return { ...s, state: 'active' };
            return s;
        }));
        animateItems('explanation_generator', newItems.length);
    }, [thoughts]);

    // Agent 6: Image Integrity
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

    // Clean timers and complete all active elements
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

    // Auto-scroll inside chat
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [visibleItems]);

    const activeSections = sections.filter(s => s.state !== 'pending');

    const progressPercent = (activeSections.length / 8) * 100;

    const panel = (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card/25 backdrop-blur-sm shadow-xl">
            {!isComplete && (
                <div className="h-0.5 w-full bg-muted/40 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-emerald-400"
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            )}
            <div className="py-2.5 divide-y divide-border/30">
                {activeSections.map(section => {
                    const count = isHistory ? section.items.length : (visibleItems[section.id] || 0);
                    return (
                        <div
                            key={section.id}
                            className={`p-4 transition-all duration-200 ${
                                section.state === 'active' ? 'bg-emerald-500/5 border-l-2 border-emerald-400' : 'bg-transparent'
                            }`}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-3">
                                <span className={`flex items-center justify-center rounded-lg h-7 w-7 ${
                                    section.state === 'active'
                                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
                                        : 'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                    <section.Icon className="h-4 w-4" strokeWidth={2} />
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-foreground/90">{section.label}</span>
                                    {section.state === 'done' && (
                                        <span className="text-[10px] font-mono text-muted-foreground/60">
                                            Stage complete · {section.duration}
                                        </span>
                                    )}
                                </div>
                                <span className="ml-auto">
                                    {section.state === 'active' && !isComplete && (
                                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-kredo-pulse-dot" />
                                    )}
                                    {section.state === 'done' && (
                                        <span className="flex items-center justify-center text-emerald-400 text-xs bg-emerald-500/10 h-5 w-5 rounded-full ring-1 ring-emerald-500/20 font-bold">
                                            ✓
                                        </span>
                                    )}
                                </span>
                            </div>

                            {/* Items */}
                            {section.items.length > 0 && (
                                <ul className="mt-3 pl-10 space-y-1.5">
                                    {section.items.slice(0, count).map((item: SubItem, i: number) => {
                                        if (item.kind === 'verdict-cot' && item.cot) {
                                            return (
                                                <li key={i} className="animate-kredo-fade-in-up">
                                                    <VerdictCoTCard cot={item.cot} />
                                                </li>
                                            );
                                        }

                                        const dotColors: Record<string, string> = {
                                            info: 'bg-emerald-400/60',
                                            search: 'bg-violet-400/60',
                                            score: 'bg-amber-400/60',
                                            final: 'bg-emerald-400',
                                            warn: 'bg-rose-400/80',
                                        };

                                        return (
                                            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed animate-kredo-fade-in-up">
                                                <span className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${dotColors[item.kind as keyof typeof dotColors] || 'bg-emerald-400'}`} />
                                                <span className="text-muted-foreground font-sans">{item.text}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {/* Thinking placeholder */}
                            {section.state === 'active' && !isComplete && section.items.length === 0 && (
                                <div className="mt-2 pl-10 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                    <span className="flex gap-1">
                                        <span className="animate-bounce" style={{ animationDelay: '0s' }}>.</span>
                                        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                                        <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                                    </span>
                                    <span>Processing stage</span>
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
            <details className="mt-4 border border-border/60 rounded-xl bg-muted/10 group overflow-hidden" open={false}>
                <summary className="flex items-center gap-2 p-3 font-mono text-xs text-muted-foreground hover:text-foreground cursor-pointer transition select-none">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Pipeline checkpoints · Completed</span>
                    <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground group-open:rotate-180 transition-transform duration-200" />
                </summary>
                <div className="border-t border-border/40 p-2 bg-background/30">{panel}</div>
            </details>
        );
    }

    return panel;
}
