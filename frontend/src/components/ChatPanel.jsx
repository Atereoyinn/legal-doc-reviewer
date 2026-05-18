import { useEffect, useMemo, useRef, useState } from "react";
import { queryAPI, APIError } from "../services/api.js";

const SUGGESTED_PROMPTS = [
  "Summarize this agreement",
  "What are the key risks?",
  "What are the tenant obligations?",
  "What clauses are missing?",
];

export default function ChatPanel({ docId = null, disabled = false, onAnswer }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const canSubmit = useMemo(() => {
    return !disabled && !loading && question.trim().length > 0;
  }, [disabled, loading, question]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleAsk() {
    setError("");
    const q = question.trim();
    if (!q) return;

    const userMessage = { type: "user", text: q };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");

    setLoading(true);
    try {
      const data = await queryAPI.ask(q, docId);
      const answer = String(data?.answer || "");
      const sources = Array.isArray(data?.sources) ? data.sources : [];

      const assistantMessage = { type: "assistant", text: answer, sources };
      setMessages((prev) => [...prev, assistantMessage]);

      onAnswer?.({ question: q, answer, sources });
    } catch (e) {
      const errorMsg = e instanceof APIError ? e.message : "Query failed.";
      setError(errorMsg);
      const errorMessage = { type: "assistant", text: `Error: ${errorMsg}`, isError: true };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestedPrompt(prompt) {
    setQuestion(prompt);
  }

  return (
    <div className="chatPanel">
      <div className="chatPanelHeader">Ask Questions About This Document</div>

      <div className="chatMessages">
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#9ca3af",
              padding: "16px",
              fontSize: "13px",
              marginTop: "32px",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>💬</div>
            <div>Start by asking a question about the document</div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`chatMessage ${msg.type}`}>
            <div className={`chatBubble ${msg.type}`}>
              <div>{msg.text}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px solid rgba(255,255,255,0.2)",
                    fontSize: "12px",
                    opacity: 0.8,
                  }}
                >
                  Source: {msg.sources[0]?.text?.substring(0, 50)}...
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chatMessage assistant">
            <div className="chatBubble assistant">
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="loadingSpinner"></span> Thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 0 && (
        <div className="chatPrompts">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              className="chatPromptButton"
              onClick={() => handleSuggestedPrompt(prompt)}
              disabled={disabled || loading}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flag" style={{ margin: "8px", borderColor: "#fed7aa", background: "#fff7ed", color: "#7c2d12" }}>
          {error}
        </div>
      )}

      <div className="chatInput">
        <textarea
          className="chatInputField"
          placeholder={disabled ? "Upload a document to enable querying" : "Ask a question..."}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={disabled || loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !disabled && !loading && question.trim()) {
              e.preventDefault();
              handleAsk();
            }
          }}
          rows={1}
        />
        <button
          className="chatInputButton"
          onClick={handleAsk}
          disabled={!canSubmit}
          aria-label="Send message"
        >
          {loading ? "Asking..." : "Send"}
        </button>
      </div>
    </div>
  );
}
