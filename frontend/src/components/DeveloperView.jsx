import { useMemo, useState } from "react";

export default function DeveloperView({ structured_data, raw_text, risk_analysis }) {
  const [isOpen, setIsOpen] = useState(false);

  const devData = useMemo(() => {
    return {
      structured_data: structured_data || {},
      risk_analysis: risk_analysis || {},
      text_preview: raw_text ? raw_text.substring(0, 200) + "..." : "",
    };
  }, [structured_data, raw_text, risk_analysis]);

  const jsonString = JSON.stringify(devData, null, 2);

  return (
    <div className="accordion">
      <div className="accordionHeader" onClick={() => setIsOpen(!isOpen)} role="button" tabIndex="0">
        <span className="accordionTitle">
          <span>👨‍💻</span> Developer View
        </span>
        <span className="accordionToggle">›</span>
      </div>
      {isOpen && (
        <div className="accordionBody">
          <div className="jsonDisplay">{jsonString}</div>
        </div>
      )}
    </div>
  );
}
