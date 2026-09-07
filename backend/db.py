"""Plain sqlite3 -- no ORM. The pitch deck's stack graphic names
FastAPI, PostgreSQL/SQLite, and bcrypt+JWT; it doesn't show an ORM, so
this stays on the stdlib driver for the MVP. SQLite needs zero setup,
which is what an MVP needs; swapping the SQL below for psycopg2 against
Postgres later is a roadmap item (see the deck's "Roadmap: BHASHINI"
column), not a rewrite of the schema or the route logic.
"""

import os
import sqlite3

DB_PATH = os.environ.get(
    "SETU_DB_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "setu.db"),
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts (
    identifier TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('officer','counsellor','victim')),
    account_type TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cases (
    case_id TEXT PRIMARY KEY REFERENCES accounts(identifier),
    case_type TEXT NOT NULL,
    case_status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL REFERENCES cases(case_id),
    timestamp TEXT NOT NULL,
    text TEXT NOT NULL,
    text_negative REAL NOT NULL,
    voice_stress REAL NOT NULL,
    engagement_risk REAL NOT NULL,
    crisis_flag INTEGER NOT NULL,
    text_driver TEXT,
    voice_driver TEXT,
    engagement_driver TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL REFERENCES cases(case_id),
    checkin_index INTEGER NOT NULL,
    decision TEXT NOT NULL CHECK(decision IN ('validated','rejected')),
    reviewer_identifier TEXT NOT NULL,
    reviewer_role TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS discharges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL REFERENCES cases(case_id),
    action TEXT NOT NULL CHECK(action IN ('discharged','reactivated')),
    authority_identifier TEXT NOT NULL,
    authority_role TEXT NOT NULL,
    reason TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
"""


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()
