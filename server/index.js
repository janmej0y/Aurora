// ═══════════════════════════════════════════════════════════════════
//  Aurora API  —  Production Backend
//  Architecture: Voice/Text → STT → Gemini Intent → Supabase Tools
//                         → Gemini Response Generation → Client
//
//  Security contract:
//   - Supabase service-role key NEVER leaves this process
//   - Gemini receives ONLY sanitised action results, never DB creds
//   - Deepgram receives ONLY audio bytes
//   - userId is extracted from the client-side Supabase session
//     and passed as a plain string in every request body / field
//
//  Rate limiting: TODO — add express-rate-limit in production
// ═══════════════════════════════════════════════════════════════════

'use strict';

require('dotenv').config();

const cors    = require('cors');
const express = require('express');
const fs      = require('fs');
const multer  = require('multer');
const path    = require('path');

// ─── Supabase (service-role — server only) ────────────────────────
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL              || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ─── App & multer setup ───────────────────────────────────────────
const app       = express();
const port      = Number(process.env.PORT || 4000);
const uploadDir = path.join(__dirname, 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest:   uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ─── Health check (Render pings this to confirm the server is up) ─
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─── AI keys / constants ──────────────────────────────────────────
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY   || '';
const GEMINI_MODEL     = 'gemini-2.0-flash-lite';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';
const GROQ_API_KEY     = process.env.GROQ_API_KEY     || '';
const GROQ_MODEL       = 'llama-3.3-70b-versatile';   // fast + free tier

let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    const OpenAI = require('openai');
    openai = new (OpenAI.default || OpenAI)({ apiKey: process.env.OPENAI_API_KEY });
  } catch {
    console.warn('[Aurora] OpenAI SDK unavailable — Whisper fallback disabled.');
  }
}

// ─── Date helper (always UTC calendar date) ───────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 1 — SUPABASE TOOL FUNCTIONS
//  All return { success: boolean, ...data }  |  { success: false, error: string }
// ═══════════════════════════════════════════════════════════════════

/**
 * Log water intake and return updated daily total.
 */
async function logWater(userId, amountMl) {
  try {
    const loggedDate = today();

    const { error: insertErr } = await supabase
      .from('hydration_logs')
      .insert({ user_id: userId, amount_ml: amountMl, logged_date: loggedDate });

    if (insertErr) throw insertErr;

    const { data: sumData, error: sumErr } = await supabase
      .from('hydration_logs')
      .select('amount_ml')
      .eq('user_id', userId)
      .eq('logged_date', loggedDate);

    if (sumErr) throw sumErr;

    const totalMl = (sumData || []).reduce((acc, row) => acc + (row.amount_ml || 0), 0);

    return { success: true, totalMl, amountLogged: amountMl };
  } catch (err) {
    console.error('[Tool:logWater]', err?.message);
    return { success: false, error: err?.message || 'Failed to log water' };
  }
}

/**
 * Upsert sleep log for today (one record per user per day).
 */
async function logSleep(userId, hours, bedtime, wakeTime) {
  try {
    const loggedDate = today();

    const { data, error } = await supabase
      .from('sleep_logs')
      .upsert(
        {
          user_id:     userId,
          hours,
          bedtime:     bedtime  || null,
          wake_time:   wakeTime || null,
          logged_date: loggedDate,
        },
        { onConflict: 'user_id,logged_date' }
      )
      .select()
      .single();

    if (error) throw error;

    return { success: true, hours, record: data };
  } catch (err) {
    console.error('[Tool:logSleep]', err?.message);
    return { success: false, error: err?.message || 'Failed to log sleep' };
  }
}

/**
 * Create a new habit for the user.
 */
async function createHabit(userId, title, period, cadence) {
  try {
    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id:        userId,
        title,
        period:         period  || 'Anytime',
        cadence:        cadence || 'Daily',
        streak:         0,
        longest_streak: 0,
        paused:         false,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, habit: data };
  } catch (err) {
    console.error('[Tool:createHabit]', err?.message);
    return { success: false, error: err?.message || 'Failed to create habit' };
  }
}

/**
 * Mark a habit complete by fuzzy title match and bump streak.
 */
