const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://legal-doc-reviewer.onrender.com'
    : 'http://localhost:8000'
  );

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    UPLOAD: `${API_BASE_URL}/upload`,
    QUERY: `${API_BASE_URL}/query`,
    DOCUMENTS: `${API_BASE_URL}/documents`,
    ANALYZE: `${API_BASE_URL}/analyze`,
  },
};

export default API_CONFIG;
