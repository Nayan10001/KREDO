import { useState } from 'react';

/**
 * useAnalysis — Analysis state management.
 * Holds the final analysis data after the agent chain completes.
 */
export function useAnalysis() {
    const [analysisData, setAnalysisData] = useState<any>(null);

    return { analysisData, setAnalysisData };
}
