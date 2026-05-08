# Legal Document Reviewer - Frontend Documentation

## Overview

The frontend is a **modern React + Vite application** that provides a user-friendly interface for uploading legal PDFs, viewing extracted structured data and risk analysis, and asking questions about document content using RAG-powered AI.

### Key Features
- **Document Upload**: Drag-and-drop or file picker for PDF uploads with progress indication
- **Live Document Viewing**: Three display modes (split, raw text, structured data)
- **Structured Data Display**: Type-specific field extraction with price/date formatting
- **Risk Analysis**: Visual flags for missing fields and suspicious values
- **Q&A Interface**: Ask questions grounded in document context with source highlighting
- **Document History**: Browse previously uploaded documents
- **Responsive Design**: Works on desktop, tablet, and mobile

---

## Technology Stack

### Build & Runtime
- **React 18.3.1**: Modern JavaScript UI library with hooks
- **Vite 5.4.19**: Lightning-fast build tool and dev server
- **@vitejs/plugin-react 4.3.4**: Fast Refresh for hot module replacement

### Development
- **Node.js 18+**: JavaScript runtime
- **npm/yarn**: Package management

### Bundling & Deployment
- **Vite build**: Produces optimized static assets (HTML, JS, CSS)
- **Procfile**: Heroku deployment support

---

## Architecture

### Directory Structure

```
frontend/
├── package.json              # Project metadata & scripts
├── vite.config.js           # Vite configuration
├── Procfile                 # Heroku deployment config
├── index.html               # HTML entry point
├── main.py                  # Python HTTP server (optional, for serving static)
├── requirements-dev.txt     # Python dev dependencies (unused in Vite)
├── src/
│   ├── main.jsx             # React app bootstrap
│   ├── App.jsx              # Main app component (router & state)
│   ├── styles.css           # Global styles
│   └── components/
│       ├── Upload.jsx       # PDF upload interface
│       ├── DocumentView.jsx # Document display with 3 view modes
│       ├── QueryBox.jsx     # Q&A interface
│       └── DocumentHistory.jsx # Document list & history
└── tests/
    ├── conftest.py          # Pytest configuration (legacy)
    └── test_api.py          # API integration tests
```

### Component Hierarchy

```
App (root state)
├── <header>
│   └── Title & Subtitle
├── Upload
│   └── File input + Upload button
├── DocumentView
│   ├── Mode tabs (Split | Raw | Structured)
│   ├── Structured panel
│   │   ├── Document type badge
│   │   ├── Fields table
│   │   └── Risk flags
│   └── Text panel
│       ├── Raw text
│       └── Source highlighting
├── QueryBox
│   ├── Question input
│   ├── Ask button
│   ├── Answer display
│   └── Source references
└── DocumentHistory
    └── Previous documents list
```

### State Management

**App.jsx** manages global state:
```javascript
const [doc, setDoc] = useState(null);        // Current document
const [answers, setAnswers] = useState([]); // Q&A history
const [sources, setSources] = useState([]); // Search result sources
```

**Flow**:
1. User uploads PDF → calls `Upload.handleUpload()` → API response → `setDoc()`
2. User asks question → calls `QueryBox.handleAsk()` → API response → `setAnswers()` + `setSources()`
3. Sources highlight relevant text in `DocumentView`

---

## Components

### Upload.jsx
**Responsibility**: PDF file selection and upload to backend

**Props**:
- `onUploaded`: Callback when upload completes

**Behavior**:
- File input accepts `.pdf` only
- Shows upload progress ("Uploading...")
- Displays error messages if upload fails
- Disabled during upload

**API Integration**:
```javascript
POST ${BACKEND_BASE_URL}/upload
Body: FormData with file
Response: { filename, doc_type, text, structured_data, risk_analysis }
```

**Error Handling**:
- Invalid file type
- Empty file
- Network errors
- Backend processing errors

### DocumentView.jsx
**Responsibility**: Display extracted document data in multiple formats

**Props**:
- `raw_text`: Full PDF text
- `doc_type`: Detected document type
- `structured_data`: Extracted fields object
- `risk_analysis`: Risk flags and missing fields
- `sources`: Search result chunks with highlighting

**Features**:

1. **Mode Toggle**: 3 view modes
   - **Split**: Structured fields on left, raw text on right
   - **Raw**: Full document text with source highlighting
   - **Structured**: Fields table only

2. **Structured Data Panel**:
   - Document type badge
   - Dynamic field formatting (prices, dates)
   - Currency formatting: `123456` → `123,456`
   - Field name normalization: `buyer_name` → "Buyer Name"
   - Missing field highlighting (risk flags)

3. **Risk Display**:
   - Visual flags for missing required fields
   - Severity coloring
   - List of detected issues

4. **Text Highlighting**:
   - Highlights chunks referenced in Q&A answers
   - Simple substring matching
   - Merges overlapping highlights

