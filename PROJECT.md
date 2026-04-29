# JK AI — Uzbekistan Criminal Code AI Legal Assistant

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [System Architecture](#3-system-architecture)
4. [Backend — Deep Dive](#4-backend--deep-dive)
5. [RAG Pipeline — The Core Engine](#5-rag-pipeline--the-core-engine)
6. [Frontend — Deep Dive](#6-frontend--deep-dive)
7. [API Reference](#7-api-reference)
8. [Database Design](#8-database-design)
9. [Docker & Deployment](#9-docker--deployment)
10. [Technology Choices & Trade-offs](#10-technology-choices--trade-offs)
11. [What Was Built — Full Feature List](#11-what-was-built--full-feature-list)
12. [Questions & Answers](#12-questions--answers)

---

## 1. Project Overview

**JK AI** (Jinoyat Kodeksi AI) is a specialized AI legal assistant built specifically for the **Criminal Code of the Republic of Uzbekistan**. It allows users to ask questions in natural Uzbek language and receive precise, source-cited answers grounded in the actual text of the Criminal Code.

The system is designed around a key principle: **every answer must be traceable to a real article**. Rather than relying solely on a language model's internal training knowledge (which can hallucinate or be outdated), JK AI retrieves the relevant article text from a vector database and feeds it as context to the LLM. The model's job is then to interpret and explain — not to invent.

### Key Capabilities

- Answer questions about specific crimes, punishments, and articles
- Answer general questions about the structure and purpose of the Criminal Code
- Handle natural conversational greetings and self-introduction
- Display the exact source articles that informed each answer
- Stream responses token-by-token for a fluid, ChatGPT-like experience
- Work fully offline using a local LLM (Ollama/Qwen3)
- Alternatively, use a cloud API (OpenRouter) for faster, more capable models
- Maintain full conversation history per session
- Search across all past conversations (titles and message content)

---

## 2. Problem Statement

The Uzbekistan Criminal Code contains hundreds of articles covering a wide range of crimes — from property offenses and corruption to violent crimes, traffic violations, and state security. Looking up specific articles, understanding punishment ranges, or finding which law applies to a given situation typically requires either legal expertise or significant time spent reading dense legal text.

**The challenge:**
- The Criminal Code is a large, structured legal document — not a FAQ
- Direct keyword search misses synonyms and conceptual matches
- A general-purpose LLM may hallucinate article numbers or penalties
- Legal professionals and citizens alike need fast, reliable answers with citations

**The solution:**
A Retrieval-Augmented Generation (RAG) system that combines:
1. A pre-indexed vector database of all Criminal Code article chunks
2. Hybrid keyword + semantic search to find the most relevant articles
3. A language model that reads those articles and formulates a precise answer
4. A modern, streaming UI that shows the answer and its sources

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                             │
│                                                                 │
│  React 18 + TypeScript + Material UI + Framer Motion           │
│  Zustand state management                                       │
│  SSE client (fetch + ReadableStream)                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / Server-Sent Events (SSE)
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                       NGINX (port 3000)                         │
│                                                                 │
│  /api/*  → proxy_pass → backend:8000    (SSE-compatible)       │
│  /*      → /index.html                 (SPA fallback)          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                   FASTAPI BACKEND (port 8000)                   │
│                                                                 │
│  ┌─────────────────┐  ┌────────────────────┐  ┌─────────────┐  │
│  │  Sessions API   │  │     Chat API        │  │  /health    │  │
│  │  CRUD + search  │  │  /ask (SSE stream)  │  │             │  │
│  └────────┬────────┘  └────────┬───────────┘  └─────────────┘  │
│           │                   │                                 │
│  ┌────────▼───────────────────▼───────────────────────────┐    │
│  │                    RAG PIPELINE                         │    │
│  │                                                         │    │
│  │  1. normalize(query)                                    │    │
│  │       ↓                                                 │    │
│  │  2. detect_intent() → greeting | general | legal        │    │
│  │       ↓                                                 │    │
│  │  3a. greeting → GREETING_PROMPT → LLM                  │    │
│  │  3b. general  → metadata JSON  → GENERAL_PROMPT → LLM  │    │
│  │  3c. legal    → hybrid_retrieve() → LEGAL_PROMPT → LLM │    │
│  │                                                         │    │
│  │  hybrid_retrieve():                                     │    │
│  │    BM25_scores(query) ──┐                               │    │
│  │                         ├→ fuse → rank → top-K chunks   │    │
│  │    Semantic_scores(q) ──┘                               │    │
│  └──────────────┬──────────────────────────────────────────┘    │
│                 │                                                │
│  ┌──────────────▼────────────┐  ┌───────────────────────────┐   │
│  │    ChromaDB               │  │  LLM Inference            │   │
│  │    (persistent vector DB) │  │                           │   │
│  │    BAAI/bge-m3 embeddings │  │  Local: Ollama + Qwen3:8b │   │
│  │    Collection: jk_chunks  │  │  API:   OpenRouter        │   │
│  └───────────────────────────┘  └───────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   SQLite Database                                        │   │
│  │   sessions table | messages table                        │   │
│  │   Managed by SQLAlchemy ORM + Alembic migrations         │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Backend — Deep Dive

### Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Web framework | FastAPI 0.111+ | Async API, automatic OpenAPI docs |
| ASGI server | Uvicorn | Production-grade async server |
| ORM | SQLAlchemy 2.x | Database abstraction layer |
| Migrations | Alembic | Schema versioning and upgrades |
| Validation | Pydantic v2 | Request/response schema validation |
| Database | SQLite | Conversation persistence |
| Vector store | ChromaDB | Embedding storage and similarity search |
| Embedding model | BAAI/bge-m3 | Multilingual text embeddings (1024-dim) |
| Local LLM | Qwen3:8b via Ollama | Offline inference |
| Cloud LLM | OpenRouter | Access to GPT-4o, Claude, Gemini, etc. |
| BM25 | rank_bm25 | Keyword-based retrieval |
| Settings | pydantic-settings | Environment variable management |
| Container | Docker (multi-stage) | Reproducible deployment |

### Project Structure

```
back/
├── app/
│   ├── api/routes/
│   │   ├── sessions.py     # CRUD + search endpoints
│   │   └── chat.py         # SSE streaming endpoint
│   ├── db/
│   │   ├── models.py       # SQLAlchemy ORM models
│   │   └── session.py      # DB engine + session factory
│   ├── schemas/
│   │   └── chat.py         # Pydantic request/response models
│   ├── services/
│   │   └── chat_service.py # Business logic layer
│   ├── config.py           # pydantic-settings configuration
│   └── main.py             # FastAPI app, lifespan, CORS, routers
├── rag/
│   ├── __init__.py         # Public API re-exports
│   ├── pipeline.py         # Main orchestrator
│   ├── hybrid.py           # BM25 + ChromaDB retrieval engine
│   ├── intent.py           # Query type classifier
│   ├── normalizer.py       # Text normalization
│   └── prompts.py          # System prompts + context builders
├── alembic/                # Migration scripts
├── Dockerfile              # Multi-stage build
└── requirements.txt
```

### FastAPI Application Startup (lifespan)

When the server starts, it runs a **lifespan** context manager that:
1. Creates all SQLite tables (if they don't exist)
2. Pre-loads the embedding model (`BAAI/bge-m3`) into memory
3. Connects to ChromaDB and loads the document collection
4. Builds the in-memory BM25 index over all documents

This is done in a thread pool (`run_in_executor`) so the server is ready to accept requests immediately while resources load in the background. The first request that needs retrieval will block until loading is complete, but subsequent requests are instant.

### Chat Service Layer

`chat_service.py` acts as the business logic layer between the API routes and the database. Key functions:

- **`save_message()`** — persists a message and auto-generates the session title from the first user message (first 80 characters)
- **`get_history()`** — retrieves the last 10 messages (excluding the current one) in chronological order for LLM context
- **`search_sessions()`** — searches both session titles and message content using Python string matching, returning matched snippets with context around the hit (±60/120 characters)

### SSE Streaming Architecture

The streaming endpoint (`POST /api/chat/{id}/ask`) uses a threading bridge pattern to connect the synchronous RAG pipeline to the async FastAPI event loop:

```python
async def event_generator():
    loop  = asyncio.get_event_loop()
    queue = asyncio.Queue()

    def run_rag():
        # Runs in a daemon thread
        for kind, value in rag.ask_stream(...):
            loop.call_soon_threadsafe(queue.put_nowait, (kind, value))
        loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

    threading.Thread(target=run_rag, daemon=True).start()

    while True:
        item = await queue.get()
        if item is None: break
        kind, value = item
        yield f"data: {json.dumps(...)}\n\n"

    # After stream ends, save the complete answer to SQLite
    chat_service.save_message(db, session_id, "assistant", answer, sources)
```

The three event types emitted over SSE:
- `{"type": "token", "content": "..."}` — single LLM output token
- `{"type": "sources", "sources": [...]}` — retrieved articles (sent after last token)
- `{"type": "done"}` — stream complete

---

## 5. RAG Pipeline — The Core Engine

The RAG pipeline is the intellectual heart of the system. Located in `back/rag/`, it transforms a raw user question into a grounded LLM answer in five steps.

### Step 1: Text Normalization (`normalizer.py`)

Before anything else, the raw query is normalized to handle the real-world messiness of Uzbek text input:

| Problem | Solution |
|---|---|
| Multiple apostrophe variants (`'`, `ʼ`, `` ` ``, `´`) | Map all to canonical `ʻ` (U+02BB) |
| Cyrillic vs Latin script (some users type in Cyrillic) | Transliterate Cyrillic → Latin if >30% of chars are Cyrillic |
| OCR artifacts in source documents | Same transliteration handles scanned text |
| Article number inconsistency (`"168 modda"`, `"168- modda"`) | Normalize to `"168-modda"` via regex |
| Zero-width chars, soft hyphens, BOM | Strip invisibles |
| Multiple spaces / blank lines | Collapse whitespace |

This normalization is applied to **both** the user query and the document chunks at indexing time, ensuring they share the same canonical form when compared.

### Step 2: Intent Detection (`intent.py`)

A rule-based classifier categorizes each question into one of three intents, with zero ML overhead:

#### Intent: `greeting`
Conversational messages that are not legal questions. Detected by patterns like:
- Greetings: `salom`, `assalomu alaykum`, `hey`, `hi`
- "How are you": `qandaysan`, `yaxshimisan`, `nima gap`
- "Who are you": `sen kimsan`, `kimsan`, `isming nima`, `nima qila olasan`
- Standalone responses: `rahmat`, `xayr`, `ok`, `tushunarli`, `ha`, `yo'q`

#### Intent: `general`
Meta-questions about the Criminal Code as a document:
- Article count: `nechta modda`, `modda soni`, `qancha modda`
- Structure: `tuzilish`, `bo'limlari`, `umumiy qism`, `maxsus qism`
- What it is: `kodeks nima`, `jinoyat kodeksi haqida`
- Adoption: `qachon qabul`, `qaysi yil`
- Purpose: `maqsad nima`, `vazifasi`, `nimani tartibga soladi`

#### Intent: `legal`
Questions about specific articles, crimes, or penalties:
- Explicit article reference: `168-modda`, `168 modda` (fast-path, always wins)
- Crime names: `o'g'irlik`, `firibgarlik`, `qotillik`, `pora`, `kontrabanda`
- Penalty terms: `qamoq`, `jarima`, `sanksiya`, `javobgar`, `ozodlikdan mahrum`
- "jazo" with context: `nima uchun jazo`, `jazosi`, `necha yil`

**Scoring algorithm:**
```python
def detect_query_type(question):
    # Fast-path: article number → always legal
    if re.search(r"\b\d+-modda\b", question):
        return "legal"

    g = score_greeting(question)  # sum of pattern hits × 5
    q = score_general(question)
    l = score_legal(question)

    # Greeting wins only if it dominates with no legal/general signal
    if g > 0 and g >= q and g >= l:
        return "greeting"
    if q > l:
        return "general"
    return "legal"  # tie → legal (retrieval is safer)
```

Ties default to `legal` because retrieval will simply return nothing for non-legal questions, which is a safe failure mode.

### Step 3: Hybrid Retrieval (`hybrid.py`)

This is the key architectural differentiator. Most RAG systems use only semantic (embedding) search. JK AI uses **both keyword and semantic search** and fuses their scores.

#### BM25 — Keyword Search

BM25 (Best Match 25) is the probabilistic ranking algorithm that powers traditional search engines. It measures term frequency against inverse document frequency.

- At startup, all document chunks are fetched from ChromaDB
- Each chunk is tokenized using the same normalizer
- A `BM25Okapi` index is built in memory
- On each query: scores for all documents are computed, normalized to [0, 1], and the top-K are returned

**Strength:** Exact and near-exact keyword matches. If a user writes `"168-modda"`, BM25 scores the document containing that exact string very highly.

**Weakness:** Cannot understand that `"odam o'ldirganda"` (when someone kills a person) relates to `"qasddan qotillik"` (intentional homicide).

#### Semantic Search — Embedding Similarity

The `BAAI/bge-m3` model converts text into 1024-dimensional vectors. Semantically similar texts have vectors that point in similar directions (low cosine distance).

- The user query is encoded into a vector
- ChromaDB performs approximate nearest-neighbor search
- The returned documents are those whose vectors are most similar to the query vector

**Strength:** Conceptual understanding. `"odam o'ldirsam nima bo'ladi"` → finds `"qasddan qotillik"` article even without keyword overlap.

**Weakness:** Exact article numbers might not produce the highest semantic similarity if the article text doesn't contain the number prominently.

#### Score Fusion

```
fused_score = 0.40 × normalized_BM25 + 0.60 × semantic_score
```

Both scores are in [0, 1]. Documents appear in results from either or both retrievers — the union of candidates is scored. Only documents with `fused_score >= 0.30` are returned (configurable via `MIN_SCORE` env var). The top-5 are sent to the LLM.

**Why these weights?**
- Semantic (0.60) gets slightly more weight because the primary use case is natural language queries, not exact keyword lookups
- BM25 (0.40) handles the article-number lookup case that semantic search can miss

### Step 4: Prompt Construction (`prompts.py` + `pipeline.py`)

Three distinct prompt strategies produce very different behaviors:

#### Greeting Prompt
```
You are "JK AI" — an AI assistant for the Criminal Code of Uzbekistan.
If the user says hello or asks about you:
- Warmly greet back and briefly introduce yourself
- State that you are JK AI, specialized in the Criminal Code
- Invite them to ask legal questions
If they say "thank you" — respond warmly. If "goodbye" — see them off.
Rules: Be brief (1-3 sentences). Uzbek language. Friendly tone.
```
No retrieval, no sources. Pure conversational LLM.

#### General Prompt
```
You are a professional legal assistant for the Criminal Code of Uzbekistan.
The user asked about the general structure, purpose, or statistics of the Code.
Use the metadata reference below to give an accurate, official answer.
Rules: Only use the provided data. Be concise (2-4 sentences). Official style.

METADATA:
Official name: ...
Year adopted: 1994
Total articles: 339
Sections: [...]
```
The metadata JSON is read from `legal_metadata.json` and formatted as a structured context block. No retrieval needed.

#### Legal Prompt
```
You are a professional legal assistant for the Criminal Code of Uzbekistan.
Rules:
1. ONLY answer based on the articles provided below
2. Always cite article numbers (e.g., "Under Article 168...")
3. Never hallucinate information not present in the articles
4. If the information is not in the provided articles, say so clearly
5. Answer in Uzbek, official legal style
6. Consider conversation history for consistent answers
7. Cite specific parts and paragraphs when relevant

Retrieved articles:
[1] 168-modda: Qasddan odam o'ldirish  (match: 0.87)
[full article text...]

[2] 169-modda: ...

Question: [user question]
```
The retrieved chunks are formatted with their article number, title, and match score. Conversation history (last 10 messages) is prepended so the model can handle follow-up questions.

### Step 5: LLM Inference

The pipeline supports two providers, selected per-request:

#### Local — Ollama

```python
stream = ollama.chat(model="qwen3:8b", messages=messages, stream=True)
for chunk in stream:
    yield ("token", chunk["message"]["content"])
```

- Runs entirely on the user's machine or server
- No data leaves the local network
- Free to use (after initial model download ~5GB)
- Speed depends on hardware (CPU: slow, GPU: fast)
- Default model: `qwen3:8b` (8 billion parameters, good quality/speed trade-off)

#### Cloud — OpenRouter

```python
response = requests.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers={"Authorization": f"Bearer {api_key}"},
    json={"model": model, "messages": messages, "stream": True},
    stream=True
)
for line in response.iter_lines():
    # Parse SSE, extract delta content
    yield ("token", token)
```

- Access to GPT-4o, Claude Opus, Gemini, Mistral, and 100+ models
- Faster, more capable responses
- Requires `OPENROUTER_API_KEY` environment variable
- Paid per token
- Includes a streaming fallback (non-streaming request) if SSE yields no tokens

---

## 6. Frontend — Deep Dive

### Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Framework | React 18 | UI rendering, hooks |
| Language | TypeScript | Type safety |
| UI Library | Material UI (MUI) v6 | Component system |
| Animations | Framer Motion | Page transitions, message animations |
| State | Zustand | Global state management |
| Build tool | Vite | Fast dev server and bundling |
| Web server | Nginx | SPA serving + API proxy |

### Application Structure

```
front/src/
├── App.tsx                    # Root: theme, layout, sidebar, modals
├── theme/
│   └── theme.ts               # Custom MUI theme (light + dark, glass tokens)
├── types/
│   └── index.ts               # TypeScript interfaces: Message, Session, etc.
├── api/
│   ├── client.ts              # Base fetch wrapper
│   ├── sessions.ts            # Sessions API calls
│   └── chat.ts                # SSE streaming client
├── store/
│   ├── chatStore.ts           # Message list, streaming state
│   ├── sessionStore.ts        # Sessions list, active session
│   └── modelStore.ts          # Provider + model selection
├── hooks/
│   └── useSendMessage.ts      # Send + abort message logic
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx         # App bar: toggle, logo/title, actions
│   │   └── Sidebar.tsx        # Session list, new chat, settings
│   ├── chat/
│   │   ├── ChatArea.tsx       # Message list + input panel container
│   │   ├── MessageBubble.tsx  # User/assistant bubble, markdown, sources
│   │   ├── ThinkingBubble.tsx # "Thinking..." animation while waiting
│   │   ├── InputPanel.tsx     # Text input + send/stop button
│   │   └── WelcomeScreen.tsx  # Initial screen with suggestion cards
│   └── common/
│       ├── SessionSearchModal.tsx  # Ctrl+Shift+F search
│       └── SettingsModal.tsx       # Model/provider configuration
└── utils/
    └── formatDate.ts          # Relative date formatting
```

### State Management — Zustand Stores

#### `chatStore` — Active conversation state

```typescript
interface ChatState {
  messages:         Message[];       // Loaded messages for the active session
  streamingContent: string;          // Accumulated tokens from current stream
  streamingSources: SourceChunk[];   // Sources received mid-stream
  streamingMeta:    StreamingMeta;   // Provider, model, start time
  isStreaming:      boolean;
  currentSessionId: string | null;   // Which session owns the stream
}
```

Key design: when a stream is active, `streamingContent` is a separate field from `messages`. The UI renders both — the finalized messages array plus the live streaming bubble. When `done` arrives, `finalizeStreaming()` moves `streamingContent` into `messages` with elapsed time metadata attached.

#### `sessionStore` — Session list and navigation

Manages the sidebar session list. The active session ID drives URL updates (`/chat/{id}`), message loading, and the TopBar title. Optimistic deletion (remove from UI immediately, then call API, revert on failure).

#### `modelStore` — LLM provider configuration

Persisted to `localStorage`. Stores whether to use `local` (Ollama) or `api` (OpenRouter), and which specific model ID is selected for each provider.

### SSE Client (`api/chat.ts`)

The client consumes the backend's SSE stream using `fetch()` and `ReadableStream`:

```typescript
const response = await fetch(`/api/chat/${sessionId}/ask`, {
  method: 'POST',
  body: JSON.stringify({ question, top_k: topK, model, provider }),
  signal: abortSignal,
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // Parse "data: {...}\n\n" lines
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const event = JSON.parse(line.slice(6));
    if (event.type === 'token')   onToken(event.content);
    if (event.type === 'sources') onSources(event.sources);
    if (event.type === 'done')    onDone();
  }
}
```

The `AbortController` signal allows the user to stop generation mid-stream by clicking the stop button.

### Glass Morphism Design System

The entire UI uses a "Glass Morphism" aesthetic — frosted glass panels layered over animated background gradients.

**Background layer (AmbientBlobs):**
Three absolutely-positioned `Box` elements with radial gradient fills and CSS keyframe animations. They slowly drift and scale, creating a living background:
```css
@keyframes jkBlob1 {
  0%, 100% { transform: translate(0,0) scale(1); }
  33%       { transform: translate(6%,10%) scale(1.08); }
  66%       { transform: translate(-3%,5%) scale(0.95); }
}
```

**Glass panels:**
```css
backdrop-filter: blur(24px);
background: rgba(10, 11, 20, 0.82);     /* dark mode */
background: rgba(248, 250, 255, 0.78);  /* light mode */
border: 1px solid rgba(255,255,255,0.07);
```

**Color palette:**
- Primary gradient: `#5B8CFF → #7C4DFF` (blue-violet)
- User message bubble: full gradient fill
- Assistant message bubble: glass panel
- Dark mode background: `#08090D`
- Light mode background: `#EEF2FF`

**MUI Theme customization:**
The MUI theme is extended with a custom `glass` palette token (via TypeScript module augmentation) and global overrides for `MuiDialog`, `MuiPaper`, and scrollbars.

### Component Details

#### `MessageBubble`

Renders each conversation turn with distinct styling:

**User message:**
- Right-aligned, gradient background (`#5B8CFF → #7C4DFF`)
- Border radius `18px 4px 18px 18px` (tail on top-right)
- White text, `pre-wrap` for line breaks

**Assistant message:**
- Left-aligned, glass panel with `backdrop-filter: blur(16px)`
- Border radius `4px 18px 18px 18px` (tail on top-left)
- Full Markdown rendering via `react-markdown`
- Blinking cursor animation during streaming
- **Copy button** — absolutely positioned at `top: 15px, right: 15px` inside the bubble, fades in on hover
- **Sources section** — collapsible list of article chips (`168-modda`, `169-modda`, etc.) with match percentage in tooltip
- **Response metadata** — elapsed time, provider (online/offline indicator), model name

#### `ThinkingBubble`

Shown when the stream has started but no tokens have arrived yet (the model is loading context and generating the first token). Displays an animated capsule with three pulsing gradient dots and rotating "thinking" step text (`"Analyzing..."`, `"Searching articles..."`, etc.) using `AnimatePresence`.

#### `WelcomeScreen`

Shown when no session is active. Features:
- Animated logo orb (floating CSS animation)
- Gradient headline
- 9 predefined suggestion questions across legal categories (property crimes, corruption, violent crimes, etc.)
- 3 are randomly selected on each render using `useMemo` with a Fisher-Yates-style sort
- Clicking a card immediately sends the question

#### `Sidebar`

On **desktop** (≥900px): a collapsible panel that slides in/out by animating its `width` from `0` to `282px`. The inner content box stays at full width so content doesn't compress during the animation.

On **mobile** (<900px): a MUI `Drawer` (overlay, temporary).

Session list features:
- Active session has a left accent bar (3px gradient strip)
- Delete button appears on row hover
- `AnimatePresence` for enter/exit animations
- Footer chip showing current model and provider, clicking opens settings

#### `SessionSearchModal`

Full-text search across all sessions:
- **No query:** Shows all sessions ordered by last updated
- **With query:** Calls `GET /api/sessions/search?q=...` with 220ms debounce
- **Results display:** Session title + a 180-char message snippet showing where the match occurred, with matched text in `<strong>` (bold, primary color)
- Role icon (person/bot) indicates whether the match was in a user or assistant message
- Spinner replaces search icon while fetching

---

## 7. API Reference

### Sessions Endpoints

| Method | Endpoint | Body / Query | Response |
|---|---|---|---|
| `GET` | `/api/sessions` | — | `Session[]` |
| `POST` | `/api/sessions` | `{ title? }` | `Session` |
| `GET` | `/api/sessions/search` | `?q=string` | `SessionSearchOut[]` |
| `GET` | `/api/sessions/{id}` | — | `SessionWithMessages` |
| `PUT` | `/api/sessions/{id}` | `{ title }` | `Session` |
| `DELETE` | `/api/sessions/{id}` | — | `204 No Content` |

### Chat Endpoints

| Method | Endpoint | Body | Response |
|---|---|---|---|
| `POST` | `/api/chat/{id}/ask` | `AskRequest` | `text/event-stream` (SSE) |
| `POST` | `/api/chat/{id}/ask/sync` | `AskRequest` | `{ answer, sources }` |

**AskRequest schema:**
```json
{
  "question": "168-modda haqida nima deyish mumkin?",
  "top_k": 5,
  "model": "qwen3:8b",
  "provider": "local"
}
```

**SSE event stream format:**
```
data: {"type": "token", "content": "168-modda"}
data: {"type": "token", "content": " bo'yicha..."}
data: {"type": "sources", "sources": [{...}, {...}]}
data: {"type": "done"}
```

**SessionSearchOut schema:**
```json
{
  "id": "uuid",
  "title": "168-modda haqida savol",
  "updated_at": "2025-04-29T10:00:00",
  "message_count": 4,
  "match": {
    "role": "assistant",
    "snippet": "…168-modda bo'yicha qasddan odam o'ldirish uchun…"
  }
}
```

---

## 8. Database Design

### Schema

```sql
CREATE TABLE sessions (
    id          VARCHAR(36)  PRIMARY KEY,
    title       VARCHAR(255),              -- auto-set from first user message
    created_at  DATETIME NOT NULL,
    updated_at  DATETIME NOT NULL          -- updated on every new message
);

CREATE TABLE messages (
    id          VARCHAR(36)  PRIMARY KEY,
    session_id  VARCHAR(36)  NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role        VARCHAR(10)  NOT NULL,     -- "user" or "assistant"
    content     TEXT         NOT NULL,
    sources     TEXT,                      -- JSON-encoded list of SourceChunk objects
    created_at  DATETIME     NOT NULL
);
```

### Key Design Decisions

**UUID primary keys** — no auto-increment integers. UUIDs are safe to generate client-side and don't expose record counts.

**Cascade delete** — deleting a session automatically removes all its messages. No orphaned rows.

**Sources as JSON text** — storing sources as a JSON column in SQLite avoids a separate `sources` table and join. The source data is only read when displaying a specific message, making this trade-off acceptable.

**Auto-title** — `chat_service.save_message()` sets the session title to the first 80 characters of the first user message if no title exists yet. This happens server-side, keeping the logic centralized.

**History window** — only the last 10 messages are sent to the LLM as history (configurable). This bounds token usage and keeps prompts manageable. The query returns messages in descending order, skips the current one (`offset(1)`), limits to 10, then reverses to chronological order.

---

## 9. Docker & Deployment

### Backend Dockerfile (Multi-stage)

```dockerfile
# Stage 1: Build (includes gcc for native Python extensions)
FROM python:3.11-slim AS builder
RUN apt-get install -y gcc g++
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install -r requirements.txt

# Stage 2: Runtime (no build tools, smaller image)
FROM python:3.11-slim AS runtime
COPY --from=builder /usr/local/lib/python3.11 ...
COPY back/ back/
CMD ["sh", "-c", "alembic upgrade head && uvicorn back.app.main:app --host 0.0.0.0 --port 8000"]
```

The two-stage build keeps the runtime image lean (no gcc, no build artifacts).  
Alembic migrations run automatically before the server starts, ensuring the database schema is always up-to-date.

### Frontend Dockerfile (Multi-stage)

```dockerfile
# Stage 1: Build React app
FROM node:20-alpine AS builder
RUN npm ci
RUN npm run build          # outputs to /app/dist

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### Nginx Configuration

```nginx
location /api/ {
    proxy_pass         http://backend:8000/api/;
    proxy_buffering    off;      # Critical: SSE tokens must not be buffered
    proxy_cache        off;
    proxy_read_timeout 300s;     # LLM can take a while for long answers
    chunked_transfer_encoding on;
}

location / {
    try_files $uri $uri/ /index.html;  # SPA: all routes serve index.html
}
```

The `proxy_buffering off` directive is critical for SSE. Without it, Nginx would buffer all tokens and send them in one batch when the response completes — destroying the streaming experience.

### docker-compose.yml

```yaml
services:
  backend:
    build: { context: ., dockerfile: back/Dockerfile }
    ports: ["8000:8000"]
    volumes:
      - ./db:/app/db                      # Persists SQLite + ChromaDB
      - hf_cache:/root/.cache/huggingface # Persists embedding model download
    environment:
      - OLLAMA_HOST=http://host.docker.internal:11434  # Reach host Ollama
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}

  frontend:
    build: { context: front, dockerfile: Dockerfile }
    ports: ["3000:80"]
    depends_on: [backend]

volumes:
  hf_cache:
```

The `extra_hosts: host.docker.internal:host-gateway` entry (Linux-only) allows the backend container to reach Ollama running on the host machine, which is necessary because Ollama is not containerized in this setup.

### Volume Strategy

- `./db` mounted into `/app/db` — both SQLite (`jk_assistant.db`) and ChromaDB (`chroma/`) live here. Data survives container restarts and rebuilds.
- `hf_cache` named volume — the `BAAI/bge-m3` model (~2GB) is downloaded once and reused across rebuilds.

---

## 10. Technology Choices & Trade-offs

### Why RAG instead of fine-tuning?

**Fine-tuning** bakes knowledge into model weights. Problems:
- Expensive to train and retrain as the law changes
- Risk of catastrophic forgetting (loses general capabilities)
- Still hallucinates — the model may confidently generate wrong article numbers
- Hard to audit where an answer came from

**RAG** feeds the actual document text as context. Benefits:
- The model reads the real article before answering — same as a human lawyer
- Sources are always visible and verifiable by the user
- Updating the knowledge base = re-indexing the new document, no training
- Works with any LLM without modification

### Why SQLite instead of PostgreSQL?

For a single-instance deployment with moderate usage, SQLite is:
- Zero configuration
- No separate database process
- Fast for read-heavy workloads
- The database is just a file — trivial to back up and move

Switching to PostgreSQL is a one-line change (`DATABASE_URL=postgresql://...` in `.env`). SQLAlchemy and Alembic are database-agnostic.

### Why Zustand instead of Redux?

Redux adds significant boilerplate (actions, reducers, selectors). Zustand provides the same functionality with a simpler mental model and less code. For a project of this size, Redux's structure is overhead without benefit.

### Why ChromaDB instead of Pinecone/Weaviate?

ChromaDB runs embedded — no separate vector database server. For a self-hosted, potentially offline system, this is ideal:
- No external dependencies
- Persists to disk automatically
- Fast enough for a collection of hundreds to low thousands of documents
- Easy to swap if scaling becomes necessary

### Why BAAI/bge-m3 for embeddings?

`bge-m3` is specifically designed for multilingual, multi-granularity retrieval. Uzbek is a low-resource language — many embedding models have poor Uzbek support. `bge-m3` produces high-quality embeddings for Uzbek legal text and runs on CPU (though slowly) without a GPU.

### Why Qwen3:8b as the local model?

- 8 billion parameters is the practical limit for CPU inference on consumer hardware
- Qwen3 has strong multilingual capabilities including Uzbek
- Good instruction-following behavior with structured legal prompts
- Small enough to fit in ~8GB RAM when quantized

---

## 11. What Was Built — Full Feature List

### Backend Features
- [x] FastAPI application with async request handling
- [x] CORS middleware for cross-origin frontend access
- [x] SQLite persistence with SQLAlchemy ORM
- [x] Alembic database migrations (run automatically on startup)
- [x] Sessions CRUD API (create, read, update, delete, list)
- [x] Full-text session search (title + message content) with snippet extraction
- [x] SSE streaming endpoint with threading bridge
- [x] Non-streaming fallback endpoint for testing
- [x] Conversation history (last 10 messages) sent to LLM
- [x] Automatic session title generation from first message
- [x] Text normalization (Unicode, apostrophes, Cyrillic→Latin, article numbers)
- [x] Three-way intent classification (greeting / general / legal)
- [x] BM25 keyword index built from ChromaDB documents at startup
- [x] Semantic search via ChromaDB + BAAI/bge-m3
- [x] Hybrid BM25 + semantic score fusion with configurable weights
- [x] Minimum score filtering for retrieval quality control
- [x] Three distinct system prompts and context builders
- [x] Ollama local LLM integration with streaming
- [x] OpenRouter cloud API integration with streaming + non-streaming fallback
- [x] Per-request model and provider selection
- [x] Multi-stage Docker build (builder + runtime stages)
- [x] Health check endpoint
- [x] pydantic-settings configuration with `.env` support

### Frontend Features
- [x] React 18 + TypeScript + Vite
- [x] Material UI v6 with custom theme (dark + light mode)
- [x] Glass morphism design system (frosted panels, gradient accents)
- [x] Animated ambient background blobs (CSS keyframes)
- [x] SSE streaming client with per-token rendering
- [x] Three Zustand stores (chat, session, model) with clean separation
- [x] Collapsible sidebar — animated width on desktop, Drawer on mobile
- [x] Session list with active indicator, timestamps, delete button
- [x] New chat button (UI + keyboard shortcut `Ctrl+Shift+O`)
- [x] Welcome screen with 3 randomly selected suggestion cards
- [x] Message bubbles — user (gradient) and assistant (glass) with distinct styling
- [x] Full Markdown rendering (headers, bold, italic, code, blockquote, lists)
- [x] Blinking cursor animation during streaming
- [x] ThinkingBubble — animated "thinking" indicator before first token
- [x] Copy button inside the assistant bubble (hover to reveal)
- [x] Source articles — collapsible chips with article numbers and match scores
- [x] Response metadata — elapsed time, provider (online/offline), model name
- [x] Session search modal (`Ctrl+Shift+F`) — debounced API search with highlight
- [x] Settings modal — provider and model selection
- [x] Stop generation button (AbortController)
- [x] Dark/light theme toggle with localStorage persistence
- [x] URL routing — `/chat/{sessionId}` updates on session switch
- [x] Session title auto-update in sidebar on first message
- [x] Custom thin scrollbar styling across all scrollable areas
- [x] Framer Motion animations (message entry, sidebar, TopBar title transitions)
- [x] Nginx SPA serving + SSE-compatible API proxy
- [x] Multi-stage Docker build (Node build → Nginx runtime)

---

## 12. Questions & Answers

**Q: Can the system answer questions about laws other than the Criminal Code?**

No, by design. The ChromaDB collection only contains Criminal Code article chunks. If someone asks about civil law or administrative law, the retrieval will either return unrelated articles or nothing. The system prompt instructs the model to only use the provided articles, so it should decline rather than hallucinate. Expanding to other legal codes would require ingesting their text into the same (or a separate) collection.

**Q: How does the system prevent hallucination?**

Three layers:
1. The legal prompt explicitly instructs the model to ONLY use the provided article text and never invent information
2. Retrieved source articles are shown to the user — any answer can be verified against them
3. If the hybrid retrieval returns nothing (score < 0.30), the model receives no article context and should state that no relevant information was found

**Q: What happens when many users use it simultaneously?**

FastAPI + Uvicorn handles concurrent requests asynchronously. Each SSE stream runs the LLM in a separate daemon thread, so multiple streams can run in parallel limited only by hardware (CPU cores / GPU memory for local Ollama). SQLite handles concurrent reads well; writes (saving messages) are short and infrequent. For high-load scenarios, switching to PostgreSQL and a GPU-served LLM would scale significantly.

**Q: What is the difference between local and API mode?**

| Aspect | Local (Ollama) | API (OpenRouter) |
|---|---|---|
| Privacy | Data stays on-machine | Sent to external service |
| Cost | Free after hardware | Paid per token |
| Speed | Slow on CPU, fast on GPU | Fast (cloud compute) |
| Model quality | Qwen3:8b (good) | GPT-4o, Claude (excellent) |
| Internet | Not required | Required |
| Offline | Works | Does not work |

**Q: How is conversation context maintained?**

Every message is saved to SQLite with its role and content. Before each LLM call, the `get_history()` function retrieves the last 10 messages from the database and includes them in the messages array sent to the LLM (between the system prompt and the current user question). This allows the model to understand follow-up questions like "What is the maximum penalty?" after asking about a specific crime.

**Q: Why is BM25 built in-memory at startup rather than persisted?**

The BM25 index is built from documents already stored in ChromaDB. Rebuilding it at startup (typically seconds for hundreds of documents) is simpler than maintaining a separate persisted BM25 index that could go out of sync with ChromaDB. The index fits comfortably in RAM for any reasonably-sized legal document collection.

**Q: How would you scale this system?**

1. **Replace SQLite with PostgreSQL** — handles concurrent writes better
2. **Add a GPU server for Ollama** — dramatically faster local inference
3. **Add caching** — Redis for session data and common query results
4. **Horizontal scaling** — multiple FastAPI instances behind a load balancer (stateless by design)
5. **Expand the knowledge base** — ingest additional legal codes into separate ChromaDB collections and route by detected legal domain

**Q: What are the limitations of the current intent detection?**

The regex-based intent detection is fast and deterministic but has known gaps:
- Complex mixed queries (`"Salom, 168-modda haqida..."`) rely on the `legal` fast-path override
- Nuanced general questions not matching known patterns fall through to `legal` (safe fallback — retrieval handles it)
- Adding new intent types requires writing new patterns manually
- An ML-based intent classifier (fine-tuned BERT) would generalize better but adds complexity and infrastructure overhead that isn't justified at this scale
