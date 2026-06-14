import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { applyTheme } from '../theme/tokens';
import { supabase } from '../lib/supabase';
import { cancelAllNotifications, scheduleHealthNotifications } from '../lib/notifications';

import {
  Achievement,
  AgentAction,
  ChatMessage,
  Goal,
  Habit,
  HabitPeriod,
  HealthState,
  Meal,
  MealType,
  NotificationKey,
  TrackingMode,
  UserProfile,
} from '../types/health';

const STORAGE_KEY = 'aurora.health.v2';
const RESET_DATE_KEY = 'aurora.reset.date';

export const goalOptions: Goal[] = [
  'Improve Hydration',
  'Sleep Better',
  'Build Better Habits',
  'Eat Healthier',
  'Improve Energy Levels',
  'Improve Consistency',
];

const todayKey = () => new Date().toISOString().slice(0, 10);

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const initialAchievements: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Sip',
    description: 'Logged your first hydration entry',
    icon: '💧',
    type: 'hydration',
    unlockedAt: daysAgo(3),
  },
  {
    id: 'ach-2',
    title: 'Early Riser',
    description: 'Maintained consistent wake time for 5 days',
    icon: '🌅',
    type: 'sleep',
    unlockedAt: daysAgo(1),
  },
  {
    id: 'ach-3',
    title: 'Habit Builder',
    description: 'Completed 3 habits in a single day',
    icon: '✅',
    type: 'habits',
    unlockedAt: daysAgo(2),
  },
];

