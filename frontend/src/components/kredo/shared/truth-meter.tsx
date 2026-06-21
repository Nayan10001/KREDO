import { useState, useEffect } from 'react';

interface TruthMeterProps {
    score: number;
    size?: number;
    label?: string;
    sublabel?: string;
    animate?: boolean;
    className?: string;
}

export default function TruthMeter({
    score,
    size = 140,
    label,
    sublabel,
    animate = true,
    className = '',
}: TruthMeterProps) {
    const [displayScore, setDisplayScore] = useState(0);

    // Get color based on score
    const getColor = (s: number) => {
        if (s >= 70) return 'oklch(0.78 0.18 155)'; // Emerald
        if (s >= 50) return 'oklch(0.82 0.16 75)';  // Amber
        if (s >= 30) return 'oklch(0.78 0.16 50)';  // Orange
        return 'oklch(0.65 0.22 25)';               // Rose
    };

    const color = getColor(score);

    useEffect(() => {
        if (!animate) {
            setDisplayScore(score);
            return;
        }

        const duration = 1200; // ms
        const startTime = performance.now();

        let animId: number;

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing: easeOutCubic: 1 - (1-t)^3
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.round(ease * score);

            setDisplayScore(currentVal);

            if (progress < 1) {
                animId = requestAnimationFrame(tick);
            }
        };

        animId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animId);
    }, [score, animate]);

    // SVG parameters
    const strokeWidth = size * 0.07;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    // We only fill 75% of the circle (270 degrees)
    const arcLength = circumference * 0.75;
    const filledLength = (displayScore / 100) * arcLength;
    const strokeDashoffset = arcLength - filledLength;

    return (
        <div className={`relative flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-[225deg]" // Rotated so the open part is at the bottom
            >
                {/* Background Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="oklch(1 0 0 / 6%)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeLinecap="round"
                />

                {/* Foreground Arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{
                        filter: `drop-shadow(0 0 6px ${color}55)`,
                        transition: 'stroke 0.3s ease',
                    }}
                />
            </svg>

            {/* Central Score Text Panel */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-[-4px]">
                <div className="flex items-baseline justify-center">
                    <span
                        style={{ fontSize: size * 0.26 }}
                        className="font-mono font-bold leading-none tabular-nums text-foreground"
                    >
                        {displayScore}
                    </span>
                    <span
                        style={{ fontSize: size * 0.09 }}
                        className="font-mono text-muted-foreground/60 font-medium ml-0.5"
                    >
                        /100
                    </span>
                </div>

                {label && (
                    <span
                        style={{ fontSize: size * 0.08 }}
                        className="text-muted-foreground font-mono font-medium uppercase tracking-wider mt-1.5"
                    >
                        {label}
                    </span>
                )}

                {sublabel && (
                    <span
                        style={{ fontSize: size * 0.07 }}
                        className="text-muted-foreground/50 font-mono mt-0.5"
                    >
                        {sublabel}
                    </span>
                )}
            </div>
        </div>
    );
}
