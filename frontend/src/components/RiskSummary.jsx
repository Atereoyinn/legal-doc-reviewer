import { formatFieldName } from "../services/formatting.js";

export default function RiskSummary({ risk_analysis, missing_fields = [] }) {
  const flags = risk_analysis?.flags || [];
  const missing = new Set(missing_fields);

  const IMPORTANT_MISSING_FIELDS = ["lease_end_date", "completion_date", "deposit", "rent"];
  const missingImportant = IMPORTANT_MISSING_FIELDS.filter((f) => missing.has(f));

  const allIssues = [
    ...flags.map((f) => ({
      type: "flag",
      text: f,
      severity: "warning",
    })),
    ...missingImportant.map((f) => ({
      type: "missing",
      text: `Missing: ${formatFieldName(f)}`,
      severity: "warning",
    })),
  ];

  if (allIssues.length === 0) {
    return (
      <div className="riskSummary">
        <div className="riskSummaryHeader">Risk Summary</div>
        <div className="riskSummaryBody">
          <div className="riskSafeState">
            <div className="riskSafeIcon">✅</div>
            <div className="riskSafeText">No critical issues detected</div>
            <div className="muted" style={{ fontSize: "12px" }}>
              Document appears safe for review
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="riskSummary">
      <div className="riskSummaryHeader">Risk Summary ({allIssues.length})</div>
      <div className="riskSummaryBody">
        <div className="riskFlagsList">
          {allIssues.map((issue, idx) => (
            <div key={idx} className={`riskFlag ${issue.severity === "critical" ? "critical" : ""}`}>
              <div className="riskFlagTitle">
                {issue.type === "missing" ? "⚠️ Missing Field" : "⚠️ Risk Flag"}
              </div>
              <div>{issue.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