async function completeHabit(userId, habitTitle) {
  try {
    const loggedDate = today();

    // Fuzzy match — case-insensitive LIKE
    const { data: habits, error: findErr } = await supabase
      .from('habits')
      .select('id, title, streak')
      .eq('user_id', userId)
      .eq('paused', false)
      .ilike('title', `%${habitTitle}%`)
      .limit(1);

    if (findErr) throw findErr;
    if (!habits || habits.length === 0) {
      return { success: false, error: `No active habit matching "${habitTitle}" found` };
    }

    const habit = habits[0];

    // Upsert habit_log for today (idempotent)
    const { error: logErr } = await supabase
      .from('habit_logs')
      .upsert(
        { habit_id: habit.id, logged_date: loggedDate, status: 'completed' },
        { onConflict: 'habit_id,logged_date' }
      );

    if (logErr) throw logErr;

    // Increment streak
    const newStreak = (habit.streak || 0) + 1;
    const { error: updateErr } = await supabase
      .from('habits')
      .update({ streak: newStreak })
      .eq('id', habit.id);

    if (updateErr) throw updateErr;

    return { success: true, habitId: habit.id, title: habit.title, streak: newStreak };
  } catch (err) {
    console.error('[Tool:completeHabit]', err?.message);
    return { success: false, error: err?.message || 'Failed to complete habit' };
  }
}

/**
 * Log a meal entry.
 */
