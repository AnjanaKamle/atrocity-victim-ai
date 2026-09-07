from dataclasses import dataclass, field
from datetime import datetime
import numpy as np

from config import WEIGHTS, THRESHOLDS
from intervention import recommend_interventions

TREND_WINDOW = 5


@dataclass
class CheckIn:
    timestamp: datetime
    text_negative: float
    voice_stress: float
    engagement_risk: float
    crisis_flag: bool = False
    text_driver: str = ""
    voice_driver: str = ""
    engagement_driver: str = ""
    case_type: str = "unspecified"

    @property
    def distress_score(self) -> float:
        return round(100 * (
            WEIGHTS["text"] * self.text_negative +
            WEIGHTS["voice"] * self.voice_stress +
            WEIGHTS["engagement"] * self.engagement_risk
        ), 1)


@dataclass
class Review:
    checkin_index: int
    decision: str  # validated | rejected
    reviewer_role: str
    timestamp: datetime


@dataclass
class DischargeRecord:
    action: str  # discharged | reactivated
    authority_role: str
    reason: str
    timestamp: datetime


@dataclass
class CaseHistory:
    case_id: str
    checkins: list = field(default_factory=list)
    reviews: list = field(default_factory=list)
    case_status: str = "active"  # active | voluntary
    discharge_history: list = field(default_factory=list)

    def add(self, checkin: CheckIn):
        self.checkins.append(checkin)

    def discharge(self, authority_role: str, reason: str):
        self.case_status = "voluntary"
        self.discharge_history.append(DischargeRecord("discharged", authority_role, reason, datetime.now()))

    def reactivate(self, authority_role: str, reason: str):
        self.case_status = "active"
        self.discharge_history.append(DischargeRecord("reactivated", authority_role, reason, datetime.now()))

    def record_review(self, decision: str, reviewer_role: str):
        self.reviews.append(Review(len(self.checkins) - 1, decision, reviewer_role, datetime.now()))

    def review_stats(self) -> dict:
        v = sum(1 for r in self.reviews if r.decision == "validated")
        r = sum(1 for r in self.reviews if r.decision == "rejected")
        return {"total_reviewed": len(self.reviews), "validated": v, "rejected": r}

    def scores(self):
        return [c.distress_score for c in self.checkins]

    def trend(self) -> dict:
        recent = self.scores()[-TREND_WINDOW:]
        if len(recent) < 2:
            return {"direction": "insufficient_data", "slope": 0.0}
        slope = float(np.polyfit(np.arange(len(recent)), recent, 1)[0])
        direction = "worsening" if slope > 1.5 else "improving" if slope < -1.5 else "stable"
        return {"direction": direction, "slope": round(slope, 2)}

    def predict_escalation(self) -> dict:
        trend = self.trend()
        current = self.scores()[-1] if self.checkins else 0
        if trend["slope"] <= 0:
            return {"predicted_escalation": False}

        next_threshold = next((v for v in THRESHOLDS.values() if current < v), None)
        if next_threshold is None:
            return {"predicted_escalation": False}

        checkins_to_cross = (next_threshold - current) / trend["slope"]
        if 0 < checkins_to_cross <= 3:
            return {"predicted_escalation": True, "checkins_until_threshold": round(checkins_to_cross, 1), "threshold": next_threshold}
        return {"predicted_escalation": False}

    def alert_tier(self) -> str:
        if self.checkins and self.checkins[-1].crisis_flag:
            return "crisis_counsellor"

        latest_idx = len(self.checkins) - 1
        if any(r.checkin_index == latest_idx and r.decision == "rejected" for r in self.reviews):
            return "none"

        if self.case_status == "voluntary":
            return "none"

        score = self.scores()[-1] if self.checkins else 0
        if score >= THRESHOLDS["high"]:
            return "officer"
        if score >= THRESHOLDS["low"]:
            return "counsellor"
        return "none"

    def explain(self) -> str:
        if not self.checkins:
            return "No data yet."
        latest = self.checkins[-1]
        if latest.crisis_flag:
            return "CRISIS: acute risk language detected in latest check-in. Immediate contact required."
        contributions = {
            f"text sentiment ({latest.text_driver or 'negative affect'})": WEIGHTS["text"] * latest.text_negative,
            f"voice signal ({latest.voice_driver})": WEIGHTS["voice"] * latest.voice_stress,
            f"engagement ({latest.engagement_driver})": WEIGHTS["engagement"] * latest.engagement_risk,
        }
        top_two = sorted(contributions.items(), key=lambda kv: kv[1], reverse=True)[:2]
        reasons = " + ".join(name for name, _ in top_two)
        trend = self.trend()
        return f"Flagged due to: {reasons}. Trend: {trend['direction']} (slope {trend['slope']}/check-in)."

    def to_dashboard_payload(self) -> dict:
        latest = self.checkins[-1] if self.checkins else None
        interventions = []
        if latest:
            interventions = recommend_interventions(
                distress_score=latest.distress_score, crisis_flag=latest.crisis_flag,
                engagement_risk=latest.engagement_risk, case_type=latest.case_type,
            )
        return {
            "case_id": self.case_id,
            "current_score": self.scores()[-1] if self.checkins else None,
            "history": [{"timestamp": c.timestamp.isoformat(), "score": c.distress_score} for c in self.checkins],
            "trend": self.trend(),
            "alert_tier": self.alert_tier(),
            "escalation_prediction": self.predict_escalation(),
            "explanation": self.explain(),
            "recommended_interventions": interventions,
            "review_stats": self.review_stats(),
            "case_status": self.case_status,
        }
