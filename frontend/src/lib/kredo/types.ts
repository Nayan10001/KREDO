export type KredoView = 'verify' | 'dashboard' | 'agents' | 'history' | 'sources';

export interface VerdictCot {
    claim_text: string;
    verdict: string;
    truth_score: number;
    confidence_level: string;
    reasoning_text?: string;
    reasoning_summary?: string;
    evidence_gaps?: string[];
}

export interface SubItem {
    text: string;
    kind: 'info' | 'search' | 'score' | 'verdict-cot' | 'final' | 'warn';
    visible: boolean;
    cot?: VerdictCot;
}

export type StepState = 'pending' | 'active' | 'done';

export type AgentId =
    | 'init'
    | 'multilingual'
    | 'claim_extraction'
    | 'evidence_retrieval'
    | 'source_credibility'
    | 'fact_checker'
    | 'explanation_generator'
    | 'image_integrity';

export interface AgentSection {
    id: AgentId;
    label: string;
    Icon: any; // LucideIcon type placeholder
    state: StepState;
    items: SubItem[];
    duration?: string;
}

export interface MediaVerdict {
    url: string;
    exif_tamper_flag: boolean;
    ocr_text?: string;
}

export interface StreamResult {
    verdicts: any[];
    explanations: any;
    localizedOutput?: any;
    isTranslated?: boolean;
    sourceLanguage?: string;
    mediaRiskLevel?: string;
    imageUrls?: string[];
    mediaVerdicts?: MediaVerdict[];
}

export interface HistoryItem {
    id: string;
    url: string;
    timestamp: string;
    verdicts: any[];
    explanations: any;
    source?: string;
    // Client-side computed properties
    trustScore?: number;
    overallVerdict?: string;
    language?: string;
    inputType?: 'url' | 'text' | 'image';
    claimsCount?: number;
    sourcesCount?: number;
    duration?: string;
}

export interface Source {
    rank: number;
    domain: string;
    tier: 'T1' | 'T2' | 'T3';
    category: string;
    bias: 'left' | 'center-left' | 'center' | 'center-right' | 'right';
    citedCount: number;
    avgScore: number;
}
