import { useMemo } from "react";
import { formatPrice, formatFieldName, formatFieldValue } from "../services/formatting.js";

// Group fields by category
function groupFields(structured_data, missing_fields) {
  const missing = new Set(missing_fields || []);
  const groups = {
    parties: { label: "Parties", icon: "👥", fields: [] },
    financial: { label: "Financial Terms", icon: "💰", fields: [] },
    dates: { label: "Key Dates", icon: "📅", fields: [] },
    property: { label: "Property Details", icon: "🏠", fields: [] },
    other: { label: "Other Information", icon: "📋", fields: [] },
  };

  if (!structured_data || typeof structured_data !== "object") {
    return Object.values(groups);
  }

  const partyKeys = ["tenant", "landlord", "employer", "employee", "buyer", "seller"];
  const financialKeys = ["rent", "deposit", "salary", "purchase_price", "monthly_payment"];
  const dateKeys = ["lease_start_date", "lease_end_date", "start_date", "end_date", "completion_date"];
  const propertyKeys = ["property_address", "property"];

  Object.entries(structured_data).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    let group = groups.other;

    if (partyKeys.some((pk) => lowerKey.includes(pk))) {
      group = groups.parties;
    } else if (financialKeys.some((fk) => lowerKey.includes(fk))) {
      group = groups.financial;
    } else if (dateKeys.some((dk) => lowerKey.includes(dk))) {
      group = groups.dates;
    } else if (propertyKeys.some((pk) => lowerKey.includes(pk))) {
      group = groups.property;
    }

    group.fields.push([key, value]);
  });

  return Object.values(groups).filter((g) => g.fields.length > 0);
}

export default function ExtractedFieldsPanel({ structured_data, missing_fields = [] }) {
  const groups = useMemo(() => groupFields(structured_data, missing_fields), [structured_data, missing_fields]);
  const missing = useMemo(() => new Set(missing_fields), [missing_fields]);

  if (!structured_data) {
    return (
      <div className="card">
        <div className="muted">No extracted fields available. Upload a document to see extracted data.</div>
      </div>
    );
  }

  return (
    <div className="fieldsGrid">
      {groups.map((group) => (
        <div key={group.label} className="fieldGroup">
          <div className="fieldGroupHeader">
            <span className="fieldGroupIcon">{group.icon}</span>
            <span>{group.label}</span>
          </div>
          <div className="fieldGroupBody">
            {group.fields.map(([key, value]) => (
              <div key={key} className="fieldRow">
                <div className="fieldLabel">{formatFieldName(key)}</div>
                <div className={missing.has(key) ? "fieldValue isMissing" : "fieldValue"}>
                  {missing.has(key) ? (
                    <span className="missingBadge">Missing</span>
                  ) : (
                    formatFieldValue(key, value) || "—"
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