**Helpers**:
```javascript
formatPrice(value)          // 123456 → "123,456"
formatFieldName(key)        // buyer_name → "Buyer Name"
formatFieldValue(key, val)  // Format by field type
buildHighlights(text, sources) // Compute highlight ranges
```

### QueryBox.jsx
**Responsibility**: Q&A interface with backend RAG

**Props**:
- `disabled`: Whether to disable query (no document uploaded)
- `onAnswer`: Callback when answer received

**Behavior**:
- Text input for questions
- "Ask" button (disabled if no document or empty question)
- Loading state ("Asking...")
- Error display
- Answer and source display

**API Integration**:
```javascript
POST ${BACKEND_BASE_URL}/query
Body: { question: "string" }
Response: { answer: "string", sources: [{ text, score }] }
```

**Error Handling**:
- Network errors
- Backend errors (e.g., no index built, API key missing)
- Empty responses

### DocumentHistory.jsx
**Responsibility**: List previously uploaded documents

**Features** (future):
- Fetch list of documents from backend
- Click to load document details
- Show metadata (filename, date, doc_type)

**API Endpoint** (not fully integrated):
```javascript
GET ${BACKEND_BASE_URL}/documents
GET ${BACKEND_BASE_URL}/documents/{id}
```

---

## API Communication

### Base URL Configuration
```javascript
const BACKEND_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
```

**Environment Variables**:
- `VITE_API_BASE_URL`: Configurable backend URL (defaults to localhost:8000)

### Data Normalization

The frontend normalizes backend responses to handle API field name variations:

```javascript
// normalizeUploadResponse
input:  { text, structured, risks, doc_type, filename }
output: { text, structured_data, risk_analysis, doc_type, filename }

// normalizeDocumentDetail
input:  { id, filename, created_at, raw_text, structured_data, doc_type }
output: { id, filename, created_at, text, structured_data, doc_type, risk_analysis }
```

This ensures backward compatibility if backend field names change.

### Error Handling Pattern
```javascript
try {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || "Request failed");
  }
  // Handle data
} catch (e) {
  setError(e.message);
}
```

---

## Styling

**Global Styles** (`styles.css`):
- CSS variables for colors, spacing
- Responsive flexbox layout
- Mobile-first design

**Key Classes**:
- `.container`: Max-width wrapper
- `.header`: Title section
- `.row`: Flex row layout
- `.muted`: Dim/secondary text
- `.flag`: Alert/warning box
- `input`, `button`: Form controls
- `code`: Inline code display

**Responsive Design**:
- Default: Desktop (flexbox row layout)
- Tablet: Adjusted spacing
- Mobile: Stack components vertically

---

## Build & Deployment

### Development
```bash
cd frontend
npm install
npm run dev
```
- Dev server: `http://localhost:5173`
- Hot module replacement enabled
- Automatic page reload on changes

### Production Build
```bash
npm run build
```
- Creates `dist/` folder with optimized assets
- Tree-shaking, minification, code splitting
- Asset hashing for cache busting
- Typical output size: ~50-100KB (gzipped)

### Preview Built Assets (locally)
```bash
npm run preview
```

### Deployment

#### Heroku (via Procfile)
The `Procfile` (currently for backend) can be extended:
```
web: npm run build && npm start
```

Heroku will:
1. Install dependencies (`npm install`)
2. Run build script
3. Serve static files

#### Static Hosting (Netlify, Vercel, S3 + CloudFront)
1. `npm run build`
2. Deploy `dist/` folder to static host
3. Configure environment: `VITE_API_BASE_URL=https://api.example.com`

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

---

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `VITE_API_BASE_URL` | ❌ No | `http://localhost:8000` | Backend API base URL |

**Example .env.local** (development):
```
VITE_API_BASE_URL=http://localhost:8000
```

**Example for production** (via build command):
```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```

---

## Performance Considerations

### Current Optimization
- ✅ Vite fast refresh (instant HMR)
- ✅ Code splitting (Vite automatic)
- ✅ Asset minification
- ✅ React 18 automatic batching

### Recommendations for Scaling

1. **Code Splitting**
   - Use React.lazy() for route-based splitting
   - Split components into separate chunks

2. **Image Optimization**
   - Add WebP support
   - Lazy load images

3. **Caching**
   - Service Worker for offline support
   - HTTP caching headers (Cache-Control)

4. **Bundle Analysis**
   ```bash
   npm install --save-dev vite-plugin-visualizer
   ```

5. **Lighthouse Optimization**
   - Add meta tags (viewport, description)
   - Improve Core Web Vitals
   - Add accessibility (ARIA labels)

---

## Known Issues & Limitations

### 🚨 Critical

1. **CORS Dependency**
   - Frontend requires backend CORS to allow all origins
   - Currently backend has `allow_origins=["*"]`
   - **Fix**: Frontend must work with restricted CORS headers