const initialState: HealthState = {
  hasSeenIntro: false,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  hasConfiguredTracking: false,
  trackingModes: ['Manual Tracking'],
  theme: 'Charcoal',
  user: {
    name: 'Maya',
    email: '',
    age: '28',
    gender: 'Prefer not to say',
    heightCm: '168',
    weightKg: '62',
    wakeTime: '06:45',
    bedtime: '22:45',
    activityLevel: 'Moderate',
    goals: ['Improve Hydration', 'Sleep Better', 'Improve Consistency'],
  },
  notifications: {
    hydrationReminders: true,
    sleepReminders: true,
    habitReminders: true,
    dailyInsights: true,
  },
  hydration: {
    goalMl: 2600,
    currentMl: 1450,
    history: [
      { date: daysAgo(6), amountMl: 2100 },
      { date: daysAgo(5), amountMl: 2400 },
      { date: daysAgo(4), amountMl: 1800 },
      { date: daysAgo(3), amountMl: 2600 },
      { date: daysAgo(2), amountMl: 2300 },
      { date: daysAgo(1), amountMl: 2750 },
      { date: todayKey(), amountMl: 1450 },
    ],
  },
  sleep: {
    lastHours: 7.7,
    weeklyAverage: 7.3,
    consistency: 82,
    score: 78,
    logs: [
      {
        id: 'sleep-1',
        date: daysAgo(6),
        hours: 7.1,
        bedtime: '22:55',
        wakeTime: '06:05',
        quality: 'Good',
        stages: { rem: 1.4, light: 3.8, deep: 1.6, awake: 0.3 },
      },
      {
        id: 'sleep-2',
        date: daysAgo(5),
        hours: 7.4,
        bedtime: '22:35',
        wakeTime: '06:10',
        quality: 'Good',
        stages: { rem: 1.6, light: 3.9, deep: 1.6, awake: 0.3 },
      },
      {
        id: 'sleep-3',
        date: daysAgo(4),
        hours: 6.6,
        bedtime: '23:20',
        wakeTime: '06:00',
        quality: 'Fair',
        stages: { rem: 1.1, light: 3.5, deep: 1.7, awake: 0.3 },
      },
      {
        id: 'sleep-4',
        date: daysAgo(3),
        hours: 7.8,
        bedtime: '22:25',
        wakeTime: '06:15',
        quality: 'Excellent',
        stages: { rem: 1.8, light: 4.0, deep: 1.7, awake: 0.3 },
      },
      {
        id: 'sleep-5',
        date: daysAgo(2),
        hours: 7.3,
        bedtime: '22:50',
        wakeTime: '06:10',
        quality: 'Good',
        stages: { rem: 1.5, light: 3.8, deep: 1.7, awake: 0.3 },
      },
      {
        id: 'sleep-6',
        date: daysAgo(1),
        hours: 7.7,
        bedtime: '22:30',
        wakeTime: '06:15',
        quality: 'Good',
        stages: { rem: 1.6, light: 4.1, deep: 1.7, awake: 0.3 },
      },
    ],
  },
  habits: [
    {
      id: 'habit-1',
      title: 'Morning walk',
      period: 'Morning',
      cadence: 'Daily',
      streak: 9,
      longestStreak: 14,
      completedToday: true,
      completionDates: [todayKey(), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)],
      paused: false,
      skippedToday: false,
      emoji: '🚶',
      color: '#22C55E',
    },
    {
      id: 'habit-2',
      title: 'Meditation',
      period: 'Morning',
      cadence: 'Daily',
      streak: 4,
      longestStreak: 8,
      completedToday: false,
      completionDates: [daysAgo(1), daysAgo(2), daysAgo(3)],
      paused: false,
      skippedToday: false,
      emoji: '🧘',
      color: '#8B7BFF',
    },
    {
      id: 'habit-3',
      title: 'Read for 20 minutes',
      period: 'Evening',
      cadence: 'Daily',
      streak: 6,
      longestStreak: 12,
      completedToday: true,
      completionDates: [todayKey(), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4), daysAgo(5)],
      paused: false,
      skippedToday: false,
      emoji: '📚',
      color: '#3B9EFF',
    },
    {
      id: 'habit-4',
      title: 'Stretch before bed',
      period: 'Evening',
      cadence: 'Weekdays',
      streak: 5,
      longestStreak: 11,
      completedToday: false,
      completionDates: [daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)],
      paused: false,
      skippedToday: false,
      emoji: '🤸',
      color: '#FFB547',
    },
    {
      id: 'habit-5',
      title: 'No Sugar Day',
      period: 'Anytime',
      cadence: 'Daily',
      streak: 2,
      longestStreak: 7,
      completedToday: false,
      completionDates: [daysAgo(1)],
      paused: false,
      skippedToday: false,
      emoji: '🚫',
      color: '#FF6B6B',
    },
    {
      id: 'habit-6',
      title: 'Sleep by 11 PM',
      period: 'Evening',
      cadence: 'Daily',
      streak: 8,
      longestStreak: 15,
      completedToday: true,
      completionDates: [todayKey(), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4), daysAgo(5), daysAgo(6)],
      paused: false,
      skippedToday: false,
      emoji: '🌙',
      color: '#8B7BFF',
    },
  ],
  meals: [
    { id: 'meal-1', date: todayKey(), type: 'Breakfast', name: 'Greek yogurt bowl', calories: 360, protein: 28, carbs: 42, fat: 10 },
    { id: 'meal-2', date: todayKey(), type: 'Lunch', name: 'Paneer quinoa salad', calories: 540, protein: 32, carbs: 58, fat: 20 },
    { id: 'meal-3', date: daysAgo(1), type: 'Breakfast', name: 'Oats & banana', calories: 420, protein: 12, carbs: 76, fat: 8 },
    { id: 'meal-4', date: daysAgo(1), type: 'Lunch', name: 'Grilled chicken wrap', calories: 580, protein: 44, carbs: 52, fat: 18 },
    { id: 'meal-5', date: daysAgo(1), type: 'Dinner', name: 'Salmon & vegetables', calories: 490, protein: 38, carbs: 28, fat: 22 },
  ],
  memories: [
    'Hydration is strongest on days with a morning walk.',
    'Sleep consistency improves when bedtime is before 11 PM.',
    'Morning habits are completed more reliably than evening habits.',
    'Protein intake is highest on days with Lunch logged.',
    'Energy levels correlate with 7+ hours of sleep.',
  ],
  chatMessages: [
    {
      id: 'message-1',
      role: 'assistant',
      content: "Good morning! I've reviewed your health data. Your sleep last night was excellent at 7h 42m — well above your weekly average. Your hydration is at 56% today. Try adding a glass of water now to keep the momentum going.",
      createdAt: new Date().toISOString(),
    },
  ],
  achievements: initialAchievements,
};

