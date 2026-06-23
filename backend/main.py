"""
main.py — FastAPI app runner entry point.

Loads environment variables, initializes logging configuration, and runs Uvicorn.
"""

import logging
import os

import uvicorn

# Setup logging configuration early
from core.logging import setup_logging
from dotenv import load_dotenv

setup_logging()

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Ensure environment variables are loaded
    load_dotenv()
    
    reload_enabled = os.getenv("UVICORN_RELOAD", "true").strip().lower() not in {"0", "false", "no"}

    from typing import Any

    uvicorn_kwargs: dict[str, Any] = {
        "host": "0.0.0.0",
        "port": 8000,
        "reload": reload_enabled,
        "access_log": True,
        "log_level": "info",
        "log_config": None,
    }

    # If watchfiles is installed, enable reload include patterns; otherwise, gracefully degrade
    try:
        import watchfiles  # type: ignore # noqa: F401
        if reload_enabled:
            uvicorn_kwargs["reload_includes"] = ["*.yaml"]
            logger.info("watchfiles detected — reload include/exclude patterns enabled")
    except ImportError:
        if reload_enabled:
            logger.warning(
                "watchfiles not installed; reload include/exclude patterns are ignored. "
                "Install with: pip install watchfiles"
            )

    uvicorn.run("app:app", **uvicorn_kwargs)