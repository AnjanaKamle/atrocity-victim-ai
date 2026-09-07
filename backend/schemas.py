"""Request/response shapes, matched field-for-field against
frontend/src/shared/api.js so nothing needs translating on either side.
"""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    identifier: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    role: str
    account_type: str
    must_change_password: bool


class ChangePasswordRequest(BaseModel):
    identifier: str
    new_password: str


class RegisterVictimRequest(BaseModel):
    case_id: str
    incident_type: str


class RegisterVictimResponse(BaseModel):
    case_id: str
    temporary_password: str


class ReviewRequest(BaseModel):
    decision: str  # "validated" | "rejected"


class DischargeRequest(BaseModel):
    reason: str


class CheckinRequest(BaseModel):
    text: str


class ReactResponse(BaseModel):
    tone: str
