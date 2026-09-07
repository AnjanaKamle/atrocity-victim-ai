"""A victim going quiet is a signal, not a lack of data."""


def engagement_risk_score(days_since_last_checkin: float,
                           expected_interval_days: float,
                           missed_checkins_streak: int) -> dict:
    overdue = min(1.0, max(0.0, days_since_last_checkin / expected_interval_days - 1.0))
    streak = min(1.0, missed_checkins_streak * 0.25)
    risk = max(0.0, min(1.0, 0.6 * overdue + 0.4 * streak))

    if missed_checkins_streak >= 2:
        driver = f"{missed_checkins_streak} consecutive missed check-ins"
    elif overdue > 0:
        driver = "overdue for scheduled check-in"
    else:
        driver = "engagement normal"

    return {"engagement_risk": round(risk, 3), "driver": driver}
