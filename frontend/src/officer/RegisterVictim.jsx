import { useState } from "react";
import { registerVictim } from "../shared/api.js";
import { CASE_TYPES } from "../shared/caseTypes.js";

// Officer-only -- gated at the route level (RequireRole roles={['officer']})
// AND enforced server-side (backend/auth.py requires the "officer" role).
//
// NOTE: preferred language / contact channel / notes below are NOT sent
// to the backend yet -- OfficerRegisterVictimRequest in backend/auth.py
// only accepts case_id + incident_type today. They're kept in this form
// because you asked for a fuller intake, but they're currently UI-only
// until models_db.Case gets matching columns. Deliberately NOT asking
// for the victim's name/address here -- that would work against the
// pseudonymization commitment already made in docs/privacy_governance.md.
export default function RegisterVictim() {
  const [caseId, setCaseId] = useState("");
  const [incidentType, setIncidentType] = useState(CASE_TYPES[0].value);
  const [preferredLanguage, setPreferredLanguage] = useState("hi");
  const [contactChannel, setContactChannel] = useState("chatbot");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    try {
      const data = await registerVictim(caseId, incidentType);
      setResult(data);
      setCaseId("");
      setNotes("");
    } catch (err) {
      setError(err.message || "Could not register victim. Case ID may already exist.");
    }
  };

  return (
    <div>
      <h1>Register Victim</h1>
      <p className="dim">
        Creates the case record and a government-issued account in one step.
        The victim never self-registers -- hand them the credentials below directly.
      </p>

      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 460 }}>
        <label className="dim">Case ID</label>
        <input type="text" value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="NHAA-2026-XXXXX" required />

        <label className="dim" style={{ display: "block", marginTop: 12 }}>Incident type</label>
        <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} style={{ width: "100%", padding: 8 }}>
          {CASE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <label className="dim" style={{ display: "block", marginTop: 12 }}>Preferred language</label>
        <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} style={{ width: "100%", padding: 8 }}>
          <option value="hi">Hindi</option>
          <option value="en">English</option>
          <option value="other">Other regional language</option>
        </select>

        <label className="dim" style={{ display: "block", marginTop: 12 }}>Preferred contact channel</label>
        <select value={contactChannel} onChange={(e) => setContactChannel(e.target.value)} style={{ width: "100%", padding: 8 }}>
          <option value="chatbot">Chatbot / app</option>
          <option value="ivrs">IVRS (phone call)</option>
          <option value="sms">SMS</option>
        </select>

        <label className="dim" style={{ display: "block", marginTop: 12 }}>Officer notes (internal, not sent to victim)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional context for the assigned counsellor" />

        <p className="dim" style={{ marginTop: 10, fontSize: 12 }}>
          Language, contact channel, and notes are captured here but not yet saved by the backend -- see the code comment at the top of this file.
        </p>

        {error && <p className="error-text">{error}</p>}
        <button className="primary" type="submit" style={{ marginTop: 16 }}>Register Victim</button>
      </form>

      {result && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <h3>Account created</h3>
          <p className="dim">
            Shown once -- copy these now and hand them to the victim securely.
            They will be forced to set their own password on first login.
          </p>
          <p><strong>Case ID:</strong> {result.case_id}</p>
          <p><strong>Temporary password:</strong> <code>{result.temporary_password}</code></p>
        </div>
      )}
    </div>
  );
}
