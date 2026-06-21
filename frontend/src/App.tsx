import { useState, useCallback, useRef, useEffect } from 'react';
import AppShell from './components/kredo/app-shell';
import VerifyView from './components/kredo/views/verify-view';
import DashboardView from './components/kredo/views/dashboard-view';
import AgentsView from './components/kredo/views/agents-view';
import HistoryView from './components/kredo/views/history-view';
import SourcesView from './components/kredo/views/sources-view';
import CliLoader from './components/CliLoader';
import { useAgentStream } from './hooks/useAgentStream';
import { saveHistory } from './services/api';
import { KredoView } from './lib/kredo/types';

function App() {
    const [view, setView] = useState<KredoView>('verify');
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [submittedUrl, setSubmittedUrl] = useState<string>('');
    const [showSplash, setShowSplash] = useState(() => {
        // Skip splash when launched from Chrome extension (?url=...)
        return !new URLSearchParams(window.location.search).get('url');
    });
    const [splashFading, setSplashFading] = useState(false);

    const { thoughts, isComplete, finalResult, startStream, startImageStream, resetStream } = useAgentStream();

    const handleSubmit = useCallback((url: string) => {
        setSubmittedUrl(url);
        setIsAnalyzing(true);
        setView('verify');
        resetStream();
        startStream(url);
    }, [resetStream, startStream]);

    const handleSubmitImage = useCallback((file: File) => {
        setSubmittedUrl(`Image: ${file.name}`);
        setIsAnalyzing(true);
        setView('verify');
        resetStream();
        startImageStream(file);
    }, [resetStream, startImageStream]);

    const handleReset = useCallback(() => {
        setSubmittedUrl('');
        setIsAnalyzing(false);
        resetStream();
    }, [resetStream]);

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

    const handleSplashComplete = useCallback(() => {
        setSplashFading(true);
        setTimeout(() => setShowSplash(false), 450);
    }, []);

    if (showSplash) {
        return (
            <div className={`transition-opacity duration-300 ${splashFading ? 'opacity-0' : 'opacity-100'}`}>
                <CliLoader onComplete={handleSplashComplete} />
            </div>
        );
    }

    return (
        <AppShell view={view} onView={setView}>
            {view === 'verify' && (
                <VerifyView
                    isAnalyzing={isAnalyzing}
                    submittedUrl={submittedUrl}
                    thoughts={thoughts}
                    isComplete={isComplete}
                    finalResult={finalResult}
                    onSubmit={handleSubmit}
                    onSubmitImage={handleSubmitImage}
                    resetStream={handleReset}
                />
            )}
            {view === 'dashboard' && <DashboardView />}
            {view === 'agents' && <AgentsView />}
            {view === 'history' && (
                <HistoryView
                    onAnalyze={(url) => {
                        handleSubmit(url);
                    }}
                />
            )}
            {view === 'sources' && <SourcesView />}
        </AppShell>
    );
}

export default App;
