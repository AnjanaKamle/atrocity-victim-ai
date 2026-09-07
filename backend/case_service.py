"""Rebuilds an ai_core.fusion.CaseHistory from the SQLite rows for a
case, so every distress score, trend, alert tier, escalation
prediction, and explanation the API returns comes straight out of
ai_core/fusion.py -- nothing is recomputed or duplicated here.
"""

from datetime import datetime

from ai_core_bridge import fusion


def _parse_ts(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def load_case_history(conn, case_row) -> "fusion.CaseHistory":
    case_id = case_row["case_id"]
    ch = fusion.CaseHistory(case_id=case_id, case_status=case_row["case_status"])

    for row in conn.execute(
        "SELECT * FROM checkins WHERE case_id = ? ORDER BY timestamp ASC", (case_id,)
    ):
        ch.checkins.append(
            fusion.CheckIn(
                timestamp=_parse_ts(row["timestamp"]),
                text_negative=row["text_negative"],
                voice_stress=row["voice_stress"],
                engagement_risk=row["engagement_risk"],
                crisis_flag=bool(row["crisis_flag"]),
                text_driver=row["text_driver"] or "",
                voice_driver=row["voice_driver"] or "",
                engagement_driver=row["engagement_driver"] or "",
                case_type=case_row["case_type"],
            )
        )

    for row in conn.execute(
        "SELECT * FROM reviews WHERE case_id = ? ORDER BY timestamp ASC", (case_id,)
    ):
        ch.reviews.append(
            fusion.Review(
                checkin_index=row["checkin_index"],
                decision=row["decision"],
                reviewer_role=row["reviewer_role"],
                timestamp=_parse_ts(row["timestamp"]),
            )
        )

    for row in conn.execute(
        "SELECT * FROM discharges WHERE case_id = ? ORDER BY timestamp ASC", (case_id,)
    ):
        ch.discharge_history.append(
            fusion.DischargeRecord(
                action=row["action"],
                authority_role=row["authority_role"],
                reason=row["reason"],
                timestamp=_parse_ts(row["timestamp"]),
            )
        )

    return ch


def dashboard_payload(conn, case_row) -> dict:
    ch = load_case_history(conn, case_row)
    payload = ch.to_dashboard_payload()
    # fusion.CaseHistory.to_dashboard_payload() doesn't include
    # case_type, but CaseDetail.jsx, OfficerDashboard.jsx, and
    # CounsellorDashboard.jsx all read c.case_type -- added here rather
    # than editing ai_core/fusion.py.
    payload["case_type"] = case_row["case_type"]
    return payload
