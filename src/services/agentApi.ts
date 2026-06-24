import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../config/api';
import { AgentResponse, ChatMessage, HealthState } from '../types/health';

// ─── Types ────────────────────────────────────────────────────────
type ChatHistoryItem = { role: 'user' | 'assistant'; content: string };

export type AgentResult = AgentResponse & {
  intent?: string;
  confidence?: number;
  needsConfirmation?: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

// ─── Get current userId (non-throwing) ───────────────────────────
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

const CARD_PREFIX = '<<CARD:';
const CARD_SUFFIX = '>>';

function stripCardEncoding(content: string): string {
  if (!content.startsWith(CARD_PREFIX)) return content;
  const end = content.indexOf(CARD_SUFFIX, CARD_PREFIX.length);
  if (end === -1) return content;
  // Return just the natural language text that follows the card block
  return content.slice(end + CARD_SUFFIX.length + 1).trim();
}

// ─── Build lean chat history for context window ───────────────────
function buildChatHistory(messages: ChatMessage[]): ChatHistoryItem[] {
  return messages
    .slice(1)        // skip system seed message
    .slice(-12)
    .map(m => ({
      role: m.role,
      // Strip <<CARD:...>> encoding from assistant messages so Gemini
      // receives only the natural-language text, not raw JSON blobs.
      content: m.role === 'assistant' ? stripCardEncoding(m.content) : m.content,
    }));
}

// ─── Minimal context (bio only — no credentials ever sent) ───────
export function buildMinimalContext(state: HealthState) {
  const today = new Date().toISOString().slice(0, 10);
  const mealsToday = state.meals.filter(m => m.date === today);
  const cals = mealsToday.reduce((s, m) => s + m.calories, 0);

  return {
    name:           state.user.name,
    goals:          state.user.goals,
    wakeTime:       state.user.wakeTime,
    bedtime:        state.user.bedtime,
    activityLevel:  state.user.activityLevel,
    // Live numbers for AI context (not credentials)
    hydrationMl:    state.hydration.currentMl,
    hydrationGoal:  state.hydration.goalMl,
    sleepLastNight: state.sleep.lastHours,
    habitsTotal:    state.habits.filter(h => !h.paused).length,
    habitsDone:     state.habits.filter(h => !h.paused && h.completedToday).length,
    caloriesToday:  cals,
    memories:       state.memories.slice(0, 5),
  };
}

// ─── Parse server response safely ────────────────────────────────
async function parseResult(response: Response): Promise<AgentResult> {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Aurora API ${response.status}: ${text.slice(0, 120)}`);
  }
  const json = await response.json() as AgentResult;
  // Server always returns a reply — if missing, generate a fallback so we never throw
  if (!json.reply) {
    json.reply = "Got it! I've logged that for you.";
  }
  return json;
}

// ─── Fetch with timeout ────────────────────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err: unknown) {
    clearTimeout(id);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    throw new Error(isAbort ? 'Request timed out — the server may be waking up, try again.' : (err instanceof Error ? err.message : 'Network error'));
  }
}

// ─── Server keepalive — call on app start to wake Render from sleep ─
export async function pingServer(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/health`, {}, 20000);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Text chat ───────────────────────────────────────────────────
export async function sendAgentText(
  message: string,
  state: HealthState
): Promise<AgentResult> {
  const [userId] = await Promise.all([getCurrentUserId()]);

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      userId:      userId ?? undefined,
      context:     buildMinimalContext(state),
      chatHistory: buildChatHistory(state.chatMessages),
    }),
  });

  return parseResult(response);
}

// ─── Voice ───────────────────────────────────────────────────────
export async function sendAgentVoice(
  uri: string,
  state: HealthState
): Promise<AgentResult> {
  const userId = await getCurrentUserId();
  const form   = new FormData();

  if (uri.startsWith('blob:')) {
    // Web: fetch the blob and append it directly
    const blob     = await fetch(uri).then(r => r.blob());
    const mimeType = blob.type || 'audio/webm';
    const ext      = mimeType.includes('ogg') ? 'ogg' : 'webm';
    form.append('audio', blob, `aurora-voice.${ext}`);
    // Release the object URL now that we've consumed the blob
    URL.revokeObjectURL(uri);
  } else {
    // Native: pass the file URI as React Native expects
    const ext       = uri.split('.').pop()?.toLowerCase() ?? 'm4a';
    const audioType = ext === 'webm' ? 'audio/webm'
                    : ext === 'wav'  ? 'audio/wav'
                    : 'audio/m4a';
    form.append('audio', { uri, name: `aurora-voice.${ext}`, type: audioType } as unknown as Blob);
  }

  form.append('userId',      userId ?? '');
  form.append('context',     JSON.stringify(buildMinimalContext(state)));
  form.append('chatHistory', JSON.stringify(buildChatHistory(state.chatMessages)));

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/agent/voice`, {
    method: 'POST',
    body:   form,
  }, 30000); // voice needs a bit longer — transcription takes time

  return parseResult(response);
}

// ─── Health summary direct fetch (for HomeScreen) ─────────────────
export async function fetchHealthSummary(): Promise<Record<string, unknown> | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/health-summary/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Weekly report fetch ──────────────────────────────────────────
export async function fetchWeeklyReport(): Promise<Record<string, unknown> | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/weekly-report/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
