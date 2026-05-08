import { useState } from "react";

export default function Tabs({ tabs, initial, onChange, className = "" }) {
  const [active, setActive] = useState(initial || tabs[0]?.key);
  return (
    <div className={`tabs ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab ${active === tab.key ? "active" : ""}`}
          role="tab"
          aria-selected={active === tab.key}
          tabIndex={active === tab.key ? 0 : -1}
          onClick={() => {
            setActive(tab.key);
            onChange?.(tab.key);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
