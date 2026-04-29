# JK AI — O'zbekiston Jinoyat Kodeksi Sun'iy Intellekt Yordamchisi

## Loyiha haqida qisqacha

**JK AI** — O'zbekiston Respublikasi Jinoyat Kodeksi bo'yicha ixtisoslashgan sun'iy intellekt yordamchi tizim. Foydalanuvchi savolini yozadi, tizim Jinoyat Kodeksining tegishli moddalarini topadi va sun'iy intellekt yordamida aniq, manba ko'rsatilgan javob beradi. Barcha javoblar real maqola matnlariga asoslanadi — bu gallyutsinatsiya xavfini minimallashtirradi.

---

## Loyihaning maqsadi

- Jinoyat Kodeksi bo'yicha tezkor, ishonchli va havolali javob berish
- Aniq maqola raqamlari va qoidalarga havola qilish
- Oflayn ishlash imkoniyati (lokal model orqali)
- Ishlatish uchun qulay, zamonaviy interfeys

---

## Texnik arxitektura

Loyiha ikki asosiy qismdan iborat:

```
┌─────────────────────────────────────────────┐
│              FRONTEND (React)               │
│   Brauzer ↔ SSE streaming ↔ Nginx proxy     │
└─────────────────────┬───────────────────────┘
                      │ HTTP / SSE
┌─────────────────────▼───────────────────────┐
│           BACKEND (FastAPI / Python)        │
│                                             │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  │
│  │ Sessions │  │   Chat    │  │  Health  │  │
│  │   API    │  │    API    │  │  check   │  │
│  └────┬─────┘  └─────┬─────┘  └──────────┘  │
│       │              │                       │
│  ┌────▼──────────────▼──────────────────┐   │
│  │          RAG Pipeline                │   │
│  │  normalize → detect_intent →         │   │
│  │  retrieve  → build_messages →        │   │
│  │  stream_LLM                          │   │
│  └────────────┬────────────────┬────────┘   │
│               │                │            │
│  ┌────────────▼──┐  ┌──────────▼─────────┐  │
│  │  ChromaDB     │  │  Ollama / OpenRouter│  │
│  │  (vectors)    │  │  (LLM inference)   │  │
│  └───────────────┘  └────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │       SQLite (chat history)          │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Backend

### Stack

| Komponent | Texnologiya | Versiya |
|---|---|---|
| Web framework | FastAPI | 0.111+ |
| ASGI server | Uvicorn | latest |
| ORM | SQLAlchemy | 2.x |
| Migrations | Alembic | latest |
| Ma'lumotlar bazasi | SQLite | built-in |
| Vector store | ChromaDB | latest |
| Embedding modeli | BAAI/bge-m3 | HuggingFace |
| Lokal LLM | Qwen3:8b (Ollama) | latest |
| API LLM | OpenRouter (har qanday model) | — |
| BM25 | rank_bm25 | latest |
| Konteyner | Docker (multi-stage) | — |

### Ma'lumotlar bazasi sxemasi

**`sessions`** jadvali — har bir suhbat:
```
id (UUID) | title (varchar) | created_at | updated_at
```

**`messages`** jadvali — har bir xabar:
```
id (UUID) | session_id (FK) | role (user|assistant) | content (text) | sources (JSON) | created_at
```

- `sources` maydoni — topilgan maqola parchalarini JSON formatda saqlaydi
- Suhbat o'chirilsa, uning barcha xabarlari ham o'chadi (`CASCADE DELETE`)
- Birinchi foydalanuvchi xabari avtomatik tarzda session sarlavhasiga aylanadi

---

## RAG Pipeline — Asosiy mexanizm

RAG (Retrieval-Augmented Generation) — bu modeli o'z bilimidan emas, balki real hujjatdan olingan parchalar asosida javob beradigan arxitektura.

### 1-qadam: Normalizatsiya (`normalizer.py`)

Har bir savol quyidagi bosqichlardan o'tadi:
- **Unicode NFC** — kompozit belgilar birlashtiriladi
- **Ko'rinmas belgilar olib tashlanadi** — nol kenglikli, BOM, yumshoq defis
- **Apostrof variantlari** — `'`, `ʼ`, `` ` `` va boshqalar bitta standart belgi (`ʻ`) ga keltiriladi
- **Kirill → Lotin transliteratsiya** — agar matn >30% kirill bo'lsa, lotin alifbosiga o'giriladi
- **Maqola raqami normalizatsiyasi** — `"168 modda"`, `"168- modda"` → `"168-modda"`
- **Bo'shliqlar qisqartiriladi**

