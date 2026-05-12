import React from 'react';

interface ExportReportProps {
    result: any;
}

/**
 * ExportReport — PDF export button.
 * Allows users to export the analysis report as a PDF.
 */
const ExportReport: React.FC<ExportReportProps> = ({ result }) => {
    const hasResult = Boolean(result);

    return (
        <div className="export-report">
            <button
                type="button"
                className="export-button"
                disabled={!hasResult}
                aria-disabled={!hasResult}
                title={hasResult ? 'Export is coming soon' : 'Run an analysis to enable export'}
            >
                Export Report (coming soon)
            </button>
        </div>
    );
};

export default ExportReport;
