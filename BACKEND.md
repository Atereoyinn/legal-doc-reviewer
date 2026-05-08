# Legal Document Reviewer - Backend Documentation

## Overview

The backend is an **AI-powered legal document processing system** built with FastAPI that extracts structured data from PDF documents, analyzes risks, and provides RAG-based (Retrieval-Augmented Generation) question-answering capabilities.

### Key Features
- **PDF Processing**: Extracts raw text from PDFs using PyMuPDF
- **Document Classification**: Automatically classifies documents into 4 types (property_sale, tenancy, employment, nda)
- **Structured Data Extraction**: Uses OpenAI LLM to extract key fields based on document type
- **Risk Analysis**: Rule-based risk detection for missing fields and suspicious numeric ranges
- **RAG Question-Answering**: Uses FAISS vector search with OpenAI embeddings to answer questions grounded in document context
- **Document History**: Persists all uploaded documents and extracted data in SQLite database

---

## Technology Stack

### Core Framework
- **FastAPI 0.136.1**: Modern async Python web framework with automatic API documentation
- **Uvicorn 0.46.0**: ASGI server for running FastAPI

### AI/ML Components
- **OpenAI SDK 2.33.0**: For LLM calls (chat completion, embeddings)
- **FAISS 1.13.2**: Facebook's vector search library for semantic retrieval
- **text-embedding-3-small**: OpenAI embedding model (384 dimensions)

### Data Processing
- **PyMuPDF 1.27.2.3**: PDF text extraction
- **SQLAlchemy 2.0.49**: ORM for database interactions
- **SQLite**: Embedded database for persistence

### Utilities
- **Pydantic 2.13.3**: Data validation and serialization
- **python-dotenv 1.2.2**: Environment variable management
- **python-multipart 0.0.27**: Form data parsing for file uploads
- **requests 2.33.1**: HTTP client library

---

## Architecture

### Directory Structure

```
backend/
├── __init__.py
├── main.py                 # FastAPI app factory & lifespan management
├── requirements.txt        # Python dependencies
├── api/                    # API route handlers
│   ├── __init__.py
│   ├── documents.py       # GET /documents - list/retrieve documents
│   ├── query.py           # POST /query - RAG question-answering
│   └── upload.py          # POST /upload - PDF processing pipeline
├── db/                     # Database layer
│   ├── __init__.py
│   ├── database.py        # SQLAlchemy engine, session factory, migrations
│   └── models.py          # Document ORM model
└── services/               # Business logic & ML pipelines
    ├── __init__.py
    ├── faiss_rag.py              # Vector indexing & retrieval
    ├── llm_extractor.py          # Document type classification & field extraction
    ├── openai_embeddings.py      # OpenAI embedding wrapper
    ├── pdf_extractor.py          # PDF text extraction
    ├── risk_analyzer.py          # Rule-based risk detection
    └── text_chunking.py          # Text segmentation for embeddings
```

### Data Flow

#### 1. Document Upload (`POST /upload`)
```
PDF File 
  ↓
[PDFExtractor] → Raw Text
  ↓
[TextChunking] → Chunks
  ↓
[FAISSIndexing] ← [OpenAI Embeddings] (in-memory index)
  ↓
[LLMExtractor] → Document Type + Structured Fields
  ↓
[RiskAnalyzer] → Risk Analysis
  ↓
[Database] → Persist extracted data + raw text
  ↓
Response: filename, doc_type, text, structured_data, risk_analysis
```

#### 2. Query Processing (`POST /query`)
```
User Question
  ↓
[OpenAI Embeddings] → Query vector
  ↓
[FAISS Index] → Top-K similar chunks (in-memory)
  ↓
[LLM] → Generate answer using retrieved context
  ↓
Response: answer + source chunks with relevance scores
```

#### 3. Document History (`GET /documents`, `GET /documents/{id}`)
```
SQLite Database → Document metadata + extracted fields → Response
```

---

## API Endpoints

### Upload Document
**`POST /upload`**
- **Input**: Multipart form with PDF file
- **Output**:
  ```json
  {
    "filename": "string",
    "doc_type": "property_sale | tenancy | employment | nda | unknown",
    "text": "string (raw extracted text)",
    "structured_data": {
      // fields depend on doc_type
      "buyer_name": "string",
      "seller_name": "string",
      "property_address": "string",
      "purchase_price": "number",
      "completion_date": "string"
    },
    "risk_analysis": {
      "missing_fields": ["field1", "field2"],
      "flags": ["Missing required fields: buyer_name, seller_name.", "..."]
    }
  }
  ```
- **Error Codes**:
  - `400`: Invalid file type (non-PDF), empty file, file read error
  - `500`: Database save failure
  - `502`: PDF extraction, FAISS indexing, or LLM extraction failed