Bu bosqich muhim, chunki foydalanuvchilar turli klaviatura va yozuv uslubida yozadi.

### 2-qadam: Intent Detection — Niyatni aniqlash (`intent.py`)

Savol uch kategoriyadan biriga ajratiladi:

| Intent | Misol | Xatti-harakat |
|---|---|---|
| `greeting` | "Salom", "Sen kimsan?" | Shunchaki LLM javob beradi, retrieval yo'q |
| `general` | "Jinoyat kodeksida nechta modda bor?" | Metadata konteksti bilan LLM |
| `legal` | "168-modda jazosi nima?" | Hybrid retrieval + LLM |

**Aniqlash mexanizmi** — regex pattern matching, ML modelsiz:
- **Fast-path**: Savol `\d+-modda` ni o'z ichiga olsa — har doim `legal`
- **Scoring**: Har bir kategoriya uchun weighted pattern matching
- **Greeting** faqat boshqa signallar bo'lmasa g'alaba qiladi

Bu yondashuv deterministik, tez va oflayn ishlaydi.

### 3-qadam: Retrieval — Hybrid BM25 + Semantic (`hybrid.py`)

Bu loyihaning markaziy texnik yangiligi. Ko'pchilik RAG tizimlari faqat semantic (vektor) qidiruvdan foydalanadi. Biz ikkisini birlashtiramiz:

#### BM25 (Keyword Search)
- **BM25Okapi** algoritmidan foydalanadi — Google kabi axtaruv tizimlarining asosi
- Startup vaqtida ChromaDB dagi barcha hujjatlar tokenizatsiya qilinib indekslanadi
- So'z to'liq mos kelganda yuqori ball beradi: masalan, `"168-modda"` so'zi bor hujjatni topadi

#### Semantic Search (Embedding)
- **BAAI/bge-m3** embedding modeli — ko'p tilli, yuqori sifatli
- Savol va hujjatlar 1024 o'lchamli vektor fazosiga o'giriladi
- ChromaDB kosinus masofasi bilan o'xshash vektorlarni topadi
- Ma'nosi o'xshash, lekin so'zi farqli savollarni ham topadi

#### Score Fusion — Ballarni birlashtirish
```
Yakuniy ball = 0.40 × BM25_ball + 0.60 × Semantic_ball
```
- BM25 va Semantic har biri [0, 1] oralig'iga normalizatsiya qilinadi
- Minimum ball chegarasi: 0.30 — past sifatli natijalar filtrlanadi
- Top-5 natija LLM ga uzatiladi

**Nima uchun hybrid?**
- BM25 yaxshi: `"168-modda"`, `"qamoq"`, `"jarima"` — aniq kalit so'zlar
- Semantic yaxshi: `"inson o'ldirganda nima bo'ladi?"` → qasddan qotillik moddasini topadi
- Birgalikda: ikkalasini ham ushlab qoladi

### 4-qadam: Prompt Building — Kontekst tayyorlash

Uch xil prompt strategiyasi:

**Greeting prompt**: Oddiy suhbat — model o'zini JK AI sifatida tanishtiradi, kodeks bo'yicha savol berishga taklif qiladi.

**General prompt**: Kodeksning umumiy ma'lumotnomasidan (metadata JSON) kontekst olinadi va savolga biriktiriladi. Masalan, jami moddalar soni, bo'limlar, qabul qilingan yil.

**Legal prompt**: Topilgan maqola parhalari raqamlanib formatlashtiriladi:
```
[1] 168-modda: Qasddan odam o'ldirish  (mos: 0.87)
[maqola matni...]

[2] 169-modda: Ehtiyotsizlik oqibatida o'ldirish  (mos: 0.72)
[maqola matni...]

Savol: [foydalanuvchi savoli]
```

Suhbat tarixi ham qo'shiladi — model oldingi xabarlarni hisobga oladi.

### 5-qadam: LLM Streaming

Ikki provider qo'llab-quvvatlanadi:

