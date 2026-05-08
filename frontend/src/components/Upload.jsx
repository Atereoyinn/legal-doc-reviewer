import { useMemo, useState } from "react";

const BACKEND_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function Upload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canUpload = useMemo(() => {
    return Boolean(file) && !loading;
  }, [file, loading]);

  async function handleUpload() {
    setError("");
    if (!file) return;

    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${BACKEND_BASE_URL}/upload`, {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = data?.detail ? String(data.detail) : "Upload failed.";
        throw new Error(detail);
      }

      onUploaded?.(data);
    } catch (e) {
      setError(e?.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="row" style={{ alignItems: "center" }}>
        <div style={{ flex: "1 1 320px" }}>
          <label htmlFor="pdf">PDF file</label>
          <div style={{ marginTop: 6 }}>
            <input
              id="pdf"
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
              }}
            />
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            PDF only. Backend: <code>{BACKEND_BASE_URL}</code>
          </div>
        </div>

        <div style={{ flex: "0 0 auto" }}>
          <button onClick={handleUpload} disabled={!canUpload}>
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flag" style={{ borderColor: "#fed7aa", background: "#fff7ed", color: "#7c2d12" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

