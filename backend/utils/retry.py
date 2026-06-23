"""
utils/retry.py — Standardized tenacity retry decorators.

Encapsulates the KREDO latency budget: max 2 retries (3 attempts total)
with exponential backoff (1s -> 2s) and standard logging for visibility.
"""

import logging

from tenacity import before_sleep_log, retry, stop_after_attempt, wait_exponential

logger = logging.getLogger("pipeline.retry")

# Latency budget: Max 3 attempts, wait starting at 1s, maxing out at 2s.
retry_sync = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=2),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)

retry_async = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=2),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
