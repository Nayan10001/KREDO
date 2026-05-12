import React from 'react';

interface SourceInfo {
    source: string;
    title: string;
    url: string;
    relevance: string;
}

interface SourceCitationsProps {
    corroborating: SourceInfo[];
    contradicting: SourceInfo[];
}

/**
 * SourceCitations — Trusted sources list.
 * Displays corroborating and contradicting sources with links.
 */
const SourceCitations: React.FC<SourceCitationsProps> = ({ corroborating, contradicting }) => {
    return (
        <section className="source-citations" aria-label="Source citations">
            <h3>Sources</h3>

            {corroborating.length > 0 && (
                <div className="sources-section supporting">
                    <h4>Corroborating Sources</h4>
                    <ul>
                        {corroborating.map((source, index) => (
                            <li key={index}>
                                <strong>{source.source}</strong>: {source.title}
                                <br />
                                <a href={source.url} target="_blank" rel="noopener noreferrer">
                                    {source.url}
                                </a>
                                <span className="relevance">Relevance: {source.relevance}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {contradicting.length > 0 && (
                <div className="sources-section contradicting">
                    <h4>Contradicting Sources</h4>
                    <ul>
                        {contradicting.map((source, index) => (
                            <li key={index}>
                                <strong>{source.source}</strong>: {source.title}
                                <br />
                                <a href={source.url} target="_blank" rel="noopener noreferrer">
                                    {source.url}
                                </a>
                                <span className="relevance">Relevance: {source.relevance}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
};

export default SourceCitations;
