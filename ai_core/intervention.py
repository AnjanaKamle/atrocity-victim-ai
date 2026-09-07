"""Ranks all 7 PS-mandated categories. Never auto-selects -- officer
picks or overrides."""

from config import INTERVENTION_CATEGORIES


def recommend_interventions(distress_score: float, crisis_flag: bool,
                             engagement_risk: float, case_type: str = "unspecified") -> list:
    scores = {c: 0.0 for c in INTERVENTION_CATEGORIES}
    reasons = {c: [] for c in INTERVENTION_CATEGORIES}

    if crisis_flag:
        scores["medical"] += 1.0
        reasons["medical"].append("acute crisis language detected")
        scores["counselling"] += 0.9
        reasons["counselling"].append("acute crisis language detected")

    if distress_score >= 60:
        scores["counselling"] += 0.6
        reasons["counselling"].append("high distress score")

    if engagement_risk >= 0.6:
        scores["rehabilitation"] += 0.4
        reasons["rehabilitation"].append("sustained disengagement pattern")

    if case_type == "witness_intimidation":
        scores["witness_protection"] += 0.8
        reasons["witness_protection"].append("case flagged as witness intimidation")
        scores["relocation"] += 0.5
        reasons["relocation"].append("case flagged as witness intimidation")

    if case_type in ("caste_violence", "rape_gang_rape"):
        scores["legal_aid"] += 0.4
        reasons["legal_aid"].append("case type typically involves ongoing legal proceedings")

    scores["financial_assistance"] += 0.2
    reasons["financial_assistance"].append("standing entitlement under SC/ST Act relief provisions")

    return sorted(
        ({"category": c, "weight": round(s, 2), "reasons": reasons[c]}
         for c, s in scores.items() if s > 0),
        key=lambda x: x["weight"], reverse=True,
    )
