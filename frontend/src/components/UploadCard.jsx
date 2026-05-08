import { useMemo, useRef, useState } from "react";

const BACKEND_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function UploadCard({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const canUpload = useMemo(() => {
    return Boolean(file) && !loading;
  }, [file, loading]);

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

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

      // Success - call parent callback
      onUploaded?.(data);
      setFile(null);
    } catch (e) {
      setError(e?.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const f = droppedFiles[0];
      if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
        setFile(f);
        setError("");
      } else {
        setError("Please drop a PDF file.");
      }
    }
  }

  return (
    <div className="uploadCard">
      <div
        className={`dragDropZone ${isDragging ? "isDragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex="0"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload PDF file"
      >
        <div className="dragDropIcon">📄</div>
        <div className="dragDropText">Drag & drop your PDF here</div>
        <div className="dragDropSubtext">or click to browse</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="uploadHiddenInput"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            if (f) {
              setFile(f);
              setError("");
            }
          }}
          aria-hidden="true"
        />
      </div>

      {file && (
        <div className="fileSelected">
          <div>
            <div className="fileSelectedName">{file.name}</div>
            <div className="muted" style={{ fontSize: "12px" }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <div className="fileSelectedIcon">✓</div>
        </div>
      )}

      {file && (
        <button onClick={handleUpload} disabled={!canUpload} style={{ alignSelf: "flex-start" }}>
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="loadingSpinner"></span> Analyzing...
            </span>
          ) : (
            "Upload & Analyze"
          )}
        </button>
      )}

      {error && (
        <div className="flag" style={{ borderColor: "#fed7aa", background: "#fff7ed", color: "#7c2d12" }}>
          {error}
        </div>
      )}
    </div>
  );
}