### Query Document
**`POST /query`**
- **Input**:
  ```json
  {
    "question": "string (min 1 character)"
  }
  ```
- **Output**:
  ```json
  {
    "answer": "string",
    "sources": [
      {
        "text": "chunk text",
        "score": 0.85
      }
    ]
  }
  ```
- **Error Codes**:
  - `400`: No index built (upload document first), empty question
  - `500`: Unexpected error retrieving context
  - `502`: OpenAI API failure or API key not set

### List Documents
**`GET /documents`**
- **Output**: List of documents with metadata
- **Example Response**:
  ```json
  [
    {
      "id": 1,
      "filename": "contract.pdf",
      "doc_type": "property_sale",
      "created_at": "2026-05-08T10:30:00+00:00"
    }
  ]
  ```

### Get Document Detail
**`GET /documents/{id}`**
- **Output**:
  ```json
  {
    "id": 1,
    "filename": "contract.pdf",
    "doc_type": "property_sale",
    "created_at": "2026-05-08T10:30:00+00:00",
    "raw_text": "string",
    "structured_data": {...}
  }
  ```

---

## Key Services

### FAISSRAGService (`faiss_rag.py`)
**Responsibility**: Vector indexing and semantic search

**Key Functions**:
- `build_index(text)`: Build/overwrite in-memory FAISS index
  - Chunks text (1200 chars, 200 overlap)
  - Converts chunks to OpenAI embeddings (text-embedding-3-small)
  - Creates L2-normalized FAISS index
  
- `retrieve_with_scores(query, top_k=3)`: Retrieve most relevant chunks
  - Embeds query
  - Returns top-K chunks with similarity scores

**Configuration**:
```python
chunk_size: 1200 characters
chunk_overlap: 200 characters
top_k: 5 (default retrieval count)
embedding_model: "text-embedding-3-small" (384 dim)
```

**Limitation**: Index is in-memory; rebuilds on each upload. Not persistent across restarts.

### LLMExtractorService (`llm_extractor.py`)
**Responsibility**: Document type classification and structured field extraction

**Document Types**:
1. **property_sale**
   - Fields: buyer_name, seller_name, property_address, purchase_price, completion_date
   
2. **tenancy**
   - Fields: tenant_name, landlord, rent, deposit, lease_start_date, lease_end_date, property_address
   
3. **employment**
   - Fields: employee_name, employer, salary, start_date, end_date, position
   
4. **nda**
   - Fields: party1, party2, effective_date, term_length, confidentiality_period

**Key Functions**:
- `classify_document_type(text)`: LLM call to classify document
- `extract_structured_fields(text)`: LLM call to extract fields for detected type
- `_coerce_output()`: Type-safe field coercion (currency parsing, null handling)

**Models Used**:
- Default: gpt-3.5-turbo (configurable via `OPENAI_CHAT_MODEL` env var)
- Temperature: 0 (deterministic)

### RiskAnalyzerService (`risk_analyzer.py`)
**Responsibility**: Rule-based risk detection

**Checks**:
- Missing required fields for document type
- Numeric values outside realistic ranges
- Missing critical dates

**Example Ranges**:
- property_sale: price $10k–$10M
- tenancy: rent $100–$100k, deposit $100–$1M
- employment: salary $15k–$10M

### PDFExtractorService (`pdf_extractor.py`)
**Responsibility**: PDF to text conversion using PyMuPDF

### OpenAIEmbeddingsService (`openai_embeddings.py`)
**Responsibility**: Wrapper for OpenAI embedding API

**Model**: text-embedding-3-small (384-dim vectors, $0.02 per 1M tokens)

### TextChunkingService (`text_chunking.py`)
**Responsibility**: Split documents into overlapping chunks for RAG

---

## Database Schema

### documents table
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key, auto-increment |
| filename | STRING | Original PDF filename |
| doc_type | STRING | Detected document type (default: 'unknown') |
| raw_text | TEXT | Full extracted PDF text |
| structured_data | JSON | Extracted fields (type-specific) |
| extracted_json | JSON | Legacy column (backwards compatibility) |
| created_at | DATETIME | UTC timestamp with timezone |

**Migrations**: Handled via `ALTER TABLE` in `database.py:init_db()`

---

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OPENAI_API_KEY` | ✅ Yes | - | OpenAI API authentication |
| `OPENAI_CHAT_MODEL` | ❌ No | `gpt-3.5-turbo` | LLM model for extraction |
| `DATABASE_URL` | ❌ No | `sqlite:///./app.db` | SQLAlchemy database URL |

**Example .env**:
```
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-3.5-turbo
DATABASE_URL=sqlite:///./app.db
```

