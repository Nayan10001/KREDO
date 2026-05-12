import React from 'react';

interface RedFlag {
    type: string;
    description: string;
    severity: string;
}

interface RedFlagsListProps {
    redFlags: RedFlag[];
}

/**
 * RedFlagsList — Red flags breakdown.
 * Displays identified issues with severity levels.
 */
const RedFlagsList: React.FC<RedFlagsListProps> = ({ redFlags }) => {
    const getSeverityLabel = (severity: string): string => {
        switch (severity) {
            case 'critical':
                return 'Critical';
            case 'high':
                return 'High';
            case 'medium':
                return 'Medium';
            case 'low':
                return 'Low';
            default:
                return 'Unknown';
        }
    };

    if (redFlags.length === 0) {
        return null;
    }

    return (
        <section className="red-flags-list" aria-label="Identified red flags">
            <h3>Red Flags</h3>
            <ul>
                {redFlags.map((flag, index) => (
                    <li key={index} className={`red-flag severity-${flag.severity}`}>
                        <span className="severity-icon">{getSeverityLabel(flag.severity)}</span>
                        <span className="flag-type">{flag.type.replace(/_/g, ' ')}</span>
                        <p className="flag-description">{flag.description}</p>
                        <span className="flag-severity">{flag.severity.toUpperCase()}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default RedFlagsList;
