import { useEffect, useMemo, useRef, useState } from "react";

function formatPrice(price) {
  if (price === null || price === undefined || price === "") return "";
  const n = Number(price);
  if (!Number.isFinite(n)) return String(price);
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatFieldName(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatFieldValue(key, value) {
  if (value === null || value === undefined || value === "") return "";
  if (["purchase_price", "salary", "rent", "deposit", "term_length"].includes(key)) {
    return formatPrice(value);
  }
  return String(value);
}

function buildHighlights(rawText, sources) {
  const text = rawText || "";
  if (!text || !Array.isArray(sources) || sources.length === 0) {
    return { nodes: [text], firstMarkRefIndex: -1 };
  }

  // Simple substring matching only (as requested). We take the first match
  // for each source chunk to avoid over-highlighting.
  const ranges = [];
  for (const s of sources) {
    const needle = String(s?.text || "").trim();
    if (!needle) continue;
    const idx = text.indexOf(needle);
    if (idx === -1) continue;
    ranges.push({ start: idx, end: idx + needle.length });
  }

  if (!ranges.length) return { nodes: [text], firstMarkRefIndex: -1 };

  ranges.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (!last || r.start > last.end) merged.push({ ...r });
    else last.end = Math.max(last.end, r.end);
  }

  const nodes = [];
  let cursor = 0;
  let markIndex = 0;
  let firstMarkRefIndex = -1;

  for (const r of merged) {
    if (cursor < r.start) nodes.push(text.slice(cursor, r.start));
    const marked = text.slice(r.start, r.end);
    const refKey = `m-${markIndex}`;
    nodes.push({ type: "mark", key: refKey, text: marked, ref: markIndex === 0 });
    if (firstMarkRefIndex === -1) firstMarkRefIndex = nodes.length - 1;
    markIndex += 1;
    cursor = r.end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return { nodes, firstMarkRefIndex };
}

export default function DocumentView({ raw_text, doc_type, structured_data, risk_analysis, sources }) {
  const [mode, setMode] = useState("split"); // split | raw | structured
  const firstMarkEl = useRef(null);

  const missing = useMemo(() => new Set(risk_analysis?.missing_fields || []), [risk_analysis]);
  const flags = risk_analysis?.flags || [];

  const fieldEntries = useMemo(() => {
    if (!structured_data || typeof structured_data !== "object") return [];
    return Object.entries(structured_data);
  }, [structured_data]);

  const structuredPretty = useMemo(() => {
    try {
      return JSON.stringify(structured_data || {}, null, 2);
    } catch {
      return "{}";
    }
  }, [structured_data]);

  const { nodes } = useMemo(() => buildHighlights(raw_text, sources), [raw_text, sources]);

  useEffect(() => {
    // Scroll to the first highlighted match after query results arrive.
    if (firstMarkEl.current) {
      firstMarkEl.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [sources]);

  const showRaw = mode === "split" || mode === "raw";
  const showStructured = mode === "split" || mode === "structured";

  return (
    <div>
      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="View mode">
          <button
            type="button"
            className={mode === "split" ? "active" : ""}
            onClick={() => setMode("split")}
          >
            Split
          </button>
          <button
            type="button"
            className={mode === "raw" ? "active" : ""}
            onClick={() => setMode("raw")}
          >
            Raw
          </button>
          <button
            type="button"
            className={mode === "structured" ? "active" : ""}
            onClick={() => setMode("structured")}
          >
            Structured
          </button>
        </div>

        {flags?.length ? (
          <span className="pill">{flags.length} flag(s)</span>
        ) : (
          <span className="pill">No flags</span>
        )}
      </div>

      <div className={mode === "split" ? "split" : ""}>
        {showRaw ? (
          <div className="panel">
            <div className="panelHeader">
              <div style={{ fontWeight: 700 }}>Raw text</div>
              {Array.isArray(sources) && sources.length ? (
                <span className="pill">Highlighted sources</span>
              ) : null}
            </div>
            <div className="panelBody">
              {nodes.map((n, idx) => {
                if (typeof n === "string") return <span key={idx}>{n}</span>;
                if (n.type === "mark") {
                  return (
                    <mark
                      key={n.key}
                      className="mark"
                      ref={n.ref ? firstMarkEl : undefined}
                    >
                      {n.text}
                    </mark>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ) : null}

        {showStructured ? (
          <div className="panel">
            <div className="panelHeader">
              <div style={{ fontWeight: 700 }}>Structured output</div>
              <span className="pill">
                Missing:{" "}
                {missing.size ? (
                  <span className="missing">{missing.size}</span>
                ) : (
                  "0"
                )}
              </span>
            </div>
            <div className="panelBody">
              <div style={{ marginBottom: 10 }}>
                <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>
                  Document type
                </div>
                <div className="pill" style={{ display: "inline-flex", padding: "6px 10px" }}>
                  {doc_type || "unknown"}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>
                  Extracted fields
                </div>
                {fieldEntries.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {fieldEntries.map(([key, value]) => (
                      <div
                        key={key}
                        style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10 }}
                      >
                        <div className="muted">{formatFieldName(key)}</div>
                        <div className={missing.has(key) ? "missing" : ""}>
                          {missing.has(key)
                            ? "Missing"
                            : formatFieldValue(key, value) || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No structured fields available.</div>
                )}
              </div>

              {flags?.length ? (
                <div style={{ marginBottom: 10 }}>
                  <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>
                    Risk flags
                  </div>
                  {flags.map((f, i) => (
                    <div key={i} className="flag">
                      {f}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>
                Pretty JSON
              </div>
              <pre className="json" style={{ margin: 0 }}>
                {structuredPretty}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

