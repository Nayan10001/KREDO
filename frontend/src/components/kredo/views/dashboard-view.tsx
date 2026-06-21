import { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
    Activity, ShieldCheck, Clock, CheckCircle2,
    Languages, Zap, TrendingUp, ChevronRight, Loader2
} from 'lucide-react';
import { getHistory } from '../../../services/api';
import { HistoryItem } from '../../../lib/kredo/types';
import { getVerdictStyle } from '../shared/verdict-badge';
import VerdictBadge from '../shared/verdict-badge';

export default function DashboardView() {
    const [entries, setEntries] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const mapRawToHistoryItem = (raw: any): HistoryItem => {
        const isUrl = raw.url.startsWith('http');
        const isImage = raw.url.startsWith('Image:');
        const inputType = isImage ? 'image' : (isUrl ? 'url' : 'text');

        const trustScore = typeof raw.avg_score === 'number' ? raw.avg_score : (raw.trustScore || 50);

        let overallVerdict = raw.overall_credibility || raw.overallVerdict || '';
        if (!overallVerdict) {
            if (trustScore >= 70) overallVerdict = 'CREDIBLE';
            else if (trustScore >= 50) overallVerdict = 'MIXED';
            else overallVerdict = 'UNRELIABLE';
        }

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

    useEffect(() => {
        getHistory()
            .then(data => {
                const dbEntries = Array.isArray(data) ? data.map(mapRawToHistoryItem) : [];
                setEntries(dbEntries);
            })
            .catch(err => {
                console.error('Error fetching dashboard history:', err);
                setEntries([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const total = entries.length;
    const avgScore = total > 0
        ? Math.round(entries.reduce((acc, curr) => acc + (curr.trustScore || 50), 0) / total)
        : 0;

    let totalDuration = 0;
    let countWithDuration = 0;
    entries.forEach(e => {
        if (e.duration) {
            const parsed = parseFloat(e.duration);
            if (!isNaN(parsed)) {
                totalDuration += parsed;
                countWithDuration++;
            }
        }
    });
    const avgDuration = countWithDuration > 0 ? (totalDuration / countWithDuration) : 0;
    const avgLatency = `${avgDuration.toFixed(1)}s`;

    const totalClaims = entries.reduce((acc, curr) => acc + (curr.claimsCount || 0), 0);
    const totalSources = entries.reduce((acc, curr) => acc + (curr.sourcesCount || 0), 0);

    const uniqueLangs = new Set(entries.map(e => e.language || 'English'));
    const totalLanguages = total > 0 ? uniqueLangs.size : 0;

    const highRiskImages = entries.filter(e => e.inputType === 'image' && (e.overallVerdict === 'UNRELIABLE' || e.overallVerdict === 'CONTRADICTED')).length;

    // Checks last 14 days vs prior 14 days
    const now = new Date();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);
    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(now.getDate() - 28);

    const checksLast14 = entries.filter(e => new Date(e.timestamp) >= fourteenDaysAgo).length;
    const checksPrior14 = entries.filter(e => {
        const d = new Date(e.timestamp);
        return d >= twentyEightDaysAgo && d < fourteenDaysAgo;
    }).length;

    let pctChange = 0;
    if (checksPrior14 > 0) {
        pctChange = Math.round(((checksLast14 - checksPrior14) / checksPrior14) * 100);
    } else if (checksLast14 > 0) {
        pctChange = 100;
    }
    const pctSign = pctChange >= 0 ? '+' : '';
    const pctChangeText = `${pctSign}${pctChange}% checks vs. prior 14 days`;

    // Stat cards definition
    const statCards = [
        { label: 'Total Checks', value: total.toLocaleString(), sub: pctChangeText, icon: Activity, color: 'oklch(0.78 0.18 155)', bgClass: 'bg-emerald-500/10 text-emerald-400' },
        { label: 'Avg Trust Score', value: `${avgScore}/100`, sub: 'across all claims', icon: ShieldCheck, color: 'oklch(0.78 0.18 155)', bgClass: 'bg-emerald-500/10 text-emerald-400' },
        { label: 'Avg Latency', value: avgLatency, sub: 'end-to-end pipeline', icon: Clock, color: 'oklch(0.82 0.16 75)', bgClass: 'bg-amber-500/10 text-amber-400' },
        { label: 'Claims Verified', value: totalClaims.toLocaleString(), sub: `${totalSources.toLocaleString()} sources cited`, icon: CheckCircle2, color: 'oklch(0.78 0.18 155)', bgClass: 'bg-emerald-500/10 text-emerald-400' },
        { label: 'Languages', value: totalLanguages.toString(), sub: 'Indic + English', icon: Languages, color: 'oklch(0.70 0.18 300)', bgClass: 'bg-violet-500/10 text-violet-400' },
        { label: 'High-Risk Images', value: highRiskImages.toString(), sub: 'EXIF tamper detected', icon: Zap, color: 'oklch(0.65 0.22 25)', bgClass: 'bg-rose-500/10 text-rose-400' },
    ];

    // Format tooltips for charts
    const customTooltipStyle = {
        contentStyle: {
            background: 'oklch(0.205 0.014 250)',
            border: '1px solid oklch(1 0 0 / 10%)',
            borderRadius: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'oklch(0.96 0.005 250)',
        },
        itemStyle: {
            color: 'oklch(0.96 0.005 250)',
        },
        labelStyle: {
            color: 'oklch(0.68 0.012 250)',
            marginBottom: '4px',
            fontWeight: 'bold',
        }
    };

    // Compute charts data
    const trendData = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

        const entriesOnDay = entries.filter(e => {
            const entryDate = new Date(e.timestamp);
            return entryDate.getDate() === d.getDate() &&
                   entryDate.getMonth() === d.getMonth() &&
                   entryDate.getFullYear() === d.getFullYear();
        });

        const credible = entriesOnDay.filter(e => e.overallVerdict === 'CREDIBLE' || e.overallVerdict === 'SUPPORTED').length;
        const mixed = entriesOnDay.filter(e => e.overallVerdict === 'MIXED' || e.overallVerdict === 'MISLEADING').length;
        const unreliable = entriesOnDay.filter(e => e.overallVerdict === 'UNRELIABLE' || e.overallVerdict === 'CONTRADICTED').length;

        trendData.push({
            date: dateStr,
            credible,
            mixed,
            unreliable
        });
    }

    const credibleCount = entries.filter(e => e.overallVerdict === 'CREDIBLE' || e.overallVerdict === 'SUPPORTED').length;
    const mixedCount = entries.filter(e => e.overallVerdict === 'MIXED' || e.overallVerdict === 'MISLEADING').length;
    const unreliableCount = entries.filter(e => e.overallVerdict === 'UNRELIABLE' || e.overallVerdict === 'CONTRADICTED').length;
    const unverifiedCount = entries.filter(e => e.overallVerdict === 'UNVERIFIED' || !e.overallVerdict).length;

    const distributionData = [
        { name: 'Credible', value: total > 0 ? Math.round((credibleCount / total) * 100) : 0, color: 'oklch(0.72 0.19 155)' },
        { name: 'Mixed', value: total > 0 ? Math.round((mixedCount / total) * 100) : 0, color: 'oklch(0.78 0.16 75)' },
        { name: 'Unreliable', value: total > 0 ? Math.round((unreliableCount / total) * 100) : 0, color: 'oklch(0.64 0.22 25)' },
        { name: 'Unverified', value: total > 0 ? Math.round((unverifiedCount / total) * 100) : 0, color: 'oklch(0.68 0.012 250)' }
    ];

    const urlCount = entries.filter(e => e.inputType === 'url').length;
    const textCount = entries.filter(e => e.inputType === 'text').length;
    const imageCount = entries.filter(e => e.inputType === 'image').length;

    const inputTypeData = [
        { type: 'URL', count: urlCount },
        { type: 'Text', count: textCount },
        { type: 'Image', count: imageCount }
    ];

    const langCounts: Record<string, number> = {};
    entries.forEach(e => {
        const lang = e.language || 'English';
        langCounts[lang] = (langCounts[lang] || 0) + 1;
    });
    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
    const languageCoverage = sortedLangs.map(([language, count]) => ({
        language,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
    if (languageCoverage.length === 0) {
        languageCoverage.push({ language: 'English', percentage: 0 });
    }

    const data = {
        trendData,
        distributionData,
        inputTypeData,
        languageCoverage
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-7xl mx-auto w-full py-12 px-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-emerald-400" />
                <span className="font-mono text-xs text-muted-foreground">Loading dashboard analytics...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full py-4 lg:py-6 px-4">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/40 pb-5">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-sans">Dashboard</h1>
                    <p className="text-xs lg:text-sm text-muted-foreground mt-1 font-sans">
                        Platform analytics across all fact-checks · last 14 days
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25 self-start md:self-auto">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] font-mono font-semibold text-emerald-300 uppercase tracking-wider">
                        {pctChangeText}
                    </span>
                </div>
            </div>

            {/* Stat Cards 6-up Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {statCards.map((card, index) => (
                    <div
                        key={index}
                        className="rounded-xl border border-border bg-card/20 p-4 space-y-3 shadow-md backdrop-blur-sm"
                    >
                        <span className={`inline-flex items-center justify-center rounded-lg h-7 w-7 ${card.bgClass}`}>
                            <card.icon className="h-4 w-4" />
                        </span>
                        <div>
                            <span className="font-mono text-xl font-bold text-foreground tabular-nums block">
                                {card.value}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 block font-sans">
                                {card.label}
                            </span>
                            <span className="text-[9px] text-muted-foreground/60 mt-1 block font-sans">
                                {card.sub}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Verdict Trend (Area Chart) - 2 cols on lg */}
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card/10 p-5 space-y-4 shadow-lg backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <span className="text-xs font-semibold text-foreground block">Verification Trends</span>
                            <span className="text-[10px] text-muted-foreground/80 font-sans">
                                Fact-check volume segmented by verdict categories
                            </span>
                        </div>
                        {/* Custom Legend */}
                        <div className="flex gap-3 text-[10px] font-mono">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                <span className="text-muted-foreground/80">Credible</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-400" />
                                <span className="text-muted-foreground/80">Mixed</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-rose-400" />
                                <span className="text-muted-foreground/80">Unreliable</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCredible" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorMixed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorUnreliable" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="oklch(0.64 0.22 25)" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="oklch(0.64 0.22 25)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="oklch(0.68 0.012 250)"
                                    fontSize={10}
                                    fontFamily="var(--font-mono)"
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="oklch(0.68 0.012 250)"
                                    fontSize={10}
                                    fontFamily="var(--font-mono)"
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip {...customTooltipStyle} />
                                <Area
                                    type="monotone"
                                    dataKey="credible"
                                    stroke="oklch(0.72 0.19 155)"
                                    fillOpacity={1}
                                    fill="url(#colorCredible)"
                                    strokeWidth={1.8}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="mixed"
                                    stroke="oklch(0.78 0.16 75)"
                                    fillOpacity={1}
                                    fill="url(#colorMixed)"
                                    strokeWidth={1.8}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="unreliable"
                                    stroke="oklch(0.64 0.22 25)"
                                    fillOpacity={1}
                                    fill="url(#colorUnreliable)"
                                    strokeWidth={1.8}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Verdict Distribution (Donut Pie Chart) - 1 col */}
                <div className="rounded-2xl border border-border bg-card/10 p-5 space-y-4 shadow-lg backdrop-blur-sm flex flex-col justify-between">
                    <div>
                        <span className="text-xs font-semibold text-foreground block">Verdict Distribution</span>
                        <span className="text-[10px] text-muted-foreground/80 font-sans">
                            Overall rating breakdowns for analyzed articles
                        </span>
                    </div>

                    <div className="h-40 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.distributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={44}
                                    outerRadius={68}
                                    paddingAngle={2.5}
                                    dataKey="value"
                                >
                                    {data.distributionData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip {...customTooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Donut Legend */}
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono border-t border-border/40 pt-4">
                        {data.distributionData.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-muted-foreground/80 truncate">{item.name}</span>
                                <span className="text-foreground font-bold ml-auto">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Recent Checks List - 2 cols on lg */}
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card/10 p-5 space-y-4 shadow-lg backdrop-blur-sm">
                    <div>
                        <span className="text-xs font-semibold text-foreground block">Recent Checks</span>
                        <span className="text-[10px] text-muted-foreground/80 font-sans">
                            Latest activity streaming from the platform
                        </span>
                    </div>

                    <div className="divide-y divide-border/40 border-t border-border/40">
                        {entries.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground font-mono">
                                No checks recorded yet. Run a verification query to start.
                            </div>
                        ) : (
                            entries.slice(0, 5).map((row: any, idx: number) => {
                                const vStyle = getVerdictStyle(row.overallVerdict || 'UNVERIFIED');
                                const prettyUrl = row.url.startsWith('http')
                                    ? row.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
                                    : row.url;

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between gap-4 py-3 hover:bg-muted/10 transition px-2 rounded-lg cursor-pointer group"
                                    >
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <VerdictBadge size="sm" verdict={row.overallVerdict || 'UNVERIFIED'} />
                                                {row.language && (
                                                    <span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-violet-500/12 text-violet-300 ring-1 ring-inset ring-violet-500/20 uppercase font-semibold">
                                                        {row.language}
                                                    </span>
                                                )}
                                                <span className="text-[9px] font-mono text-muted-foreground/50">
                                                    {row.inputType} · {row.claimsCount} claims · {row.sourcesCount} sources
                                                </span>
                                            </div>
                                            <span className="text-xs text-foreground/90 font-mono block truncate max-w-lg">
                                                {prettyUrl}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <span className={`font-mono text-sm font-bold ${vStyle.text}`}>
                                                    {row.trustScore}
                                                </span>
                                                <span className="text-[9px] font-mono text-muted-foreground/45 block">/100</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 2. Breakdowns (Input types + Languages) - 1 col */}
                <div className="rounded-2xl border border-border bg-card/10 p-5 space-y-6 shadow-lg backdrop-blur-sm">
                    {/* Input Types (Bar Chart) */}
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs font-semibold text-foreground block">Submission Types</span>
                            <span className="text-[10px] text-muted-foreground/80 font-sans">
                                Distribution of queries by channel
                            </span>
                        </div>
                        <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.inputTypeData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                                    <XAxis
                                        dataKey="type"
                                        stroke="oklch(0.68 0.012 250)"
                                        fontSize={9}
                                        fontFamily="var(--font-mono)"
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="oklch(0.68 0.012 250)"
                                        fontSize={9}
                                        fontFamily="var(--font-mono)"
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip {...customTooltipStyle} />
                                    <Bar
                                        dataKey="count"
                                        fill="oklch(0.72 0.19 155)"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={32}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Language Coverage (Progress bars) */}
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs font-semibold text-foreground block">Language Coverage</span>
                            <span className="text-[10px] text-muted-foreground/80 font-sans">
                                Multilingual distribution in fact-checks
                            </span>
                        </div>
                        <div className="space-y-2.5">
                            {data.languageCoverage.map((item: any, idx: number) => (
                                <div key={idx} className="space-y-1 text-xs">
                                    <div className="flex justify-between font-sans text-muted-foreground">
                                        <span>{item.language}</span>
                                        <span className="font-mono font-semibold text-foreground">{item.percentage}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-400/80 rounded-full"
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
