"""
core/logging.py — Centralised logging configuration and print patching.

Configures standard logging formatting, silences noisy libraries, and safely routes
pipeline print() calls to the logger with thread-local recursion guards.
"""

import builtins
import logging
import sys
import threading

_local = threading.local()
_original_print = builtins.print
_pipeline_logger = logging.getLogger("pipeline")

def _logging_print(*args, **kwargs):
    # Recursion safety guard: if we are already inside a print patch call,
    # fallback to the original print (e.g. logging system errors trying to print)
    if getattr(_local, "is_printing", False):
        _original_print(*args, **kwargs)
        return

    _local.is_printing = True
    try:
        sep = kwargs.get("sep", " ")
        end = kwargs.get("end", "\n")
        msg = sep.join(str(a) for a in args)
        if msg.strip():
            _pipeline_logger.info(msg)
        if end not in ("\n", ""):
            sys.stdout.write(end)
        sys.stdout.flush()
    finally:
        _local.is_printing = False


def setup_logging():
    """Configure line-buffered stdout, basic logging rules, and patch print()."""
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(line_buffering=True, encoding="utf-8")  # type: ignore
        except Exception:
            pass
    if hasattr(sys.stderr, "reconfigure"):
        try:
            sys.stderr.reconfigure(line_buffering=True, encoding="utf-8")  # type: ignore
        except Exception:
            pass


    # Setup basicConfig
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,  # Overrides any logging handlers registered by uvicorn
    )

    # Silence noisy third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("langchain").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)

    # Route all print() calls to _logging_print
    builtins.print = _logging_print
