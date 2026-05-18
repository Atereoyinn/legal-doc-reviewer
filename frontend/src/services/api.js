import { API_CONFIG } from '../config.js';

// API key is embedded at build time from VITE_API_KEY env var.
// Note: this protects against casual access but not determined inspection of the JS bundle.
// For stronger security, move authentication to a server-side session layer.
const API_KEY = import.meta.env.VITE_API_KEY || '';

function getHeaders(extra = {}) {
  const headers = { ...extra };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  return headers;
}

class APIError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

async function handleResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.detail ? String(data.detail) : `HTTP ${response.status}`;
    throw new APIError(response.status, message);
  }
  return data;
}

export const documentsAPI = {
  async list() {
    const response = await fetch(API_CONFIG.ENDPOINTS.DOCUMENTS, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async get(docId) {
    const response = await fetch(`${API_CONFIG.ENDPOINTS.DOCUMENTS}/${docId}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export const uploadAPI = {
  async upload(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(API_CONFIG.ENDPOINTS.UPLOAD, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },
};

export const queryAPI = {
  async ask(question, docId = null) {
    const body = { question };
    if (docId != null) body.doc_id = docId;

    const response = await fetch(API_CONFIG.ENDPOINTS.QUERY, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },
};

export { APIError };
