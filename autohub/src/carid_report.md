# CarID — Full Technical Report
**AI Car Identification & Chat System**
*Generated: June 2026 | Version 5.0*

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Backend — main.py](#3-backend--mainpy)
4. [Backend API Endpoints](#4-backend-api-endpoints)
5. [AI Models & Prompts](#5-ai-models--prompts)
6. [Frontend — car_id_chat_app.html](#6-frontend--car_id_chat_apphtml)
7. [External APIs](#7-external-apis)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Environment Variables](#9-environment-variables)

---

## 1. System Overview

CarID is an AI-powered automotive assistant with three core capabilities:

| Capability | Description |
|---|---|
| **Car Identification** | Upload any car photo → CarNet detects brand/model/generation, Serper enriches with real data, Groq generates a human-like response |
| **Conversational Chat** | Full memory chat with intent detection (compare, buy, clarify), Arabic/English bilingual, Egyptian market awareness |
| **Damage Detection** | Upload a damage photo → Groq vision analyses severity, infers hidden internal damage, estimates repair costs |

---

## 2. Architecture

```
User Browser (car_id_chat_app.html)
         │
         ├── CarID Backend (HuggingFace Space — main.py)
         │       ├── POST /identify   → CarNet + Serper + Groq
         │       ├── POST /chat       → Groq (llama / allam)
         │       ├── POST /chat/stream→ Groq SSE streaming
         │       ├── POST /compare    → Serper × N + Groq
         │       └── POST /damage     → Groq vision (llama-4-scout)
         │
         └── AutoHub Backend (Railway — graduation project)
                 ├── GET  /api/auth/me
                 ├── GET  /api/ai/conversations
                 ├── GET  /api/ai/conversations/{id}/messages
                 ├── POST /api/ai/conversations
                 ├── DELETE /api/ai/conversations/{id}
                 ├── POST /api/ai/chat          (saves messages)
                 └── GET  /api/posts?search=    (Find on AutoHub)
```

---

## 3. Backend — main.py

### 3.1 File Stats
- **Lines:** ~1,966
- **Framework:** FastAPI 0.111+
- **Python:** 3.11+
- **Deployment:** HuggingFace Spaces (Docker)

### 3.2 Dependencies
```
fastapi, uvicorn, httpx, requests, Pillow, pillow-heif,
python-dotenv, pydantic
```

### 3.3 Pydantic Models

#### `HistoryMessage`
```python
role:    str    # "user" | "assistant"
content: str
```

#### `BuyerProfile`
```python
budget:          str   # e.g. "Under $15k" | "أقل من 500,000 EGP"
priority:        str   # appearance | cost | reliability | performance
usage:           str   # family | single | commuting | off-road | mixed
fuel_pref:       str   # petrol | diesel | electric | hybrid | any
body_pref:       str   # sedan | SUV | hatchback | coupe | any
location:        str   # "Egypt" | "Cairo" | "UAE" etc.
currency:        str   # "EGP" | "USD" | "AED" | "SAR"
questions_asked: int
```

#### `ChatRequest`
```python
question:       str                    # User message (English)
message:        str                    # Alias (Next.js frontend uses this)
conversationId: str                    # AutoHub conversation ID
history:        list[HistoryMessage]   # Last 14 messages for Groq context
car_context:    dict                   # {brand, model, generation, color}
user_location:  str                    # "Egypt" | "UAE" etc.
user_lang:      str                    # "ar" | "en" | ""
buyer_mode:     bool
buyer_profile:  BuyerProfile
```

#### `ChatResponse`
```python
answer:          str
reply:           str          # Same as answer (alias for compatibility)
intent:          str          # "chat" | "clarify" | "compare" | "buyer" | "recommend"
options:         list[str]    # Tappable option buttons (buyer advisor + clarify)
buyer_mode:      bool
buyer_profile:   BuyerProfile
user_location:   str          # Echoed back for frontend to persist
user_lang:       str          # Echoed back
compare_data:    list[dict]   # Populated when intent == "compare"
recommendations: list[str]    # Car names for chips when intent == "recommend"
```

#### `DamageArea`
```python
component:       str   # e.g. "front bumper", "hood", "windshield"
severity:        str   # minor | moderate | severe | critical
description:     str
repair_cost_min: int   # USD
repair_cost_max: int   # USD
is_internal:     bool
```

#### `InternalRisk`
```python
component:       str   # e.g. "radiator", "airbag sensor", "CV axle"
likelihood:      str   # likely | possible | unlikely
reason:          str   # mechanical causation explanation
repair_cost_min: int
repair_cost_max: int
```

#### `DamageReport`
```python
safe_to_drive:     bool
overall_severity:  str          # minor | moderate | severe | critical
damage_areas:      list[DamageArea]
internal_risks:    list[InternalRisk]
total_cost_min:    int
total_cost_max:    int
priority_actions:  list[str]
message:           str          # Human-readable narrative from Groq
```

---

## 4. Backend API Endpoints

### 4.1 `GET /health`
**Purpose:** Liveness check
**Response:**
```json
{
  "status": "ok",
  "groq_key_set": true,
  "serper_key_set": true,
  "pipeline": "carnet+serper+groq+memory+compare+buyer+damage"
}
```

---

### 4.2 `GET /`
**Purpose:** Serves the HTML frontend file
**Response:** `text/html` — the full `car_id_chat_app.html`

---

### 4.3 `POST /identify`
**Purpose:** Identify a car from an uploaded photo

**Request:** `multipart/form-data`
```
file: <image file>   # JPG, PNG, WEBP, HEIC — max 20MB
```

**Pipeline:**
```
1. _prepare_image() → JPEG, center-crop 16:9, resize 1500×844, compress <1MB
2. _call_carnet()   → POST to carnet.ai/recognize-file → {brand, model, generation, color, angle, confidence}
3. _serper()        → "{brand} {model} {generation} specs reliability pros cons review"
4. _groq()          → warm human-like response (English model)
```

**Response:**
```json
{
  "status": "known | uncertain | unknown",
  "prediction": "BMW 3 Series",
  "confidence": 92.5,
  "message": "That's a BMW 3 Series! ...",
  "details": {
    "brand": "BMW",
    "model": "3 Series",
    "generation": "G20",
    "color": "White",
    "angle": "front"
  },
  "web_source": "https://...",
  "query_time_ms": 1243.5
}
```

**Status rules:**
- `known` → confidence ≥ 75%
- `uncertain` → confidence < 75%
- `unknown` → CarNet returned no brand

---

### 4.4 `POST /compare`
**Purpose:** Side-by-side structured comparison of 2–4 cars

**Request:**
```json
{
  "cars": ["BMW E90", "Alfa Romeo 156"],
  "history": [],
  "aspect": "reliability"
}
```

**Pipeline:**
```
For each car:
  1. _serper() × 3 → specs, price, review snippets
  2. _groq_json()  → extract JSON {name, price_range, engine, fuel, reliability, pros, cons, verdict}
3. _compare_summary() → human verdict paragraph
```

**Response:**
```json
{
  "cars": [
    {
      "name": "BMW E90",
      "price_range": "$8,000 – $15,000",
      "engine": "2.0L I4 / 3.0L I6, 148–265hp",
      "fuel": "Petrol",
      "reliability": "RepairPal rates 2.5/5, above-average repair costs",
      "pros": "• Excellent driving dynamics • Premium interior • Engine variety",
      "cons": "• Expensive maintenance • N54 engine issues • High insurance",
      "verdict": "Best for driving enthusiasts who can afford German maintenance costs"
    }
  ],
  "summary": "The BMW E90 wins on driving dynamics..."
}
```

---

### 4.5 `POST /damage`
**Purpose:** Analyse car damage from a photo

**Request:** `multipart/form-data`
```
file:        <image file>   # Optional
description: <string>       # Optional — at least one required
```

**Pipeline:**
```
1. _prepare_image()             → normalise image
2. _groq_vision()               → llama-4-scout reads image → structured JSON
   IF vision fails:
3. _call_carnet()               → identify car
4. _groq_json()                 → text-only damage assessment from description
5. Force safe_to_drive=False    → if any "likely" risk involves brake/steering/fuel/airbag/battery
6. Recompute costs              → external areas + "likely" internal risks only
7. _damage_narrative()          → Groq generates human summary with emojis
```

**Response:** `DamageReport`
```json
{
  "safe_to_drive": false,
  "overall_severity": "severe",
  "damage_areas": [
    {
      "component": "front bumper",
      "severity": "severe",
      "description": "Heavy impact, structural deformation visible",
      "repair_cost_min": 1500,
      "repair_cost_max": 3000,
      "is_internal": false
    }
  ],
  "internal_risks": [
    {
      "component": "radiator",
      "likelihood": "likely",
      "reason": "Front-end collision typically damages the radiator behind the bumper",
      "repair_cost_min": 500,
      "repair_cost_max": 1200
    }
  ],
  "total_cost_min": 2000,
  "total_cost_max": 4200,
  "priority_actions": [
    "Do not drive — safety risk",
    "Have radiator and cooling system inspected immediately",
    "Check airbag deployment sensors"
  ],
  "message": "🔴 SEVERE DAMAGE\n⛔ DO NOT DRIVE..."
}
```

**Severity scale:**
| Level | Meaning | Safe to drive | Typical cost |
|---|---|---|---|
| 🟢 Minor | Cosmetic only | Yes | < $1,000 |
| 🟡 Moderate | Functional impact | Drive carefully | $500–$5,000 |
| 🔴 Severe | Safety risk | No | $3,000–$15,000 |
| ⚫ Critical | Total loss likely | No | $10,000+ |

---

### 4.6 `POST /chat`
**Purpose:** Full conversational chat with memory, intent routing, bilingual support

**Request:** `ChatRequest` (JSON)

**Intent detection logic:**
```
buyer_mode=True           → buyer advisor flow
_BUY_RE match             → "want to buy", "looking for a car"...
_BUY_AR_RE match          → "عايز اشتري", "محتاج سيارة"...
_BUY_AR_RE2 match         → "شراء سيارة", "انصحني بسيارة"...
_COMPARE_RE match         → "compare", "vs", "versus"...
_COMPARE_AR_RE match      → "قارن", "مقارنة", "الفرق بين"...
Two brand names detected  → compare
Vague + no context        → clarify
Default                   → chat
```

**Intent: `buyer`** — Progressive Q&A flow
```
Questions asked (English):
1. Budget: Under $15k | $15k–$30k | $30k–$50k | Over $50k
2. Priority: Looks & style | Low cost | Reliability | Performance
3. Usage: The whole family | Just me | Daily commuting | Off-road
4. Fuel: Petrol | Diesel | Electric | Hybrid
5. Body: SUV/Crossover | Sedan | Hatchback | Coupe/No preference

Questions asked (Egyptian Arabic — when user is in Egypt):
1. ما هي ميزانيتك؟: أقل من 500,000 EGP | 500k–1M EGP | 1M–2M EGP | أكثر من 2M EGP
2. ما الأهم بالنسبة لك؟: الشكل والمظهر | توفير الوقود | الموثوقية | الأداء
3. السيارة هتكون لمين؟: للعيلة كلها | بس أنا | التنقل اليومي | مختلط
4. نوع الوقود؟: بنزين | ديزل | هايبرد | مش مهم
5. هيكل السيارة؟: SUV | سيدان | هاتشباك | مش مهم
```

**Intent: `compare`** — Returns `compare_data` list + summary
**Intent: `clarify`** — Returns question + 4 option buttons
**Intent: `recommend`** — Returns recommendations + car name chips
**Intent: `chat`** — Normal conversational reply with web context

**Response:** `ChatResponse`

---

### 4.7 `POST /chat/stream`
**Purpose:** Streaming version of `/chat` using Server-Sent Events

**For `intent: chat`** → streams tokens via SSE:
```
data: {"token": "That"}
data: {"token": "'s"}
data: {"token": " a"}
...
data: {"done": true}
```

**For `intent: buyer | compare | clarify`** → falls back to `/chat` and wraps result in a single done event:
```
data: {"done": true, "answer": "...", "intent": "buyer", "options": [...]}
```

---

## 5. AI Models & Prompts

### 5.1 Models Used

| Model | Provider | Used for | Language |
|---|---|---|---|
| `llama-3.1-8b-instant` | Groq | English chat, JSON extraction | English |
| `allam-2-7b` | Groq (Saudi NCAI) | Arabic conversational responses | Arabic |
| `meta-llama/llama-4-scout-17b-16e-instruct` | Groq | Damage image vision analysis | Any |

**Model selection logic:**
- `_groq(messages, lang="ar")` → uses `allam-2-7b`
- `_groq(messages, lang="en")` → uses `llama-3.1-8b-instant`
- `_groq_json(messages)` → always `llama-3.1-8b-instant` (JSON reliability)
- `_groq_vision(image, ...)` → always `llama-4-scout-17b`

### 5.2 System Prompts

#### Normal Chat Prompt
```
You are CarID — a warm, funny, deeply knowledgeable car expert who talks
exactly like a real human friend who loves cars.
You remember EVERYTHING said in this conversation and naturally weave it into your answers.
You use natural phrases: 'honestly', 'the thing is', 'good news', 'to be fair', 'personally I'd…'.
You're direct and give real opinions.

+ car_note    → "CAR IN FOCUS: BMW 3 Series (color: White). Short follow-ups refer to THIS car."
+ curr_note   → "CURRENCY RULE: Show prices in EGP. 1 USD = 50 EGP. Round to nearest 1,000."
+ lang_note   → "LANGUAGE RULE: Respond entirely in Arabic. Brand names stay in Latin script."
+ market_note → EGYPT_TAX_KNOWLEDGE (full 600-char Egyptian market rules)

RULES:
- Never start with 'Answer:', 'Based on results', or 'According to'.
- Reference earlier conversation when relevant.
- When user is in Egypt: use real Egyptian dealer prices, not converted US MSRP.
- Only recommend cars available in the user's local market.
- 3-5 sentences unless user asks for more.
- End with a natural, relevant follow-up question.
- Never invent facts.
```

#### Car Data Extraction Prompt (`_fetch_car_data`)
```
You are a car data extraction engine.
Return ONLY a valid JSON object — no markdown, no preamble.
+ short Egypt market note (if Egyptian user)
+ currency note

JSON keys required:
  name, price_range, engine, fuel (Petrol|Diesel|Electric|Hybrid|Plug-in Hybrid),
  reliability (1 sentence), pros (3 bullets, • separator),
  cons (3 bullets, • separator), verdict (1 sentence)

STRICT RULES:
- fuel: NEVER put a model name — only: Petrol, Diesel, Electric, Hybrid, Plug-in Hybrid
- price_range: NEVER put '—' if any price appears in snippets — find it
- engine: include displacement AND power if found
- Only use '—' if genuinely absent from ALL snippets
- Do NOT truncate. Complete the entire JSON object.
```

#### Buyer Recommendations Prompt
```
You are CarID — a knowledgeable car-buying advisor.
{location_note} {currency_note}
🚨 BUDGET CEILING: Max is {X} EGP/USD. Every car MUST be below this.
{egypt_cars_hint} → "Cars available in Egypt at this budget: Toyota Corolla, Kia Cerato..."
{market_knowledge} → full Egyptian market rules
{arabic_note} → "Respond entirely in Arabic" (if lang=ar)

Recommend exactly 3 cars.
Budget is the MOST IMPORTANT constraint — never violate it.
Only recommend cars actually available in the user's country.
End with: 'Want me to go deeper on any of these, or compare two of them?'
```

#### Compare Summary Prompt
```
You are CarID — a warm, opinionated car expert.
Max 3 sentences. Give a clear winner or recommendation.
+ currency note (EGP for Egypt)
+ language note (Arabic if lang=ar)
```

#### Damage Analysis Prompt (`_DAMAGE_SYSTEM`)
```
You are an expert automotive damage assessor with 20+ years experience.
Return ONLY a valid JSON object.

Severity: minor (<$1k, cosmetic) | moderate ($500-5k) | severe ($3k-15k, unsafe) | critical ($10k+)

Internal risk rules:
- Front collision → radiator, AC condenser, engine mounts, steering rack, airbag sensors
- Hood buckled   → engine block, transmission, EV battery
- Side impact    → door beams, seat belt pretensioners, side curtain airbags, fuel lines
- Rear impact    → fuel tank, exhaust, rear suspension
- Undercarriage  → oil pan, catalytic converter, transmission oil pan
- Wheel damage   → CV axle, wheel bearing, brake caliper, ABS sensor
- Deployed airbags → crash sensors, SRS/ECU, steering column

safe_to_drive=false if:
  - Any area is severe/critical
  - Any "likely" internal risk involves: brake, steering, fuel, airbag, SRS,
    suspension, axle, engine mount, subframe, firewall, battery

total_cost = external + "likely" internal only
priority_actions: top 3 most urgent actions
```

#### Damage Narrative Prompt (`_DAMAGE_NARRATIVE_SYSTEM`)
```
You are CarID — a warm, knowledgeable automotive expert.
Turn the damage JSON into a human-friendly summary.

FORMAT:
1. Severity headline with emoji: 🟢 Minor | 🟡 Moderate | 🔴 Severe | ⚫ Critical
2. "⛔ DO NOT DRIVE" warning if safe_to_drive=false
3. Each damage area with severity emoji
4. "🔧 Suspected Internal Damage" section:
   🔴 likely | 🟡 possible | 🔵 unlikely
5. Total cost range
6. Top 3 priority actions numbered
7. "⚠️ Internal damage estimates are based on mechanical inference — always get a workshop inspection"
Max 250 words.
```

### 5.3 Egyptian Market Knowledge

```
EGYPT_TAX_KNOWLEDGE (full — used in chat + recommendations):
  Import Tax: <1600cc = 40-60% | 1600-2000cc = 80-100% | >2000cc = 100-135%
  Price reality: $20k USD car = 1,800,000-2,200,000 EGP (NOT USD×50)
  Popular brands: Toyota, Hyundai, Kia, MG, Chery, Renault, Nissan, Geely, Lada
  Unavailable: Tesla, Rivian, Subaru, Chrysler, Dodge, Genesis, Alfa Romeo

EGYPT_TAX_KNOWLEDGE_SHORT (condensed — used in compare table fetch):
  Same key facts in 3 lines to avoid crowding the JSON prompt

EGYPT_MARKET (car lists by budget tier):
  under_500k:   Lada Vesta, Chery Tiggo 4, JAC J7, Geely Emgrand, MG 5
  500k_1000k:   Hyundai i10/i20, Kia Picanto/Rio, Renault Logan/Duster, MG ZS
  1000k_1800k:  Toyota Corolla, Hyundai Elantra, Kia Cerato, MG HS, Skoda Octavia
  1800k_3500k:  Toyota Camry/RAV4, Hyundai Tucson, Kia Sportage/Sorento
  over_3500k:   BMW 3/5, Mercedes C/E, Audi A4/Q5, Toyota Land Cruiser, Lexus ES
```

---

## 6. Frontend — car_id_chat_app.html

### 6.1 File Stats
- **Lines:** ~1,444
- **Type:** Single-file vanilla HTML/CSS/JS
- **No frameworks** — pure browser APIs

### 6.2 Global State Variables

```javascript
let sessions     = []     // All chat sessions with their messages + memory
let activeId     = null   // Currently open session ID
let pendingB64   = null   // Image waiting to be sent (base64)
let pendingType  = null   // Image MIME type
let isStreaming  = false  // Whether a response is being streamed
let userLocation = ''     // Persisted country/city across entire session
let userLang     = 'en'  // 'ar' | 'en' — auto-detected from user input
let pendingDamageB64  = null   // Damage image waiting for intent selection
let pendingDamageType = null
```

### 6.3 Session Object Structure

Each session in `sessions[]`:
```javascript
{
  id:           string,          // Local timestamp ID or AutoHub conv ID
  title:        string,          // First message text (truncated to 30 chars)
  history:      [{role, content}], // Last 24 messages sent to /chat
  carCtx:       {brand, model, generation, color} | null,
  buyerMode:    boolean,
  buyerProfile: BuyerProfile object,
  convId:       string,          // AutoHub conversation ID for persistence
  updatedAt:    timestamp,
}
```

### 6.4 Message Types Rendered

| Type | Description | Rendered as |
|---|---|---|
| `text` | Normal bot/user text | Bubble with optional RTL |
| `clarify` | Clarification question | Orange left-border bubble |
| `image` | User uploaded image | `<img>` in bubble |
| `upload-zone` | Click-to-upload area | Dashed bordered zone |
| `chips` | Quick-reply buttons | Pill buttons row |
| `options` | A/B/C/D choice buttons | Lettered vertical buttons |
| `result-card` | Car identification | Card with confidence bar + specs |
| `compare` | Compare table | Full HTML table with summary |
| `damage` | Damage report | Severity card with cost breakdown |
| `system-note` | Info message | Centered dashed pill |
| `starter-cards` | Welcome grid | 2-col clickable cards |

### 6.5 Key JavaScript Functions

#### Image Handling
```javascript
showIntentPicker(b64, imgType, isDamage)
// Shows 6-option intent picker after any image upload
// isDamage=false → car intents (Identify, Full specs, Worth buying?, etc.)
// isDamage=true  → damage intents (Full report, Safe to drive?, etc.)

triggerCarIntent(prompt, b64, imgType)
// Dispatches to handleImageWithIntent()

handleImageWithIntent(b64, imgType, intentPrompt)
// "Identify this car" → POST /identify
// All others → POST /identify (silently) then POST /chat with car label

dispatchDamageAction(action)
// POST /damage with description based on action type
```

#### Text Chat
```javascript
handleText(text)
// Detects Arabic → sets userLang='ar'
// Sends to POST /chat/stream (tries streaming first)
// Falls back to POST /chat
// Routes result by intent: compare → table, clarify → orange bubble,
//   recommend → chips, buyer → option buttons, chat → animated text
```

#### Card Builders
```javascript
buildResultCard(car, confidence, status)
// Result card with: badge, car name, confidence bar, spec rows, pros/cons, AutoHub btn

buildCompareTable(cars, summary)
// HTML table: price/engine/fuel/reliability/pros/cons/verdict rows
// Summary box in blue below table

buildDamageCard(report)
// DO NOT DRIVE banner, damage areas with severity badges,
// internal risks with likelihood badges, disclaimer, priority actions

buildAutoHubBtn(brand, model)
// Blue "Find on AutoHub" button linking to /api/posts?search=
```

#### Arabic Support
```javascript
const ARABIC_RE = /[\u0600-\u06FF]/
isArabic(text)     // Detects Arabic characters
detectLang(text)   // Returns 'ar' | 'en'

// addBubble() auto-applies dir="rtl" for Arabic content
// animateText() applies dir="rtl" for streaming Arabic
// handleKey() flips textarea direction on Arabic input
```

#### Voice Input
```javascript
toggleVoice()
// Uses browser SpeechRecognition API
// Mic button pulses red while recording
// Auto-sends when speech ends
// Falls back gracefully if browser doesn't support
```

#### Animated Text
```javascript
animateText(text)
// Reveals text word-by-word at 18ms intervals
// Shows blinking cursor ▋ while streaming
// Applies RTL for Arabic content
```

### 6.6 Intent Picker Options

**Car Photo Intents:**
```
🔍 Identify this car     → "Identify this car — what is the brand, model, year and generation?"
📋 Full specs            → "Give me the full specs of this car — engine, power, dimensions and fuel type."
🛒 Is it worth buying?  → "Is this car worth buying? Give me reliability, value and what to check."
⚠️ Common problems      → "What are the common problems and known issues with this car?"
💰 Price & market value → "What is the current market value and price range for this car?"
🔧 Maintenance tips     → "What are the maintenance tips, service intervals and running costs for this car?"
```

**Damage Photo Intents:**
```
📋 Full damage report    → Full /damage endpoint call + card rendered
🚦 Is it safe to drive? → "Focus only on whether this car is safe to drive." (danger style)
💸 Repair cost estimate  → "Focus on repair cost estimation for all visible damage."
🔧 Hidden & internal     → "Focus on hidden and internal damage that might not be visible."
🛒 Should I buy this?   → "Assess whether this car is worth buying given the damage."
⚡ Quick summary         → "Give a brief 2-3 sentence summary of the key damage only."
```

---

## 7. External APIs

### 7.1 CarID Backend (HuggingFace Space)

| Endpoint | Method | Auth | Called from |
|---|---|---|---|
| `/identify` | POST | None | Image upload |
| `/chat` | POST | None | Every text message |
| `/chat/stream` | POST | None | Every text (tries first) |
| `/compare` | POST | None | Explicit compare |
| `/damage` | POST | None | Damage scan button |

### 7.2 AutoHub Backend (Railway)

Base: `https://graduation-project-autohub-production.up.railway.app`
Auth: `Authorization: Bearer <token>` from `localStorage.getItem('autohub_token')`

| Endpoint | Method | When called | Purpose |
|---|---|---|---|
| `/api/auth/me` | GET | Page load | Get user name for sidebar |
| `/api/ai/conversations` | GET | Page load | Load conversation list |
| `/api/ai/conversations` | POST | New Chat click | Create conversation on backend |
| `/api/ai/conversations/{id}/messages` | GET | Sidebar click | Load past messages + seed history |
| `/api/ai/conversations/{id}` | DELETE | Trash button | Delete conversation |
| `/api/ai/chat` | POST | After every AI reply | Save exchange to DB |
| `/api/posts?search=&limit=3` | GET | After identify/compare | "Find on AutoHub" button search |

### 7.3 Third-Party Services (Backend)

| Service | Used for | Cost | Limit |
|---|---|---|---|
| **CarNet** (carnet.ai) | Brand/model/generation detection from images | Free (web scraping) | Unofficial |
| **Serper** (serper.dev) | Google web search for car specs/prices/reviews | Free tier | 2,500/month |
| **Groq** (console.groq.com) | LLM inference for chat, extraction, vision | Free tier | Rate limited |
| **Nominatim** (OSM) | Reverse geocoding for browser location | Free | 1 req/sec |
| **ipapi.co** | IP-based country detection | Free | 45k/month |

---

## 8. Data Flow Diagrams

### 8.1 Image Identification Flow
```
User uploads photo
      │
      ▼
showIntentPicker() → 6 options appear
      │
User clicks "Identify this car"
      │
      ▼
POST /identify (CarID)
  ├── _prepare_image()    → JPEG 1500×844 <1MB
  ├── _call_carnet()      → brand + model + confidence
  ├── _serper() ×1        → specs/review snippets
  └── _groq(lang=en)      → human-like response
      │
      ▼
buildResultCard() rendered
+ "Find on AutoHub" button
+ Smart context chips
      │
      ▼
persistMessage() → POST /api/ai/chat (save to DB)
```

### 8.2 Buyer Advisor Flow (Egypt example)
```
User: "عايزة اشتري عربية"
      │
_detect_intent() → _BUY_AR_RE matches → "buyer"
user_lang = "ar" (Arabic detected)
      │
      ▼
Opening (Arabic): "أهلاً! 😊 يسعدني أساعدك..."
Options: [أقل من 500,000 EGP] [500k-1M EGP] [1M-2M EGP] [أكثر من 2M EGP]
      │
User clicks "500k – 1M EGP"
      │
_extract_profile() → BUDGET_MAP lookup → budget = "500k – 1M EGP" ✓
      │
Next question (Arabic): "ما الأهم بالنسبة لك في السيارة؟"
Options: [الشكل والمظهر] [توفير الوقود] [الموثوقية] [الأداء]
      │
... (4 questions total)
      │
_profile_complete() → filled >= 4 → True
      │
_generate_recommendations(profile, history, lang="ar")
  ├── _egypt_budget_cars("500k-1M EGP") → [Hyundai i10, Kia Picanto, MG ZS...]
  ├── budget_ceiling_note → "Max 1,000,000 EGP"
  ├── egypt_cars_hint → recommended car list
  └── _groq(lang="ar") → allam-2-7b → Arabic recommendations with EGP prices
      │
      ▼
3 car recommendations in Arabic with EGP prices
```

### 8.3 Compare Flow
```
User: "قارن بين Toyota Corolla و Kia Cerato"
      │
_COMPARE_AR_RE matches → intent = "compare"
_extract_car_names() → ["Toyota Corolla", "Kia Cerato"]
      │
For each car (×2 = 6 Serper calls total):
  _serper("Toyota Corolla specs engine مواصفات محرك")
  _serper("Toyota Corolla سعر مصر price Egypt 2024")
  _serper("Toyota Corolla pros cons مراجعة عيوب")
  _groq_json() → extract {price_range, engine, fuel, reliability, pros, cons, verdict}
      │
_compare_summary(cars_data, aspect, history, user_location, lang)
  _groq(lang="ar") → Arabic comparison verdict
      │
buildCompareTable() → HTML table
+ AutoHub search buttons for each car
+ Chips: "Tell me more about Toyota Corolla", etc.
```

---

## 9. Environment Variables

Set in HuggingFace Spaces → Settings → Repository Secrets:

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | console.groq.com | All Groq LLM calls |
| `SERPER_API_KEY` | ✅ Yes | serper.dev | Web search for car data |
| `HTML_PATH` | ❌ Optional | — | Path to HTML file (default: `/app/car_id_chat_app.html`) |

---

## Appendix — Currency Conversion Table

| Country/City | Currency | USD Rate |
|---|---|---|
| Egypt, Cairo, Alexandria | EGP | 1 USD = 50 EGP |
| UAE, Dubai, Abu Dhabi | AED | 1 USD = 3.67 AED |
| Saudi Arabia, Riyadh, Jeddah | SAR | 1 USD = 3.75 SAR |
| Jordan, Amman | JOD | 1 USD = 0.71 JOD |
| Kuwait | KWD | 1 USD = 0.31 KWD |
| Qatar, Doha | QAR | 1 USD = 3.64 QAR |
| Bahrain | BHD | 1 USD = 0.38 BHD |
| Oman | OMR | 1 USD = 0.38 OMR |
| Morocco | MAD | 1 USD = 10 MAD |
| UK, England | GBP | 1 USD = 0.79 GBP |
| Europe, Germany, France | EUR | 1 USD = 0.92 EUR |
| Turkey | TRY | 1 USD = 32 TRY |
| India | INR | 1 USD = 83 INR |
| Pakistan | PKR | 1 USD = 278 PKR |
| Nigeria | NGN | 1 USD = 1,550 NGN |
| Kenya | KES | 1 USD = 130 KES |
