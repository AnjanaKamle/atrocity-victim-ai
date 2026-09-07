import ai_core_bridge  # noqa: F401  -- must run first: puts ai_core/ on sys.path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import db
import demo_seed
import seed
from auth_routes import router as auth_router
from official_routes import router as official_router
from victim_routes import router as victim_router

app = FastAPI(title="Setu API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend/vite.config.js dev server port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    db.init_db()
    seed.seed_if_empty()  # officer_demo / counsellor_demo -- created once, kept across restarts
    demo_seed.seed_demo_cases()  # synthetic victim cases -- reset on every restart by default


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(official_router)
app.include_router(victim_router)

# NOTE: frontend/src/shared/api.js has one more call -- forwardToCounsellor
# (POST /official/cases/{id}/forward) -- that it explicitly documents as
# "NOT YET BACKED" and expects to 404. No route for it is added here on
# purpose, to match that comment; OfficerDashboard.jsx already handles
# the failure gracefully. Add a /forward route (plus an
# assigned_counsellor column on cases) when you're ready to wire it up.