async function logMeal(userId, mealType, name, calories, protein, carbs, fat) {
  try {
    const { data, error } = await supabase
      .from('meal_logs')
      .insert({
        user_id:       userId,
        meal_type:     mealType,
        name,
        calories:      calories || null,
        protein_grams: protein  || null,
        carbs_grams:   carbs    || null,
        fat_grams:     fat      || null,
        logged_date:   today(),
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, meal: data };
  } catch (err) {
    console.error('[Tool:logMeal]', err?.message);
    return { success: false, error: err?.message || 'Failed to log meal' };
  }
}

/**
 * Pull a full health snapshot for the user (today + recent context).
 */
async function getHealthSummary(userId) {
  try {
    const loggedDate = today();

    // Yesterday for sleep fallback
    const yesterday    = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const [
      hydResult,
      sleepTodayResult,
      sleepYestResult,
      habitsResult,
      nutritionResult,
      profileResult,
    ] = await Promise.all([
      // 1. Hydration total today
      supabase
        .from('hydration_logs')
        .select('amount_ml')
        .eq('user_id', userId)
        .eq('logged_date', loggedDate),

      // 2. Sleep — today
      supabase
        .from('sleep_logs')
        .select('hours, bedtime, wake_time')
        .eq('user_id', userId)
        .eq('logged_date', loggedDate)
        .maybeSingle(),

      // 3. Sleep — yesterday (fallback)
      supabase
        .from('sleep_logs')
        .select('hours, bedtime, wake_time')
        .eq('user_id', userId)
        .eq('logged_date', yesterdayStr)
        .maybeSingle(),

      // 4. Habits + today's logs (left join)
      supabase
        .from('habits')
        .select(`id, title, period, cadence, streak, longest_streak, paused,
                 habit_logs!left(status, logged_date)`)
        .eq('user_id', userId)
        .eq('paused', false),

      // 5. Nutrition totals today
      supabase
        .from('meal_logs')
        .select('calories, protein_grams, carbs_grams, fat_grams, meal_type, name')
        .eq('user_id', userId)
        .eq('logged_date', loggedDate),

      // 6. Profile
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
    ]);

    // Hydration
    const totalMl = (hydResult.data || []).reduce((s, r) => s + (r.amount_ml || 0), 0);
    const profile  = profileResult.data || {};
    const goalMl   = profile.goal_ml || 2500;

    // Sleep (prefer today, fall back to yesterday)
    const sleepData = sleepTodayResult.data || sleepYestResult.data || null;

    // Habits
    const habits = (habitsResult.data || []).map(h => {
      const todayLog = (h.habit_logs || []).find(l => l.logged_date === loggedDate);
      return {
        id:             h.id,
        title:          h.title,
        period:         h.period,
        cadence:        h.cadence,
        streak:         h.streak,
        completedToday: todayLog?.status === 'completed',
      };
    });

    // Nutrition
    const meals      = nutritionResult.data || [];
    const totCals    = meals.reduce((s, r) => s + (r.calories      || 0), 0);
    const totProtein = meals.reduce((s, r) => s + (r.protein_grams || 0), 0);
    const totCarbs   = meals.reduce((s, r) => s + (r.carbs_grams   || 0), 0);
    const totFat     = meals.reduce((s, r) => s + (r.fat_grams     || 0), 0);

    return {
      success: true,
      hydration: {
        totalMl,
        goalMl,
        progressPercent: Math.min(100, Math.round((totalMl / goalMl) * 100)),
        remainingMl:     Math.max(0, goalMl - totalMl),
      },
      sleep:   sleepData,
      habits,
      nutrition: {
        calories:    totCals,
        protein:     totProtein,
        carbs:       totCarbs,
        fat:         totFat,
        mealsLogged: meals.length,
        meals,
      },
      profile,
    };
  } catch (err) {
    console.error('[Tool:getHealthSummary]', err?.message);
    return { success: false, error: err?.message || 'Failed to get health summary' };
  }
}

/**
 * 7-day rolling report: averages and totals for hydration, sleep, habits.
 */
async function getWeeklyReport(userId) {
  try {
    const endDate   = today();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    const startStr  = startDate.toISOString().slice(0, 10);

    const [hydResult, sleepResult, habitLogsResult] = await Promise.all([
      supabase
        .from('hydration_logs')
        .select('amount_ml, logged_date')
        .eq('user_id', userId)
        .gte('logged_date', startStr)
        .lte('logged_date', endDate),

      supabase
        .from('sleep_logs')
        .select('hours, logged_date')
        .eq('user_id', userId)
        .gte('logged_date', startStr)
        .lte('logged_date', endDate),

      // habit_logs don't filter by user_id directly — join via habit_id
      supabase
        .from('habit_logs')
        .select('habit_id, logged_date, status, habits!inner(user_id)')
        .eq('habits.user_id', userId)
        .gte('logged_date', startStr)
        .lte('logged_date', endDate),
    ]);

    // Group hydration by date
    const hydByDate = {};
    (hydResult.data || []).forEach(r => {
      hydByDate[r.logged_date] = (hydByDate[r.logged_date] || 0) + (r.amount_ml || 0);
    });
    const hydValues   = Object.values(hydByDate);
    const hydAvgMl    = hydValues.length
      ? Math.round(hydValues.reduce((s, v) => s + v, 0) / hydValues.length)
      : 0;

    // Sleep
    const sleepRows   = sleepResult.data || [];
    const sleepAvgHrs = sleepRows.length
      ? parseFloat((sleepRows.reduce((s, r) => s + (r.hours || 0), 0) / sleepRows.length).toFixed(1))
      : 0;

    // Habits
    const completedLogs = (habitLogsResult.data || []).filter(l => l.status === 'completed');

    return {
      success: true,
      period:  { start: startStr, end: endDate },
      hydration: {
        avgDailyMl:  hydAvgMl,
        dailyTotals: hydByDate,
        daysTracked: hydValues.length,
      },
      sleep: {
        avgHours:    sleepAvgHrs,
        daysTracked: sleepRows.length,
        records:     sleepRows,
      },
      habits: {
        totalCompletions: completedLogs.length,
        logs:             completedLogs,
      },
    };
  } catch (err) {
    console.error('[Tool:getWeeklyReport]', err?.message);
    return { success: false, error: err?.message || 'Failed to get weekly report' };
  }
}

/**
 * Retrieve recent health memories for the user.
 */
async function getUserMemories(userId) {
  try {
    const { data, error } = await supabase
      .from('health_memories')
      .select('observation, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return { success: true, memories: (data || []).map(r => r.observation) };
  } catch (err) {
    console.error('[Tool:getUserMemories]', err?.message);
    return { success: false, memories: [] };
  }
}

/**
 * Persist a health memory / insight for long-term personalisation.
 */
async function saveMemory(userId, observation) {
  try {
    const { error } = await supabase
      .from('health_memories')
      .insert({ user_id: userId, observation });

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('[Tool:saveMemory]', err?.message);
    return { success: false, error: err?.message || 'Failed to save memory' };
  }
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 2 — TRANSCRIPTION (Deepgram Nova-2 + OpenAI Whisper)
//  Supabase credentials are NEVER sent to any transcription service.
// ═══════════════════════════════════════════════════════════════════

/**
 * Transcribe an audio file. Returns { transcript, confidence }.
 */
async function transcribeAudio(filePath, mimeType) {
  // 1. OpenAI Whisper (preferred if key present)
  if (openai) {
    try {
      const result = await openai.audio.transcriptions.create({
        file:  fs.createReadStream(filePath),
        model: process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1',
      });
      if (result.text) {
        return { transcript: result.text, confidence: 0.9 }; // Whisper doesn't surface confidence
      }
    } catch (err) {
      console.warn('[Aurora] Whisper failed, trying Deepgram:', err?.message);
    }
  }

  // 2. Deepgram Nova-2
  if (DEEPGRAM_API_KEY) {
    try {
      const audioBuffer = fs.readFileSync(filePath);
      const contentType = mimeType || 'audio/m4a';

      const dgRes = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en-US&punctuate=true',
        {
          method:  'POST',
          headers: {
            Authorization:  `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': contentType,
          },
          body: audioBuffer,
        }
      );

      if (dgRes.ok) {
        const data       = await dgRes.json();
        const alt        = data?.results?.channels?.[0]?.alternatives?.[0];
        const transcript = alt?.transcript || '';
        const confidence = alt?.confidence ?? 0;
        if (transcript) return { transcript, confidence };
      } else {
        console.warn('[Aurora] Deepgram returned', dgRes.status);
      }
    } catch (err) {
      console.warn('[Aurora] Deepgram failed:', err?.message);
    }
  }

  return { transcript: '', confidence: 0 };
}

/**
 * Voice activity / quality gate.
 * Returns { pass: true, transcript, confidence, needsConfirmation? }
 *      or { pass: false, error, transcript?, confidence? }
 */
function checkTranscriptQuality(transcript, confidence) {
  const trimmed = (transcript || '').trim();

  if (!trimmed) {
    return { pass: false, error: 'no_transcript' };
  }

  const words   = trimmed.split(/\s+/).filter(Boolean);
  const fillers = new Set(['um', 'uh', 'hmm', 'ah', 'oh', 'hello', 'hi', 'hey']);

  if (words.length <= 2 && words.every(w => fillers.has(w.toLowerCase()))) {
    return { pass: false, error: 'unclear', transcript: trimmed };
  }

  if (confidence < 0.3) {
    return { pass: false, error: 'low_confidence', transcript: trimmed, confidence };
  }

  if (confidence < 0.7) {
    return { pass: true, needsConfirmation: true, transcript: trimmed, confidence };
  }

  return { pass: true, transcript: trimmed, confidence };
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 3 — GEMINI INTENT CLASSIFICATION  (Step 1 — no DB data)
//  Gemini receives ONLY the user message + intent schema.
// ═══════════════════════════════════════════════════════════════════

const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for a health app. Classify the user's message into one of these intents and extract parameters.

Available intents:
- log_water: user drank/drank water. Extract: amount_ml (number, default 250 if not specified)
- log_sleep: user slept. Extract: hours (number), bedtime (HH:MM 24h, optional), wake_time (HH:MM 24h, optional)
- create_habit: user wants to create/start a habit. Extract: title (string), period (Morning/Afternoon/Evening/Anytime), cadence (Daily/Weekdays/Weekends)
- complete_habit: user completed a habit. Extract: title (string)
- log_meal: user ate something. Extract: meal_type (Breakfast/Lunch/Dinner/Snack), name (string), calories (number or null), protein (number or null), carbs (number or null), fat (number or null)
- get_health_summary: user asks how they're doing overall
- get_weekly_report: user asks about this week
- get_hydration_status: user asks about water/hydration
- get_sleep_status: user asks about sleep
- get_habit_status: user asks about habits
- get_nutrition_status: user asks about food/nutrition/calories
- add_memory: store something to remember. Extract: observation (string)
- general_health_advice: health question not requiring DB data
- off_topic: not health related

Return ONLY valid JSON: { "intent": "...", "params": {...}, "confidence": 0.0-1.0 }`;

async function classifyIntent(message) {
  // ── Attempt 1: Gemini
  if (GEMINI_API_KEY) {
    try {
      const body = JSON.stringify({
        contents: [
          {
            role:  'user',
            parts: [{ text: `${INTENT_CLASSIFICATION_PROMPT}\n\nUser message: "${message}"` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature:      0.1,
          maxOutputTokens:  200,
        },
      });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
      );

      if (res.ok) {
        const data   = await res.json();
        const text   = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = extractJson(text);
        if (parsed?.intent) return parsed;
      } else {
        const errText = await res.text().catch(() => '');
        console.warn('[Aurora] Gemini intent HTTP error:', res.status, errText.slice(0, 120));
      }
    } catch (err) {
      console.warn('[Aurora] Gemini intent failed, trying Groq:', err?.message);
    }
  }

  // ── Attempt 2: Groq (llama-3.3-70b — OpenAI-compatible API)
  if (GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:       GROQ_MODEL,
          temperature: 0.1,
          max_tokens:  200,
          messages: [
            {
              role:    'user',
              content: `${INTENT_CLASSIFICATION_PROMPT}\n\nUser message: "${message}"\n\nReturn ONLY valid JSON.`,
            },
          ],
        }),
      });

      if (res.ok) {
        const data   = await res.json();
        const text   = data?.choices?.[0]?.message?.content || '';
        const parsed = extractJson(text);
        if (parsed?.intent) {
          console.log('[Aurora] Intent classified via Groq fallback');
          return parsed;
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn('[Aurora] Groq intent HTTP error:', res.status, errText.slice(0, 120));
      }
    } catch (err) {
      console.warn('[Aurora] Groq intent failed:', err?.message);
    }
  }

  return { intent: 'general_health_advice', params: {}, confidence: 0.4 };
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 4 — AGENT CONTROLLER  (execute tools from intent)
//  Runs the appropriate Supabase tool(s) and tracks what happened.
// ═══════════════════════════════════════════════════════════════════

async function executeIntent(intent, params, userId) {
  const actionsExecuted = [];
  let toolResult        = null;

  if (!userId) {
    // Guest mode — skip all DB ops
    return { toolResult: null, actionsExecuted };
  }

  switch (intent) {

    case 'log_water': {
      const amountMl = Number(params.amount_ml) || 250;
      toolResult     = await logWater(userId, amountMl);
      actionsExecuted.push({ type: 'ADD_WATER', amountMl });
      break;
    }

    case 'log_sleep': {
      const hours    = Number(params.hours) || null;
      const bedtime  = params.bedtime   || null;
      const wakeTime = params.wake_time || null;
      if (hours) {
        toolResult = await logSleep(userId, hours, bedtime, wakeTime);
        actionsExecuted.push({ type: 'LOG_SLEEP', hours, bedtime, wakeTime });
      }
      break;
    }

    case 'create_habit': {
      const { title, period, cadence } = params;
      if (title) {
        toolResult = await createHabit(userId, title, period, cadence);
        actionsExecuted.push({ type: 'CREATE_HABIT', title, period, cadence });
      }
      break;
    }

    case 'complete_habit': {
      const { title } = params;
      if (title) {
        toolResult = await completeHabit(userId, title);
        actionsExecuted.push({ type: 'COMPLETE_HABIT', title });
      }
      break;
    }

    case 'log_meal': {
      const { meal_type, name, calories, protein, carbs, fat } = params;
      if (name) {
        toolResult = await logMeal(
          userId,
          meal_type || 'Snack',
          name,
          calories || null,
          protein  || null,
          carbs    || null,
          fat      || null
        );
        actionsExecuted.push({ type: 'ADD_MEAL', mealType: meal_type, name, calories, protein, carbs, fat });
      }
      break;
    }

    case 'get_health_summary':
    case 'get_hydration_status':
    case 'get_sleep_status':
    case 'get_habit_status':
    case 'get_nutrition_status': {
      toolResult = await getHealthSummary(userId);
      break;
    }

    case 'get_weekly_report': {
      toolResult = await getWeeklyReport(userId);
      break;
    }

    case 'add_memory': {
      const { observation } = params;
      if (observation) {
        toolResult = await saveMemory(userId, observation);
        actionsExecuted.push({ type: 'ADD_MEMORY', text: observation });
      }
      break;
    }

    default:
      // general_health_advice, off_topic — no DB op
      break;
  }

  return { toolResult, actionsExecuted };
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 5 — GEMINI RESPONSE GENERATION  (Step 2)
//  Gemini receives: user message + intent + tool result + profile summary
//  Gemini does NOT receive Supabase credentials.
// ═══════════════════════════════════════════════════════════════════

function buildResponseSystemPrompt(profile, memories) {
  const name    = profile?.full_name || profile?.name || 'there';
  const goalMl  = profile?.goal_ml   || 2500;
  const memText = (memories || []).slice(0, 8).join('\n  - ') || 'none yet';

  return `You are Aurora, a warm and knowledgeable AI health companion. You have just executed a health action or retrieved health data for the user.

User profile: ${name}
Hydration goal: ${goalMl}ml/day
Recent context about this user:
  - ${memText}

Generate a brief, encouraging, coach-like response (1-3 sentences).
- Reference actual numbers from the action result when available
- Be specific, not generic
- If data was logged, confirm it and add a brief insight
- If data was retrieved, summarise it conversationally
- Do NOT start with "I" — vary your openings
- Return ONLY the response text, no JSON, no markdown`;
}

async function generateGeminiResponse(userMessage, intent, toolResult, profile, memories, chatHistory) {
  if (!GEMINI_API_KEY) return null;

  try {
    const systemPrompt  = buildResponseSystemPrompt(profile, memories);
    const resultSummary = toolResult
      ? JSON.stringify(toolResult, null, 2)
      : '(no database action was performed)';

    const historyContents = (chatHistory || [])
      .filter(m => m.content && m.role)
      .slice(-10)
      .map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content) }],
      }));

    const userPayload = `User said: "${userMessage}"
Classified intent: ${intent}
Action result from database:
${resultSummary}

Generate a warm, specific, coach-like response:`;

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        ...historyContents,
        { role: 'user', parts: [{ text: userPayload }] },
      ],
      generationConfig: {
        temperature:     0.8,
        maxOutputTokens: 300,
        topP:            0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',  threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      ],
    });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('[Aurora] Gemini response generation HTTP error:', res.status, errText.slice(0, 200));
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim() || null;
  } catch (err) {
    console.warn('[Aurora] Gemini response generation failed:', err?.message);
    return null;
  }
}

