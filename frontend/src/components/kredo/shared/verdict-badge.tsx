
interface VerdictBadgeProps {
    verdict: string;
    size?: 'sm' | 'md' | 'lg';
    showDot?: boolean;
    className?: string;
}

export interface VerdictStyle {
    bg: string;
    text: string;
    ring: string;
    dot: string;
    label: string;
}

export function getVerdictStyle(verdict: string): VerdictStyle {
    const v = verdict.toUpperCase().trim();

    if (v === 'SUPPORTED' || v === 'CREDIBLE') {
        return {
            bg: 'bg-emerald-500/12',
            text: 'text-emerald-300',
            ring: 'ring-emerald-500/30',
            dot: 'bg-emerald-400',
            label: v === 'SUPPORTED' ? 'Supported' : 'Credible',
        };
    }
    if (v === 'CONTRADICTED' || v === 'UNRELIABLE') {
        return {
            bg: 'bg-rose-500/12',
            text: 'text-rose-300',
            ring: 'ring-rose-500/30',
            dot: 'bg-rose-400',
            label: v === 'CONTRADICTED' ? 'Contradicted' : 'Unreliable',
        };
    }
    if (v === 'MISLEADING' || v === 'MIXED') {
        return {
            bg: 'bg-amber-500/12',
            text: 'text-amber-300',
            ring: 'ring-amber-500/30',
            dot: 'bg-amber-400',
            label: v === 'MISLEADING' ? 'Misleading' : 'Mixed',
        };
    }
    // Default/UNVERIFIED
    return {
        bg: 'bg-slate-400/12',
        text: 'text-slate-300',
        ring: 'ring-slate-400/25',
        dot: 'bg-slate-400',
        label: 'Unverified',
    };
}

export default function VerdictBadge({
    verdict,
    size = 'md',
    showDot = true,
    className = '',
}: VerdictBadgeProps) {
    const style = getVerdictStyle(verdict);

    const sizeClasses = {
        sm: 'text-[10px] px-2 py-0.5 gap-1',
        md: 'text-xs px-2.5 py-1 gap-1',
        lg: 'text-sm px-3.5 py-1.5 gap-1.5',
    };

    const dotSizeClasses = {
        sm: 'h-1 w-1',
        md: 'h-1 w-1',
        lg: 'h-1.5 w-1.5',
    };

    return (
        <span
            className={`inline-flex items-center rounded-full font-mono font-medium uppercase tracking-wider ring-1 ring-inset ${style.bg} ${style.text} ${style.ring} ${sizeClasses[size]} ${className}`}
        >
            {showDot && (
                <span className={`rounded-full ${style.dot} ${dotSizeClasses[size]}`} />
            )}
            {style.label}
        </span>
    );
}