// Clean starting state for real new users — no demo data
const freshUserState: HealthState = {
  hasSeenIntro: false,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  hasConfiguredTracking: false,
  trackingModes: ['Manual Tracking'],
  theme: 'Charcoal',
  user: {
    name: 'Friend',
    email: '',
    age: '',
    gender: 'Prefer not to say',
    heightCm: '',
    weightKg: '',
    wakeTime: '07:00',
    bedtime: '22:30',
    activityLevel: 'Moderate',
    goals: [],
  },
  notifications: {
    hydrationReminders: true,
    sleepReminders: true,
    habitReminders: true,
    dailyInsights: true,
  },
  hydration: { goalMl: 2000, currentMl: 0, history: [] },
  sleep: { lastHours: 0, weeklyAverage: 0, consistency: 0, score: 0, logs: [] },
  habits: [],
  meals: [],
  memories: [],
  chatMessages: [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: "Hi! I'm Aurora, your personal health companion. Start by telling me how you're feeling today, or ask me to help track your water, sleep, or habits.",
      createdAt: new Date().toISOString(),
    },
  ],
  achievements: [],
};

type HealthContextValue = {
  state: HealthState;
  ready: boolean;
  authLoading: boolean;
  goalOptions: Goal[];
  setSeenIntro: () => void;
  authenticate: (email?: string) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  logout: () => void;
  saveProfile: (profile: Partial<UserProfile>) => void;
  setTheme: (theme: 'Charcoal' | 'Slate' | 'OLED') => void;
  completeOnboarding: () => void;
  configureTracking: (modes: TrackingMode[]) => void;
  toggleGoal: (goal: Goal) => void;
  toggleNotification: (key: NotificationKey) => void;
  addWater: (amountMl: number) => void;
  setHydrationGoal: (goalMl: number) => void;
  logSleep: (hours: number, bedtime?: string, wakeTime?: string) => void;
  createHabit: (title: string, period?: HabitPeriod, cadence?: string, emoji?: string, color?: string) => void;
  completeHabit: (id: string) => void;
  skipHabit: (id: string) => void;
  pauseHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  addMeal: (meal: Omit<Meal, 'id' | 'date'>) => void;
  deleteMeal: (id: string) => void;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  applyAgentActions: (actions: AgentAction[]) => void;
  resetDemo: () => void;
};

const HealthContext = createContext<HealthContextValue | undefined>(undefined);

const mergeState = (stored: Partial<HealthState>): HealthState => ({
  ...initialState,
  ...stored,
  user: { ...initialState.user, ...stored.user },
  notifications: { ...initialState.notifications, ...stored.notifications },
  hydration: { ...initialState.hydration, ...stored.hydration },
  sleep: { ...initialState.sleep, ...stored.sleep },
  achievements: stored.achievements ?? initialState.achievements,
});

const recalculateSleep = (logs: HealthState['sleep']['logs']) => {
  const recent = logs.slice(0, 7);
  const weeklyAverage = recent.length
    ? recent.reduce((sum, log) => sum + log.hours, 0) / recent.length
    : initialState.sleep.weeklyAverage;
  const variance = recent.length
    ? recent.reduce((sum, log) => sum + Math.abs(log.hours - weeklyAverage), 0) / recent.length
    : 0.7;
  const consistency = Math.max(52, Math.min(98, Math.round(100 - variance * 16)));
  const score = Math.max(40, Math.min(100, Math.round(consistency * 0.6 + (weeklyAverage / 8) * 40)));
  return {
    lastHours: recent[0]?.hours ?? initialState.sleep.lastHours,
    weeklyAverage: Number(weeklyAverage.toFixed(1)),
    consistency,
    score,
  };
};

