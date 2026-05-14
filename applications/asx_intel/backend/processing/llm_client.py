"""
LLM provider wrapper.

Supports OpenAI and Anthropic via environment variables.
Gracefully degrades to rule-based fallbacks if no API key is set.

Environment variables:
    LLM_PROVIDER         — "openai" | "anthropic"  (default: "openai")
    OPENAI_API_KEY       — OpenAI key
    ANTHROPIC_API_KEY    — Anthropic key
    MODEL_NAME           — override model (e.g. "gpt-4o", "claude-opus-4-7")
"""

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()
_MODEL_OVERRIDE = os.getenv("MODEL_NAME", "")
_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
_ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")

_DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-haiku-4-5-20251001",
}


def _model_name() -> str:
    return _MODEL_OVERRIDE or _DEFAULT_MODELS.get(_PROVIDER, "gpt-4o-mini")


def _is_available() -> bool:
    if _PROVIDER == "openai":
        return bool(_OPENAI_KEY and _OPENAI_KEY != "sk-placeholder")
    if _PROVIDER == "anthropic":
        return bool(_ANTHROPIC_KEY and _ANTHROPIC_KEY != "sk-ant-placeholder")
    return False


def complete(system: str, user: str, max_tokens: int = 1024) -> str:
    """
    Send a chat completion request and return the response text.
    Returns empty string if no API key is configured — callers should handle gracefully.
    """
    if not _is_available():
        logger.warning("No LLM API key configured — skipping LLM call. Set LLM_PROVIDER + API key in .env")
        return ""

    if _PROVIDER == "openai":
        return _call_openai(system, user, max_tokens)
    if _PROVIDER == "anthropic":
        return _call_anthropic(system, user, max_tokens)

    logger.error("Unknown LLM_PROVIDER: %s", _PROVIDER)
    return ""


def _call_openai(system: str, user: str, max_tokens: int) -> str:
    try:
        from openai import OpenAI

        client = OpenAI(api_key=_OPENAI_KEY)
        resp = client.chat.completions.create(
            model=_model_name(),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=max_tokens,
            temperature=0.2,
        )
        return resp.choices[0].message.content or ""
    except ImportError:
        logger.error("openai package not installed. Run: pip install openai")
        return ""
    except Exception as exc:
        logger.error("OpenAI API call failed: %s", exc)
        return ""


def _call_anthropic(system: str, user: str, max_tokens: int) -> str:
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=_ANTHROPIC_KEY)
        msg = client.messages.create(
            model=_model_name(),
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return msg.content[0].text if msg.content else ""
    except ImportError:
        logger.error("anthropic package not installed. Run: pip install anthropic")
        return ""
    except Exception as exc:
        logger.error("Anthropic API call failed: %s", exc)
        return ""