/**
 * Groq fallback for response generation (OpenAI-compatible API).
 */
async function generateGroqResponse(userMessage, intent, toolResult, profile, memories, chatHistory) {
  if (!GROQ_API_KEY) return null;

  try {
    const systemPrompt  = buildResponseSystemPrompt(profile, memories);
    const resultSummary = toolResult
      ? JSON.stringify(toolResult, null, 2)
      : '(no database action was performed)';

    const historyMessages = (chatHistory || [])
      .filter(m => m.content && m.role)
      .slice(-8)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));

    const userContent = `User said: "${userMessage}"
Classified intent: ${intent}
Action result: ${resultSummary}
Generate a warm, specific coach-like response:`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        temperature: 0.8,
        max_tokens:  300,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('[Aurora] Groq response HTTP error:', res.status, errText.slice(0, 120));
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    if (text.trim()) {
      console.log('[Aurora] Response generated via Groq fallback');
      return text.trim();
    }
    return null;
  } catch (err) {
    console.warn('[Aurora] Groq response generation failed:', err?.message);
    return null;
  }
}

/**
 * OpenAI fallback for response generation.
 */
async function generateOpenAIResponse(userMessage, intent, toolResult, profile, memories, chatHistory) {
  if (!openai) return null;

  try {
    const systemPrompt  = buildResponseSystemPrompt(profile, memories);
    const resultSummary = toolResult
      ? JSON.stringify(toolResult, null, 2)
      : '(no database action was performed)';

    const historyMessages = (chatHistory || [])
      .filter(m => m.content && m.role)
      .slice(-8)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));

    const userContent = `User said: "${userMessage}"
Classified intent: ${intent}
Action result: ${resultSummary}
Generate a warm, specific coach-like response:`;

    const result = await openai.chat.completions.create({
      model:       process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages:    [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userContent },
      ],
      max_tokens:  300,
      temperature: 0.8,
    });

    const text = result.choices?.[0]?.message?.content || '';
    return text.trim() || null;
  } catch (err) {
    console.warn('[Aurora] OpenAI response generation failed:', err?.message);
    return null;
  }
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 6 — DETERMINISTIC FALLBACK
//  Used when no AI is configured, or both AI calls fail.
// ═══════════════════════════════════════════════════════════════════

