export default function FieldGrid({ fields, missing = new Set(), confidence = {}, showConfidence = false }) {
  if (!fields || !fields.length) return <div className="muted">No fields available.</div>;
  return (
    <div className="fieldGrid">
      {fields.map(([key, value]) => (
        <div key={key} className="fieldRow">
          <div className="fieldKey">{key}</div>
          <div className={`fieldValue${missing.has(key) ? " missing" : ""}`}>
            {missing.has(key) ? <span className="missing">Missing</span> : value || "—"}
            {showConfidence && confidence[key] !== undefined ? (
              <span className="confidence">{Math.round(confidence[key] * 100)}%</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