---

## Running the Backend

### Development
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API available at `http://localhost:8000`
Auto-generated docs: `http://localhost:8000/docs`

### Production (Heroku example from Procfile)
```bash
web: uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

---

## Deployment Issues & Recommendations

### 🚨 Critical Issues

1. **CORS Configuration**
   - **Current**: `allow_origins=["*"]` (accepts any origin)
   - **Risk**: CSRF attacks, API abuse
   - **Fix**: Restrict to frontend domain in production
   ```python
   allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
   ```

2. **In-Memory FAISS Index**
   - **Issue**: Vector index lost on application restart
   - **Impact**: Users must re-upload documents after deployment
   - **Fix**: Persist FAISS index to disk or use vector database (Pinecone, Milvus)

3. **Missing Error Handling**
   - **Issue**: Some environment variables (OpenAI key) not validated at startup
   - **Fix**: Add validation in `create_app()` lifespan startup

4. **Database for Production**
   - **Current**: SQLite (single-threaded, file-based)
   - **Issue**: Cannot handle concurrent uploads efficiently
   - **Recommendation**: Use PostgreSQL for production
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/legal_reviewer
   ```

5. **No Input Validation on API**
   - **Risk**: Large files, malicious PDFs could crash app
   - **Fix**: Add max file size limits, timeout on processing

6. **API Rate Limiting**
   - **Issue**: No rate limiting on `/upload` or `/query`
   - **Fix**: Add `slowapi` middleware with per-IP rate limits

### ⚠️ Important Issues

7. **Logging & Monitoring**
   - **Issue**: No structured logging, no error tracking
   - **Recommendation**: Add Sentry, structured JSON logging

8. **Security - API Key Exposure**
   - **Current**: OpenAI key passed in requests
   - **Best Practice**: All API calls should be backend-only (✓ already done)
   - **Verify**: Never expose keys in frontend API responses

9. **No Request Timeouts**
   - **Risk**: Long-running LLM calls hang connections
   - **Fix**: Add request timeouts, async task queues (Celery)

10. **Document Storage**
    - **Current**: Raw text stored in database
    - **Risk**: Large documents bloat database
    - **Recommendation**: Store PDFs in cloud storage (S3, GCS), store only extracted data

11. **Type Safety**
    - **Issue**: Pydantic models not used for all endpoints
    - **Fix**: Add response_model to all routes for OpenAPI docs

12. **Tests**
    - **Current**: Minimal test coverage
    - **Fix**: Add integration tests for each document type, mock OpenAI calls

---

## Performance Considerations

### Current Bottlenecks
1. **OpenAI API Calls**: ~2-5s per request (network latency)
   - **Optimization**: Batch requests, cache embeddings
   
2. **FAISS Indexing**: ~100-300ms for documents <100KB
   - **Optimization**: Use GPU-accelerated FAISS for large deployments
   
3. **PDF Extraction**: ~50-200ms depending on PDF complexity

### Scaling Recommendations
- Add async task queue (Celery + Redis) for document processing
- Cache frequently asked questions
- Use CDN for API responses
- Database indexing on `created_at`, `doc_type`

---

## Testing

Run existing tests:
```bash
cd backend
pip install pytest python-multipart
pytest tests/ -v
```

**Current Coverage**:
- ✅ Upload endpoint (mocked LLM)
- ✅ Document list/detail endpoints
- ⚠️ Missing: RAG retrieval tests, risk analyzer tests

---

## Maintenance & Operations

### Database Backups
```bash
sqlite3 app.db ".dump" > backup_$(date +%Y%m%d).sql
```

### Monitor Database Size
```bash
ls -lh app.db
sqlite3 app.db "SELECT COUNT(*) FROM documents;"
```

### Common Issues & Troubleshooting

**Issue**: "OPENAI_API_KEY is not set"
- **Solution**: Add to .env or environment variables

**Issue**: FAISS index not found
- **Solution**: Upload a document first to build index

**Issue**: PDF extraction fails
- **Solution**: Try another PDF, may be corrupted or encrypted

**Issue**: Slow query responses
- **Solution**: Check OpenAI API status, increase timeout, use faster model

---

## Future Enhancements

1. **Multi-document RAG**: Query across multiple uploaded documents
2. **Custom Document Types**: Allow users to define custom extraction schemas
3. **Export Functionality**: Export extracted data as Excel/CSV
4. **Webhook Support**: Notify frontend when async processing completes
5. **Fine-tuned LLM**: Train custom model on legal documents for better extraction
6. **Audit Trail**: Track all document modifications and access
7. **Role-based Access**: Multi-user support with permissions
8. **Document Comparison**: Diff between two documents