2. **No Persistent State**
   - Page refresh clears all state (document, answers, history)
   - **Fix**: Add localStorage or session storage

3. **No Authentication**
   - No login/user isolation
   - All users share document history
   - **Fix**: Add JWT auth, user-scoped API endpoints

4. **No Offline Support**
   - Requires constant backend connection
   - **Fix**: Add Service Worker caching

### ⚠️ Important

5. **Source Highlighting Logic**
   - Simple substring matching (not fuzzy)
   - May fail on text variations or tokenization
   - **Fix**: Exact chunk matching or fuzzy search

6. **No Pagination**
   - Document history loads all at once
   - **Fix**: Add pagination/infinite scroll

7. **File Upload Limits**
   - No client-side validation of file size
   - Large PDFs may timeout
   - **Fix**: Add pre-upload size check, progress bar

8. **Accessibility Issues**
   - No ARIA labels on inputs
   - Color contrast may be insufficient
   - **Fix**: Add keyboard navigation, screen reader support

9. **Mobile Layout**
   - Split view doesn't work well on mobile
   - **Fix**: Stack components on small screens

10. **Error Messages**
    - Generic error display
    - **Fix**: Add error boundary, detailed error logging

---

## Testing

### Run Tests
```bash
cd frontend/tests
pytest test_api.py -v
```

**Current Coverage**:
- ✅ API mocking with unittest.mock
- ⚠️ Missing: Component testing (React Testing Library), E2E tests (Cypress)

### Recommended Testing Stack
- **Unit**: Vitest + React Testing Library
- **E2E**: Playwright or Cypress
- **Visual**: Percy or Chromatic

### Example Test
```javascript
import { render, screen } from '@testing-library/react';
import Upload from './Upload';

test('displays upload button', () => {
  render(<Upload onUploaded={() => {}} />);
  expect(screen.getByText('Upload')).toBeInTheDocument();
});
```

---

## Deployment Issues & Recommendations

### 🚨 Critical Issues

1. **Cross-Origin Resource Sharing (CORS)**
   - **Current**: Works with backend `allow_origins=["*"]`
   - **Production**: Restrict to specific frontend domain
   - **Fix**: Set `VITE_API_BASE_URL` environment variable

2. **No API Error Recovery**
   - **Issue**: Network timeout hangs indefinitely
   - **Fix**: Add request timeout, retry logic

3. **Unhandled Promise Rejections**
   - **Issue**: Some fetch errors not caught
   - **Fix**: Add global error boundary

### ⚠️ Important Issues

4. **Missing Loading States**
   - **Issue**: Large PDFs take time, user doesn't know if processing
   - **Fix**: Add progress bar, ETA display

5. **No Form Validation**
   - **Issue**: Frontend accepts any input, relies on backend validation
   - **Fix**: Add client-side validation (min/max question length)

6. **Hardcoded Placeholders**
   - **Issue**: Placeholder text assumes property_sale document type
   - **Fix**: Dynamic placeholders based on doc_type

7. **No Dark Mode**
   - Recommendation: Add theme toggle for accessibility

8. **Analytics Missing**
   - No usage tracking, error monitoring
   - **Fix**: Add Google Analytics, Sentry

---

## Build Configuration

### vite.config.js
```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
```

**Customization Options**:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000' // Proxy API calls
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps in production
    minify: 'terser', // JS minification
  },
  base: '/', // CDN base path if needed
});
```

---

## Future Enhancements

1. **Multi-Document Upload**: Upload and compare multiple documents
2. **Document Templates**: Save extraction templates for repeated document types
3. **Export Functionality**: Export structured data as CSV/Excel/JSON
4. **Audit Trail**: Track all viewed/queried documents
5. **Collaboration**: Real-time document annotation and sharing
6. **Mobile App**: React Native version for iOS/Android
7. **Advanced Search**: Filter documents by type, date, keywords
8. **Custom Themes**: User-selectable color schemes
9. **Keyboard Shortcuts**: Power user features (Cmd+K for search, etc.)
10. **Document Comparison**: Side-by-side diff of two documents

---

## Production Checklist

- [ ] Set `VITE_API_BASE_URL` environment variable to production backend
- [ ] Add HTTPS enforcement
- [ ] Configure CSP (Content Security Policy) headers
- [ ] Enable gzip compression
- [ ] Add service worker for offline support
- [ ] Set up error tracking (Sentry)
- [ ] Add analytics (Google Analytics, Mixpanel)
- [ ] Test on mobile devices
- [ ] Audit accessibility (WCAG 2.1)
- [ ] Set up monitoring and alerting
- [ ] Create documentation for end users
- [ ] Prepare database backup strategy
- [ ] Set up CI/CD pipeline (GitHub Actions, etc.)
- [ ] Load test with concurrent users
- [ ] Security audit (OWASP Top 10)
