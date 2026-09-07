"""Synthetic demo cases -- wiped and reloaded on EVERY backend startup
(see main.py) so the dashboards always open with realistic-looking
data, the same way ai_core/run_demo.py demonstrates ai_core standalone.
Every check-in below is run through the real emotion/crisis_detector/
engagement pipeline, not hand-set scores, so the numbers you see are
exactly what ai_core would produce for that text.

Set SETU_DEMO_MODE=0 to turn this off and keep whatever's actually
been entered across restarts (e.g. for a longer-running staging
instance instead of a fresh demo each time).
"""

import os
from datetime import datetime, timedelta, timezone

import db
from ai_core_bridge import crisis_detector, emotion, engagement, voice
from security import hash_password

DEMO_MODE = os.environ.get("SETU_DEMO_MODE", "1") == "1"
DEMO_PASSWORD = "DemoPass123!"

# Each case: (case_id, incident_type, weekly check-in script).
# Chosen to span the alert tiers: 00101 ends in an exact crisis-trigger
# phrase (matches ai_core/config.py's CRISIS_TRIGGERS_HI, same line
# ai_core/run_demo.py uses); 00102 trends toward officer-tier without
# tripping the crisis fast-path; 00104 is short/overdue to show
# engagement risk; 00103 and 00105 stay lower/improving for contrast.
DEMO_CASES = [
    (
        "NHAA-2026-00101",
        "rape",
        [
            "Main theek hoon, sab accha hai.",
            "Thoda pareshan hoon, court ki tareek aane wali hai.",
            "Neend nahi ari, bahut ghabrahat ho rahi hai.",
            "jeena nahi chahti, sab kuch bahut mushkil ho gaya hai.",
        ],
    ),
    (
        "NHAA-2026-00102",
        "witness_intimidation",
        [
            "Sab thik chal raha hai abhi tak.",
            "Kal ek anjaan number se dhamki mili thi.",
            "Bahut dar lag raha hai, akela mehsoos kar raha hoon.",
        ],
    ),
    (
        "NHAA-2026-00103",
        "caste_violence",
        [
            "Family support kar rahi hai, theek feel ho raha hai.",
            "Thoda behtar hai is hafte.",
            "Accha lag raha hai, madad mil rahi hai.",
        ],
    ),
    (
        "NHAA-2026-00104",
        "monetary scams",
        [
            "Paisa wapas nahi mila abhi tak, pareshan hoon.",
            "Koi update nahi hai case mein.",
        ],
    ),
    (
        "NHAA-2026-00105",
        "acid attacks",
        [
            "Ilaj chal raha hai, dard kam ho raha hai.",
            "Log ajeeb tarike se dekhte hain, akela mehsoos karti hoon.",
            "Bhook nahi lagri, thoda behtar hai ab.",
        ],
    ),
]


def _wipe_demo_data(conn) -> None:
    demo_ids = [c[0] for c in DEMO_CASES]
    placeholders = ",".join("?" for _ in demo_ids)
    for table in ("discharges", "reviews", "checkins", "cases", "accounts"):
        conn.execute(f"DELETE FROM {table} WHERE case_id IN ({placeholders})" if table != "accounts"
                      else f"DELETE FROM accounts WHERE identifier IN ({placeholders})", demo_ids)
    conn.commit()


def seed_demo_cases() -> None:
    if not DEMO_MODE:
        return

    conn = db.get_conn()
    _wipe_demo_data(conn)

    for case_id, incident_type, script in DEMO_CASES:
        now_iso = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO accounts (identifier, password_hash, role, account_type, must_change_password) "
            "VALUES (?, ?, 'victim', 'government_issued', 1)",
            (case_id, hash_password(DEMO_PASSWORD)),
        )
        conn.execute(
            "INSERT INTO cases (case_id, case_type, case_status, created_at) VALUES (?, ?, 'active', ?)",
            (case_id, incident_type, now_iso),
        )

        case_base = datetime.now(timezone.utc) - timedelta(weeks=len(script))
        for i, text in enumerate(script):
            ts = case_base + timedelta(weeks=i)
            text_result = emotion.score_text(text)
            crisis_result = crisis_detector.check_crisis(text)
            voice_result = voice.stress_score_stub(seed=0.4 + i * 0.08)
            engagement_result = engagement.engagement_risk_score(
                days_since_last_checkin=7 if i > 0 else 0,
                expected_interval_days=7,
                missed_checkins_streak=0,
            )
            conn.execute(
                "INSERT INTO checkins (case_id, timestamp, text, text_negative, voice_stress, "
                "engagement_risk, crisis_flag, text_driver, voice_driver, engagement_driver) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    case_id, ts.isoformat(), text, text_result["negative_affect"],
                    voice_result["voice_stress"], engagement_result["engagement_risk"],
                    int(crisis_result["crisis_flag"]), "text sentiment", voice_result["driver"],
                    engagement_result["driver"],
                ),
            )

    conn.commit()
    conn.close()
    print(
        f"Seeded {len(DEMO_CASES)} synthetic demo cases (password for all: {DEMO_PASSWORD}). "
        "Set SETU_DEMO_MODE=0 to stop resetting this on every restart."
    )