// Human-readable labels for backend roles.
export const ROLE_LABEL = {
  counsellor: "Counsellor",
  officer: "Officer",
  district_officer: "District Officer",
  state_national: "State & National",
};

export function roleLabel(role) {
  return ROLE_LABEL[role] || role || "Unknown role";
}

export function initialsFor(identifier) {
  if (!identifier) return "?";
  return identifier.slice(0, 2).toUpperCase();
}