export function HealthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<HealthState>(initialState);
  const [ready, setReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Load health data from AsyncStorage + restore Supabase session on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [stored, resetDate, { data: { session } }] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY).catch(() => null),
          AsyncStorage.getItem(RESET_DATE_KEY).catch(() => null),
          supabase.auth.getSession().catch(() => ({ data: { session: null } })),
        ]);

        // New real users (no local data + active session) start clean, not with Maya's demo data
        let merged: HealthState;
        if (!stored && session?.user) {
          merged = {
            ...freshUserState,
            hasSeenIntro: true,
            isAuthenticated: true,
            user: { ...freshUserState.user, email: session.user.email ?? '' },
          };
        } else {
          merged = stored
            ? mergeState(JSON.parse(stored) as Partial<HealthState>)
            : { ...initialState };
        }

        if (merged.theme) applyTheme(merged.theme);

        if (session?.user) {
          merged = {
            ...merged,
            isAuthenticated: true,
            user: { ...merged.user, email: session.user.email ?? merged.user.email },
          };

          // Load profile from Supabase and merge into local state
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const profileCompleted = Boolean(
              profile.name && profile.name !== 'Friend' && profile.age
            );
            merged = {
              ...merged,
              hasCompletedOnboarding: merged.hasCompletedOnboarding || profileCompleted,
              user: {
                ...merged.user,
                name: profile.name ?? merged.user.name,
                email: profile.email ?? merged.user.email,
                age: profile.age != null ? String(profile.age) : merged.user.age,
                gender: (profile.gender as any) ?? merged.user.gender,
                heightCm: profile.height_cm != null ? String(profile.height_cm) : merged.user.heightCm,
                weightKg: profile.weight_kg != null ? String(profile.weight_kg) : merged.user.weightKg,
                wakeTime: profile.wake_time ? String(profile.wake_time).slice(0, 5) : merged.user.wakeTime,
                bedtime: profile.bedtime ? String(profile.bedtime).slice(0, 5) : merged.user.bedtime,
                activityLevel: (profile.activity_level as any) ?? merged.user.activityLevel,
                goals: (profile.goals as any) ?? merged.user.goals,
              },
            };
          }
        }

        // Day-boundary reset: new day → reset daily hydration + habit completion flags
        if (resetDate !== todayKey()) {
          merged = {
            ...merged,
            hydration: { ...merged.hydration, currentMl: 0 },
            habits: merged.habits.map((h) => ({ ...h, completedToday: false, skippedToday: false })),
          };
          AsyncStorage.setItem(RESET_DATE_KEY, todayKey()).catch(() => undefined);
        }

        setState(merged);
      } finally {
        setReady(true);
      }
    };
    init();
  }, []);

  // Listen for Supabase auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        setState((current) => ({
          ...current,
          isAuthenticated: true,
          user: { ...current.user, email: session.user.email ?? current.user.email },
        }));
      } else if (event === 'SIGNED_OUT') {
        setState((current) => ({ ...current, isAuthenticated: false }));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Persist health data to AsyncStorage whenever state changes
  useEffect(() => {
    if (ready) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
    }
  }, [ready, state]);

  const setSeenIntro = useCallback(() => {
    setState((current) => ({ ...current, hasSeenIntro: true }));
  }, []);

  // Demo mode bypass — skips real Supabase auth
  const authenticate = useCallback((email?: string) => {
    setState((current) => ({
      ...current,
      isAuthenticated: true,
      user: { ...current.user, email: email || current.user.email || 'maya@aurora.health' },
    }));
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error?.message ?? null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      return error?.message ?? null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    setAuthLoading(true);
    try {
      const redirectTo = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) return error?.message ?? 'Could not start Google sign in';

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (exchangeError) return exchangeError.message;
      } else if (result.type === 'cancel') {
        return null; // User dismissed — not an error
      }
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    supabase.auth.signOut().catch(() => undefined);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
    AsyncStorage.removeItem(RESET_DATE_KEY).catch(() => undefined);
    cancelAllNotifications();
    setState({ ...freshUserState, hasSeenIntro: true });
  }, []);

  const saveProfile = useCallback((profile: Partial<UserProfile>) => {
    setState((current) => ({ ...current, user: { ...current.user, ...profile } }));
    // Fire-and-forget sync to Supabase
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      return Promise.resolve(
        supabase.from('profiles').upsert({
          id: user.id,
          email: user.email ?? '',
          ...(profile.name !== undefined && { name: profile.name }),
          ...(profile.age !== undefined && { age: parseInt(profile.age) || null }),
          ...(profile.gender !== undefined && { gender: profile.gender }),
          ...(profile.heightCm !== undefined && { height_cm: parseFloat(profile.heightCm) || null }),
          ...(profile.weightKg !== undefined && { weight_kg: parseFloat(profile.weightKg) || null }),
          ...(profile.wakeTime !== undefined && { wake_time: profile.wakeTime + ':00' }),
          ...(profile.bedtime !== undefined && { bedtime: profile.bedtime + ':00' }),
          ...(profile.activityLevel !== undefined && { activity_level: profile.activityLevel }),
          ...(profile.goals !== undefined && { goals: profile.goals }),
        })
      ).catch(() => undefined);
    }).catch(() => undefined);
  }, []);

  const setTheme = useCallback((theme: 'Charcoal' | 'Slate' | 'OLED') => {
    applyTheme(theme);
    setState((current) => ({ ...current, theme }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((current) => {
      scheduleHealthNotifications(current.notifications, {
        wakeTime: current.user.wakeTime,
        bedtime: current.user.bedtime,
        name: current.user.name,
      });
      return { ...current, hasCompletedOnboarding: true };
    });
  }, []);

  const configureTracking = useCallback((modes: TrackingMode[]) => {
    setState((current) => ({
      ...current,
      hasConfiguredTracking: true,
      trackingModes: modes.length ? modes : ['Manual Tracking'],
    }));
  }, []);

  const toggleGoal = useCallback((goal: Goal) => {
    setState((current) => {
      const hasGoal = current.user.goals.includes(goal);
      return {
        ...current,
        user: {
          ...current.user,
          goals: hasGoal ? current.user.goals.filter((item) => item !== goal) : [...current.user.goals, goal],
        },
      };
    });
  }, []);

  const toggleNotification = useCallback((key: NotificationKey) => {
    setState((current) => {
      const updated = { ...current.notifications, [key]: !current.notifications[key] };
      const schedule = { wakeTime: current.user.wakeTime, bedtime: current.user.bedtime, name: current.user.name };
      Promise.resolve().then(() => scheduleHealthNotifications(updated, schedule));
      return { ...current, notifications: updated };
    });
  }, []);

  // ── Fire-and-forget Supabase sync helpers ──────────────────────
  const syncWater = useCallback(async (amountMl: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('hydration_logs').insert({
        user_id: user.id, amount_ml: amountMl, logged_date: todayKey(),
      });
    } catch { /* non-critical */ }
  }, []);

  const syncSleep = useCallback(async (hours: number, bedtime?: string, wakeTime?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('sleep_logs').upsert({
        user_id: user.id, hours, bedtime: bedtime || null, wake_time: wakeTime || null,
        logged_date: todayKey(),
      }, { onConflict: 'user_id,logged_date' });
    } catch { /* non-critical */ }
  }, []);

  const syncHabit = useCallback(async (title: string, period: string, cadence: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('habits').insert({
        user_id: user.id, title, period, cadence, streak: 0, longest_streak: 0, paused: false,
      });
    } catch { /* non-critical */ }
  }, []);

  const syncHabitComplete = useCallback(async (habitId: string, habitTitle: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Find the Supabase habit row by title
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', user.id)
        .ilike('title', `%${habitTitle}%`)
        .limit(1);
      const sbHabitId = habits?.[0]?.id;
      if (!sbHabitId) return;
      await supabase.from('habit_logs').upsert(
        { habit_id: sbHabitId, logged_date: todayKey(), status: 'completed' },
        { onConflict: 'habit_id,logged_date' }
      );
      try {
        await supabase.rpc('increment_habit_streak', { p_habit_id: sbHabitId });
      } catch {
        await supabase.from('habits').update({ streak: 1 }).eq('id', sbHabitId);
      }
    } catch { /* non-critical */ }
  }, []);

  const syncMeal = useCallback(async (meal: Omit<Meal, 'id' | 'date'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('meal_logs').insert({
        user_id: user.id,
        meal_type: meal.type,
        name: meal.name,
        calories: meal.calories,
        protein_grams: meal.protein,
        carbs_grams: meal.carbs,
        fat_grams: meal.fat,
        logged_date: todayKey(),
      });
    } catch { /* non-critical */ }
  }, []);

  const syncMemory = useCallback(async (observation: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('health_memories').insert({ user_id: user.id, observation });
    } catch { /* non-critical */ }
  }, []);

  const addWater = useCallback((amountMl: number) => {
    const cleanAmount = Math.max(0, Math.round(amountMl));
    if (!cleanAmount) return;
    setState((current) => {
      const today = todayKey();
      const history = current.hydration.history.some((item) => item.date === today)
        ? current.hydration.history.map((item) =>
            item.date === today ? { ...item, amountMl: item.amountMl + cleanAmount } : item,
          )
        : [...current.hydration.history, { date: today, amountMl: cleanAmount }];
      return {
        ...current,
        hydration: {
          ...current.hydration,
          currentMl: current.hydration.currentMl + cleanAmount,
          history: history.slice(-14),
        },
      };
    });
    Promise.resolve().then(() => syncWater(cleanAmount));
  }, [syncWater]);

  const setHydrationGoal = useCallback((goalMl: number) => {
    setState((current) => ({
      ...current,
      hydration: { ...current.hydration, goalMl: Math.max(500, Math.min(5000, goalMl)) },
    }));
  }, []);

  const logSleep = useCallback((hours: number, bedtime?: string, wakeTime?: string) => {
    const cleanHours = Math.max(0, Math.min(16, Number(hours.toFixed(1))));
    if (!cleanHours) return;
    Promise.resolve().then(() => syncSleep(cleanHours, bedtime, wakeTime));
    setState((current) => {
      const entry = {
        id: makeId('sleep'),
        date: todayKey(),
        hours: cleanHours,
        bedtime: bedtime || current.user.bedtime,
        wakeTime: wakeTime || current.user.wakeTime,
        quality: cleanHours >= 7.5 ? 'Excellent' : cleanHours >= 6.5 ? 'Good' : cleanHours >= 5.5 ? 'Fair' : 'Poor' as 'Excellent' | 'Good' | 'Fair' | 'Poor',
        stages: {
          rem: Number((cleanHours * 0.21).toFixed(1)),
          light: Number((cleanHours * 0.52).toFixed(1)),
          deep: Number((cleanHours * 0.22).toFixed(1)),
          awake: Number((cleanHours * 0.05).toFixed(1)),
        },
      };
      const logs = [entry, ...current.sleep.logs.filter((log) => log.date !== entry.date)].slice(0, 30);
      return { ...current, sleep: { ...current.sleep, ...recalculateSleep(logs), logs } };
    });
  }, [syncSleep]);

  const createHabit = useCallback((title: string, period: HabitPeriod = 'Anytime', cadence = 'Daily', emoji?: string, color?: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const habitColors = ['#00D97E', '#3B9EFF', '#8B7BFF', '#FFB547', '#FF6B6B'];
    setState((current) => ({
      ...current,
      habits: [
        {
          id: makeId('habit'),
          title: trimmed,
          completionDates: [],
          period,
          cadence,
          streak: 0,
          longestStreak: 0,
          completedToday: false,
          paused: false,
          skippedToday: false,
          emoji: emoji || '⭐',
          color: color || habitColors[current.habits.length % habitColors.length],
        },
        ...current.habits,
      ],
    }));
    Promise.resolve().then(() => syncHabit(trimmed, period, cadence));
  }, [syncHabit]);

  const completeHabit = useCallback((id: string) => {
    const today = todayKey();
    let habitTitle = '';
    setState((current) => {
      const updated = current.habits.map((habit) => {
        if (habit.id !== id || habit.completedToday || habit.paused) return habit;
        habitTitle = habit.title;
        const nextStreak = habit.streak + 1;
        const existing = habit.completionDates ?? [];
        return {
          ...habit,
          completedToday: true,
          skippedToday: false,
          streak: nextStreak,
          longestStreak: Math.max(habit.longestStreak, nextStreak),
          completionDates: existing.includes(today) ? existing : [...existing, today],
        };
      });
      return { ...current, habits: updated };
    });
    Promise.resolve().then(() => { if (habitTitle) syncHabitComplete(id, habitTitle); });
  }, [syncHabitComplete]);

  const skipHabit = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      habits: current.habits.map((habit) =>
        habit.id === id ? { ...habit, skippedToday: true, completedToday: false, streak: 0 } : habit,
      ),
    }));
  }, []);

  const pauseHabit = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      habits: current.habits.map((habit) =>
        habit.id === id ? { ...habit, paused: !habit.paused, skippedToday: false } : habit,
      ),
    }));
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      habits: current.habits.filter((habit) => habit.id !== id),
    }));
  }, []);

  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => {
    setState((current) => ({
      ...current,
      habits: current.habits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)),
    }));
  }, []);

  const addMeal = useCallback((meal: Omit<Meal, 'id' | 'date'>) => {
    setState((current) => ({
      ...current,
      meals: [{ ...meal, id: makeId('meal'), date: todayKey() }, ...current.meals].slice(0, 60),
    }));
    Promise.resolve().then(() => syncMeal(meal));
  }, [syncMeal]);

  const deleteMeal = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      meals: current.meals.filter((m) => m.id !== id),
    }));
  }, []);

  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    setState((current) => ({
      ...current,
      chatMessages: [
        ...current.chatMessages,
        { ...message, id: makeId('message'), createdAt: new Date().toISOString() },
      ].slice(-40),
    }));
  }, []);

  const applyAgentActions = useCallback(
    (actions: AgentAction[]) => {
      actions.forEach((action) => {
        if (action.type === 'ADD_WATER') addWater(action.amountMl);
        if (action.type === 'LOG_SLEEP') logSleep(action.hours, action.bedtime, action.wakeTime);
        if (action.type === 'CREATE_HABIT') createHabit(action.title, action.period, action.cadence);
        if (action.type === 'COMPLETE_HABIT') {
          const today = todayKey();
          setState((current) => {
            const match = current.habits.find(
              (h) => h.title.toLowerCase().includes(action.title.toLowerCase()) && !h.completedToday
            );
            if (!match) return current;
            const nextStreak = match.streak + 1;
            const existing = match.completionDates ?? [];
            return {
              ...current,
              habits: current.habits.map((h) =>
                h.id === match.id
                  ? {
                      ...h,
                      completedToday: true,
                      streak: nextStreak,
                      longestStreak: Math.max(h.longestStreak, nextStreak),
                      completionDates: existing.includes(today) ? existing : [...existing, today],
                    }
                  : h
              ),
            };
          });
        }
        if (action.type === 'ADD_MEAL') {
          addMeal({
            type: action.mealType,
            name: action.name,
            calories: action.calories ?? 0,
            protein: action.protein ?? 0,
            carbs: action.carbs ?? 0,
            fat: action.fat ?? 0,
          });
        }
        if (action.type === 'SET_HYDRATION_GOAL') {
          setState((current) => ({
            ...current,
            hydration: { ...current.hydration, goalMl: action.goalMl },
          }));
        }
        if (action.type === 'ADD_MEMORY') {
          setState((current) => ({
            ...current,
            memories: [action.text, ...current.memories.filter((m) => m !== action.text)].slice(0, 10),
          }));
          Promise.resolve().then(() => syncMemory(action.text));
        }
      });
    },
    [addMeal, addWater, createHabit, logSleep, syncMemory],
  );

  const resetDemo = useCallback(() => {
    setState(initialState);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      state,
      ready,
      authLoading,
      goalOptions,
      setSeenIntro,
      authenticate,
      signIn,
      signUp,
      signInWithGoogle,
      logout,
      saveProfile,
      setTheme,
      completeOnboarding,
      configureTracking,
      toggleGoal,
      toggleNotification,
      addWater,
      setHydrationGoal,
      logSleep,
      createHabit,
      completeHabit,
      skipHabit,
      pauseHabit,
      deleteHabit,
      updateHabit,
      addMeal,
      deleteMeal,
      addChatMessage,
      applyAgentActions,
      resetDemo,
    }),
    [
      addChatMessage,
      addMeal,
      addWater,
      applyAgentActions,
      authenticate,
      authLoading,
      logout,
      completeHabit,
      completeOnboarding,
      configureTracking,
      createHabit,
      deleteHabit,
      deleteMeal,
      logSleep,
      pauseHabit,
      ready,
      resetDemo,
      saveProfile,
      setTheme,
      setHydrationGoal,
      setSeenIntro,
      signIn,
      signInWithGoogle,
      signUp,
      skipHabit,
      state,
      toggleGoal,
      toggleNotification,
      updateHabit,
    ],
  );

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (!context) throw new Error('useHealth must be used inside HealthProvider');
  return context;
}
