"""
LLM Service (Groq API)

Wrapper for the Groq API used by Agent 2 (Fact Checker)
for natural language analysis & reasoning about article authenticity.
"""

import os
import logging

from groq import Groq

logger = logging.getLogger(__name__)


class LLMService:
    """Groq API wrapper for article analysis."""

    def __init__(self):
        self.client = Groq(
            api_key=os.getenv("GROQ_API_KEY"),
        )

    async def analyze_article(self, article: dict, tavily_report: str) -> str:
        """
        Feed article + Tavily fact-check results to Groq LLM for analysis.

        Args:
            article: Dict with 'headline' and 'body' keys.
            tavily_report: Markdown-formatted Tavily fact-check report.

        Returns:
            LLM response text (JSON-formatted analysis string).
        """
        prompt = f"""Analyze this article for authenticity.

ARTICLE:
Headline: {article['headline']}
Content: {article['body']}

FACT-CHECK RESULTS:
{tavily_report}

Provide analysis in JSON format with:
- authenticity_verdict (REAL/FAKE/MISLEADING/UNVERIFIED)
- confidence (0.0-1.0)
- reasoning (natural language explanation)
- red_flags (array of issues)
- supporting_evidence (array)
- contradicting_evidence (array)
"""

        chat_completion = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        return chat_completion.choices[0].message.content
