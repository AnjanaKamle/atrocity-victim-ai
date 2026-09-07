"""HindiEmotion via HuggingFace. USE_REAL_MODEL=False runs a
keyword-based stub so the pipeline works without internet."""

USE_REAL_MODEL = False

NEGATIVE_EMOTIONS = {"sadness", "anger", "fear", "disgust", "anxious"}
POSITIVE_EMOTIONS = {"joy", "surprise","happy"}

_pipeline_cache = {}


def _load_pipeline():
    if "pipe" not in _pipeline_cache:
        from transformers import pipeline
        _pipeline_cache["pipe"] = pipeline(
            "text-classification", model="vashuag/HindiEmotion", top_k=None,
        )
    return _pipeline_cache["pipe"]


def score_text_real(text: str) -> dict:
    pipe = _load_pipeline()
    results = pipe(text)[0]
    scores = {r["label"].lower(): r["score"] for r in results}
    neg = sum(scores.get(e, 0.0) for e in NEGATIVE_EMOTIONS)
    pos = sum(scores.get(e, 0.0) for e in POSITIVE_EMOTIONS)
    return {
        "raw_emotions": scores,
        "negative_affect": round(max(0.0, min(1.0, 0.5 + (neg - pos) / 2)), 3),
    }


def score_text_stub(text: str) -> dict:
    negative_words = ["dar", "dukh", "akela", "bhay", "pareshan", "rona","die","dying",
                       "afraid", "scared", "alone", "hopeless", "threat", "tired","lonely","shame"]
    positive_words = ["theek", "accha", "khush", "better", "safe"]
    text_l = text.lower()
    neg_hits = sum(w in text_l for w in negative_words)
    pos_hits = sum(w in text_l for w in positive_words)
    return {
        "raw_emotions": {"stub": True},
        "negative_affect": round(max(0.0, min(1.0, 0.5 + 0.15 * neg_hits - 0.15 * pos_hits)), 3),
    }


def score_text(text: str) -> dict:
    return score_text_real(text) if USE_REAL_MODEL else score_text_stub(text)
