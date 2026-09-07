from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

import case_service
import db
from deps import require_roles
from schemas import DischargeRequest, ReviewRequest

router = APIRouter(prefix="/official", tags=["official"])


def _get_case_row(conn, case_id: str):
    row = conn.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,)).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")
    return row


@router.get("/cases")
def list_cases(_account: dict = Depends(require_roles("officer", "counsellor"))):
    # Both roles see every case -- CounsellorDashboard.jsx already says
    # so explicitly ("there's no per-counsellor case assignment on the
    # backend yet"). Narrow this once assignment exists server-side.
    conn = db.get_conn()
    rows = conn.execute("SELECT * FROM cases ORDER BY created_at DESC").fetchall()
    payloads = [case_service.dashboard_payload(conn, row) for row in rows]
    conn.close()
    return payloads


@router.get("/cases/{case_id}")
def get_case(case_id: str, _account: dict = Depends(require_roles("officer", "counsellor"))):
    conn = db.get_conn()
    row = _get_case_row(conn, case_id)
    payload = case_service.dashboard_payload(conn, row)
    conn.close()
    return payload


@router.post("/cases/{case_id}/review")
def review_case(
    case_id: str,
    payload: ReviewRequest,
    account: dict = Depends(require_roles("officer", "counsellor")),
):
    if payload.decision not in ("validated", "rejected"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "decision must be 'validated' or 'rejected'"
        )

    conn = db.get_conn()
    case_row = _get_case_row(conn, case_id)

    latest_count = conn.execute(
        "SELECT COUNT(*) AS n FROM checkins WHERE case_id = ?", (case_id,)
    ).fetchone()["n"]
    if latest_count == 0:
        conn.close()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No check-ins to review yet")

    conn.execute(
        "INSERT INTO reviews (case_id, checkin_index, decision, reviewer_identifier, "
        "reviewer_role, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        (
            case_id,
            latest_count - 1,
            payload.decision,
            account["identifier"],
            account["role"],
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    payload_out = case_service.dashboard_payload(conn, case_row)
    conn.close()
    return payload_out


@router.post("/cases/{case_id}/discharge")
def discharge_case(
    case_id: str,
    payload: DischargeRequest,
    account: dict = Depends(require_roles("officer")),
):
    if not payload.reason.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "A discharge reason is required")

    conn = db.get_conn()
    _get_case_row(conn, case_id)
    now = datetime.now(timezone.utc).isoformat()

    conn.execute("UPDATE cases SET case_status = 'voluntary' WHERE case_id = ?", (case_id,))
    conn.execute(
        "INSERT INTO discharges (case_id, action, authority_identifier, authority_role, reason, timestamp) "
        "VALUES (?, 'discharged', ?, ?, ?, ?)",
        (case_id, account["identifier"], account["role"], payload.reason, now),
    )
    conn.commit()

    case_row = _get_case_row(conn, case_id)
    payload_out = case_service.dashboard_payload(conn, case_row)
    conn.close()
    return payload_out


@router.post("/cases/{case_id}/reactivate")
def reactivate_case(
    case_id: str,
    payload: DischargeRequest,
    account: dict = Depends(require_roles("officer")),
):
    # Not wired to a button in CaseDetail.jsx yet (only discharge is).
    # Included because ai_core/fusion.py already models the reverse
    # action (CaseHistory.reactivate / DischargeRecord action=
    # "reactivated") -- one route to keep the case lifecycle complete
    # for when the UI adds it.
    conn = db.get_conn()
    _get_case_row(conn, case_id)
    now = datetime.now(timezone.utc).isoformat()

    conn.execute("UPDATE cases SET case_status = 'active' WHERE case_id = ?", (case_id,))
    conn.execute(
        "INSERT INTO discharges (case_id, action, authority_identifier, authority_role, reason, timestamp) "
        "VALUES (?, 'reactivated', ?, ?, ?, ?)",
        (case_id, account["identifier"], account["role"], payload.reason, now),
    )
    conn.commit()

    case_row = _get_case_row(conn, case_id)
    payload_out = case_service.dashboard_payload(conn, case_row)
    conn.close()
    return payload_out
