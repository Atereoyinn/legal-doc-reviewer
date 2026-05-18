import { useMemo, useState } from "react";
import SidebarHistory from "./components/SidebarHistory.jsx";
import UploadCard from "./components/UploadCard.jsx";
import WorkflowStepper from "./components/WorkflowStepper.jsx";
import ExtractedFieldsPanel from "./components/ExtractedFieldsPanel.jsx";
import RiskSummary from "./components/RiskSummary.jsx";
import PdfPreviewPanel from "./components/PdfPreviewPanel.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import DeveloperView from "./components/DeveloperView.jsx";
import Toast from "./components/Toast.jsx";

function normalizeUploadResponse(data) {
  return {
    id: data?.id ?? null,
    text: data?.text ?? "",
    structured_data: data?.structured_data ?? data?.structured ?? null,
    risk_analysis: data?.risk_analysis ?? data?.risks ?? null,
    doc_type: data?.doc_type ?? null,
    filename: data?.filename ?? null,
  };
}

function normalizeDocumentDetail(data) {
  return {
    id: data?.id ?? null,
    filename: data?.filename ?? null,
    created_at: data?.created_at ?? null,
    text: data?.raw_text ?? "",
    structured_data: data?.structured_data ?? null,
    doc_type: data?.doc_type ?? null,
    risk_analysis: null,
  };
}

export default function App() {
  const [doc, setDoc] = useState(null);
  const [toast, setToast] = useState(null);

  const currentStep = useMemo(() => {
    if (!doc) return 1;
    if (!doc.structured_data) return 2;
    return 3;
  }, [doc, doc?.structured_data]);

  const missingFields = useMemo(() => {
    return doc?.risk_analysis?.missing_fields || [];
  }, [doc?.risk_analysis]);

  function handleUploadSuccess(data) {
    const normalized = normalizeUploadResponse(data);
    setDoc(normalized);
    setToast({ type: "success", message: "Document uploaded and analyzed successfully!" });
  }

  function handleUploadError(error) {
    setToast({ type: "error", message: error });
  }

  function handleSelectDocument(data) {
    setDoc(normalizeDocumentDetail(data));
  }

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">⚖️ Legal Document Reviewer</h1>
        <p className="muted subtitle">
          Upload a PDF, review extracted information & risks, then ask specific questions about the document.
        </p>
      </div>

      {doc && <WorkflowStepper currentStep={currentStep} />}

      <div className="workspace">
        <SidebarHistory activeId={doc?.id ?? null} onSelect={handleSelectDocument} />

        <div className="workspaceMain">
          {!doc && (
            <div className="card">
              <h2 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>Step 1: Upload Document</h2>
              <UploadCard onUploaded={handleUploadSuccess} />
            </div>
          )}

          {doc && (
            <>
              <div className="mainLayout">
                <div className="mainPanel">
                  <div className="card">
                    <h3 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>📤 Upload Another Document</h3>
                    <UploadCard onUploaded={handleUploadSuccess} />
                  </div>

                  <PdfPreviewPanel />

                  <div className="card">
                    <h3 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>📄 Document Text</h3>
                    <div className="panel" style={{ maxHeight: "400px", overflow: "auto" }}>
                      <div className="panelBody" style={{ whiteSpace: "pre-wrap" }}>
                        {doc.text || "No text available"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rightPanel">
                  <div className="card" style={{ padding: "0" }}>
                    <div
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight: "600",
                        fontSize: "14px",
                      }}
                    >
                      📋 Extracted Information
                    </div>
                    <div style={{ padding: "12px" }}>
                      {doc.structured_data ? (
                        <ExtractedFieldsPanel
                          structured_data={doc.structured_data}
                          missing_fields={missingFields}
                        />
                      ) : (
                        <div className="muted" style={{ fontSize: "13px" }}>
                          No structured data extracted
                        </div>
                      )}
                    </div>
                  </div>

                  <RiskSummary risk_analysis={doc.risk_analysis} missing_fields={missingFields} />

                  <ChatPanel docId={doc?.id ?? null} disabled={false} onAnswer={() => {}} />

                  <DeveloperView
                    structured_data={doc.structured_data}
                    raw_text={doc.text}
                    risk_analysis={doc.risk_analysis}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          duration={4000}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

