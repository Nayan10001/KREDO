import { Zap, Globe, FileSearch, Search, Shield, Scale, MessageSquare, Image } from 'lucide-react';

export interface AgentMetadata {
    id: string;
    index: number;
    label: string;
    icon: any;
    color: string; // Tailwind text color class
    bgColor: string; // Tailwind bg color class
    borderColor: string; // Tailwind border color class
    colorOklch: string;
    model: string;
    duration: string;
    role: string;
    description: string;
    inputs: string[];
    outputs: string[];
}

export const AGENTS: AgentMetadata[] = [
    {
        id: 'init',
        index: 0,
        label: 'Pipeline Initialisation',
        icon: Zap,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        colorOklch: 'oklch(0.78 0.18 155)',
        model: 'LangGraph Engine',
        duration: '0.4s',
        role: 'Scrapes user input content and boots up pipeline state.',
        description: 'Retrieves article HTML content using specialized scraping utilities (e.g. Jina Reader), normalizes metadata, and sets up parallelized thread tracking in the LangGraph memory state.',
        inputs: ['Raw URL', 'WhatsApp forward text', 'Image upload'],
        outputs: ['Sanitized Article Markdown', 'Target language schema']
    },
    {
        id: 'multilingual',
        index: 1,
        label: 'Multilingual Translator',
        icon: Globe,
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/10',
        borderColor: 'border-sky-500/20',
        colorOklch: 'oklch(0.72 0.14 230)',
        model: 'Sarvam AI / GPT-4o',
        duration: '1.2s',
        role: 'Translates non-English inputs to unified English format.',
        description: 'Detects the input language (supporting 12+ Indic languages). If the content is in Hindi, Tamil, Telugu, etc., it uses the Sarvam Translation API to convert it to English, maintaining cross-lingual semantic parity.',
        inputs: ['Sanitized Article Markdown'],
        outputs: ['English Translation', 'Detected Language code']
    },
    {
        id: 'claim_extraction',
        index: 2,
        label: 'Claim Extraction',
        icon: FileSearch,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        colorOklch: 'oklch(0.78 0.16 75)',
        model: 'GPT-4o / Claude 3.5 Sonnet',
        duration: '0.9s',
        role: 'Extracts discrete checkable claims from text.',
        description: 'Parses the English translation to identify assertions that are factual and checkable (e.g. statistics, historical events, official quotes). Discards opinion, commentary, and filler.',
        inputs: ['English Translation'],
        outputs: ['List of checkable claims (JSON)']
    },
    {
        id: 'evidence_retrieval',
        index: 3,
        label: 'Evidence Retrieval',
        icon: Search,
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/20',
        colorOklch: 'oklch(0.70 0.18 300)',
        model: 'Tavily Search / Exa API',
        duration: '1.8s',
        role: 'Executes live web search queries for corroborating evidence.',
        description: 'Generates specialized query phrases for each extracted claim. Executes parallel search requests using Tavily Search API, targeting highly authoritative domains and news outlets.',
        inputs: ['List of checkable claims'],
        outputs: ['Raw search snippets', 'Source links']
    },
    {
        id: 'source_credibility',
        index: 4,
        label: 'Source Credibility',
        icon: Shield,
        color: 'text-teal-400',
        bgColor: 'bg-teal-500/10',
        borderColor: 'border-teal-500/20',
        colorOklch: 'oklch(0.70 0.16 195)',
        model: 'Domain Verification Agent',
        duration: '0.6s',
        role: 'Rates and tiers the reliability of cited news outlets.',
        description: 'Evaluates each source against a tiered domain checklist: Tier 1 (Wire services, official primary docs), Tier 2 (Slanted mainstream media), or Tier 3 (Unverified social posts). Calculates a domain score based on historic bias.',
        inputs: ['Source links'],
        outputs: ['Domain credibility scores', 'Editorial quality labels']
    },
    {
        id: 'fact_checker',
        index: 5,
        label: 'Fact Checker',
        icon: Scale,
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/20',
        colorOklch: 'oklch(0.65 0.22 25)',
        model: 'Claude 3.5 Sonnet',
        duration: '2.1s',
        role: 'Renders final verdicts and calculates claim truth scores.',
        description: 'Performs multi-step chain-of-thought verification. It weighs retrieved evidence and source reliability scores against the claim. Emits structured verdicts: SUPPORTED, CONTRADICTED, MISLEADING, or UNVERIFIED.',
        inputs: ['Domain credibility scores', 'Raw search snippets', 'Checkable claims'],
        outputs: ['Structured Verdicts & CoT reasoning']
    },
    {
        id: 'explanation_generator',
        index: 6,
        label: 'Explanation Generator',
        icon: MessageSquare,
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20',
        colorOklch: 'oklch(0.76 0.14 290)',
        model: 'GPT-4o-mini',
        duration: '0.8s',
        role: 'Generates plain-English summaries and reader advisories.',
        description: 'Takes complex verdict trees and transforms them into an intuitive, accessible explanation. Produces "Plain English" summaries for each claim and warns of any reader advisory or sensationalist headline framing.',
        inputs: ['Structured Verdicts & CoT reasoning'],
        outputs: ['Overall credibility statement', 'Bottom line', 'Plain English blocks']
    },
    {
        id: 'image_integrity',
        index: 7,
        label: 'Image Integrity',
        icon: Image,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        colorOklch: 'oklch(0.78 0.18 155)',
        model: 'EXIF Parser / LLaVA Vision',
        duration: '1.4s',
        role: 'Scans image metadata for alterations and runs OCR feedback.',
        description: 'Inspects image file structures for EXIF headers, flagging Photoshop/GIMP tampering tags. Extracts text content from screenshots via OCR. If text is found, it triggers a feedback loop back to Agent 1 to re-run text checks.',
        inputs: ['Raw image upload'],
        outputs: ['EXIF tamper flag', 'OCR text (loop back if present)', 'Media risk level']
    }
];

export function getAgentById(id: string): AgentMetadata | undefined {
    return AGENTS.find(a => a.id === id);
}
