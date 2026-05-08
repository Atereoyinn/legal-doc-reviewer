import { useMemo, useState } from "react";

const BACKEND_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function QueryBox({ disabled, onAnswer }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);

  const canSubmit = useMemo(() => {
    return !disabled && !loading && question.trim().length > 0;
  }, [disabled, loading, question]);

  async function handleAsk() {
    setError("");
    setAnswer("");
    setSources([]);
    const q = question.trim();
    if (!q) return;

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = data?.detail ? String(data.detail) : "Query failed.";
        throw new Error(detail);
      }

      const a = String(data?.answer || "");
      const src = Array.isArray(data?.sources) ? data.sources : [];
      setAnswer(a);
      setSources(src);
      onAnswer?.({ question: q, answer: a, sources: src });
    } catch (e) {
      setError(e?.message || "Query failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="row" style={{ alignItems: "center" }}>
        <div style={{ flex: "1 1 520px" }}>
          <label htmlFor="question">Question</label>
          <div style={{ marginTop: 6 }}>
            <input
              id="question"
              type="text"
              placeholder={disabled ? "Upload a document to enable querying" : "e.g. What is the completion date?"}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={disabled || loading}
            />
          </div>
        </div>
        <div style={{ flex: "0 0 auto", marginTop: 22 }}>
          <button onClick={handleAsk} disabled={!canSubmit}>
            {loading ? "Asking..." : "Ask"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flag" style={{ borderColor: "#fed7aa", background: "#fff7ed", color: "#7c2d12" }}>
          {error}
        </div>
      ) : null}

      {answer ? (
        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ fontWeight: 600 }}>
            Answer
          </div>
          <div className="answer" style={{ marginTop: 6 }}>
            {answer}
          </div>
          {sources.length ? (
            <div style={{ marginTop: 10 }}>
              <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>
                Sources (top {sources.length})
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {sources.map((s, idx) => (
                  <div key={idx} className="listCard">
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      Score: {typeof s?.score === "number" ? s.score.toFixed(2) : "—"}
                    </div>
                    <div className="answer">{String(s?.text || "")}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

