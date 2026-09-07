"""Airavata rephrases each script question empathetically -- it does
NOT freely converse. Crisis detection runs on the victim's raw reply
independent of anything the LLM does; the LLM is never the safety net.

Set HF_API_TOKEN env var to use the real API. Falls back to returning
the script question as-is if no token / no internet."""

import os
import requests
from config import HF_API_URL, CHECKIN_QUESTIONS

HF_API_TOKEN = os.environ.get("HF_API_TOKEN")


def _call_airavata(prompt: str) -> str:
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    resp = requests.post(HF_API_URL, headers=headers, json={"inputs": prompt}, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return data[0]["generated_text"].strip()


def get_next_question(question_index: int, last_user_reply: str = None) -> str:
    if question_index >= len(CHECKIN_QUESTIONS):
        return None

    base_question = CHECKIN_QUESTIONS[question_index]

    if not HF_API_TOKEN:
        return base_question  # stub mode: script as-is, no LLM call

    prompt = (
        "You are a gentle, trauma-informed check-in assistant speaking Hindi. "
        "Rephrase the following question warmly in 1-2 short sentences. "
        "Do not add new questions, advice, or opinions.\n\n"
        f"Question: {base_question}"
    )
    try:
        return _call_airavata(prompt)
    except Exception:
        return base_question  # fail safe to the script, never fail silently into nothing
