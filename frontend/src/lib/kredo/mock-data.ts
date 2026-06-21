import { HistoryItem, Source } from './types';

export const MOCK_HISTORY: HistoryItem[] = [
    {
        id: 'hist-1',
        url: 'https://thehindu.com/news/national/government-approves-new-rail-budget',
        timestamp: '2025-06-21T11:00:00Z',
        verdicts: [
            {
                claim_text: 'The Indian government approved a record ₹2.4 lakh crore allocation for railways.',
                verdict: 'SUPPORTED',
                truth_score: 95,
                confidence_level: 'HIGH',
                reasoning_text: '1. Official Budget Release\nThe Union Budget 2025-26 documents explicitly allocate ₹2.40 lakh crore to the Indian Railways.\n2. Year-on-Year Growth\nThis represents a 15% increase from the prior fiscal period, confirming the "record" claims.',
                reasoning_summary: 'Verified figures match the Union Budget 2025-26 allocation.',
                evidence_gaps: []
            },
            {
                claim_text: 'The railway project will create 50 lakh direct jobs in the next 12 months.',
                verdict: 'MISLEADING',
                truth_score: 55,
                confidence_level: 'MEDIUM',
                reasoning_text: '1. Jobs Estimation\nWhile the budget predicts massive indirect employment, official projections for direct employment are capped at 5 lakh, not 50 lakh.\n2. Temporal Frame\nJob creation is projected over a 5-year pipeline, not a single 12-month period.',
                reasoning_summary: 'Direct job numbers are inflated 10x; timeline is stretched over 5 years.',
                evidence_gaps: ['Official report lists 5 lakh direct jobs; 50 lakh includes unvetted indirect estimates.']
            }
        ],
        explanations: {
            overall_credibility: 'MIXED CREDIBILITY',
            bottom_line: 'While the budget allocation figures of ₹2.4 lakh crore are factually accurate, statements regarding creating 50 lakh direct jobs within 12 months are highly inflated.'
        },
        source: 'webapp',
        trustScore: 75,
        overallVerdict: 'MIXED',
        language: 'Hindi',
        inputType: 'url',
        claimsCount: 2,
        sourcesCount: 8,
        duration: '7.2s'
    },
    {
        id: 'hist-2',
        url: 'Drinking warm water with lemon every morning cures cancer in 30 days, scientists confirm',
        timestamp: '2025-06-21T08:00:00Z',
        verdicts: [
            {
                claim_text: 'Warm lemon water cures cancer in 30 days.',
                verdict: 'CONTRADICTED',
                truth_score: 8,
                confidence_level: 'HIGH',
                reasoning_text: '1. Lack of Medical Consensus\nNo peer-reviewed clinical trial or medical agency supports the claim that lemon water cures cancer.\n2. Misrepresentation\nActive compounds in lemons (limonoids) show in-vitro inhibition in petri dishes, but this does not translate to curing cancer in humans.',
                reasoning_summary: 'There is zero clinical evidence support. The claim is a recurring medical hoax.',
                evidence_gaps: ['No clinical trials in humans exist to validate cancer remission via lemon water.']
            }
        ],
        explanations: {
            overall_credibility: 'UNRELIABLE / HOAX',
            bottom_line: 'This claim is a dangerous medical hoax. Lemon water is a healthy beverage but has no curative effect on cancer, let alone in 30 days.'
        },
        source: 'webapp',
        trustScore: 8,
        overallVerdict: 'UNRELIABLE',
        language: 'English',
        inputType: 'text',
        claimsCount: 1,
        sourcesCount: 14,
        duration: '5.8s'
    },
    {
        id: 'hist-3',
        url: 'Image: budget_tampered_exif.png',
        timestamp: '2025-06-20T15:30:00Z',
        verdicts: [
            {
                claim_text: 'The government will tax all digital payments at 5% from next month.',
                verdict: 'CONTRADICTED',
                truth_score: 12,
                confidence_level: 'HIGH',
                reasoning_text: '1. Official RBI Refutation\nThe RBI and Ministry of Finance have issued official statements confirming there are no plans to introduce a 5% transaction tax.\n2. Tampering evidence\nImage analysis shows text overlay alterations on an old notification screenshot.',
                reasoning_summary: 'The claim is officially denied. Image analysis indicates structural content modification.',
                evidence_gaps: []
            }
        ],
        explanations: {
            overall_credibility: 'UNRELIABLE / TAMPERED',
            bottom_line: 'The uploaded image contains tampered text overlaying an old official circular. The Ministry of Finance has confirmed no such tax exists.'
        },
        source: 'webapp',
        trustScore: 12,
        overallVerdict: 'UNRELIABLE',
        language: 'English',
        inputType: 'image',
        claimsCount: 1,
        sourcesCount: 6,
        duration: '8.4s'
    },
    {
        id: 'hist-4',
        url: 'https://reuters.com/article/vaccine-rollout-success-tracker',
        timestamp: '2025-06-19T09:12:00Z',
        verdicts: [
            {
                claim_text: 'India has completed 2 billion vaccine doses in record time.',
                verdict: 'SUPPORTED',
                truth_score: 98,
                confidence_level: 'HIGH',
                reasoning_text: '1. CoWIN Registry\nThe CoWIN dashboard officially logged the 2 billionth dose milestone.\n2. Reuters Verification\nReuters health reporters audited the tracker, confirming alignment with regional databases.',
                reasoning_summary: 'Primary registry and press audit confirm the dose milestone.',
                evidence_gaps: []
            }
        ],
        explanations: {
            overall_credibility: 'CREDIBLE / SUPPORTED',
            bottom_line: 'Fully supported by database records from the Ministry of Health and independent wire service reports.'
        },
        source: 'webapp',
        trustScore: 98,
        overallVerdict: 'CREDIBLE',
        language: 'English',
        inputType: 'url',
        claimsCount: 1,
        sourcesCount: 11,
        duration: '6.1s'
    },
    {
        id: 'hist-5',
        url: 'https://blogsite.xyz/posts/nasa-confirms-asteroid-impact-warning',
        timestamp: '2025-06-18T18:45:00Z',
        verdicts: [
            {
                claim_text: 'NASA warns a city-killer asteroid has a 99% chance of hitting Earth in August.',
                verdict: 'CONTRADICTED',
                truth_score: 5,
                confidence_level: 'HIGH',
                reasoning_text: '1. Sentry Impact Monitoring\nNASA JPL Sentry database lists the asteroid with a 1 in 10,000,000 chance of impact (effectively zero).\n2. Clickbait Sensationalism\nThe blog misinterprets a general tracking notice to inflate user engagement.',
                reasoning_summary: 'Clickbait article inflates risk from 0.00001% to 99%.',
                evidence_gaps: []
            }
        ],
        explanations: {
            overall_credibility: 'UNRELIABLE / SENSATIONALIST',
            bottom_line: 'The asteroid mentioned is categorized by NASA JPL as posing no hazard to Earth. The blog post is highly sensationalist and factually false.'
        },
        source: 'webapp',
        trustScore: 5,
        overallVerdict: 'UNRELIABLE',
        language: 'English',
        inputType: 'url',
        claimsCount: 1,
        sourcesCount: 4,
        duration: '6.9s'
    }
];

