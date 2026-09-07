# Setu — AI-Powered Dynamic Mental Health Monitoring & Distress Prediction System

**SIH26094** · MoSJE (Dept. of Social Justice & Empowerment) · Theme: MedTech/BioTech/HealthTech · Team **Maverick**

Setu continuously monitors the well-being of victims/complainants registered through NHAA (14566), the Integrated Portal, chatbot, mobile app, or IVRS — across investigation, trial, rehabilitation, and compensation — and predicts psychological distress escalation before a crisis emerges.

---

## How it works

1. **Victim check-ins** (chat, voice-to-text) are scored by `ai_core` on three signals: text sentiment (NLP), voice stress (prosody), and engagement (missed/overdue check-ins).
2. These fuse into a single **Dynamic Distress Score**, tracked over time per case.
3. An **independent crisis fast-path** scans every raw reply for acute risk language — this runs regardless of the weighted score and overrides it outright.
4. Alerts route to a **Counsellor → Officer → State/National** tier based on score and trend, with a ranked, explainable list of recommended interventions (counselling, medical, protection, relocation, financial, legal aid, rehabilitation).
5. **Officers and counsellors** validate or reject each alert (feeding a correction signal that suppresses repeat false positives) and can discharge a case from mandatory monitoring while crisis detection stays active.

---

## Project structure

```
sih_finalMVP/
├── ai_core/          # Scoring pipeline (pure Python, no web framework)
│   ├── emotion.py         # Text sentiment / negative-affect scoring
│   ├── voice.py            # Prosody (pitch/energy) stress scoring via librosa
│   ├── engagement.py        # Overdue / missed check-in risk
│   ├── crisis_detector.py    # Independent acute-risk keyword fast-path
│   ├── fusion.py               # CaseHistory: weighted score, trend, alert tier, explanation
│   ├── intervention.py          # Ranks the 7 PS-mandated intervention categories
│   ├── chat.py                   # Optional empathetic rephrasing via Airavata (HF API)
│   ├── config.py                   # Weights, thresholds, case types, check-in questions
│   └── run_demo.py                  # Standalone demo — run this to sanity-check ai_core alone
│
├── backend/            # FastAPI service — wraps ai_core, adds auth + persistence
│   ├── main.py               # App assembly, CORS, startup DB init + seeding
│   ├── ai_core_bridge.py       # Puts ai_core/ on sys.path without editing it
│   ├── db.py                     # SQLite schema (raw sqlite3, no ORM)
│   ├── security.py                 # bcrypt hashing + HS256 JWT
│   ├── deps.py                       # Auth dependency + role gating
│   ├── schemas.py                      # Request/response models (mirrors api.js)
│   ├── case_service.py                   # Rebuilds ai_core.fusion.CaseHistory from DB rows
│   ├── auth_routes.py                      # /auth/* — login, change-password, register-victim
│   ├── official_routes.py                    # /official/* — case list/detail/review/discharge
│   ├── victim_routes.py                        # /victim/* — checkin, live reaction
│   └── seed.py                                    # Seeds demo officer/counsellor accounts
│
└── frontend/            # React (Vite) — three role-gated portals
    └── src/
        ├── shared/            # api.js, auth/theme context, CaseDetail, Profile
        ├── officer/             # Officer dashboard, login, register-victim
        ├── counsellor/            # Counsellor dashboard, login
        └── victim/                  # Voice/chat check-in interface
```

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- No external services required to run the MVP — `HF_API_TOKEN` (for `chat.py`'s optional LLM rephrasing) and `USE_REAL_MODEL` (for the real HindiEmotion model in `emotion.py`) are both **off by default**, so everything runs offline on stubs.

---

## Setup & run

**Terminal 1 — backend:**

```bash
cd sih_finalMVP
pip install -r ai_core/requirements.txt -r backend/requirements.txt
cd backend
uvicorn main:app --reload --port 8000
```

On first boot this creates `backend/setu.db` and prints seeded demo credentials:

```
officer: officer_demo / ChangeMe123!
counsellor: counsellor_demo / ChangeMe123!
```

**Terminal 2 — frontend:**

```bash
cd sih_finalMVP/frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

---

## Demo walkthrough

1. Log in as `officer_demo` → **Register Victim** → create a case (note the temporary password shown once).
2. Log out, go to `/victim/login`, log in with that Case ID + temp password → set a real password.
3. Complete a check-in (type or speak). Try a neutral line, then a distress line — watch the tone shift live.
4. Log back in as `officer_demo` or `counsellor_demo` → the case appears on the dashboard with its alert tier, explanation, trend chart, and recommended interventions.
5. **Validate** or **Reject** the alert, or **Discharge** the case (officer only) — both actions are logged and reflected immediately.

---

## Known MVP limitations (intentional, documented in-code)

- `forwardToCounsellor` (case forwarding) has no backend route yet — `api.js` and `OfficerDashboard.jsx` already handle this gracefully.
- `missed_checkins_streak` is fixed at `0` — a real deployment needs a scheduled job to track cadence independent of whether a victim ever checks in again.
- `/auth/change-password` doesn't verify the caller's current password — acceptable for a demo, flagged for tightening before real use.
- `emotion.py` and `voice.py` run on lightweight stubs by default (`USE_REAL_MODEL = False`); swap in `vashuag/HindiEmotion` and real audio prosody extraction for production.
- SQLite via raw `sqlite3` for zero-config demo; swap for PostgreSQL per the roadmap when moving beyond a pilot.

---

## Tech stack

**AI/ML:** AI4Bharat (Airavata), HuggingFace `vashuag/HindiEmotion`, librosa, NumPy
**Backend:** FastAPI, SQLite, bcrypt, JWT (HS256)
**Frontend:** React, React Router, Recharts, Vite
**Roadmap:** BHASHINI (multilingual), PostgreSQL at scale

---

## Team Maverick

Problem Statement SIH26094 — *AI-Powered Dynamic Mental Health Monitoring and Distress Prediction System for Victims of Atrocities*