**Ollama (Lokal)** — `qwen3:8b` model:
- Internet aloqasi talab qilinmaydi
- Xususiy ma'lumotlar tashqariga chiqmaydi
- Docker container ichidan host mashinadagi Ollama ga ulanadi

**OpenRouter (API)** — har qanday model:
- GPT-4o, Claude, Gemini va boshqalar
- `OPENROUTER_API_KEY` orqali sozlanadi
- SSE streaming bilan token-by-token uzatiladi

Javob yakunlangach, LLM javobi va manba maqolalar SQLite ga saqlanadi.

---

## API Endpointlar

### Sessions
| Method | URL | Vazifasi |
|---|---|---|
| `GET` | `/api/sessions` | Barcha suhbatlar ro'yxati |
| `POST` | `/api/sessions` | Yangi suhbat yaratish |
| `GET` | `/api/sessions/search?q=...` | Sarlavha va xabar matnida qidirish |
| `GET` | `/api/sessions/{id}` | Suhbat + barcha xabarlari |
| `PUT` | `/api/sessions/{id}` | Sarlavhani tahrirlash |
| `DELETE` | `/api/sessions/{id}` | Suhbatni o'chirish |

### Chat
| Method | URL | Vazifasi |
|---|---|---|
| `POST` | `/api/chat/{id}/ask` | SSE streaming javob |
| `POST` | `/api/chat/{id}/ask/sync` | Oddiy (blokirovchi) javob |

### Meta
| Method | URL | Vazifasi |
|---|---|---|
| `GET` | `/health` | Server holati |

---

## Frontend

### Stack

| Komponent | Texnologiya |
|---|---|
| Framework | React 18 + TypeScript |
| UI library | Material UI (MUI) v6 |
| Animatsiyalar | Framer Motion |
| State management | Zustand |
| Build tool | Vite |
| Web server | Nginx |
| SSE client | `fetch()` + `ReadableStream` |

### State Management — Zustand Stores

**`chatStore`** — faol suhbat holati:
- `messages` — yuklangan xabarlar ro'yxati
- `streamingContent` — hozirgi kelayotgan token to'plami
- `isStreaming` — oqim faolmi?
- `currentSessionId` — qaysi suhbat uchun oqim bor

**`sessionStore`** — suhbatlar ro'yxati:
- `sessions` — sidebar uchun barcha suhbatlar
- `activeId` — tanlangan suhbat
- CRUD operatsiyalari

**`modelStore`** — LLM sozlamalari:
- `provider` — `local` yoki `api`
- `localModelId` / `apiModelId` — tanlangan model

### SSE Streaming arxitekturasi

```
Foydalanuvchi → InputPanel
    ↓
useSendMessage.send()
    ↓ POST /api/chat/{id}/ask
Backend SSE oqimi
    ↓
"data: {"type":"token","content":"Jinoyat..."}\n\n"
    ↓
chatStore.appendToken()  →  streamingContent yangilanadi
    ↓
ChatArea react  →  MessageBubble isStreaming={true} ko'rsatadi
    ↓
"data: {"type":"sources","sources":[...]}\n\n"
    ↓
"data: {"type":"done"}\n\n"
    ↓
chatStore.finalizeStreaming()  →  xabar messages[] ga qo'shiladi
```

Bu arxitektura foydalanuvchi javobni harf-harf ko'rishi imkonini beradi — sekin modelda ham qulay ko'rinish.

### UI/UX Dizayn — Glass Morphism

