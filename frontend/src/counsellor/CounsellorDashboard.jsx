import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCases, reviewCase } from "../shared/api.js";

const TIER_LABEL = {
  none: "No alert",
  counsellor: "Counsellor",
  officer: "Officer",
  crisis_counsellor: "CRISIS",
};
const TIER_ORDER = ["crisis_counsellor", "officer", "counsellor", "none"];

export default function CounsellorDashboard() {
  const [cases, setCases] = useState([]);

  const load = () => getCases().then(setCases);
  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const alerts = cases
    .filter((c) => c.alert_tier !== "none")
    .sort((a, b) => TIER_ORDER.indexOf(a.alert_tier) - TIER_ORDER.indexOf(b.alert_tier));

  const handleReview = async (caseId, decision) => {
    await reviewCase(caseId, decision);
    load();
  };

  return (
    <div>
      <h1>Counsellor Dashboard</h1>
      <div className="card" style={{ borderColor: "var(--accent-2)" }}>
        <p className="dim" style={{ margin: 0 }}>
          Showing every case visible to your role -- there's no per-counsellor case
          assignment on the backend yet, so this isn't filtered to "forwarded to me"
          specifically. Once that's added server-side, this list will narrow automatically.
        </p>
      </div>

      {alerts.length === 0 && (
        <div className="card"><p className="dim">No open alerts.</p></div>
      )}

      {alerts.map((c) => (
        <div key={c.case_id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="case-id">{c.case_id}</div>
              <div className="case-meta">{c.case_type?.replaceAll("_", " ")} &middot; trend: {c.trend.direction}</div>
            </div>
            <div className={`tier-badge ${c.alert_tier}`}>{TIER_LABEL[c.alert_tier]}</div>
          </div>

          <div className={`explanation-box ${c.alert_tier === "crisis_counsellor" ? "crisis" : ""}`} style={{ marginTop: 12 }}>
            {c.explanation}
          </div>

          {c.recommended_interventions.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p className="dim" style={{ marginBottom: 6 }}>Recommended:</p>
              {c.recommended_interventions.map((iv) => (
                <span key={iv.category} className="flag-tag">{iv.category.replaceAll("_", " ")}</span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button className="primary" onClick={() => handleReview(c.case_id, "validated")}>Validate</button>
            <button className="danger" onClick={() => handleReview(c.case_id, "rejected")}>Reject</button>
            <Link to={`/counsellor/case/${c.case_id}`} className="dim" style={{ marginLeft: 8 }}>View full case &rarr;</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
