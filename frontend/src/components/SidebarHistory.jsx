import { useEffect, useState } from "react";

const BACKEND_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function formatDate(isoString) {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return isoString;
  }
}

export default function SidebarHistory({ activeId, onSelect }) {
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
        <div style={{ fontWeight: 700, fontSize: "14px" }}>📁 History</div>
        <div className="muted" style={{ fontSize: 11 }}>
          {loading ? "Loading..." : `${docs.length}`}
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
                title={d.filename}
              >
                <div className="historyFilename">{d.filename}</div>
                <div className="muted" style={{ fontSize: 11, marginBottom: "4px" }}>
                  {formatDate(d.created_at)}
                </div>
                {d.doc_type ? (
                  <span className="pill" style={{ fontSize: "11px", padding: "2px 6px" }}>
                    {d.doc_type}
                  </span>
                ) : null}
              </button>
            );
          })
        ) : (
          <div className="muted" style={{ padding: 10, fontSize: "12px", textAlign: "center" }}>
            No uploads yet
          </div>
        )}
      </div>
    </div>
  );
}
