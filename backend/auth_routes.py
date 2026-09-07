from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

import db
from ai_core_bridge import config
from deps import require_roles
from schemas import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    RegisterVictimRequest,
    RegisterVictimResponse,
)
from security import create_access_token, generate_temp_password, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    conn = db.get_conn()
    row = conn.execute(
        "SELECT * FROM accounts WHERE identifier = ?", (payload.identifier,)
    ).fetchone()
    conn.close()

    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid identifier or password")

    token = create_access_token(identifier=row["identifier"], role=row["role"])
    return LoginResponse(
        access_token=token,
        role=row["role"],
        account_type=row["account_type"],
        must_change_password=bool(row["must_change_password"]),
    )


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest):
    # NOTE (matches the comment already in frontend/src/shared/Profile.jsx):
    # this does not verify the caller's CURRENT password first. Fine for
    # the demo, worth tightening -- require an authenticated session or
    # the old password -- before real use.
    conn = db.get_conn()
    row = conn.execute(
        "SELECT identifier FROM accounts WHERE identifier = ?", (payload.identifier,)
    ).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")

    conn.execute(
        "UPDATE accounts SET password_hash = ?, must_change_password = 0 WHERE identifier = ?",
        (hash_password(payload.new_password), payload.identifier),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.post("/officer/register-victim", response_model=RegisterVictimResponse)
def register_victim(
    payload: RegisterVictimRequest,
    _officer: dict = Depends(require_roles("officer")),
):
    if payload.incident_type not in config.CASE_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unrecognized incident type")

    conn = db.get_conn()
    existing = conn.execute(
        "SELECT 1 FROM accounts WHERE identifier = ?", (payload.case_id,)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status.HTTP_409_CONFLICT, "Case ID already exists")

    temp_password = generate_temp_password()
    now = datetime.now(timezone.utc).isoformat()

    # Government-issued onboarding: one officer action creates both the
    # login account and the case record together (RegisterVictim.jsx's
    # copy: "creates the case record and a government-issued account in
    # one step"). Deliberately no name/address column -- see the
    # pseudonymization note already in that same file.
    conn.execute(
        "INSERT INTO accounts (identifier, password_hash, role, account_type, must_change_password) "
        "VALUES (?, ?, 'victim', 'government_issued', 1)",
        (payload.case_id, hash_password(temp_password)),
    )
    conn.execute(
        "INSERT INTO cases (case_id, case_type, case_status, created_at) VALUES (?, ?, 'active', ?)",
        (payload.case_id, payload.incident_type, now),
    )
    conn.commit()
    conn.close()

    return RegisterVictimResponse(case_id=payload.case_id, temporary_password=temp_password)
