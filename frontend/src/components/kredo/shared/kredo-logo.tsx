
interface KredoLogoProps {
    size?: number;
    withWordmark?: boolean;
    className?: string;
}

export default function KredoLogo({ size = 32, withWordmark = true, className = '' }: KredoLogoProps) {
    const fontSizeTitle = Math.round(size * 0.5);
    const fontSizeTag = Math.round(size * 0.22);

    return (
        <div className={`inline-flex items-center gap-3 ${className}`}>
            {/* Logo Tile */}
            <div
                style={{ width: size, height: size }}
                className="flex-shrink-0 flex items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/40 select-none"
            >
                <svg
                    width={Math.round(size * 0.6)}
                    height={Math.round(size * 0.6)}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-400"
                >
                    {/* Stylised K with integrated checkmark */}
                    <path d="M4 2v20" />
                    <path d="M4 12h4l6-8" />
                    <path d="M8 12l8 10" />
                    {/* Verification checkmark at bottom right */}
                    <path d="M16 10l2 2 4-4" stroke="oklch(0.85 0.18 155)" />
                </svg>
            </div>

            {/* Wordmark & Tagline */}
            {withWordmark && (
                <div className="flex flex-col leading-none">
                    <span
                        style={{ fontSize: fontSizeTitle }}
                        className="font-bold tracking-tight text-foreground font-sans"
                    >
                        KREDO
                    </span>
                    <span
                        style={{ fontSize: fontSizeTag, letterSpacing: '0.12em' }}
                        className="font-mono font-medium text-emerald-400/80 uppercase mt-0.5"
                    >
                        VERIFIABLE INTELLIGENCE
                    </span>
                </div>
            )}
        </div>
    );
}
