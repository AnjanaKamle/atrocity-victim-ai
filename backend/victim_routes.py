from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

import db
from ai_core_bridge import crisis_detector, emotion, engagement, voice
from deps import require_roles
from schemas import CheckinRequest, ReactResponse

router = APIRouter(prefix="/victim", tags=["victim"])

EXPECTED_INTERVAL_DAYS = 7


@router.post("/react", response_model=ReactResponse)
def react(payload: CheckinRequest, _account: dict = Depends(require_roles("victim"))):
    """Powers the chat bubble's immediate reply tone -- read-only, saves
    nothing. crisis_detector.py's docstring is explicit that the crisis
    check runs independent of the LLM/sentiment path and overrides it,
    so it's checked first and wins outright.
    """
    crisis = crisis_detector.check_crisis(payload.text)
    if crisis["crisis_flag"]:
        return ReactResponse(tone="crisis")

    scored = emotion.score_text(payload.text)
    neg = scored["negative_affect"]
    if neg >= 0.65:
        tone = "high_distress"
    elif neg <= 0.35:
        tone = "positive"
    else:
        tone = "neutral"
    return ReactResponse(tone=tone)


@router.post("/checkin")
def submit_checkin(payload: CheckinRequest, account: dict = Depends(require_roles("victim"))):
    """Persists the check-in and runs the full ai_core scoring pipeline
    (emotion + crisis_detector + engagement) exactly as
    ai_core/run_demo.py does, so every stored row has the same fields
    fusion.CheckIn expects.
    """
    case_id = account["identifier"]
    conn = db.get_conn()
    case_row = conn.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,)).fetchone()
    if case_row is None:
        conn.close()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No case record for this account")

    last = conn.execute(
        "SELECT timestamp FROM checkins WHERE case_id = ? ORDER BY timestamp DESC LIMIT 1",
        (case_id,),
    ).fetchone()
    now = datetime.now(timezone.utc)
    days_since = (
        (now - datetime.fromisoformat(last["timestamp"])).total_seconds() / 86400
        if last
        else 0.0
    )

    text_result = emotion.score_text(payload.text)
    crisis_result = crisis_detector.check_crisis(payload.text)
    # No audio channel on the web/text check-in path -- use the same
    # stub ai_core/run_demo.py uses for its synthetic data.
    voice_result = voice.stress_score_stub(seed=0.5)
    engagement_result = engagement.engagement_risk_score(
        days_since_last_checkin=days_since,
        expected_interval_days=EXPECTED_INTERVAL_DAYS,
        # Simplification for the MVP: a real deployment would maintain
        # this as a running counter via a scheduled job that checks
        # cadence independent of whether the victim ever checks in
        # again. Fixed at 0 here, so engagement risk is currently driven
        # by overdue-ness (days_since_last_checkin) only.
        missed_checkins_streak=0,
    )

    conn.execute(
        "INSERT INTO checkins (case_id, timestamp, text, text_negative, voice_stress, "
        "engagement_risk, crisis_flag, text_driver, voice_driver, engagement_driver) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            case_id,
            now.isoformat(),
            payload.text,
            text_result["negative_affect"],
            voice_result["voice_stress"],
            engagement_result["engagement_risk"],
            int(crisis_result["crisis_flag"]),
            "text sentiment",
            voice_result["driver"],
            engagement_result["driver"],
        ),
    )
    conn.commit()
    conn.close()
    return {"saved": True, "crisis_flag": crisis_result["crisis_flag"]}