function buildDeterministicReply(intent, toolResult, params) {
  if (toolResult && !toolResult.success) {
    const errMsg = toolResult.error || 'something went wrong';
    return `Ran into an issue — ${errMsg}. Please try again in a moment.`;
  }

  switch (intent) {
    case 'log_water': {
      const { totalMl, amountLogged } = toolResult || {};
      return `Logged ${amountLogged || 0}ml — you're now at ${totalMl || 0}ml today.`;
    }
    case 'log_sleep': {
      return `Logged ${(toolResult || {}).hours || params.hours || 0}h of sleep.`;
    }
    case 'create_habit': {
      const h = (toolResult || {}).habit || {};
      return `Created habit "${h.title || params.title}" — it'll appear in your dashboard.`;
    }
    case 'complete_habit': {
      const r = toolResult || {};
      return `Marked "${r.title || params.title}" complete — streak is now ${r.streak || 0}.`;
    }
    case 'log_meal': {
      const m = (toolResult || {}).meal || {};
      return `Logged ${m.name || params.name || 'your meal'} (${m.calories || params.calories || 0} kcal) for ${(m.meal_type || params.meal_type || 'a meal').toLowerCase()}.`;
    }
    case 'get_health_summary': {
      const r    = toolResult || {};
      const hydPct = r.hydration?.progressPercent || 0;
      const sleepH = r.sleep?.hours || 0;
      const done   = (r.habits || []).filter(h => h.completedToday).length;
      const total  = (r.habits || []).length;
      const cals   = r.nutrition?.calories || 0;
      return `Snapshot — Hydration: ${hydPct}% of goal. Sleep: ${sleepH}h. Habits: ${done}/${total} done. Calories: ${cals} kcal.`;
    }
    case 'get_weekly_report': {
      const r = toolResult || {};
      return `This week — avg hydration: ${r.hydration?.avgDailyMl || 0}ml/day, avg sleep: ${r.sleep?.avgHours || 0}h/night.`;
    }
    default:
      return 'You can tell me things like "I drank 500ml water", "I slept 7 hours", or "how am I doing?"';
  }
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 7 — CORE AGENT PIPELINE
//  Shared by /api/agent/chat and /api/agent/voice
// ═══════════════════════════════════════════════════════════════════

/**
 * Full two-step agent pipeline:
 *   Step 1 — classifyIntent()       — Gemini, no DB data
 *   Step 2 — executeIntent()        — Supabase tools only
 *   Step 3 — load memories/profile  — Supabase, sanitised for Gemini
 *   Step 4 — generate reply         — Gemini with tool result
 */
async function runAgentPipeline(message, userId, context, chatHistory) {
  const safeHistory = Array.isArray(chatHistory) ? chatHistory.slice(-12) : [];

  // ── Step 1: Intent classification (Gemini — no DB data sent)
  const {
    intent            = 'general_health_advice',
    params            = {},
    confidence: intentConfidence = 0.5,
  } = await classifyIntent(message);

  // ── Step 2: Execute Supabase tools
  const { toolResult, actionsExecuted } = await executeIntent(intent, params, userId);

  // ── Step 3: Fetch memories + profile for response personalisation
  let memories = [];
  let profile  = {};

  if (userId) {
    const needsProfile = !(
      intent === 'get_health_summary' ||
      intent === 'get_hydration_status' ||
      intent === 'get_sleep_status'     ||
      intent === 'get_habit_status'     ||
      intent === 'get_nutrition_status'
    );

    const [memResult, profileResult] = await Promise.all([
      getUserMemories(userId),
      needsProfile
        ? supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    memories = memResult?.memories || [];

    if (profileResult?.data) {
      profile = profileResult.data;
    } else if (toolResult?.profile) {
      profile = toolResult.profile;
    }

    // Auto-persist a memory when the user hits their hydration goal
    if (
      intent === 'log_water' &&
      toolResult?.success &&
      toolResult.totalMl >= (profile?.goal_ml || 2500)
    ) {
      await saveMemory(
        userId,
        `Hit daily hydration goal of ${toolResult.totalMl}ml on ${today()}.`
      );
    }
  }

  // ── Step 4: Generate reply (Gemini → Groq → OpenAI → deterministic)
  let reply = null;

  if (GEMINI_API_KEY) {
    reply = await generateGeminiResponse(
      message, intent, toolResult, profile, memories, safeHistory
    );
  }

  if (!reply && GROQ_API_KEY) {
    reply = await generateGroqResponse(
      message, intent, toolResult, profile, memories, safeHistory
    );
  }

  if (!reply && openai) {
    reply = await generateOpenAIResponse(
      message, intent, toolResult, profile, memories, safeHistory
    );
  }

  if (!reply) {
    reply = buildDeterministicReply(intent, toolResult, params);
  }

  return {
    reply,
    actions:    actionsExecuted,
    intent,
    confidence: intentConfidence,
    data:       toolResult || null,
  };
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 8 — ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════

// ── GET /health ───────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    ok:            true,
    service:       'aurora-api',
    supabase:      !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    ai:            GEMINI_API_KEY ? 'gemini' : openai ? 'openai' : 'deterministic',
    transcription: openai ? 'openai-whisper' : DEEPGRAM_API_KEY ? 'deepgram' : 'none',
  });
});

