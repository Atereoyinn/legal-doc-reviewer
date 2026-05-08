export default function PdfPreviewPanel() {
  return (
    <div className="pdfPreviewPanel">
      <div className="pdfPreviewHeader">PDF Preview</div>
      <div className="pdfPreviewPlaceholder">
        <div>
          <div className="pdfPreviewPlaceholderIcon">📑</div>
          <div>PDF preview will appear here after upload</div>
          <div className="muted" style={{ fontSize: "12px", marginTop: "6px" }}>
            Currently showing document text in the review section below
          </div>
        </div>
      </div>
    </div>
  );
}
