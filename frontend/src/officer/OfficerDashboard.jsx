import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCases, reviewCase, forwardToCounsellor } from "../shared/api.js";

const TIER_LABEL = {
  none: "No alert",
  counsellor: "Counsellor",
  officer: "Officer",
  crisis_counsellor: "CRISIS",
};
const TIER_ORDER = ["crisis_counsellor", "officer", "counsellor", "none"];

export default function OfficerDashboard() {
  const [cases, setCases] = useState([]);
  const [forwarded, setForwarded] = useState({}); // caseId -> "ok" | "backend-pending"

  const load = () => getCases().then(setCases);
  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // simple polling for "live"
    return () => clearInterval(interval);
  }, []);

  const alerts = cases
    .filter((c) => c.alert_tier !== "none")
    .sort((a, b) => TIER_ORDER.indexOf(a.alert_tier) - TIER_ORDER.indexOf(b.alert_tier));

  const counts = TIER_ORDER.reduce((acc, tier) => {
    acc[tier] = cases.filter((c) => c.alert_tier === tier).length;
    return acc;
  }, {});

  const handleReview = async (caseId, decision) => {
    await reviewCase(caseId, decision);
    load();
  };

  const handleForward = async (caseId) => {
    try {
      await forwardToCounsellor(caseId);
      setForwarded((f) => ({ ...f, [caseId]: "ok" }));
    } catch {
      // Endpoint doesn't exist server-side yet -- see api.js's
      // forwardToCounsellor comment. Still reflect the intent in the UI
      // so the flow is demoable, but say plainly it isn't saved.
      setForwarded((f) => ({ ...f, [caseId]: "backend-pending" }));
    }
  };

  return (
    <div>
      <h1>Officer Dashboard</h1>
      <p className="dim">Live alert feed -- validate, reject, or forward to a counsellor.</p>

      <div className="card" style={{ display: "flex", gap: 24 }}>
        {TIER_ORDER.filter((t) => t !== "none").map((tier) => (
          <div key={tier}>
            <div className={`tier-badge ${tier}`}>{TIER_LABEL[tier]}</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{counts[tier] || 0}</div>
          </div>
        ))}
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
            <button className="secondary" onClick={() => handleForward(c.case_id)}>Forward to Counsellor</button>
            <Link to={`/officer/case/${c.case_id}`} className="dim" style={{ marginLeft: 8 }}>View full case &rarr;</Link>
          </div>

          {forwarded[c.case_id] === "ok" && <p className="success-text" style={{ marginTop: 8 }}>Forwarded to counsellor.</p>}
          {forwarded[c.case_id] === "backend-pending" && (
            <p className="dim" style={{ marginTop: 8 }}>
              Marked to forward, but not yet saved -- the backend doesn't support case forwarding yet.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
