import Badge from "./Badge";

const severityColors = {
  critical: "danger",
  warning: "warning",
  info: "info",
};

export default function RiskCard({ risk }) {
  return (
    <div className="riskCard">
      <div className="riskCardHeader">
        <Badge color={severityColors[risk.severity] || "default"}>{risk.severity || "Info"}</Badge>
        <span className="riskTitle">{risk.title || "Untitled risk"}</span>
      </div>
      {risk.affected_field ? (
        <div className="riskAffected">Field: {risk.affected_field}</div>
      ) : null}
      <div className="riskExplanation">{risk.explanation}</div>
      {risk.recommended_action ? (
        <div className="riskAction">Recommended: {risk.recommended_action}</div>
      ) : null}
    </div>
  );
}
