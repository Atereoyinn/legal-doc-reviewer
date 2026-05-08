import { useMemo, useState } from "react";
import Upload from "./components/Upload.jsx";
import DocumentView from "./components/DocumentView.jsx";
import QueryBox from "./components/QueryBox.jsx";
import DocumentHistory from "./components/DocumentHistory.jsx";

function normalizeUploadResponse(data) {
  // User expects: { text, structured_data, risk_analysis }
  // Backend currently returns: { text, structured, risks, doc_type, filename }
  const structured_data = data?.structured_data ?? data?.structured ?? null;
  const risk_analysis = data?.risk_analysis ?? data?.risks ?? null;
  return {
    text: data?.text ?? "",
    structured_data,
    risk_analysis,
    doc_type: data?.doc_type ?? null,
    filename: data?.filename ?? null,
  };
}

function normalizeDocumentDetail(data) {
  // GET /documents/{id} returns { id, filename, created_at, raw_text, structured_data, doc_type }
  return {
    id: data?.id ?? null,
    filename: data?.filename ?? null,
    created_at: data?.created_at ?? null,
    text: data?.raw_text ?? "",
    structured_data: data?.structured_data ?? null,
    doc_type: data?.doc_type ?? null,
    risk_analysis: null, // not returned by history endpoint (yet)
  };
}

export default function App() {
  const [doc, setDoc] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [sources, setSources] = useState([]);

  const canQuery = useMemo(() => {
    return Boolean(doc?.text);
  }, [doc]);

  return (
    <div className="container">
      <div className="header">
        <h2 className="title">Legal Document Reviewer</h2>
        <p className="muted subtitle">
          Upload a PDF, review extracted fields & risks, then ask questions grounded
          in the document.
        </p>
      </div>

      <div className="layout">
        <DocumentHistory
          activeId={doc?.id ?? null}
          onSelect={(data) => {
            setDoc(normalizeDocumentDetail(data));
            setAnswers([]);
            setSources([]);
          }}
        />

        <div className="stack">
          <div className="card">
            <div className="sectionHeader">
              <h3 className="sectionTitle">1) Upload document</h3>
            </div>
            <Upload
              onUploaded={(data) => {
                setDoc(normalizeUploadResponse(data));
                setAnswers([]);
                setSources([]);
              }}
            />
          </div>

          {doc?.text ? (
            <>
              <div className="card">
                <div className="sectionHeader">
                  <h3 className="sectionTitle">2) Review extracted fields</h3>
                  {doc.filename ? <span className="pill">{doc.filename}</span> : null}
                </div>
                <DocumentView
                  raw_text={doc.text}
                  doc_type={doc.doc_type}
                  structured_data={doc.structured_data}
                  risk_analysis={doc.risk_analysis}
                  sources={sources}
                />
              </div>

              <div className="card">
                <div className="sectionHeader">
                  <h3 className="sectionTitle">3) Ask questions</h3>
                </div>
                <QueryBox
                  disabled={!canQuery}
                  onAnswer={(entry) => {
                    setAnswers((prev) => [entry, ...prev]);
                    setSources(entry.sources || []);
                  }}
                />
                {answers.length ? (
                  <div style={{ marginTop: 16 }}>
                    <div className="muted" style={{ fontWeight: 600, marginBottom: 8 }}>
                      Recent answers
                    </div>
                    <div style={{ display: "grid", gap: 12 }}>
                      {answers.map((a, idx) => (
                        <div key={idx} className="listCard">
                          <div className="muted" style={{ marginBottom: 6 }}>
                            Q: {a.question}
                          </div>
                          <div className="answer">{a.answer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="card">
              <div className="sectionHeader">
                <h3 className="sectionTitle">2) Review extracted fields</h3>
              </div>
              <div className="muted">Upload a document to see extracted fields.</div>
              <div style={{ height: 12 }} />
              <div className="sectionHeader">
                <h3 className="sectionTitle">3) Ask questions</h3>
              </div>
              <div className="muted">Query is disabled until a document is uploaded.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

