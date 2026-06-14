# Aurora — AI Voice Health Companion

A voice-first mobile health app built with React Native (Expo SDK 56). Track hydration, sleep, habits, and nutrition through natural conversation with an AI companion powered by Gemini, Supabase, and Deepgram.

---

## Features

- **Voice AI companion** — speak naturally to log water, sleep, meals, and habits
- **Auto-stop silence detection** — recording stops automatically after 3 seconds of silence (real RMS level detection on web, timer on native)
- **Two-step AI pipeline** — Gemini classifies intent → Supabase executes tools → Gemini generates a personalised response
- **Groq fallback** — if Gemini is unavailable, Groq (Llama 3.3 70B) takes over automatically, then OpenAI, then deterministic replies
- **Animated health score** — ring with live beating heart + travelling ECG pulse, color-coded to score
- **Supabase backend** — Row Level Security on all 9 tables, service role key never leaves the server
- **Google OAuth + email/password auth** — via Supabase Auth
- **Cross-platform** — Android, iOS, and web (Expo)
- **EAS Build ready** — build APK without Android Studio

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.85 + Expo SDK 56 |
| Language | TypeScript (strict) |
| Navigation | React Navigation v7 (conditional auth flow) |
| Backend API | Node.js + Express 5 |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email + Google OAuth) |
| AI — Intent & Response | Google Gemini 2.0 Flash Lite |
| AI — Fallback | Groq (Llama 3.3 70B) → OpenAI → Deterministic |
| Voice STT | Deepgram Nova-2 / OpenAI Whisper |
| Voice TTS | expo-speech |
| Audio recording | expo-audio (native) + MediaRecorder + AnalyserNode (web) |
| Animations | React Native Animated API + react-native-svg |
| Deployment | Render (API server) + EAS Build (APK) |

---

## Project Structure

```
Aurora/
├── src/
│   ├── screens/          # Home, Companion, Sleep, Nutrition, Habits, Profile…
│   ├── components/       # Shared UI — PremiumBottomTabBar, visuals, AnimatedSvg
│   ├── hooks/            # useVoiceRecorder — cross-platform VAD + silence detection
│   ├── navigation/       # AppNavigator — conditional screen registration auth flow
│   ├── services/         # agentApi.ts — text + voice API calls to backend
│   ├── store/            # HealthContext — global state + fire-and-forget Supabase sync
│   ├── lib/              # Supabase client, push notifications
│   ├── theme/            # Design tokens (colors, spacing, typography)
│   └── types/            # TypeScript types (health, navigation)
├── server/
│   └── index.js          # Express API — two-step AI pipeline, Supabase tool functions
├── supabase/
│   └── schema.sql        # Full PostgreSQL schema + RLS policies + auto-profile trigger
├── assets/               # App icons, splash screen
├── .env.example          # Environment variable template (safe to commit)
├── app.json              # Expo app config
├── eas.json              # EAS Build profiles (preview APK, production)
└── render.yaml           # Render.com one-click deploy config
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) project
- A free [Gemini API key](https://aistudio.google.com)
- A free [Deepgram API key](https://deepgram.com)
- A free [Groq API key](https://console.groq.com)

### 1. Clone and install

```bash
git clone https://github.com/your-username/aurora.git
cd aurora
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

```env
# Points the Expo app at the API server
EXPO_PUBLIC_API_URL=http://localhost:4000

# Supabase (get from Supabase → Project Settings → API)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server only, never expose

# AI providers
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
DEEPGRAM_API_KEY=your-deepgram-key
OPENAI_API_KEY=                                    # optional — enables Whisper STT
```

### 3. Set up the database

1. Go to **Supabase dashboard → SQL Editor**
2. Paste the full contents of [`supabase/schema.sql`](supabase/schema.sql)
3. Click **Run**

This creates 9 tables, all indexes, RLS policies, and an auto-profile trigger that fires on every new signup.

If you get "type already exists" errors, run this first to reset enums:

```sql
drop type if exists gender_type cascade;
drop type if exists activity_level_type cascade;
drop type if exists habit_period_type cascade;
drop type if exists meal_type cascade;
drop type if exists chat_role_type cascade;
```

