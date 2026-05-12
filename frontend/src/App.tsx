import { useState, useCallback, useRef, useEffect } from 'react';
import URLInput from './components/URLInput';
import AgentChain from './components/AgentChain';
import ScoreDisplay from './components/ScoreDisplay';
import HistoryPanel from './components/HistoryPanel';
import { useAgentStream } from './hooks/useAgentStream';
import { saveHistory } from './services/api';

function App() {
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [submittedUrl, setSubmittedUrl] = useState<string>('');
    const [showHistory, setShowHistory] = useState(false);
    const [searchKey, setSearchKey] = useState(0);

    const { thoughts, isComplete, finalResult, startStream, startImageStream, resetStream } = useAgentStream();

    const handleSubmit = useCallback((url: string) => {
        setSubmittedUrl(url);
        setIsAnalyzing(true);
        setShowHistory(false);
        setSearchKey(k => k + 1);
        resetStream();
        startStream(url);
    }, [resetStream, startStream]);

    const handleSubmitImage = useCallback((file: File) => {
        setSubmittedUrl(`Image: ${file.name}`);
        setIsAnalyzing(true);
        setShowHistory(false);
        setSearchKey(k => k + 1);
        resetStream();
        startImageStream(file);
    }, [resetStream, startImageStream]);

    // Auto-start analysis if ?url= param is present (from Chrome extension handoff)
    const hasAutoStarted = useRef(false);
    useEffect(() => {
        if (hasAutoStarted.current) return;
        const params = new URLSearchParams(window.location.search);
        const autoUrl = params.get('url');
        if (autoUrl) {
            hasAutoStarted.current = true;
            window.history.replaceState({}, document.title, window.location.pathname);
            handleSubmit(autoUrl);
        }
    }, [handleSubmit]);

    // Save to history when stream completes
    const hasSavedRef = useRef(false);
    useEffect(() => {
        if (isComplete && finalResult && submittedUrl && !hasSavedRef.current) {
            hasSavedRef.current = true;
            saveHistory({
                url: submittedUrl,
                verdicts: finalResult.verdicts,
                explanations: finalResult.explanations,
            }).catch(console.error);
        }
    }, [isComplete, finalResult, submittedUrl]);

    // Reset save guard on new analysis
    useEffect(() => {
        if (!isComplete) hasSavedRef.current = false;
    }, [isComplete]);

    // Mark analysis done when stream completes
    useEffect(() => {
        if (isComplete) setIsAnalyzing(false);
    }, [isComplete]);

    const isChatMode = isAnalyzing || thoughts.length > 0;
    const isImageSubmission = submittedUrl.startsWith('Image:');

    return (
        <div className="app">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <header className="app-header">
                <div className="logo-container">
                    <span className="logo-k">K</span>
                    <span className="logo-redo">REDO</span>
                </div>
                <nav className="nav-links" aria-label="Primary navigation">
                    <button
                        type="button"
                        className={`nav-link-btn ${!showHistory ? 'active' : ''}`}
                        onClick={() => setShowHistory(false)}
                        aria-current={!showHistory ? 'page' : undefined}
                    >
                        Home
                    </button>
                    <button
                        type="button"
                        className={`nav-link-btn ${showHistory ? 'active' : ''}`}
                        onClick={() => setShowHistory(true)}
                        aria-current={showHistory ? 'page' : undefined}
                    >
                        History
                    </button>
                </nav>
            </header>

            <main
                id="main-content"
                className={`app-main ${isChatMode && !showHistory ? 'chat-layout' : ''}`}
                aria-live="polite"
            >
                {showHistory ? (
                    <HistoryPanel onAnalyze={handleSubmit} />
                ) : (
                    <>
                        {!isChatMode && !submittedUrl && (
                            <h1 className="hero-title">Let&apos;s Verify</h1>
                        )}

                        {!isChatMode && (
                            <URLInput onSubmit={handleSubmit} onSubmitImage={handleSubmitImage} isLoading={isAnalyzing && !isComplete} />
                        )}

                        {(isAnalyzing || thoughts.length > 0) && (
                            <div className="chat-container">
                                {/* User Message Bubble */}
                                <div className="chat-message user-message">
                                    <div className="chat-bubble user-query-content">
                                        Please verify this content to feed into the truth engine:<br /><br />
                                        {submittedUrl.startsWith('http') ? (
                                            <a href={submittedUrl} target="_blank" rel="noreferrer" className="user-link">
                                                {submittedUrl}
                                            </a>
                                        ) : (
                                            <span className="user-snippet">
                                                "{submittedUrl.length > 300 ? submittedUrl.substring(0, 300) + '...' : submittedUrl}"
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Assistant Message Bubble */}
                                <div className="chat-message assistant-message">
                                    <div className="chat-bubble assistant-bg">
                                        <p className="assistant-greeting">
                                            {isImageSubmission
                                                ? 'Image received. Running OCR, source validation, and integrity checks through the multi-agent pipeline.'
                                                : 'Input received. Running claim extraction, evidence retrieval, and fact-checking through the multi-agent pipeline.'}
                                        </p>

                                        <AgentChain key={searchKey} thoughts={thoughts} isComplete={isComplete} />

                                        {isComplete && finalResult && (
                                            <div className="final-result-wrapper fade-in">
                                                <ScoreDisplay key={searchKey} result={finalResult} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Chat-mode bottom input */}
                                {isChatMode && (
                                    <URLInput
                                        onSubmit={handleSubmit}
                                        onSubmitImage={handleSubmitImage}
                                        isLoading={isAnalyzing && !isComplete}
                                        isChatMode={true}
                                    />
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default App;