// ── POST /api/agent/chat ──────────────────────────────────────────
app.post('/api/agent/chat', async (req, res) => {
  const message     = String(req.body?.message  || '').trim();
  const userId      = String(req.body?.userId   || '').trim() || null;
  const context     = req.body?.context         || {};
  const chatHistory = req.body?.chatHistory      || [];

  if (!message) {
    res.status(400).json({ reply: "What's on your mind?", actions: [], intent: null });
    return;
  }

  try {
    const result = await runAgentPipeline(message, userId, context, chatHistory);
    res.json(result);
  } catch (err) {
    console.error('[Aurora] /api/agent/chat error:', err?.message);
    // Never return 500 — always respond with something useful
    res.json({
      reply:   'Something went wrong on my end. Try again in a moment.',
      actions: [],
      intent:  null,
      error:   err?.message,
    });
  }
});

// ── POST /api/agent/voice ─────────────────────────────────────────
app.post('/api/agent/voice', upload.single('audio'), async (req, res) => {
  const userId      = String(req.body?.userId || '').trim() || null;
  const context     = safeJson(req.body?.context,     {});
  const chatHistory = safeJson(req.body?.chatHistory, []);

  let transcript        = '';
  let rawConfidence     = 0;
  let needsConfirmation = false;

  try {
    if (!req.file?.path) {
      res.json({ transcript: '', reply: '', actions: [], error: 'no_audio' });
      return;
    }

    // ── Transcribe (Whisper → Deepgram)
    const sttResult  = await transcribeAudio(req.file.path, req.file.mimetype);
    transcript       = sttResult.transcript;
    rawConfidence    = sttResult.confidence;

    // ── Voice activity / quality gate
    const vad = checkTranscriptQuality(transcript, rawConfidence);

    if (!vad.pass) {
      res.json({
        transcript:  vad.transcript || '',
        reply:       '',
        actions:     [],
        error:       vad.error,
        confidence:  rawConfidence,
      });
      return;
    }

    if (vad.needsConfirmation) {
      needsConfirmation = true;
    }

    // ── Full agent pipeline
    const result = await runAgentPipeline(transcript, userId, context, chatHistory);

    res.json({
      ...result,
      transcript,
      confidence:       rawConfidence,
      needsConfirmation,
    });
  } catch (err) {
    console.error('[Aurora] /api/agent/voice error:', err?.message);
    res.json({
      transcript:   transcript || '',
      reply:        "I caught your voice but couldn't process it. Try typing your message instead.",
      actions:      [],
      error:        err?.message,
      confidence:   rawConfidence,
    });
  } finally {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => undefined);
    }
  }
});

