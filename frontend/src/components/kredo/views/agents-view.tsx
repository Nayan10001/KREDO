import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeftRight, ChevronRight, Cpu, Clock, Layers
} from 'lucide-react';
import { AGENTS, AgentMetadata } from '../../../lib/kredo/agents';

export default function AgentsView() {
    const [selectedAgentId, setSelectedAgentId] = useState<string>('init');

    const selectedAgent = AGENTS.find((a: AgentMetadata) => a.id === selectedAgentId) || AGENTS[0];

    const handleNodeClick = (id: string) => {
        setSelectedAgentId(id);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto w-full py-4 lg:py-6 px-4">
            {/* Header */}
            <div className="border-b border-border/40 pb-5">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-sans">The Pipeline</h1>
                <p className="text-xs lg:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed font-sans">
                    KREDO runs every input query through an 8-node LangGraph agent pipeline. An OCR-based feedback edge
                    re-triggers translation if target texts are found inside image contents. Click any agent to inspect its config.
                </p>
            </div>

            {/* Pipeline Diagram */}
            <div className="relative rounded-2xl border border-border bg-card/10 p-6 shadow-lg backdrop-blur-sm overflow-hidden">
                {/* Background decorative grid */}
                <div className="absolute inset-0 kredo-grid-bg opacity-30 pointer-events-none" />

                {/* Connecting Line (desktop only) */}
                <div className="hidden lg:block absolute left-12 right-12 top-[66px] h-0.5 bg-gradient-to-r from-emerald-500/20 via-emerald-500/50 to-emerald-500/20 z-0" />

                {/* Node Grid */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 lg:gap-2">
                    {AGENTS.map((agent: AgentMetadata) => {
                        const isSelected = selectedAgentId === agent.id;
                        const IconComponent = agent.icon;

                        return (
                            <button
                                key={agent.id}
                                onClick={() => handleNodeClick(agent.id)}
                                className="flex flex-col items-center text-center focus:outline-none group cursor-pointer select-none"
                            >
                                {/* Circle Node */}
                                <div className="relative">
                                    <div
                                        className={`h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                                            isSelected
                                                ? `${agent.bgColor} ring-2 ring-[${agent.colorOklch}] shadow-lg`
                                                : `bg-muted/30 hover:bg-muted/60 ring-1 ring-border group-hover:scale-105`
                                        }`}
                                        style={{
                                            boxShadow: isSelected ? `0 0 16px ${agent.colorOklch}40` : undefined,
                                            borderColor: isSelected ? agent.colorOklch : undefined,
                                        }}
                                    >
                                        <IconComponent
                                            className={`h-5 w-5 transition-colors ${
                                                isSelected ? agent.color : 'text-muted-foreground group-hover:text-foreground'
                                            }`}
                                        />
                                    </div>

                                    {/* Index Badge */}
                                    <span
                                        className={`absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold border transition ${
                                            isSelected
                                                ? 'bg-foreground text-background border-transparent'
                                                : 'bg-muted/90 text-muted-foreground border-border'
                                        }`}
                                    >
                                        {agent.index}
                                    </span>
                                </div>

                                {/* Label & Duration below */}
                                <div className="mt-2.5 space-y-0.5">
                                    <span className={`text-[10px] font-sans font-semibold block transition-colors leading-tight ${
                                        isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                                    }`}>
                                        {agent.label.replace(' Pipeline', '').replace(' Translator', '')}
                                    </span>
                                    <span className="font-mono text-[9px] text-muted-foreground/50 block">
                                        avg {agent.duration}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Expanded Agent Detail Panel */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedAgentId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className={`rounded-2xl border border-border p-5 lg:p-6 bg-card/40 backdrop-blur-xl shadow-lg relative overflow-hidden`}
                    style={{
                        borderColor: `color-mix(in oklch, ${selectedAgent.colorOklch} 25%, var(--color-border))`,
                        boxShadow: `0 8px 30px -10px color-mix(in oklch, ${selectedAgent.colorOklch} 10%, transparent)`
                    }}
                >
                    {/* Background glow tile */}
                    <div
                        className="absolute -right-24 -top-24 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
                        style={{ backgroundColor: selectedAgent.colorOklch }}
                    />

                    <div className="flex flex-col md:flex-row gap-5 items-start">
                        {/* Big Icon Tile */}
                        <div
                            className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${selectedAgent.bgColor} ring-1 ring-inset`}
                            style={{
                                borderColor: `color-mix(in oklch, ${selectedAgent.colorOklch} 30%, transparent)`,
                                boxShadow: `0 0 16px ${selectedAgent.colorOklch}20`
                            }}
                        >
                            {(() => {
                                const Icon = selectedAgent.icon;
                                return <Icon className={`h-6 w-6 ${selectedAgent.color}`} />;
                            })()}
                        </div>

                        {/* Title details */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                                    Agent {selectedAgent.index.toString().padStart(2, '0')}
                                </span>
                                <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-muted/60 text-muted-foreground border border-border uppercase">
                                    {selectedAgent.id.replace('_', '-')}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-foreground font-sans leading-none">
                                {selectedAgent.label}
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium italic">
                                "{selectedAgent.role}"
                            </p>
                        </div>
                    </div>

                    <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed font-sans mt-4 max-w-4xl border-t border-border/20 pt-4">
                        {selectedAgent.description}
                    </p>

                    {/* Meta properties grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                        <div className="p-3 rounded-lg bg-background/30 border border-border flex items-center gap-3">
                            <span className="p-1.5 rounded-md bg-muted/60 text-muted-foreground flex-shrink-0">
                                <Cpu className="h-4 w-4" />
                            </span>
                            <div>
                                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/50 block">LLM Model</span>
                                <span className="text-xs font-semibold text-foreground truncate max-w-[150px] block">{selectedAgent.model}</span>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-background/30 border border-border flex items-center gap-3">
                            <span className="p-1.5 rounded-md bg-muted/60 text-muted-foreground flex-shrink-0">
                                <Clock className="h-4 w-4" />
                            </span>
                            <div>
                                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/50 block">Avg Duration</span>
                                <span className="text-xs font-semibold text-foreground font-mono block">{selectedAgent.duration}</span>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-background/30 border border-border flex items-center gap-3">
                            <span className="p-1.5 rounded-md bg-muted/60 text-muted-foreground flex-shrink-0">
                                <Layers className="h-4 w-4" />
                            </span>
                            <div>
                                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/50 block">Pipeline Stage</span>
                                <span className="text-xs font-semibold text-foreground uppercase tracking-wide block">Stage {selectedAgent.index}</span>
                            </div>
                        </div>
                    </div>

                    {/* Inputs/Outputs lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-border/20 pt-4">
                        <div className="space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 block">Inputs</span>
                            <ul className="space-y-1.5">
                                {selectedAgent.inputs.map((inp: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                                        <span className="h-1 w-1 rounded-full bg-emerald-400/60 flex-shrink-0" />
                                        <span>{inp}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 block">Outputs</span>
                            <ul className="space-y-1.5">
                                {selectedAgent.outputs.map((out: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0 animate-pulse" />
                                        <span>{out}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Feedback Loop Callout */}
            <div className="p-4 rounded-xl bg-violet-500/8 ring-1 ring-inset ring-violet-500/20 backdrop-blur-sm flex gap-4 items-start shadow-md">
                <span className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ArrowLeftRight className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                    <h3 className="text-xs font-bold text-violet-300 uppercase tracking-wider">
                        Conditional feedback loop · Agent 7 → Agent 1
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        If Agent 7 (Image Integrity) flags text transcripts inside raw screenshots via optical character extraction,
                        it feeds the extracted string back to Agent 1 (Multilingual Translator) to evaluate textual claims in parallel,
                        ensuring hidden assertions are not missed.
                    </p>
                </div>
            </div>

            {/* All Agents List Grid */}
            <div className="space-y-3 pt-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
                    All Pipeline Node Specs
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {AGENTS.map((agent: AgentMetadata) => {
                        const IconC = agent.icon;
                        return (
                            <button
                                key={agent.id}
                                onClick={() => handleNodeClick(agent.id)}
                                className={`p-4 rounded-xl border border-border bg-card/20 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition text-left cursor-pointer group flex flex-col justify-between h-40 ${
                                    selectedAgentId === agent.id ? 'ring-1 ring-emerald-500/30 bg-emerald-500/5' : ''
                                }`}
                            >
                                <div className="space-y-2 w-full">
                                    <div className="flex items-center justify-between">
                                        <span className={`h-8 w-8 rounded-lg flex items-center justify-center bg-card ring-1 ring-border ${agent.color}`}>
                                            <IconC className="h-4 w-4" />
                                        </span>
                                        <span className="font-mono text-[9px] text-muted-foreground/50">Agent {agent.index}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-foreground block group-hover:text-emerald-300 transition duration-150">{agent.label}</span>
                                        <p className="text-[10px] text-muted-foreground/75 leading-relaxed line-clamp-2 mt-1">
                                            {agent.role}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between w-full font-mono text-[9px] text-muted-foreground/50 pt-2 border-t border-border/10">
                                    <span>avg {agent.duration}</span>
                                    <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
