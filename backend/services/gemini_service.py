"""
Gemini LLM Service

Wrapper for the Google Gemini API used as a fallback by Agent 4 (Fact Checker)
when the Groq API rate limits or exhausts its daily token quota.
"""

import logging
import os
from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI

logger = logging.getLogger(__name__)


class GeminiService:
    """Gemini API wrapper for structured verdict checks."""

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            self.api_key = os.getenv("gemini_api_key", "").strip()

    def build_structured_llm(self, output_schema: Any) -> Any:
        """
        Build a Gemini LLM client configured for strict structured output.

        Args:
            output_schema: Pydantic model class to constrain the output.
        """
        if not self.api_key:
            raise RuntimeError("Missing Gemini API key. Set GEMINI_API_KEY in .env")

        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=self.api_key,
            temperature=0,
        )
        return llm.with_structured_output(
            output_schema,
            method="json_mode",
        )

    def build_plain_llm(self) -> Any:
        """
        Build a Gemini LLM client configured for plain text output.
        """
        if not self.api_key:
            raise RuntimeError("Missing Gemini API key. Set GEMINI_API_KEY in .env")

        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=self.api_key,
            temperature=0,
        )


# Singleton instance
gemini_service = GeminiService()

