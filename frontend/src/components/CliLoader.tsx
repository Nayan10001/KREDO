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
        
        // Fast typing effect for the ASCII art
        const typingInterval = setInterval(() => {
            if (currentIndex <= ASCII_ART.length) {
                setDisplayedText(ASCII_ART.slice(0, currentIndex));
                currentIndex += 3; // Type 3 chars at a time for speed
            } else {
                clearInterval(typingInterval);
                setIsComplete(true);
                onComplete?.();
            }
        }, 15);

        // Blinking cursor
        const cursorInterval = setInterval(() => {
            setCursorVisible(v => !v);
        }, 400);

        return () => {
            clearInterval(typingInterval);
            clearInterval(cursorInterval);
        };
    }, []);

    return (
        <div className="cli-loader-container">
            <pre className="cli-ascii-art" role="img" aria-label="KREDO loading banner">
                {displayedText}
                {!isComplete && <span className="cli-cursor" style={{ opacity: cursorVisible ? 1 : 0 }}>█</span>}
            </pre>
            <div className="cli-status-text">
                <span className="spinner" aria-hidden="true">⠋</span> {isComplete ? 'Truth Engine ready.' : 'Initializing Truth Engine...'}
            </div>
        </div>
    );
}
