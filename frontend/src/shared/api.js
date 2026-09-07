// Single source of truth for all backend calls + auth token handling.

const BASE_URL = "http://localhost:8000";
const TOKEN_KEY = "sih26094_token";
const AUTH_INFO_KEY = "sih26094_auth_info";

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_INFO_KEY);
}
export function setStoredAuth(info) {
  localStorage.setItem(AUTH_INFO_KEY, JSON.stringify(info));
}
export function getStoredAuth() {
  const raw = localStorage.getItem(AUTH_INFO_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function authFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// --- Auth ---
export async function loginRequest(identifier, password) {
  return authFetch("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) });
}
export async function changePasswordRequest(identifier, newPassword) {
  return authFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ identifier, new_password: newPassword }),
  });
}

// --- Official (officer + counsellor both use these -- real, working) ---
export async function getCases() {
  return authFetch("/official/cases");
}
export async function getCase(caseId) {
  return authFetch(`/official/cases/${caseId}`);
}
export async function reviewCase(caseId, decision) {
  return authFetch(`/official/cases/${caseId}/review`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
}
export async function dischargeCase(caseId, reason) {
  return authFetch(`/official/cases/${caseId}/discharge`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// Officer-only (backend enforces via require_roles("officer")).
export async function registerVictim(caseId, incidentType) {
  return authFetch("/auth/officer/register-victim", {
    method: "POST",
    body: JSON.stringify({ case_id: caseId, incident_type: incidentType }),
  });
}

// NOT YET BACKED. There is no "assigned_counsellor" field on Case in
// models_db.py and no /official/cases/{id}/forward route in main.py --
// this will 404 until that's added server-side. Kept here so the
// frontend UX is complete and easy to wire up the moment the backend
// route exists; the Dashboard shows an inline note when this fails.
export async function forwardToCounsellor(caseId) {
  return authFetch(`/official/cases/${caseId}/forward`, { method: "POST" });
}

// --- Victim ---
export async function submitCheckin(text) {
  return authFetch("/victim/checkin", { method: "POST", body: JSON.stringify({ text }) });
}
export async function getCheckinReaction(text) {
  return authFetch("/victim/react", { method: "POST", body: JSON.stringify({ text }) });
}
