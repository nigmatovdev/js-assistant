# Jinoyat Kodeksi AI Assistant

An offline AI-powered legal assistant for the **Uzbekistan Criminal Code (Jinoyat Kodeksi)**. Ask questions in Uzbek and get accurate, context-aware answers — entirely on your local machine, no internet or API keys required.

---

## Features

- **Fully offline** — runs on your hardware via Ollama
- **Semantic search** — FAISS vector store for fast retrieval
- **Legal hierarchy aware** — understands Qism → Bo'lim → Bob → Modda structure
- **Uzbek text support** — handles Uzbek Latin script throughout the pipeline
- **Clean web UI** — React frontend for a natural chat experience

---

## Tech Stack

| Layer | Technology |
|---|---|
| Data pipeline | Python |
| Embeddings | `sentence-transformers` |
| Vector store | FAISS |
| LLM | Ollama (local) |
| API | FastAPI |
| Frontend | React + Node.js |

---

## Project Structure

```
jk-assistant/
├── data/               # Raw PDF, extraction & preprocessing scripts
│   ├── uz-crim-code.pdf
│   ├── extract_text.py
│   ├── clean_text.py
│   ├── prepare_chunks.py
│   ├── parse_json.py
│   ├── prepare_rag_json.py
│   └── validate_json.py
├── rag/                # Embedding generation and retrieval logic
├── backend/            # FastAPI server (query endpoint)
├── frontend/           # React chat interface
├── db/                 # FAISS index and vector store files
└── scripts/            # Helper/utility scripts
```

---

## Data Pipeline

```
PDF → raw text → cleaned text → parsed JSON → chunks → embeddings → FAISS index
```

1. **Extract** — `extract_text.py` pulls text from the PDF
2. **Clean** — `clean_text.py` normalises whitespace and encoding
3. **Parse** — `parse_json.py` builds a hierarchical JSON (Qism/Bo'lim/Bob/Modda)
4. **Chunk** — `prepare_chunks.py` splits articles into retrieval-sized chunks
5. **Embed** — sentence-transformers encode chunks into vectors
6. **Index** — vectors are stored in a FAISS index under `db/`

---

## RAG Flow

```
User query → embed query → FAISS search → top-k chunks → Ollama LLM → answer
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) installed and running

### 1. Clone and install Python dependencies

```bash
git clone <repo-url>
cd jk-assistant
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the data pipeline

```bash
python data/extract_text.py
python data/clean_text.py
python data/parse_json.py
python data/prepare_rag_json.py
python data/prepare_chunks.py
```

### 3. Build the vector index

```bash
python rag/build_index.py
```

### 4. Pull and run the LLM

```bash
ollama pull llama3
ollama serve
```

### 5. Start the backend

```bash
uvicorn backend.main:app --reload
```

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Example Queries

```
O'g'irlik uchun qanday jazolar belgilangan?
```
```
Odam o'ldirish jinoyati uchun maksimal jazo nima?
```
```
16 yoshgacha bo'lgan shaxslar jinoiy javobgarlikka tortila oladimi?
```

---

## Future Improvements

- [ ] Multi-turn conversation memory
- [ ] Uzbek Cyrillic script support
- [ ] Filter search by specific Modda or Bob
- [ ] Export answers as PDF
- [ ] Support for additional legal documents (civil, administrative codes)

---

## License

For educational and research use only. Legal content sourced from the official Uzbekistan Criminal Code.
