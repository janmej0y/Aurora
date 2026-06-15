export type Gender = 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say';

export type ActivityLevel = 'Light' | 'Moderate' | 'Active' | 'Athlete';

export type Goal =
  | 'Improve Hydration'
  | 'Sleep Better'
  | 'Build Better Habits'
  | 'Eat Healthier'
  | 'Improve Energy Levels'
  | 'Improve Consistency';

export type NotificationKey =
  | 'hydrationReminders'
  | 'sleepReminders'
  | 'habitReminders'
  | 'dailyInsights';

export type NotificationPrefs = Record<NotificationKey, boolean>;

export type TrackingMode = 'Manual Tracking' | 'Apple Health' | 'Health Connect' | 'Fitbit' | 'Garmin';

export type HabitPeriod = 'Morning' | 'Afternoon' | 'Evening' | 'Anytime';

export type Habit = {
  id: string;
  title: string;
  period: HabitPeriod;
  cadence: string;
  streak: number;
  longestStreak: number;
  completedToday: boolean;
  completionDates: string[];
  paused: boolean;
  skippedToday: boolean;
  emoji?: string;
  color?: string;
};

export type SleepStages = {
  rem: number;   // hours
  light: number; // hours
  deep: number;  // hours
  awake: number; // hours
};

export type SleepLog = {
  id: string;
  date: string;
  hours: number;
  bedtime: string;
  wakeTime: string;
  quality?: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  stages?: SleepStages;
};

export type HydrationLog = {
  date: string;
  amountMl: number;
};

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type Meal = {
  id: string;
  date: string;
  type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  type: 'hydration' | 'sleep' | 'habits' | 'nutrition' | 'consistency';
};

export type UserProfile = {
  name: string;
  email: string;
  age: string;
  gender: Gender;
  heightCm: string;
  weightKg: string;
  wakeTime: string;
  bedtime: string;
  activityLevel: ActivityLevel;
  goals: Goal[];
};

export type HealthState = {
  hasSeenIntro: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  hasConfiguredTracking: boolean;
  trackingModes: TrackingMode[];
  user: UserProfile;
  notifications: NotificationPrefs;
  theme: 'Charcoal' | 'Slate' | 'OLED';
  hydration: {
    goalMl: number;
    currentMl: number;
    history: HydrationLog[];
  };
  sleep: {
    lastHours: number;
    weeklyAverage: number;
    consistency: number;
    score: number;
    logs: SleepLog[];
  };
  habits: Habit[];
  meals: Meal[];
  memories: string[];
  chatMessages: ChatMessage[];
  achievements: Achievement[];
};

export type AgentAction =
  | { type: 'ADD_WATER'; amountMl: number }
  | { type: 'LOG_SLEEP'; hours: number; bedtime?: string; wakeTime?: string }
  | { type: 'CREATE_HABIT'; title: string; period?: HabitPeriod; cadence?: string }
  | { type: 'COMPLETE_HABIT'; title: string }
  | { type: 'ADD_MEAL'; mealType: MealType; name: string; calories?: number; protein?: number; carbs?: number; fat?: number }
  | { type: 'SET_HYDRATION_GOAL'; goalMl: number }
  | { type: 'ADD_MEMORY'; text: string };

export type AgentResponse = {
  transcript?: string;
  reply: string;
  actions: AgentAction[];
  error?: string;
};

// ─── Rich card payload — attached to assistant ChatMessages ──────────────────
// Stored as JSON string in ChatMessage.content when role === 'assistant'
// and the message carries a card. The CompanionScreen checks for this
// by looking for a leading JSON block marker in the content string.

export type RichCardType =
  | 'health_summary'
  | 'hydration_update'
  | 'sleep_update'
  | 'habit_progress'
  | 'nutrition_log'
  | 'weekly_report'
  | 'insight';

export type RichMessagePayload = {
  cardType: RichCardType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cardData: Record<string, any>;
  text: string; // natural language reply below the card
};
