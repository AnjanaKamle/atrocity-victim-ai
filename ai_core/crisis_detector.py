"""Runs on every raw user message, independent of the LLM and the
weighted score. A crisis flag here overrides everything downstream."""

from config import CRISIS_TRIGGERS_EN, CRISIS_TRIGGERS_HI


def check_crisis(text: str) -> dict:
    text_l = text.lower()
    triggered = any(t in text_l for t in CRISIS_TRIGGERS_EN + CRISIS_TRIGGERS_HI)
    return {
        "crisis_flag": triggered,
        "driver": "acute risk language detected" if triggered else "none",
    }