export const MOCK_SOURCES: Source[] = [
    { rank: 1, domain: 'pib.gov.in', tier: 'T1', category: 'Government Registry', bias: 'center', citedCount: 320, avgScore: 98 },
    { rank: 2, domain: 'reuters.com', tier: 'T1', category: 'News & Wire Services', bias: 'center', citedCount: 412, avgScore: 96 },
    { rank: 3, domain: 'altnews.in', tier: 'T1', category: 'Fact Checker', bias: 'center', citedCount: 138, avgScore: 94 },
    { rank: 4, domain: 'bbc.com', tier: 'T2', category: 'International News', bias: 'center-left', citedCount: 190, avgScore: 91 },
    { rank: 5, domain: 'thehindu.com', tier: 'T2', category: 'National News', bias: 'center-left', citedCount: 248, avgScore: 87 },
    { rank: 6, domain: 'indiatoday.in', tier: 'T2', category: 'National News', bias: 'center-right', citedCount: 174, avgScore: 82 },
    { rank: 7, domain: 'twitter.com/anonymous', tier: 'T3', category: 'Social Media', bias: 'center', citedCount: 86, avgScore: 34 },
    { rank: 8, domain: 'dailyblogindia.xyz', tier: 'T3', category: 'Skeptical Blog', bias: 'right', citedCount: 42, avgScore: 22 },
    { rank: 9, domain: 'whatsapp-forward-anonymous', tier: 'T3', category: 'Unverified Forward', bias: 'center', citedCount: 120, avgScore: 12 }
];

export const MOCK_DASHBOARD = {
    stats: {
        totalChecks: 1248,
        avgTrustScore: 67,
        avgLatency: '6.4s',
        claimsVerified: 5847,
        languagesCount: 12,
        highRiskImages: 87
    },
    trendData: [
        { date: 'Jun 08', credible: 20, mixed: 10, unreliable: 12 },
        { date: 'Jun 09', credible: 22, mixed: 12, unreliable: 14 },
        { date: 'Jun 10', credible: 18, mixed: 8, unreliable: 16 },
        { date: 'Jun 11', credible: 25, mixed: 15, unreliable: 10 },
        { date: 'Jun 12', credible: 28, mixed: 10, unreliable: 11 },
        { date: 'Jun 13', credible: 30, mixed: 12, unreliable: 9 },
        { date: 'Jun 14', credible: 24, mixed: 16, unreliable: 15 },
        { date: 'Jun 15', credible: 26, mixed: 11, unreliable: 13 },
        { date: 'Jun 16', credible: 29, mixed: 14, unreliable: 10 },
        { date: 'Jun 17', credible: 32, mixed: 15, unreliable: 12 },
        { date: 'Jun 18', credible: 35, mixed: 9, unreliable: 8 },
        { date: 'Jun 19', credible: 38, mixed: 12, unreliable: 9 },
        { date: 'Jun 20', credible: 40, mixed: 14, unreliable: 11 },
        { date: 'Jun 21', credible: 42, mixed: 18, unreliable: 10 }
    ],
    distributionData: [
        { name: 'Credible', value: 42, color: 'oklch(0.72 0.19 155)' },
        { name: 'Mixed', value: 18, color: 'oklch(0.78 0.16 75)' },
        { name: 'Unreliable', value: 31, color: 'oklch(0.64 0.22 25)' },
        { name: 'Unverified', value: 9, color: 'oklch(0.68 0.012 250)' }
    ],
    inputTypeData: [
        { type: 'URL', count: 68 },
        { type: 'Text', count: 22 },
        { type: 'Image', count: 10 }
    ],
    languageCoverage: [
        { language: 'English', percentage: 71 },
        { language: 'Hindi', percentage: 14 },
        { language: 'Tamil', percentage: 6 },
        { language: 'Bengali', percentage: 5 },
        { language: 'Other Indic', percentage: 4 }
    ]
};
