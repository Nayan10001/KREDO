import { useState, useEffect } from 'react';
import {
    Search, Filter, Trash2, RefreshCw, Download,
    Link2, Type, Image as ImageIcon, ChevronRight, Loader2
} from 'lucide-react';
import { getHistory, deleteHistoryEntry } from '../../../services/api';
import { HistoryItem } from '../../../lib/kredo/types';
import VerdictBadge from '../shared/verdict-badge';

interface HistoryViewProps {
    onAnalyze: (url: string) => void;
}

export default function HistoryView({ onAnalyze }: HistoryViewProps) {
    const [entries, setEntries] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'url' | 'text' | 'image'>('all');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const mapRawToHistoryItem = (raw: any): HistoryItem => {
        const isUrl = raw.url.startsWith('http');
        const isImage = raw.url.startsWith('Image:');
        const inputType = isImage ? 'image' : (isUrl ? 'url' : 'text');

        // Extract score
        const trustScore = typeof raw.avg_score === 'number' ? raw.avg_score : (raw.trustScore || 50);

        // Derive verdict from score if missing
        let overallVerdict = raw.overall_credibility || raw.overallVerdict || '';
        if (!overallVerdict) {
            if (trustScore >= 70) overallVerdict = 'CREDIBLE';
            else if (trustScore >= 50) overallVerdict = 'MIXED';
            else overallVerdict = 'UNRELIABLE';
        }

        // Clean overall verdict label
        overallVerdict = overallVerdict.replace(' CREDIBILITY', '').replace(' / HOAX', '').replace(' / TAMPERED', '').replace(' / SENSATIONALIST', '');

        return {
            id: raw.id,
            url: raw.url,
            timestamp: raw.timestamp,
            overallVerdict,
            trustScore,
            inputType,
            language: raw.language || 'English',
            claimsCount: raw.claims_count || (raw.verdicts ? raw.verdicts.length : 2),
            sourcesCount: raw.sources_count || 6,
            duration: raw.duration || '6.4s',
            explanations: raw.explanations || {
                overall_credibility: overallVerdict,
                bottom_line: raw.bottom_line
            },
            verdicts: raw.verdicts || []
        };
    };

    const loadHistory = (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        getHistory()
            .then(data => {
                const dbEntries = Array.isArray(data) ? data.map(mapRawToHistoryItem) : [];
                setEntries(dbEntries);
            })
            .catch(err => {
                console.error('Error fetching history:', err);
                setEntries([]);
            })
            .finally(() => {
                setLoading(false);
                setRefreshing(false);
            });
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const confirmed = window.confirm('Remove this analysis entry from local history?');
        if (!confirmed) return;

        setDeletingId(id);
        try {
            // Only make API call for actual database IDs (which are typically numeric/UUIDs and don't start with 'hist-')
            if (!id.startsWith('hist-')) {
                await deleteHistoryEntry(id);
            }
            setEntries(prev => prev.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting entry:', error);
        } finally {
            setDeletingId(null);
        }
    };

    // Date formatter computed against fixed reference time: 2025-06-21T16:00:00Z
    const formatRelativeTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const refDate = new Date('2025-06-21T16:00:00Z');
            const diffMs = refDate.getTime() - date.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffMs < 0 || diffHours < 1) return 'just now';
            if (diffHours < 24) return `${diffHours}h ago`;

            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d ago`;
        } catch {
            return 'recently';
        }
    };

    const handleExportCSV = () => {
        alert('Exporting history to CSV... (Feature mock-up)');
    };

    // Search and filter logic
    const filteredEntries = entries.filter(entry => {
        // Query search
        const matchesQuery =
            entry.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.overallVerdict?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.language?.toLowerCase().includes(searchQuery.toLowerCase());

        // Type filter
        const matchesType = typeFilter === 'all' || entry.inputType === typeFilter;

        return matchesQuery && matchesType;
    });

    const averageTrust = filteredEntries.length
        ? Math.round(filteredEntries.reduce((acc, curr) => acc + (curr.trustScore || 50), 0) / filteredEntries.length)
        : 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full py-4 lg:py-6 px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-5">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-sans">History</h1>
                    <p className="text-xs lg:text-sm text-muted-foreground mt-1 font-sans">
                        {filteredEntries.length} of {entries.length} checks · avg trust {averageTrust}/100
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadHistory(true)}
                        disabled={refreshing}
                        className="p-2 rounded-lg bg-muted hover:bg-muted/80 ring-1 ring-border text-muted-foreground hover:text-foreground cursor-pointer select-none transition disabled:opacity-40"
                        title="Refresh list"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium text-foreground transition cursor-pointer select-none ring-1 ring-border"
                    >
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Search + Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <input
                        type="text"
                        placeholder="Search by URL, language, or verdict…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-card/40 pl-9 pr-4 py-2.5 rounded-lg border border-border outline-none font-mono text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/30 text-foreground transition"
                    />
                </div>

                {/* Filter Segments */}
                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-card/40 border border-border select-none">
                    <span className="p-1 text-muted-foreground/60">
                        <Filter className="h-3.5 w-3.5" />
                    </span>
                    {(['all', 'url', 'text', 'image'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                                typeFilter === type
                                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/20'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* History List */}
            {loading ? (
                <div className="text-center py-12 text-sm text-muted-foreground font-mono">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading analysis log history...</span>
                </div>
            ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-border/80 text-sm text-muted-foreground">
                    No matching checks found. Select a different filter or run a new search.
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredEntries.map((row: HistoryItem) => {
                        const isUrl = row.inputType === 'url';
                        const isImage = row.inputType === 'image';
                        const IconComponent = isUrl ? Link2 : (isImage ? ImageIcon : Type);

                        // Verdict score colors
                        const scoreColors = {
                            CREDIBLE: 'text-emerald-300',
                            SUPPORTED: 'text-emerald-300',
                            UNRELIABLE: 'text-rose-300',
                            CONTRADICTED: 'text-rose-300',
                            MIXED: 'text-amber-300',
                            MISLEADING: 'text-amber-300',
                        };
                        const scoreColor = scoreColors[row.overallVerdict?.toUpperCase() as keyof typeof scoreColors] || 'text-slate-300';

                        const displayUrl = row.url.startsWith('http')
                            ? row.url.replace(/^https?:\/\/(www\.)?/, '')
                            : row.url;

                        return (
                            <div
                                key={row.id}
                                onClick={() => onAnalyze(row.url)}
                                className="group relative flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition cursor-pointer shadow-sm"
                            >
                                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                    {/* Left: Type icon badge */}
                                    <span className={`flex-shrink-0 grid place-items-center h-10 w-10 rounded-lg bg-muted/60 ring-1 ring-border text-muted-foreground group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition`}>
                                        <IconComponent className="h-4.5 w-4.5" />
                                    </span>

                                    {/* Middle info */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <VerdictBadge size="sm" verdict={row.overallVerdict || 'UNVERIFIED'} />
                                            {row.language && (
                                                <span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-violet-500/12 text-violet-300 ring-1 ring-inset ring-violet-500/20 uppercase font-semibold">
                                                    {row.language}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm font-mono text-foreground font-semibold block truncate max-w-sm sm:max-w-md md:max-w-xl">
                                            {displayUrl}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60">
                                            <span>🕐 {formatRelativeTime(row.timestamp)}</span>
                                            <span>•</span>
                                            <span>{row.claimsCount} claims</span>
                                            <span>•</span>
                                            <span>{row.sourcesCount} sources</span>
                                            <span>•</span>
                                            <span>{row.duration}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right score display */}
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className={`font-mono text-2xl font-bold tabular-nums ${scoreColor}`}>
                                            {row.trustScore}
                                        </span>
                                        <span className="text-[10px] font-mono text-muted-foreground/45 block">/100</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, row.id)}
                                        disabled={deletingId === row.id}
                                        className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground/40 grid place-items-center transition cursor-pointer disabled:opacity-40"
                                        title="Delete check"
                                    >
                                        <Trash2 className="h-4.5 w-4.5" />
                                    </button>
                                    <ChevronRight className="h-4.5 w-4.5 text-muted-foreground/30 group-hover:translate-x-0.5 group-hover:text-foreground transition-all duration-150" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
