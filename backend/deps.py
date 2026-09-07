"""Shared FastAPI dependencies: resolve the bearer token to an account
row, and gate routes by role. Every RequireRole check the frontend does
client-side (App.jsx) has a matching require_roles(...) here -- the
frontend gate is UX, this is the real enforcement.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

import db
from security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_account(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        payload = decode_access_token(creds.credentials)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    identifier = payload.get("sub")
    conn = db.get_conn()
    row = conn.execute("SELECT * FROM accounts WHERE identifier = ?", (identifier,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account no longer exists")
    return dict(row)


def require_roles(*roles: str):
    """Usage: Depends(require_roles("officer")) or
    Depends(require_roles("officer", "counsellor"))."""

    def _check(account: dict = Depends(get_current_account)) -> dict:
        if account["role"] not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")
        return account

    return _check