Interfeys zamonaviy "Glass Morphism" uslubida:
- **Shaffof panellar** — `backdrop-filter: blur(24px)` bilan loyqa shisha effekti
- **Ambient blobs** — fonda siljib yuruvchi gradientli sferalar (CSS keyframes)
- **Gradient ranglar** — asosiy rang `#5B8CFF → #7C4DFF` (ko'k-binafsha)
- **Sidebar** — desktop da chap tomonda siljuvchi panel; mobil da Drawer
- **Framer Motion** — xabarlar, sidebar, TopBar da animatsiyalar

### Asosiy komponentlar

```
App.tsx                   — tema, sidebar, modal holati
├── TopBar.tsx            — sidebar toggle, logo/sarlavha, yangi suhbat, tema
├── Sidebar.tsx           — suhbatlar ro'yxati, yangi suhbat, sozlamalar
│   └── SidebarContent
├── ChatArea.tsx          — xabarlar oqimi, ThinkingBubble, InputPanel
│   ├── MessageBubble.tsx — user/assistant pufaklar, markdown, manbalar, nusxa
│   ├── ThinkingBubble.tsx— LLM o'ylayotganida animatsiyali indikator
│   ├── InputPanel.tsx    — matn kiritish, yuborish/to'xtatish tugmasi
│   └── WelcomeScreen.tsx — boshlang'ich ekran, 3 ta tasodifiy savol kartasi
├── SessionSearchModal.tsx— suhbat qidirish (sarlavha + xabar matni)
└── SettingsModal.tsx     — model va provider tanlash
```

### WelcomeScreen — Boshlang'ich ekran

- 9 ta namuna savol mavjud (mulk jinoyatlari, korrupsiya, shaxsga qarshi va b.)
- Har safar 3 tasi tasodifiy tanlab ko'rsatiladi (`useMemo` + Fisher-Yates)
- Foydalanuvchi kartani bosganida savol avtomatik yuboriladi

### Qidiruv modali

- Oddiy holat: barcha suhbatlar ro'yxati (sarlavha bo'yicha)
- Qidiruv vaqtida: backend `GET /api/sessions/search?q=...` ga murojaat
- 220ms debounce — har harfda so'rov jo'natilmaydi
- Natijalar: sarlavha + suhbat matni parcha, mos kelgan qism **qalin** ko'rinadi
- Rol belgisi — 👤 foydalanuvchi yoki 🤖 assistant xabaridan ekanini ko'rsatadi

---

## Docker va Deployment

### Konteyner tuzilishi

```
docker-compose.yml
├── backend   ← Python 3.11 (multi-stage build)
│   ├── Stage 1: PyTorch + pip install (gcc bilan)
│   └── Stage 2: faqat runtime + source code
│       └── Startup: alembic migrate → uvicorn
└── frontend  ← Node 20 alpine build → nginx:1.27 serve
    ├── Stage 1: npm ci + npm run build
    └── Stage 2: /dist → /usr/share/nginx/html
```

### Volume'lar

```yaml
volumes:
  ./db:/app/db          # SQLite fayli + ChromaDB vektorlar
  hf_cache:             # HuggingFace model keshi (bge-m3)
```

ChromaDB va SQLite konteyner qayta ishga tushirilsa ham saqlanib qoladi.

### Nginx konfiguratsiyasi

Nginx ikki vazifani bajaradi:
1. `/api/*` so'rovlarni backend ga proksi qiladi
2. Barcha boshqa URL larda React SPA ga `/index.html` qaytaradi

SSE uchun maxsus sozlamalar:
```nginx
proxy_buffering    off;     # tokenlar buffer qilinmasdan o'tadi
proxy_cache        off;
proxy_read_timeout 300s;    # uzoq LLM javobi uchun
```

### Muhit o'zgaruvchilari

```env
DATABASE_URL=sqlite:////app/db/jk_assistant.db
CHROMA_DIR=/app/db/chroma
OLLAMA_HOST=http://host.docker.internal:11434
LLM_MODEL=qwen3:8b
EMBED_MODEL=BAAI/bge-m3
MIN_SCORE=0.40
OPENROUTER_API_KEY=sk-or-v1-...
```

GPU qo'llab-quvvatlash `docker-compose.yml` da kommentdan chiqarish orqali yoqiladi.

---

## Ma'lumotlar qatlami

### Jinoyat Kodeksi ma'lumotlari

`data/parsed.json` faylida barcha maqola parhalari saqlangan. Har bir hujjat:
```json
{
  "id": "chunk_168_0",
  "text": "168-modda. Qasddan odam o'ldirish...",
  "metadata": {
    "modda": "168",
    "title": "Qasddan odam o'ldirish"
  }
}
```

Bu ma'lumotlar `cli.py` yordamida ChromaDB ga yuklanadi.

### ChromaDB collection

- Collection nomi: `jk_chunks`
- Embedding o'lchami: 1024 (BAAI/bge-m3)
- Masofa metrikasi: cosine
- BM25 indeksi startup vaqtida ChromaDB dan olingan hujjatlar asosida quriladi

