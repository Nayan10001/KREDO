import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Link2, Type, Image as ImageIcon, ArrowRight,
    Loader2, Sparkles, Plus
} from 'lucide-react';
import { StreamResult, AgentThought } from '../../../hooks/useAgentStream';
import AgentPipeline from '../verify/agent-pipeline';
import VerdictDisplay from '../verify/verdict-display';
import KredoLogo from '../shared/kredo-logo';

interface VerifyViewProps {
    isAnalyzing: boolean;
    submittedUrl: string;
    thoughts: AgentThought[];
    isComplete: boolean;
    finalResult: StreamResult | null;
    onSubmit: (url: string) => void;
    onSubmitImage: (file: File) => void;
    resetStream: () => void;
}

export default function VerifyView({
    isAnalyzing,
    submittedUrl,
    thoughts,
    isComplete,
    finalResult,
    onSubmit,
    onSubmitImage,
    resetStream,
}: VerifyViewProps) {
    const [activeTab, setActiveTab] = useState<'url' | 'text'>('url');
    const [inputValue, setInputValue] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [inputValue, activeTab]);

    const handleFormSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed) return;

        if (activeTab === 'url') {
            // Basic URL prepending if user forgot
            let targetUrl = trimmed;
            if (!/^https?:\/\//i.test(targetUrl)) {
                targetUrl = `https://${targetUrl}`;
            }
            onSubmit(targetUrl);
        } else {
            onSubmit(trimmed);
        }
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (activeTab === 'url') {
                handleFormSubmit();
            } else if ((e.metaKey || e.ctrlKey) && activeTab === 'text') {
                handleFormSubmit();
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onSubmitImage(file);
        }
    };

    const handleSampleClick = (sample: string, type: 'url' | 'text') => {
        setActiveTab(type);
        setInputValue(sample);
        // Focus the inputs
        setTimeout(() => {
            if (type === 'url') {
                document.getElementById('kredo-url-input')?.focus();
            } else {
                textareaRef.current?.focus();
            }
        }, 50);
    };

    const isChatMode = isAnalyzing || thoughts.length > 0;
    const isImageSubmission = submittedUrl.startsWith('Image:');

    return (
        <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
                {!isChatMode ? (
                    /* HERO INPUT STATE */
                    <motion.div
                        key="hero-input"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center text-center py-8 lg:py-12 px-4"
                    >
                        {/* Hero Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25 mb-6">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-kredo-pulse-dot" />
                            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-mono font-semibold">
                                7-agent pipeline · 12 Indic languages
                            </span>
                        </div>

                        {/* Title & Subtitle */}
                        <h1 className="font-bold tracking-tight text-4xl lg:text-6xl leading-[1.05] text-foreground font-sans">
                            Unmask the truth.<br />
                            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                One claim at a time.
                            </span>
                        </h1>
                        <p className="text-muted-foreground text-sm lg:text-base max-w-xl mt-4 mb-8 font-sans leading-relaxed">
                            Drop a news link, paste an article, or upload an image. Seven AI agents extract claims,
                            retrieve evidence, score sources, and render verdicts — with full reasoning paths.
                        </p>

                        {/* Input Card */}
                        <div className="w-full rounded-2xl bg-card/60 backdrop-blur-xl ring-1 ring-inset ring-border shadow-2xl shadow-black/40 kredo-gradient-border text-left overflow-hidden">
                            {/* Mode Tabs */}
                            <div className="flex items-center gap-1.5 p-3 pb-0 border-b border-border/40 bg-card/20">
                                <button
                                    onClick={() => { setActiveTab('url'); setInputValue(''); }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
                                        activeTab === 'url'
                                            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                    }`}
                                >
                                    <Link2 className="h-3.5 w-3.5" />
                                    <span>URL</span>
                                </button>
                                <button
                                    onClick={() => { setActiveTab('text'); setInputValue(''); }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
                                        activeTab === 'text'
                                            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                    }`}
                                >
                                    <Type className="h-3.5 w-3.5" />
                                    <span>Text Content</span>
                                </button>
                            </div>

                            {/* Form Input fields */}
                            <form onSubmit={handleFormSubmit} className="flex flex-col">
                                <div className="p-3">
                                    {activeTab === 'url' ? (
                                        <input
                                            id="kredo-url-input"
                                            type="text"
                                            placeholder="https://thehindu.com/news/national/article..."
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className="w-full bg-transparent px-2 py-3 text-sm font-mono outline-none placeholder:text-muted-foreground/30 text-foreground"
                                            autoComplete="off"
                                        />
                                    ) : (
                                        <textarea
                                            ref={textareaRef}
                                            placeholder="Paste a suspicious WhatsApp forward, post text, or article block here..."
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className="w-full bg-transparent px-2 py-2 text-sm font-sans outline-none placeholder:text-muted-foreground/30 text-foreground resize-none max-h-40 min-h-16 overflow-y-auto leading-relaxed"
                                        />
                                    )}
                                </div>

                                {/* Action Row */}
                                <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-card/10">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="grid place-items-center h-9 w-9 rounded-lg hover:bg-muted/80 hover:text-emerald-400 text-muted-foreground transition cursor-pointer select-none ring-1 ring-border bg-card/30"
                                        title="Upload screenshot or image to analyze"
                                    >
                                        <ImageIcon className="h-4 w-4" />
                                    </button>

                                    <div className="flex items-center gap-4">
                                        <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground/50">
                                            {activeTab === 'url' ? 'Enter to submit' : 'Ctrl + Enter to submit'}
                                        </span>
                                        <button
                                            type="submit"
                                            disabled={!inputValue.trim()}
                                            className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 hover:text-emerald-950 font-medium text-xs shadow-lg shadow-emerald-500/10 hover:shadow-emerald-400/20 transition cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                                        >
                                            <span>Verify</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Sample Prompts */}
                        <div className="w-full mt-10 space-y-3">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
                                Or Try A Sample
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <button
                                    onClick={() => handleSampleClick('https://thehindu.com/news/national/government-approves-new-rail-budget', 'url')}
                                    className="group flex items-start gap-3 p-3.5 rounded-xl bg-card/30 ring-1 ring-inset ring-border hover:ring-emerald-500/40 hover:bg-emerald-500/5 transition text-left cursor-pointer"
                                >
                                    <span className="flex-shrink-0 grid place-items-center h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition">
                                        <Link2 className="h-3.5 w-3.5" />
                                    </span>
                                    <div>
                                        <span className="text-xs font-semibold text-foreground/90 block">Credible news</span>
                                        <span className="text-[10px] text-muted-foreground/60 line-clamp-1 mt-0.5">thehindu.com/rail-budget...</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleSampleClick('Drinking warm water with lemon every morning cures cancer in 30 days, scientists confirm', 'text')}
                                    className="group flex items-start gap-3 p-3.5 rounded-xl bg-card/30 ring-1 ring-inset ring-border hover:ring-emerald-500/40 hover:bg-emerald-500/5 transition text-left cursor-pointer"
                                >
                                    <span className="flex-shrink-0 grid place-items-center h-7 w-7 rounded-lg bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition">
                                        <Type className="h-3.5 w-3.5" />
                                    </span>
                                    <div>
                                        <span className="text-xs font-semibold text-foreground/90 block">WhatsApp forward</span>
                                        <span className="text-[10px] text-muted-foreground/60 line-clamp-1 mt-0.5">Drinking warm water cures cancer...</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleSampleClick('https://randomblog.xyz/2025/06/breaking-miracle-cure-for-diabetes-found', 'url')}
                                    className="group flex items-start gap-3 p-3.5 rounded-xl bg-card/30 ring-1 ring-inset ring-border hover:ring-emerald-500/40 hover:bg-emerald-500/5 transition text-left cursor-pointer"
                                >
                                    <span className="flex-shrink-0 grid place-items-center h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition">
                                        <Sparkles className="h-3.5 w-3.5" />
                                    </span>
                                    <div>
                                        <span className="text-xs font-semibold text-foreground/90 block">Suspicious blog</span>
                                        <span className="text-[10px] text-muted-foreground/60 line-clamp-1 mt-0.5">randomblog.xyz/miracle-cure...</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    /* CHAT STREAM STATE */
                    <motion.div
                        key="chat-stream"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="max-w-4xl mx-auto w-full py-6 px-4 space-y-6"
                    >
                        {/* User Message Bubble */}
                        <div className="flex justify-end">
                            <div className="rounded-2xl rounded-tr-sm bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30 px-4.5 py-3.5 max-w-[85%] space-y-1">
                                <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-400/70">
                                    {isImageSubmission ? 'Image analysis' : 'Verification Query'} · You
                                </div>
                                {submittedUrl.startsWith('http') ? (
                                    <a
                                        href={submittedUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-mono text-emerald-100 underline decoration-emerald-500/40 break-all"
                                    >
                                        {submittedUrl}
                                    </a>
                                ) : (
                                    <span className="text-sm text-emerald-50/90 whitespace-pre-wrap font-sans">
                                        "{submittedUrl.length > 400 ? submittedUrl.substring(0, 400) + '...' : submittedUrl}"
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Assistant Message Bubble */}
                        <div className="flex justify-start">
                            <div className="w-full rounded-2xl rounded-tl-sm bg-card/60 ring-1 ring-inset ring-border px-5 py-4 lg:px-7 lg:py-6 space-y-4 shadow-xl">
                                {/* Header info */}
                                <div className="flex items-center gap-2">
                                    <KredoLogo size={22} withWordmark={false} />
                                    <span className="text-xs font-semibold text-foreground font-sans">KREDO</span>
                                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest bg-muted/40 px-1.5 py-0.5 rounded">
                                        multi-agent pipeline
                                    </span>
                                    {isAnalyzing && !isComplete && (
                                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-300 ml-auto bg-emerald-500/10 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/20">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span>running</span>
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed font-sans">
                                    {isImageSubmission
                                        ? 'Image received. Running metadata extraction, OCR transcription, and credibility checks through the LangGraph pipeline.'
                                        : 'Input received. Launching claim extraction, live web crawls, and evidence aggregation through the LangGraph pipeline.'}
                                </p>

                                {/* Pipeline Progress Flow */}
                                <AgentPipeline thoughts={thoughts} isComplete={isComplete} />

                                {/* Complete Verdict Displays */}
                                {isComplete && finalResult && (
                                    <VerdictDisplay result={finalResult} />
                                )}

                                {/* Reset button */}
                                {isComplete && (
                                    <div className="pt-2 border-t border-border/40 flex justify-end">
                                        <button
                                            onClick={resetStream}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 font-mono text-xs ring-1 ring-inset ring-emerald-500/25 cursor-pointer select-none transition"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>New analysis</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom prompt input for quick new analysis */}
                        {isChatMode && !isAnalyzing && (
                            <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                                <button
                                    onClick={resetStream}
                                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition rounded-lg ring-1 ring-border cursor-pointer"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>New query</span>
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
