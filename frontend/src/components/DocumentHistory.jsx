import { useEffect, useState } from "react";

const BACKEND_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function formatDate(isoString) {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString();
  } catch {
    return isoString;
  }
}

export default function DocumentHistory({ activeId, onSelect }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/documents`);
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.detail || "Failed to load documents.");
        if (!cancelled) setDocs(Array.isArray(data?.documents) ? data.documents : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load documents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSelect(id) {
    setError("");
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/documents/${id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Failed to load document.");
      onSelect?.(data);
    } catch (e) {
      setError(e?.message || "Failed to load document.");
    }
  }

  return (
    <div className="history">
      <div className="historyHeader">
        <div style={{ fontWeight: 700 }}>History</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {loading ? "Loading..." : `${docs.length} item(s)`}
        </div>
      </div>

      {error ? <div className="historyError">{error}</div> : null}

      <div className="historyList">
        {docs.length ? (
          docs.map((d) => {
            const isActive = activeId === d.id;
            return (
              <button
                key={d.id}
                className={`historyItem ${isActive ? "active" : ""}`}
                onClick={() => handleSelect(d.id)}
                type="button"
              >
                <div className="historyFilename">
                  {d.filename}
                  {d.doc_type ? <span className="pill" style={{ marginLeft: 8 }}>{d.doc_type}</span> : null}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {formatDate(d.created_at)}
                </div>
              </button>
            );
          })
        ) : (
          <div className="muted" style={{ padding: 10 }}>
            No uploads yet.
          </div>
        )}
      </div>
    </div>
  );
}