### `legal_metadata.json`

Kodeksning umumiy ma'lumotlari: jami moddalar soni, bo'limlar, qabul qilingan yil, tavsif. `general` intent savollari uchun ishlatiladi.

---

## Keyboard shortcuts

| Shortcut | Vazifasi |
|---|---|
| `Ctrl+Shift+O` | Yangi suhbat |
| `Ctrl+Shift+F` | Qidiruv modali |
| `Enter` | Xabar yuborish |
| `Shift+Enter` | Yangi qator |

---

## Loyihada bajarilgan ishlar

### Backend
- [x] FastAPI ilovasi, CORS, lifespan (startup pre-load)
- [x] SQLite + SQLAlchemy + Alembic migratsiyalari
- [x] Sessions va Messages CRUD API
- [x] SSE streaming endpoint (thread + asyncio queue)
- [x] Matn normalizatori (Kirill→Lotin, apostroflar, maqola raqami)
- [x] Intent detector: `greeting`, `general`, `legal` (regex, ML-siz)
- [x] Hybrid retrieval: BM25 + semantic score fusion
- [x] Uch xil prompt strategiyasi
- [x] Ollama lokal model integratsiyasi
- [x] OpenRouter API integratsiyasi (SSE + fallback)
- [x] Sessions qidiruv endpoint (sarlavha + xabar matni)
- [x] Multi-stage Docker build

### Frontend
- [x] React 18 + TypeScript + MUI v6 + Framer Motion
- [x] SSE streaming client (token-by-token)
- [x] Zustand state management (chat, session, model stores)
- [x] Glass Morphism UI dizayn
- [x] Responsive sidebar (desktop: siljuvchi panel, mobil: Drawer)
- [x] WelcomeScreen (3 ta tasodifiy namuna savol)
- [x] Markdown rendering (kod bloki, ro'yxat, blockquote)
- [x] Manbalar ko'rsatish (maqola chips, togglable)
- [x] ThinkingBubble (animatsiyali kutish indikatori)
- [x] Nusxalash tugmasi (bubble ichida, hover da ko'rinadi)
- [x] Suhbat qidirish (debounce, highlight, snippet)
- [x] Sozlamalar modali (provider va model tanlash)
- [x] Qorong'u/yorug' tema (localStorage da saqlanadi)
- [x] Nginx Docker image

---

## Savollarga tayyorgarlik

**"Nima uchun RAG, fine-tuning emas?"**
Fine-tuning qimmat, vaqt talab qiladi va model "esidan chiqaradi" (catastrophic forgetting). RAG esa real hujjatni kontekstga kiritadi — javob har doim maqola matniga asoslanadi, yangilanishi oson.

**"Nima uchun hybrid retrieval?"**
Faqat semantic: `"168-modda"` desa boshqa maqolalar ham chiqishi mumkin.
Faqat BM25: `"odam o'ldirsam nima bo'ladi?"` desa qasddan qotillik moddasini topmaydi.
Birgalikda: ikkalasini ham ushlab qoladi.

**"Gallyutsinatsiya qanday oldini olinadi?"**
Prompt qoidasi: `"FAQAT quyida berilgan maqolalar matniga asoslanib javob bering"`. Agar topilmasa — `"Berilgan maqolalarda bu haqda ma'lumot yo'q"` deydi. Manba maqolalar har doim UI da ko'rsatiladi.

**"Lokal model vs API — farqi nima?"**
Lokal (Ollama/Qwen3): Internet yo'q, xususiy, bepul. API (OpenRouter): Tezroq, kuchliroq, lekin to'lovli va internet talab qiladi.

**"Suhbat tarixi qanday ishlaydi?"**
Har bir xabar SQLite da saqlanadi. Savol kelganda oxirgi 10 xabar history sifatida LLM ga uzatiladi — model suhbat kontekstini tushunadi.

**"Ko'p foydalanuvchi bir vaqtda ishlatsa?"**
FastAPI async + SSE threading arxitekturasi bir vaqtda ko'p so'rovni qo'llab-quvvatlaydi. SQLite bir vaqtda bir yozuv uchun lock qo'llaydi — katta yuklanmada PostgreSQL ga o'tish mumkin (DATABASE_URL sozlamasini o'zgartirish kifoya).
