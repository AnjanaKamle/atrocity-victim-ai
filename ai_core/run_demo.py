import json
from datetime import datetime, timedelta

from chat import get_next_question
from emotion import score_text
from voice import stress_score_stub
from engagement import engagement_risk_score
from crisis_detector import check_crisis
from fusion import CaseHistory, CheckIn

synthetic_replies = [
    "Main theek hoon, sab accha hai.",
    "Thoda pareshan hoon, court ki tareek aane wali hai.",
    "Bahut dar lag raha hai, dhamki mili thi.",
    "jeena nahi chahti, sab kuch bahut mushkil ho gaya hai.",
]

print("--- Chat script (stub, no HF_API_TOKEN set) ---")
for i in range(len(synthetic_replies)):
    q = get_next_question(i)
    print(f"Q{i}: {q}")

case = CaseHistory(case_id="NHAA-2026-00891")
base_date = datetime(2026, 8, 1)

for i, text in enumerate(synthetic_replies):
    text_result = score_text(text)
    voice_result = stress_score_stub(seed=0.4 + i * 0.1)
    engagement_result = engagement_risk_score(
        days_since_last_checkin=7 if i < 2 else 10,
        expected_interval_days=7,
        missed_checkins_streak=0 if i < 2 else 1,
    )
    crisis_result = check_crisis(text)

    case.add(CheckIn(
        timestamp=base_date + timedelta(weeks=i),
        text_negative=text_result["negative_affect"],
        voice_stress=voice_result["voice_stress"],
        engagement_risk=engagement_result["engagement_risk"],
        crisis_flag=crisis_result["crisis_flag"],
        text_driver="text sentiment",
        voice_driver=voice_result["driver"],
        engagement_driver=engagement_result["driver"],
    ))

print("\n--- Dashboard payload ---")
print(json.dumps(case.to_dashboard_payload(), indent=2))
