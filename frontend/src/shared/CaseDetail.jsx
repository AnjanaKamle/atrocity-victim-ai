import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCase, reviewCase, dischargeCase } from "./api.js";
import { useAuth } from "./AuthContext.jsx";
import TrendChart from "./charts/TrendChart.jsx";

export default function CaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [c, setC] = useState(null);
  const [chosenIntervention, setChosenIntervention] = useState(null);
  const [dischargeReason, setDischargeReason] = useState("");

  const load = () => getCase(caseId).then(setC);
  useEffect(load, [caseId]);

  if (!c) return <p className="dim">Loading...</p>;

  const isCrisis = c.alert_tier === "crisis_counsellor";

  const handleReview = async (decision) => {
    await reviewCase(c.case_id, decision);
    load();
  };

  const handleDischarge = async () => {
    if (!dischargeReason.trim()) return;
    await dischargeCase(c.case_id, dischargeReason);
    setDischargeReason("");
    load();
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        &larr; back
      </button>
      <h1>{c.case_id}</h1>
      <p className="dim">{c.case_type?.replaceAll("_", " ")}</p>

      <div className="card">
        <h3>Distress trend</h3>
        <TrendChart history={c.history} />
        <p className="dim">Trend: {c.trend.direction} (slope {c.trend.slope}/check-in)</p>
        {c.escalation_prediction?.predicted_escalation && (
          <p style={{ color: "#d9741f" }}>
            Predicted to cross {c.escalation_prediction.threshold} within{" "}
            {c.escalation_prediction.checkins_until_threshold} check-ins if trend holds.
          </p>
        )}
      </div>

      <div className="card">
        <h3>Explanation</h3>
        <div className={`explanation-box ${isCrisis ? "crisis" : ""}`}>{c.explanation}</div>
      </div>

      <div className="card">
        <h3>Review</h3>
        <p className="dim">
          Confirm this alert reflects a real concern, or reject as a false positive.
          Rejecting suppresses repeat alerts on this check-in and is logged below.
        </p>
        <button className="primary" onClick={() => handleReview("validated")}>Validate</button>
        <button className="danger" onClick={() => handleReview("rejected")}>Reject (false positive)</button>
        <p className="dim" style={{ marginTop: 10 }}>
          Reviewed {c.review_stats.total_reviewed} times &middot; {c.review_stats.validated} validated &middot; {c.review_stats.rejected} rejected
        </p>
      </div>

      <div className="card">
        <h3>AI-recommended interventions</h3>
        <p className="dim">Ranked by relevance. The officer selects or overrides -- the AI never auto-assigns.</p>
        {c.recommended_interventions.length === 0 && <p className="dim">No intervention currently recommended.</p>}
        {c.recommended_interventions.map((iv) => (
          <div key={iv.category} className="intervention-item">
            <div>
              <strong>{iv.category.replaceAll("_", " ")}</strong>
              <div className="dim">{iv.reasons.join("; ")}</div>
            </div>
            <button
              className={chosenIntervention === iv.category ? "primary" : "secondary"}
              onClick={() => setChosenIntervention(iv.category)}
            >
              {chosenIntervention === iv.category ? "Selected" : "Select"}
            </button>
          </div>
        ))}
      </div>

      {auth?.role === "officer" && (
        <div className="card">
          <h3>Case status: {c.case_status}</h3>
          <p className="dim">
            Discharging ends MANDATORY monitoring -- the victim may still check in voluntarily.
            Crisis detection stays active regardless of status.
          </p>
          {c.case_status === "active" && (
            <>
              <textarea
                placeholder="Reason for discharge (required)"
                value={dischargeReason}
                onChange={(e) => setDischargeReason(e.target.value)}
                rows={2}
              />
              <button className="secondary" onClick={handleDischarge} disabled={!dischargeReason.trim()}>
                Discharge from mandatory monitoring
              </button>
            </>
          )}
          {c.case_status === "voluntary" && <p className="dim">This case is on voluntary, self-initiated monitoring.</p>}
        </div>
      )}
    </div>
  );
}