// ── GET /api/health-summary/:userId ──────────────────────────────
app.get('/api/health-summary/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const summary = await getHealthSummary(userId);
    res.json(summary);
  } catch (err) {
    console.error('[Aurora] /api/health-summary error:', err?.message);
    res.json({ success: false, error: err?.message });
  }
});

// ── GET /api/weekly-report/:userId ───────────────────────────────
app.get('/api/weekly-report/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const report = await getWeeklyReport(userId);
    res.json(report);
  } catch (err) {
    console.error('[Aurora] /api/weekly-report error:', err?.message);
    res.json({ success: false, error: err?.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
//  SECTION 9 — UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════

function extractJson(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch { /* fall through */ }
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? safeJson(match[0], null) : null;
}

function safeJson(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}


// ═══════════════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════════════

app.listen(port, '0.0.0.0', () => {
  const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(`\n Aurora API  ->  http://localhost:${port}`);
  console.log(`   Supabase:      ${hasSupabase    ? 'connected (service role)' : 'MISSING — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'}`);
  console.log(`   AI:            ${GEMINI_API_KEY ? 'Gemini 2.0 Flash Lite' : GROQ_API_KEY ? 'Groq llama-3.3-70b' : openai ? 'OpenAI fallback' : 'Deterministic fallback'} ${GROQ_API_KEY && GEMINI_API_KEY ? '(Groq on standby)' : ''}`);
  console.log(`   Transcription: ${openai          ? 'OpenAI Whisper'         : DEEPGRAM_API_KEY ? 'Deepgram Nova-2' : 'unavailable'}\n`);
});
