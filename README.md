# JK Assistant — O'zbekiston Jinoyat Kodeksi AI Yordamchisi

A fully offline, RAG-powered AI legal assistant for the **Uzbekistan Criminal Code (Jinoyat Kodeksi)**. Users ask questions in Uzbek and receive context-aware, article-cited answers — entirely on local hardware, no internet or external API keys required.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Flow](#system-flow)
3. [Data Pipeline](#data-pipeline)
4. [Backend](#backend)
   - [RAG Module (`rag.py`)](#rag-module-ragpy)
   - [FastAPI Application](#fastapi-application)
   - [Database Models](#database-models)
   - [API Endpoints](#api-endpoints)
   - [Service Layer](#service-layer)
   - [Configuration](#configuration)
5. [Frontend](#frontend)
   - [State Management](#state-management)
   - [API Layer](#api-layer)
   - [Components](#components)
   - [Hooks](#hooks)
   - [Theming](#theming)
6. [Streaming Architecture](#streaming-architecture)
7. [Prompts](#prompts)
8. [Tech Stack](#tech-stack)
9. [Project Structure](#project-structure)
10. [Setup & Installation](#setup--installation)
11. [Docker Deployment](#docker-deployment)
12. [Environment Variables](#environment-variables)
13. [Limitations & Future Work](#limitations--future-work)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React)                          │
│  Sidebar (sessions + model) │ ChatArea (messages) │ InputPanel  │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTP/SSE  (proxied via Vite → localhost:8000)
┌─────────────────▼───────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                      │
│   /api/sessions  ←→  chat_service.py  ←→  SQLite (SQLAlchemy)  │
│   /api/chat/{id}/ask  →  rag.py  →  ChromaDB + Ollama           │
└─────────────────────────────────────────────────────────────────┘
         │                          │
┌────────▼───────┐       ┌──────────▼──────────┐
│   ChromaDB     │       │   Ollama (local LLM) │
│  db/chroma/    │       │  qwen3:8b (default)  │
│  jk_chunks     │       │  :11434              │
│  BAAI/bge-m3   │       └─────────────────────-┘
└────────────────┘
```

**Key principle**: The browser never talks to Ollama or ChromaDB directly. All AI logic lives in the Python backend behind a clean REST/SSE API.

---

## System Flow

### Full Request Lifecycle

```
1. User types question in InputPanel (React)
   └─ useSendMessage hook fires

2. chatStore.startStreaming(userMessage)
   └─ Appends user message to local state immediately (optimistic)

3. streamAsk(sessionId, question, topK, model) [front/src/api/chat.ts]
   └─ POST /api/chat/{sessionId}/ask  (JSON body: question, top_k, model)

4. FastAPI route handler [back/app/api/routes/chat.py]
   ├─ Loads session from SQLite via chat_service
   ├─ Fetches last 10 messages as conversation history
   └─ Spawns daemon thread running rag.ask_stream()

5. rag.ask_stream() [back/rag.py]
   ├─ Normalize Uzbek text (apostrophe variants → ʻ)
   ├─ Embed question with BAAI/bge-m3
   ├─ Query ChromaDB for top-k chunks, filter score ≥ 0.40
   ├─ Build system prompt + context block in Uzbek
   └─ Stream tokens from Ollama via ollama.chat()

6. Thread → asyncio.Queue → FastAPI SSE generator
   └─ Yields JSON events: token | sources | done | error

7. Browser SSE reader [front/src/api/chat.ts]
   ├─ onToken  → chatStore.appendToken()  → live re-render
   ├─ onSources → chatStore.setSources()
   └─ onDone   → chatStore.finalizeStreaming()
                  └─ Converts streaming buffer to saved Message

8. chat_service.save_message() persists assistant reply + sources to SQLite
   └─ Auto-titles session from first user message (first 80 chars)
```

### Session Switching

```
User clicks session in Sidebar
  └─ sessionStore.setActive(id)
     └─ App.tsx useEffect fires
        └─ GET /api/sessions/{id}  (full history)
           └─ chatStore.loadMessages(messages)
              └─ Skips overwrite if same session is currently streaming
```

---

## Data Pipeline

The Criminal Code PDF is processed offline once to build the vector database.

```
uz-crim-code.pdf  (2.4 MB, source document)
      │
      ▼  extract_text.py
raw.txt           (465 KB, raw extracted text)
      │
      ▼  clean_text.py
clean.txt         (465 KB, normalized whitespace + encoding)
      │
      ▼  parse_json.py
structured.json   (1.1 MB, hierarchical)
parsed.json       (530 KB)
      │
      ▼  prepare_chunks.py
chunks.json       (803 KB, retrieval-ready chunks with metadata)
      │
      ▼  db/embed_and_ingest.py
db/chroma/        (ChromaDB persistent vector store)
  collection: "jk_chunks"
  embedding:  BAAI/bge-m3
```

### Legal Hierarchy

The parser preserves the Criminal Code's four-level structure:

| Uzbek | Meaning | Example |
|-------|---------|---------|
| Qism | Part/Section | Umumiy qism |
| Bo'lim | Division | I Bo'lim |
| Bob | Chapter | 1-bob |
| Modda | Article | 15-modda |

Each chunk's metadata contains `modda` (article number) and `title` (article heading), which are surfaced in the UI as source citations.

---

## Backend

### RAG Module (`rag.py`)

**Location**: `back/rag.py`  
This is the most critical file — it orchestrates retrieval and generation.

#### Configuration

```python
CHROMA_DIR      = "db/chroma"
COLLECTION_NAME = "jk_chunks"
EMBED_MODEL     = "BAAI/bge-m3"   # multilingual, 384-dim
LLM_MODEL       = "qwen3:8b"      # overridable via .env or request
MIN_SCORE       = 0.40            # relevance threshold (0–1)
```

#### Lazy Loading

```python
_model      = None   # SentenceTransformer instance
_collection = None   # ChromaDB collection handle
```

`_load()` initializes both on first use, auto-detecting CPU/GPU via PyTorch. This avoids blocking app startup.

#### `_normalize(text: str) -> str`

Normalizes Uzbek apostrophe variants (`'`, `'`, `ʼ`) to the canonical U+02BB (`ʻ`) before embedding. Without this, semantically identical queries with different apostrophe encodings produce different vectors.

#### `retrieve(question, top_k=5) -> list[dict]`

```python
1. _normalize(question)
2. model.encode([question], normalize_embeddings=True)
3. collection.query(query_embeddings=..., n_results=top_k)
4. Filter: keep only results where distance ≤ (1 - MIN_SCORE)
5. Return: [{"id", "text", "metadata", "score"}, ...]
```

ChromaDB returns cosine distances; `score = 1 - distance`.

#### `ask_stream(question, top_k=5, history=None, model=None)`

Generator function that yields tuples:
- `("token", "some text")` — each LLM output token chunk
- `("sources", [...])` — retrieved chunks, emitted after generation completes

**Prompt construction**:

```
[System prompt — Uzbek, see Prompts section]

[Conversation history — last N turns as alternating user/assistant]

[Current user message]:
question text

Jinoyat Kodeksidan tegishli maqolalar:
---
Modda: 15-modda — Jinoyatning qasdi va ehtiyotsizligi
Matn: ...chunk text...
O'xshashlik: 0.87

Modda: 97-modda — ...
---
```

The Ollama call uses `stream=True`:
```python
ollama.chat(model=model, messages=[system, *history, user], stream=True)
```

#### `ask(question, top_k=5, history=None) -> dict`

Non-streaming wrapper; drains the generator and returns:
```python
{"answer": "full text", "sources": [...]}
```

Used by the sync endpoint and the CLI.

---

### FastAPI Application

**Entry point**: `back/app/main.py`

#### Startup

```python
@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind=engine)   # create tables if not exist
    loop.run_in_executor(None, rag._load)   # warm up embedding model
    yield
```

#### CORS

Allowed origins: `http://localhost:5173`, `http://localhost:3000`  
Methods: all. Headers: all.

#### Routes

- `/api/sessions` — session CRUD (sessions router)
- `/api/chat` — question answering (chat router)
- `/health` — health check (`{"status": "ok"}`)

---

### Database Models

**Location**: `back/app/db/models.py`  
ORM: SQLAlchemy 2.x, database: SQLite (default) or PostgreSQL.

#### `ChatSession`

| Column | Type | Notes |
|--------|------|-------|
| `id` | String (UUID) | Primary key |
| `title` | String, nullable | Auto-set from first user message |
| `created_at` | DateTime | UTC |
| `updated_at` | DateTime | Touched on every new message |
| `messages` | Relationship | Cascade delete |

#### `Message`

| Column | Type | Notes |
|--------|------|-------|
| `id` | String (UUID) | Primary key |
| `session_id` | FK → ChatSession | Cascade delete |
| `role` | String | `"user"` or `"assistant"` |
| `content` | Text | Full message body |
| `sources` | Text, nullable | JSON-serialized `list[SourceChunk]` |
| `created_at` | DateTime | UTC |

---

### API Endpoints

#### Sessions (`/api/sessions`)

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | `/api/sessions` | — | `SessionOut[]` | All sessions, newest first |
| POST | `/api/sessions` | `{"title": str?}` | `SessionOut` (201) | Create session |
| GET | `/api/sessions/{id}` | — | `SessionWithMessages` | Session + all messages |
| PUT | `/api/sessions/{id}` | `{"title": str}` | `SessionOut` | Update title |
| DELETE | `/api/sessions/{id}` | — | 204 | Delete session + messages |

#### Chat (`/api/chat`)

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | `/api/chat/{id}/ask` | `AskRequest` | SSE stream | Streaming answer |
| POST | `/api/chat/{id}/ask/sync` | `AskRequest` | `{"answer", "sources"}` | Sync answer |

**`AskRequest` body**:
```json
{
  "question": "O'g'irlik uchun jazo nima?",
  "top_k": 5,
  "model": "qwen3:8b"
}
```

**SSE event format** (one JSON object per `data:` line):
```
data: {"type": "token", "content": "Jinoyat"}
data: {"type": "token", "content": " Kodeksining"}
data: {"type": "sources", "sources": [{...}]}
data: {"type": "done"}
data: {"type": "error", "message": "..."}
```

**Post-stream persistence**: After the SSE generator exhausts, the backend saves the full assembled answer and sources to SQLite. User messages are saved before streaming begins.

---

### Service Layer

**Location**: `back/app/services/chat_service.py`

| Function | Description |
|----------|-------------|
| `list_sessions(db)` | ORDER BY `updated_at` DESC |
| `get_session(db, id)` | Returns `ChatSession` or `None` |
| `create_session(db, data)` | Generates UUID, inserts row |
| `update_session(db, session, data)` | Sets title + `updated_at` |
| `delete_session(db, session)` | Deletes; cascade removes messages |
| `get_history(db, session_id, limit=10)` | Last N messages as `[{"role", "content"}]` |
| `save_message(db, session_id, role, content, sources)` | Inserts message; auto-titles session on first user msg (80 chars) |

---

### Configuration

**Location**: `back/app/config.py` (Pydantic Settings)

| Setting | Default | Environment variable |
|---------|---------|---------------------|
| `database_url` | `sqlite:///db/jk_assistant.db` | `DATABASE_URL` |
| `chroma_dir` | `db/chroma` | `CHROMA_DIR` |
| `embed_model` | `BAAI/bge-m3` | `EMBED_MODEL` |
| `llm_model` | `qwen3:8b` | `LLM_MODEL` |
| `min_score` | `0.40` | `MIN_SCORE` |
| `ollama_host` | `http://localhost:11434` | `OLLAMA_HOST` |
| `cors_origins` | `["http://localhost:5173", "http://localhost:3000"]` | `CORS_ORIGINS` |

---

## Frontend

**Stack**: React 18, TypeScript, Vite, MUI v6, Zustand, Framer Motion

Vite proxies all `/api/*` requests to `http://localhost:8000` in development, so the frontend never needs to know the backend URL.

---

### State Management

Three Zustand stores, each with a single responsibility.

#### `chatStore.ts`

Owns the active conversation state.

| State | Type | Purpose |
|-------|------|---------|
| `messages` | `Message[]` | Full rendered history |
| `streamingContent` | `string` | Live token accumulation buffer |
| `streamingSources` | `SourceChunk[]` | Sources arriving after stream |
| `isStreaming` | `boolean` | Controls UI loading states |
| `currentSessionId` | `string \| null` | Guards against session-switch race |

**Key actions**:

- `startStreaming(userMsg)` — appends user message, sets `isStreaming = true`
- `appendToken(token)` — concatenates to `streamingContent`, triggers re-render
- `finalizeStreaming()` — only runs if `currentSessionId` still matches; converts buffer into saved `Message` object, resets streaming state
- `loadMessages(messages, sessionId?)` — skips overwrite if a stream is active for the same session (prevents mid-stream flicker on session reload)

#### `sessionStore.ts`

Owns the session list and which session is active.

| Action | Behavior |
|--------|----------|
| `fetchSessions()` | `GET /api/sessions` |
| `createSession()` | `POST /api/sessions`, prepends to list |
| `deleteSession(id)` | Optimistic removal + rollback on API error |
| `setActive(id)` | Sets `activeId`, triggers `App.tsx` to load messages |
| `updateLocalTitle(id, title)` | Patch title in local store (after auto-title from backend) |

#### `modelStore.ts`

Persists selected LLM to `localStorage['jk-llm-model']`.

Available models:

| ID | Label | Description |
|----|-------|-------------|
| `qwen3:8b` | Qwen3 8B | Asosiy model |
| `tinyllama` | TinyLlama | Tez va yengil |
| `mistral` | Mistral 7B | Kuchli umumiy |

---

### API Layer

#### `front/src/api/client.ts`

Generic fetch wrapper. Sets `Content-Type: application/json`, throws on non-2xx, returns parsed JSON (or `undefined` for 204).

#### `front/src/api/sessions.ts`

Wraps all session CRUD calls via `apiFetch`.

#### `front/src/api/chat.ts` — `streamAsk()`

The SSE streaming client. Core implementation:

```typescript
async function streamAsk(sessionId, question, topK, model, callbacks, signal) {
  const res = await fetch(`/api/chat/${sessionId}/ask`, {
    method: "POST",
    body: JSON.stringify({ question, top_k: topK, model }),
    signal,   // AbortController signal for stop button
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    for (const line of decoder.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6));

      if (event.type === "token")   callbacks.onToken(event.content);
      if (event.type === "sources") callbacks.onSources(event.sources);
      if (event.type === "done")    callbacks.onDone();
      if (event.type === "error")   callbacks.onError(event.message);
    }
  }
}
```

---

### Components

#### Layout

**`TopBar.tsx`**
- Flat app bar (elevation 0)
- Hamburger menu (mobile sidebar toggle)
- Centered "JK AI" gradient logo with purple glow shadow
- Dark/light theme toggle icon button

**`Sidebar.tsx`** (290px drawer)
- Header: logo + "Suhbat tarixi" (Chat history)
- "Yangi suhbat" button → creates new session
- "Suhbat qidirish" button → opens search modal
- Session list (sorted newest-first):
  - Active session highlighted with primary color
  - Delete button on hover
  - Title falls back to session ID if untitled
- Model selector dropdown (Qwen3 / TinyLlama / Mistral)
- Footer: session count

#### Chat

**`ChatArea.tsx`**
- Renders `WelcomeScreen` if no active session
- Otherwise: scrollable message list + `InputPanel`
- Framer Motion `AnimatePresence` for fade-in-from-below on new messages
- `useEffect` auto-scrolls to bottom on `messages` or `streamingContent` change

**`InputPanel.tsx`**
- Multiline textarea, 1–6 rows, disabled while streaming
- Send button: gradient blue→purple, active glow
- Stop button (red, round): replaces send during streaming
- Submit on Enter (Shift+Enter = newline)
- File attachment button (UI only, feature not yet implemented)

**`MessageBubble.tsx`**

| Property | User | Assistant |
|----------|------|-----------|
| Alignment | Right | Left |
| Background | Blue gradient | White/dark paper |
| Text color | White | Default |
| Markdown | Plain text | Rendered via `react-markdown` |

Sources section (collapsible):
- Chip showing count: "3 ta manba"
- Expands to list: `97-modda — Qotillik (0.85)`

**`ThinkingBubble.tsx`**
- Three bouncing dots animation
- Cycles through status messages every 3s:
  1. "Kodeksni tekshirayapman…"
  2. "Manbalar qidirilmoqda…"
  3. "Javob tayyorlanmoqda…"
- Shows elapsed time counter

**`WelcomeScreen.tsx`**
- Hero text: "O'zbekiston Jinoyat Kodeksi bo'yicha"
- 3 randomly selected suggestion cards from 9 hardcoded examples covering: property crimes, corruption, bodily harm, traffic, fraud, money laundering, crimes against person, state security, law enforcement
- Clicking a card: creates a new session and immediately sends the suggestion as the first message

---

### Hooks

#### `useSendMessage()` — `front/src/hooks/useSendMessage.ts`

```typescript
const { send, stop } = useSendMessage();

// send(sessionId, question, topK) — starts streaming
// stop()                          — aborts current stream
```

**`send` workflow**:
1. `chatStore.startStreaming(userMsg)` — optimistic user message
2. `new AbortController()` stored in `abortRef`
3. `streamAsk(sessionId, question, topK, model, { onToken, onSources, onDone, onError }, signal)`
4. `onToken` → `chatStore.appendToken(token)` → live UI update
5. `onSources` → `chatStore.setSources(sources)`
6. `onDone` → `chatStore.finalizeStreaming()` + `sessionStore.updateLocalTitle()` if needed
7. `onError` → `chatStore.setStreamingError(message)`
8. `stop` → `abortRef.current?.abort()` → `onDone` fires via finally

---

### Theming

**Location**: `front/src/theme/theme.ts`

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#2563EB` | `#60A5FA` |
| Secondary | `#7C3AED` | `#A78BFA` |
| Background | `#F1F5F9` | `#0F1117` |
| Paper | `#FFFFFF` | `#1E2130` |
| Text primary | `#0F172A` | `#F1F5F9` |

Font: Inter (system fallback: Roboto). Border radius: 14px. Preference stored in `localStorage['jk-theme']`.

Global keyboard shortcuts (registered in `App.tsx`):
- `Ctrl+Shift+O` — New chat
- `Ctrl+Shift+F` — Search sessions

---

## Streaming Architecture

The SSE streaming pipeline bridges a blocking Python generator with an async FastAPI response:

```
rag.ask_stream()          ← blocking generator (runs in daemon thread)
      │ yields ("token", str)
      ▼
asyncio.Queue             ← thread-safe bridge
      │ async get()
      ▼
FastAPI EventSourceResponse
      │ SSE: data: {"type":"token","content":"..."}
      ▼
Browser ReadableStream (TextDecoder)
      │ parses JSON per line
      ▼
chatStore.appendToken()   ← React re-renders on each token
```

**Why a daemon thread?** Ollama's Python client uses blocking I/O. FastAPI is async. Running the blocking generator in `asyncio.get_event_loop().run_in_executor()` (or a daemon thread) prevents blocking the event loop.

**Cancellation**: The browser sends an `AbortSignal` with the fetch request. On abort, the SSE generator catches the disconnect and stops reading from the queue. The Ollama stream is abandoned (not explicitly cancelled — Ollama handles the dropped connection).

---

## Prompts

### System Prompt (Uzbek, used in every request)

```
Siz O'zbekiston Jinoyat Kodeksi bo'yicha yuridik yordamchisiz.
Faqat quyida berilgan maqolalar asosida javob bering.
Agar javob berilgan maqolalarda bo'lmasa: "Ushbu savol bo'yicha
Jinoyat Kodeksida ma'lumot topilmadi" deb ayting.
Javobda tegishli maqola raqamlarini ko'rsating.
Suhbat tarixini hisobga olib, izchil javob bering.
```

**Translation**:
> You are a legal assistant for the Uzbekistan Criminal Code. Answer only based on the articles provided below. If the answer is not in the given articles, say: "Information on this question was not found in the Criminal Code." Show relevant article numbers in your answer. Consider the conversation history and give a consistent answer.

### Context Block (appended per-request)

```
Jinoyat Kodeksidan tegishli maqolalar:
---
Modda: {article_number} — {article_title}
Matn: {chunk_text}
O'xshashlik: {score:.2f}

Modda: ...
---
```

### No-Context Fallback

If `retrieve()` returns zero chunks above `MIN_SCORE`, the context block is empty and the LLM falls back to its system prompt instruction to report that no relevant articles were found.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Embeddings | `sentence-transformers` (BAAI/bge-m3) | latest |
| Vector store | ChromaDB (persistent) | latest |
| LLM inference | Ollama | host-installed |
| Default model | qwen3:8b | via Ollama |
| API framework | FastAPI + Uvicorn | ≥0.111.0 |
| ORM | SQLAlchemy 2.x | ≥2.0 |
| Migrations | Alembic | latest |
| Database | SQLite (default) / PostgreSQL | — |
| Frontend framework | React 18 + TypeScript | 18.3.1 / 5.5.3 |
| Build tool | Vite | 5.4.0 |
| UI library | MUI v6 | 6.1.0 |
| State management | Zustand | 4.5.0 |
| Animations | Framer Motion | 11.0.0 |
| Markdown | react-markdown | 9.0.0 |

---

## Project Structure

```
jk-assistant/
├── back/                          # FastAPI backend
│   ├── app/
│   │   ├── main.py               # App factory, lifespan, CORS, routers
│   │   ├── config.py             # Pydantic settings (reads .env)
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── chat.py       # /api/chat endpoints (sync + SSE)
│   │   │       └── sessions.py   # /api/sessions CRUD
│   │   ├── db/
│   │   │   ├── models.py         # SQLAlchemy ORM (ChatSession, Message)
│   │   │   └── session.py        # Engine + SessionLocal factory
│   │   ├── services/
│   │   │   └── chat_service.py   # Business logic, save_message, get_history
│   │   └── schemas/
│   │       └── chat.py           # Pydantic request/response models
│   ├── cli.py                    # Interactive REPL (no web UI)
│   ├── Dockerfile                # Multi-stage build (builder + runtime)
│   └── alembic/                  # Database migration environment
│
├── rag.py                        # Core RAG: retrieve() + ask_stream() + ask()
│
├── front/                         # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx               # Root layout, routing, keyboard shortcuts
│   │   ├── api/
│   │   │   ├── client.ts         # Generic apiFetch wrapper
│   │   │   ├── chat.ts           # SSE streaming client (streamAsk)
│   │   │   └── sessions.ts       # Session API calls
│   │   ├── store/
│   │   │   ├── chatStore.ts      # Messages + streaming state (Zustand)
│   │   │   ├── sessionStore.ts   # Session list + active session (Zustand)
│   │   │   └── modelStore.ts     # LLM selection + localStorage (Zustand)
│   │   ├── hooks/
│   │   │   └── useSendMessage.ts # Orchestrates streaming send + stop
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── TopBar.tsx    # App header, theme toggle
│   │   │   │   └── Sidebar.tsx   # Session list, model selector
│   │   │   └── chat/
│   │   │       ├── ChatArea.tsx       # Message list + auto-scroll
│   │   │       ├── InputPanel.tsx     # Textarea + send/stop buttons
│   │   │       ├── MessageBubble.tsx  # User/assistant bubbles + sources
│   │   │       ├── ThinkingBubble.tsx # Loading animation + status
│   │   │       └── WelcomeScreen.tsx  # Initial suggestions
│   │   ├── theme/
│   │   │   └── theme.ts          # Light + dark MUI themes
│   │   └── types/
│   │       └── index.ts          # SourceChunk, Message, Session interfaces
│   ├── vite.config.ts            # Vite dev server + /api proxy
│   └── package.json
│
├── data/                          # Offline data processing (run once)
│   ├── uz-crim-code.pdf          # Source document
│   ├── extract_text.py           # PDF → raw.txt
│   ├── clean_text.py             # raw.txt → clean.txt
│   ├── parse_json.py             # clean.txt → structured.json + parsed.json
│   ├── prepare_chunks.py         # parsed.json → chunks.json
│   └── validate_json.py          # Validation utility
│
├── db/                            # Persistent storage (gitignored content)
│   ├── chroma/                   # ChromaDB vector store
│   ├── jk_assistant.db           # SQLite session/message store
│   └── embed_and_ingest.py       # Encodes chunks.json → ChromaDB
│
├── docker-compose.yml             # Single-service deployment
├── requirements.txt               # Python dependencies
├── .env.example                   # Configuration template
└── .gitignore
```

---

## Setup & Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) installed and running
- 8+ GB RAM (embedding model ~2 GB, LLM ~5–8 GB)
- GPU optional but recommended for faster inference

### 1. Clone

```bash
git clone <repo-url>
cd jk-assistant
```

### 2. Python dependencies

Install PyTorch first (pick one):

```bash
# CPU only
pip install torch --index-url https://download.pytorch.org/whl/cpu

# CUDA 12.1 (NVIDIA GPU)
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

Then:

```bash
pip install -r requirements.txt
```

### 3. Pull LLM model

```bash
ollama pull qwen3:8b
# or a lighter alternative:
ollama pull tinyllama
```

### 4. Build the vector database (one-time)

```bash
# If starting from raw PDF:
python data/extract_text.py
python data/clean_text.py
python data/parse_json.py
python data/prepare_chunks.py

# Embed and ingest into ChromaDB:
python db/embed_and_ingest.py
```

### 5. Start the backend

```bash
cd back
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Start the frontend

```bash
cd front
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### CLI Mode (no browser)

```bash
python back/cli.py
```

Interactive REPL in Uzbek. Streams tokens to terminal and prints a source table after each answer. Type `exit`, `quit`, or `chiq` to quit.

---

## Docker Deployment

```bash
docker-compose up -d
```

The `docker-compose.yml` runs only the backend. Ollama must be running on the host.

**What runs in Docker**:
- Alembic `upgrade head` on startup
- Uvicorn on port 8000

**Volumes**:
- `./db:/app/db` — persists SQLite and ChromaDB across restarts
- `hf_cache:/root/.cache/huggingface` — caches the embedding model download

**GPU support** (uncomment in `docker-compose.yml`):
```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```
Requires `nvidia-container-toolkit` on the host.

---

## Environment Variables

Copy `.env.example` to `.env` and edit:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///db/jk_assistant.db` | SQLite or `postgresql://...` |
| `CHROMA_DIR` | `db/chroma` | ChromaDB persistence path |
| `EMBED_MODEL` | `BAAI/bge-m3` | HuggingFace model ID for embeddings |
| `LLM_MODEL` | `qwen3:8b` | Default Ollama model name |
| `MIN_SCORE` | `0.40` | Minimum cosine similarity to include a chunk (0–1) |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API base URL |

---

## Limitations & Future Work

**Current limitations**:
- No authentication — assumes a trusted local network
- Single-user SQLite; no concurrent write safety for multiple users
- File attachment button in UI is not functional
- No Cyrillic Uzbek script support
- Session search is UI-only (no full-text search on message content)

**Potential improvements**:
- [ ] Multi-user support with authentication
- [ ] Full-text search on message history
- [ ] Uzbek Cyrillic script support in embeddings and UI
- [ ] Filter retrieval by specific Bob (chapter) or Modda (article) number
- [ ] PDF export of conversation
- [ ] Support for additional legal codes (civil, administrative, labor)
- [ ] Evaluation dataset and retrieval quality metrics
- [ ] Streaming to CLI with color/formatting via `rich`

---

## License

For educational and research use only. Legal content sourced from the official Uzbekistan Criminal Code. Not a substitute for professional legal advice.
