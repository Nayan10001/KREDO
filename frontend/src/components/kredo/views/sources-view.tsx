import { useState, useEffect } from 'react';
import {
    Search, Filter, Trophy, ShieldCheck, Shield, ShieldAlert, Globe, Loader2
} from 'lucide-react';
import { getHistory } from '../../../services/api';
import { Source } from '../../../lib/kredo/types';

export default function SourcesView() {
    const [searchQuery, setSearchQuery] = useState('');
    const [tierFilter, setTierFilter] = useState<'all' | 'T1' | 'T2' | 'T3'>('all');
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getHistory()
            .then(data => {
                const dbEntries = Array.isArray(data) ? data : [];

                const baseSources: Source[] = [
                    { rank: 1, domain: 'pib.gov.in', tier: 'T1', category: 'Government Registry', bias: 'center', citedCount: 0, avgScore: 0 },
                    { rank: 2, domain: 'reuters.com', tier: 'T1', category: 'News & Wire Services', bias: 'center', citedCount: 0, avgScore: 0 },
                    { rank: 3, domain: 'altnews.in', tier: 'T1', category: 'Fact Checker', bias: 'center', citedCount: 0, avgScore: 0 },
                    { rank: 4, domain: 'bbc.com', tier: 'T2', category: 'International News', bias: 'center-left', citedCount: 0, avgScore: 0 },
                    { rank: 5, domain: 'thehindu.com', tier: 'T2', category: 'National News', bias: 'center-left', citedCount: 0, avgScore: 0 },
                    { rank: 6, domain: 'indiatoday.in', tier: 'T2', category: 'National News', bias: 'center-right', citedCount: 0, avgScore: 0 },
                    { rank: 7, domain: 'twitter.com', tier: 'T3', category: 'Social Media', bias: 'center', citedCount: 0, avgScore: 0 },
                    { rank: 8, domain: 'dailyblogindia.xyz', tier: 'T3', category: 'Skeptical Blog', bias: 'right', citedCount: 0, avgScore: 0 },
                    { rank: 9, domain: 'whatsapp-forward-anonymous', tier: 'T3', category: 'Unverified Forward', bias: 'center', citedCount: 0, avgScore: 0 }
                ];

                const stats: Record<string, { count: number; totalScore: number }> = {};

                dbEntries.forEach((entry: any) => {
                    const verdicts = entry.verdicts || [];
                    verdicts.forEach((v: any) => {
                        const score = v.truth_score ?? 50;
                        const citations = v.citations || [];
                        citations.forEach((cit: string) => {
                            let domain = '';
                            try {
                                if (cit.startsWith('http')) {
                                    domain = new URL(cit).hostname.replace(/^www\./i, '');
                                } else {
                                    domain = cit.split('/')[0].trim();
                                }
                            } catch {
                                domain = cit.trim();
                            }
                            domain = domain.toLowerCase();
                            if (domain) {
                                if (!stats[domain]) {
                                    stats[domain] = { count: 0, totalScore: 0 };
                                }
                                stats[domain].count += 1;
                                stats[domain].totalScore += score;
                            }
                        });
                    });
                });

                const updatedSources = baseSources.map(src => {
                    const match = stats[src.domain.toLowerCase()];
                    return {
                        ...src,
                        citedCount: match ? match.count : 0,
                        avgScore: match && match.count > 0 ? Math.round(match.totalScore / match.count) : 0
                    };
                });

                // Algorithm to rank sources based on performance (average score & cited count)
                updatedSources.sort((a, b) => {
                    // Sources with citations go first
                    if (a.citedCount > 0 && b.citedCount === 0) return -1;
                    if (b.citedCount > 0 && a.citedCount === 0) return 1;
                    if (a.citedCount === 0 && b.citedCount === 0) {
                        const tierOrder = { T1: 1, T2: 2, T3: 3 };
                        return tierOrder[a.tier] - tierOrder[b.tier];
                    }
                    if (b.avgScore !== a.avgScore) {
                        return b.avgScore - a.avgScore;
                    }
                    return b.citedCount - a.citedCount;
                });

                const ranked = updatedSources.map((src, i) => ({
                    ...src,
                    rank: i + 1
                }));

                setSources(ranked);
            })
            .catch(err => {
                console.error('Error loading sources stats:', err);
                setSources([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Get color based on source score
    const getScoreColor = (score: number) => {
        if (score === 0) return 'bg-slate-500/30 text-slate-400';
        if (score >= 80) return 'bg-emerald-400 text-emerald-300';
        if (score >= 60) return 'bg-amber-400 text-amber-300';
        if (score >= 40) return 'bg-orange-400 text-orange-300';
        return 'bg-rose-400 text-rose-300';
    };

    // Tier definitions
    const tierPillClasses = {
        T1: 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/30',
        T2: 'bg-amber-500/12 text-amber-300 ring-amber-500/30',
        T3: 'bg-rose-500/12 text-rose-300 ring-rose-500/30',
    };

    const biasLabels = {
        'left': 'Left',
        'center-left': 'Center-Left',
        'center': 'Center',
        'center-right': 'Center-Right',
        'right': 'Right',
    };

    const filteredSources = sources.filter((source: Source) => {
        const matchesQuery = source.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
            source.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTier = tierFilter === 'all' || source.tier === tierFilter;
        return matchesQuery && matchesTier;
    });

    const topSource = sources.find(s => s.citedCount > 0) || sources[0];

    if (loading) {
        return (
            <div className="space-y-6 max-w-7xl mx-auto w-full py-12 px-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-emerald-400" />
                <span className="font-mono text-xs text-muted-foreground">Loading source performance directory...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full py-4 lg:py-6 px-4">
            {/* Header */}
            <div className="border-b border-border/40 pb-5">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-sans">Source Library</h1>
                <p className="text-xs lg:text-sm text-muted-foreground mt-1 font-sans">
                    {sources.length} sources scored & ranked by Agent 4 · tiered credibility metrics utilized during claim audit runs
                </p>
            </div>

            {/* Top Source Spotlight Card */}
            {topSource && (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-500/12 to-transparent ring-1 ring-inset ring-emerald-500/25 p-5 lg:p-6 kredo-gradient-border relative overflow-hidden shadow-lg">
                    {/* Background SVG badge glow */}
                    <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-5">
                        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                            {/* Big Trophy icon */}
                            <span className="h-14 w-14 rounded-2xl bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-md">
                                <Trophy className="h-6 w-6" />
                            </span>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 justify-center sm:justify-start">
                                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold">
                                        Most Credible Source
                                    </span>
                                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] ${tierPillClasses[topSource.tier as keyof typeof tierPillClasses]} ring-1 ring-inset uppercase font-semibold`}>
                                        {topSource.tier}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold tracking-tight text-foreground font-mono">
                                    {topSource.domain}
                                </h2>
                                <span className="text-xs text-muted-foreground block font-sans">
                                    {topSource.category} · {topSource.citedCount} citations · {biasLabels[topSource.bias as keyof typeof biasLabels]} Bias
                                </span>
                            </div>
                        </div>

                        {/* Top Score */}
                        <div className="text-center sm:text-right border-t sm:border-t-0 border-border/20 pt-4 sm:pt-0 w-full sm:w-auto">
                            <span className="text-4xl font-mono font-black text-emerald-300 tabular-nums block">
                                {topSource.avgScore}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400/60 tracking-wider uppercase block mt-1">
                                average score
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Search + Segmented Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <input
                        type="text"
                        placeholder="Search by domain, category..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-card/40 pl-9 pr-4 py-2.5 rounded-lg border border-border outline-none font-mono text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/30 text-foreground transition"
                    />
                </div>

                {/* Filter */}
                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-card/40 border border-border select-none">
                    <span className="p-1 text-muted-foreground/60">
                        <Filter className="h-3.5 w-3.5" />
                    </span>
                    {(['all', 'T1', 'T2', 'T3'] as const).map(tier => (
                        <button
                            key={tier}
                            onClick={() => setTierFilter(tier)}
                            className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                                tierFilter === tier
                                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/20'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tier === 'all' ? 'All' : `Tier ${tier.slice(1)}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table Directory Card */}
            <div className="rounded-xl border border-border bg-card/25 backdrop-blur-sm shadow-md overflow-hidden">
                {/* Header Row (desktop only) */}
                <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-border/40 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 bg-card/30">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Domain</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-2">Bias Profile</div>
                    <div className="col-span-1 text-right">Cited</div>
                    <div className="col-span-2 text-right">Avg Score</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-border/20">
                    {filteredSources.map((source: Source) => {
                        const scoreColorObj = getScoreColor(source.avgScore);
                        const [progressColor, textColorClass] = scoreColorObj.split(' ');
                        const prettyRank = source.rank.toString().padStart(2, '0');

                        return (
                            <div
                                key={source.domain}
                                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-5 py-4 items-center hover:bg-muted/10 transition duration-100"
                            >
                                {/* Rank */}
                                <div className="col-span-1 font-mono text-xs text-muted-foreground/50 tabular-nums font-semibold md:block hidden">
                                    {prettyRank}
                                </div>

                                {/* Domain, rank for mobile, tier badge */}
                                <div className="col-span-1 md:col-span-4 flex items-center gap-2 flex-wrap min-w-0">
                                    <Globe className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
                                    <span className="md:hidden font-mono text-xs text-muted-foreground/40 tabular-nums">
                                        #{prettyRank}
                                    </span>
                                    <a
                                        href={`https://${source.domain}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-mono text-sm text-foreground hover:text-emerald-300 transition truncate underline decoration-transparent hover:decoration-emerald-400/40 mr-1"
                                    >
                                        {source.domain}
                                    </a>
                                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] ${tierPillClasses[source.tier as keyof typeof tierPillClasses]} ring-1 ring-inset uppercase font-semibold`}>
                                        {source.tier}
                                    </span>
                                </div>

                                {/* Category */}
                                <div className="col-span-2 text-xs text-muted-foreground truncate">
                                    <span className="md:hidden font-semibold text-foreground/50 block mb-0.5 uppercase text-[9px] font-mono tracking-wider">Category</span>
                                    {source.category}
                                </div>

                                {/* Bias Profile */}
                                <div className="col-span-2 text-xs text-muted-foreground truncate font-sans">
                                    <span className="md:hidden font-semibold text-foreground/50 block mb-0.5 uppercase text-[9px] font-mono tracking-wider">Bias</span>
                                    {biasLabels[source.bias as keyof typeof biasLabels]}
                                </div>

                                {/* Citations */}
                                <div className="col-span-1 md:text-right text-xs font-mono text-muted-foreground tabular-nums">
                                    <span className="md:hidden font-semibold text-foreground/50 block mb-0.5 uppercase text-[9px] font-mono tracking-wider">Cited Count</span>
                                    {source.citedCount.toLocaleString()}
                                </div>

                                {/* Progress bar and Score number */}
                                <div className="col-span-2 flex items-center justify-between md:justify-end gap-3.5">
                                    <span className="md:hidden font-semibold text-foreground/50 block uppercase text-[9px] font-mono tracking-wider">Score</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-20 h-1.5 bg-muted/60 rounded-full overflow-hidden hidden md:block">
                                            <div
                                                className={`h-full rounded-full ${progressColor}`}
                                                style={{ width: `${source.avgScore}%` }}
                                            />
                                        </div>
                                        <div className="text-right">
                                            <span className={`font-mono text-sm font-bold tabular-nums ${textColorClass}`}>
                                                {source.avgScore}
                                            </span>
                                            <span className="text-[9px] font-mono text-muted-foreground/45 block md:hidden">/100</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tier Legend explainer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
                <div className="p-4 rounded-xl border border-border bg-card/10 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4" />
                        </span>
                        <div className="font-sans">
                            <span className="text-xs font-bold text-foreground block">Tier 1 · Verified Org</span>
                            <span className="text-[9px] font-mono text-muted-foreground/60 block">PIB, Reuters, AltNews</span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Wire services, established broadcasting bureaus, and primary government registries.
                        Highest standards of reporting, prompt correction logs, and zero editorial slants.
                    </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card/10 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                            <Shield className="h-4 w-4" />
                        </span>
                        <div className="font-sans">
                            <span className="text-xs font-bold text-foreground block">Tier 2 · Mainstream</span>
                            <span className="text-[9px] font-mono text-muted-foreground/60 block">The Hindu, BBC, IndiaToday</span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Mainstream national and international publication houses. Generally reliable verification systems,
                        but carrying potential editorial slants and corporate bias profiles.
                    </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card/10 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                            <ShieldAlert className="h-4 w-4" />
                        </span>
                        <div className="font-sans">
                            <span className="text-xs font-bold text-foreground block">Tier 3 · Unverified</span>
                            <span className="text-[9px] font-mono text-muted-foreground/60 block">Twitter, Blogs, WhatsApp</span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        User-generated social platforms, anonymous blogs, or unvetted private channels.
                        Treated with skepticism during audit checks due to lack of moderation.
                    </p>
                </div>
            </div>
        </div>
    );
}