### 4. Run locally

```bash
npm run dev          # starts API server + Expo together
```

Or separately:

```bash
npm run api          # Express API on http://localhost:4000
npm start            # Expo dev server
```

**On a physical Android device:** update `.env` with your machine's local IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000
```

Then scan the QR code with **Expo Go**.

**Tunnel mode** (if not on same network):

```bash
npx expo start --tunnel
```

---

## Deploying the API Server

The Express server must be publicly accessible for the mobile app to reach it.

### Render (recommended — free tier)

1. Push this repo to GitHub
2. [render.com](https://render.com) → **New → Web Service** → connect repo
3. Render auto-detects `render.yaml` — click **Apply**
4. Add these environment variables in the Render dashboard:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_ANON_KEY` | your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `GEMINI_API_KEY` | your Gemini key |
| `GROQ_API_KEY` | your Groq key |
| `DEEPGRAM_API_KEY` | your Deepgram key |

5. Deploy — you get a URL like `https://aurora-api.onrender.com`
6. Update `EXPO_PUBLIC_API_URL` in `eas.json` to this URL before building the APK

> **Free tier note:** Render spins down after 15 min of inactivity. Upgrade to $7/mo Starter to keep it always-on.

---

## Building the APK

EAS builds in the cloud — no Android Studio or Java needed locally.

```bash
# Install EAS CLI (one time)
npm install -g eas-cli

# Login to your Expo account (create free at expo.dev)
eas login

# Link this project to your Expo account
eas init

# Build the APK
eas build --platform android --profile preview
```

Build takes ~5–10 minutes. EAS gives you a direct `.apk` download link — share it with anyone to sideload on Android.

**Before building:** set `EXPO_PUBLIC_API_URL` in `eas.json` to your Render URL (not localhost).

---

## AI Pipeline Architecture

```
User speaks / types
        │
        ▼
[Step 1] Gemini: classify intent
         Input:  user message only
         Output: { intent, params, confidence }
         (Gemini never sees database credentials)
        │
        ▼
[Step 2] Supabase tool execution (server-side)
         logWater / logSleep / createHabit / logMeal
         getHealthSummary / getWeeklyReport / saveMemory
        │
        ▼
[Step 3] Gemini: generate response
         Input:  sanitised tool result + user profile + memories
         Output: warm coach-like reply (1–3 sentences)
        │
        ▼
        If Gemini fails → Groq → OpenAI → Deterministic fallback
```

**Security contract:**
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never sent to client or AI providers
- Gemini receives only sanitised action results, never credentials
- Deepgram receives only audio bytes
- All tables have RLS — users can only read/write their own rows

---

## Voice Pipeline

```
Mic open
   │
   ├─ Web:    AnalyserNode samples RMS every 120ms
   │          Speech detected → reset 3s silence timer
   │          3s silence → auto-stop → transcribe → AI pipeline
   │
   └─ Native: 3s timer from recording start → auto-stop
              (or manual tap to stop earlier)
              → transcribe → AI pipeline
```

STT priority: **OpenAI Whisper** (if key set) → **Deepgram Nova-2** → error

VAD confidence gating:
- `< 0.3` → show error / confirmation card
- `0.3–0.7` → show transcript confirmation ("Did I hear this correctly?")
- `≥ 0.7` → auto-proceed, add to chat, sync to Supabase

---

## Environment Variables Reference

| Variable | Used by | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | Client | URL of the Express API server |
| `EXPO_PUBLIC_SUPABASE_URL` | Client | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase anon key (safe to expose) |
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_ANON_KEY` | Server | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS — **never expose** |
| `GEMINI_API_KEY` | Server | Primary AI provider |
| `GROQ_API_KEY` | Server | Fallback AI provider |
| `DEEPGRAM_API_KEY` | Server | Voice transcription |
| `OPENAI_API_KEY` | Server | Optional — Whisper STT + GPT fallback |
| `OPENAI_MODEL` | Server | Default: `gpt-4.1-mini` |

---

## License

MIT
