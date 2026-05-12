"""
Tavily API Service

Wrapper for the Tavily search API used by Agent 2 (Fact Checker)
for real-time web verification of claims.
"""

import os
import logging

import httpx

logger = logging.getLogger(__name__)


class TavilyService:
    """Tavily API wrapper for claim verification."""

    def __init__(self):
        self.api_key = os.getenv("TAVILY_API_KEY")
        self.base_url = "https://api.tavily.com"

    async def search(self, query: str, max_results: int = 5) -> dict:
        """
        Search Tavily for verification of a claim.

        Args:
            query: The claim or search query to verify.
            max_results: Maximum number of results to return.

        Returns:
            Tavily API response as a dict.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/search",
                json={
                    "api_key": self.api_key,
                    "query": query,
                    "search_depth": "advanced",
                    "include_domains": [
                        "reuters.com",
                        "apnews.com",
                        "bbc.com",
                        "nytimes.com",
                    ],
                    "max_results": max_results,
                },
            )
            return response.json()
