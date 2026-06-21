import { useState, useEffect } from 'react';

const ASCII_ART = `
  _  __ _____   ______  _____    ____  
 | |/ /|  __ \\ |  ____||  __ \\  / __ \\ 
 | ' / | |__) || |__   | |  | || |  | |
 |  <  |  _  / |  __|  | |  | || |  | |
 | . \\ | | \\ \\ | |____ | |__| || |__| |
 |_|\\_\\|_|  \\_\\|______||_____/  \\____/ 
`;

interface Props {
    onComplete?: () => void;
}

export default function CliLoader({ onComplete }: Props) {
    const [displayedText, setDisplayedText] = useState('');
    const [cursorVisible, setCursorVisible] = useState(true);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        let currentIndex = 0;

        const typingInterval = setInterval(() => {
            if (currentIndex <= ASCII_ART.length) {
                setDisplayedText(ASCII_ART.slice(0, currentIndex));
                currentIndex += 4; // type slightly faster
            } else {
                clearInterval(typingInterval);
                setIsComplete(true);
                // Hold splash briefly after completion for transition smoothness
                setTimeout(() => {
                    onComplete?.();
                }, 400);
            }
        }, 12);

        const cursorInterval = setInterval(() => {
            setCursorVisible(v => !v);
        }, 400);

        return () => {
            clearInterval(typingInterval);
            clearInterval(cursorInterval);
        };
    }, [onComplete]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background font-mono px-4 text-center">
            <div className="max-w-md space-y-4">
                <pre className="text-emerald-400 font-bold text-[10px] sm:text-xs leading-none select-none tracking-tight whitespace-pre drop-shadow-[0_0_10px_oklch(0.78_0.18_155_/_20%)]">
                    {displayedText}
                    {!isComplete && <span className="text-emerald-400/80" style={{ opacity: cursorVisible ? 1 : 0 }}>█</span>}
                </pre>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
                    {!isComplete ? (
                        <>
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                            <span>Initializing Verification Pipeline...</span>
                        </>
                    ) : (
                        <>
                            <span className="text-emerald-400 font-bold animate-pulse">✓</span>
                            <span className="text-emerald-300/85">Truth Engine ready.</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
