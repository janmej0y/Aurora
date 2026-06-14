-- Aurora PostgreSQL Supabase Database Schema
-- Optimized for relational queries, type-safety, and Row-Level Security (RLS)

-- ────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────
-- TYPE ENUMS
-- ────────────────────────────────────────────────────────
create type gender_type as enum ('Female', 'Male', 'Non-binary', 'Prefer not to say');
create type activity_level_type as enum ('Light', 'Moderate', 'Active', 'Athlete');
create type habit_period_type as enum ('Morning', 'Afternoon', 'Evening', 'Anytime');
create type meal_type as enum ('Breakfast', 'Lunch', 'Dinner', 'Snack');
create type chat_role_type as enum ('user', 'assistant');

-- ────────────────────────────────────────────────────────
-- TABLES SETUP
-- ────────────────────────────────────────────────────────

-- 1. Profiles Table (extending Supabase Auth users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null default 'Friend',
  age integer,
  gender gender_type default 'Prefer not to say',
  height_cm numeric(5, 2),
  weight_kg numeric(5, 2),
  wake_time time default '06:30:00',
  bedtime time default '22:30:00',
  activity_level activity_level_type default 'Moderate',
  goals text[] default '{}'::text[],
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Hydration Logs Table
create table public.hydration_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount_ml integer not null check (amount_ml > 0),
  logged_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast weekly/monthly queries
create index idx_hydration_user_date on public.hydration_logs(user_id, logged_date);

-- 3. Sleep Logs Table
create table public.sleep_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  hours numeric(4, 2) not null check (hours >= 0.0 and hours <= 24.0),
  bedtime time not null,
  wake_time time not null,
  quality text check (quality in ('Poor', 'Fair', 'Good', 'Excellent')),
  logged_date date not null default current_date,
  -- Sleep stages splits (in hours)
  rem_hours numeric(3, 1) default 0.0,
  light_hours numeric(3, 1) default 0.0,
  deep_hours numeric(3, 1) default 0.0,
  awake_hours numeric(3, 1) default 0.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_sleep_user_date on public.sleep_logs(user_id, logged_date);

-- 4. Habits Table
create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null check (char_length(title) > 0),
  period habit_period_type not null default 'Anytime',
  cadence text not null default 'Daily',
  streak integer not null default 0,
  longest_streak integer not null default 0,
  paused boolean not null default false,
  emoji text default '⭐',
  color text default '#22C55E',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_habits_user on public.habits(user_id);

-- 5. Habit Logs Table (Daily completions)
create table public.habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  logged_date date not null default current_date,
  status text not null check (status in ('completed', 'skipped')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (habit_id, logged_date)
);

create index idx_habit_logs_date on public.habit_logs(habit_id, logged_date);

-- 6. Meal Logs Table
create table public.meal_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  meal_type meal_type not null,
  name text not null,
  calories integer not null default 0 check (calories >= 0),
  protein_grams integer not null default 0 check (protein_grams >= 0),
  carbs_grams integer not null default 0 check (carbs_grams >= 0),
  fat_grams integer not null default 0 check (fat_grams >= 0),
  logged_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_meals_user_date on public.meal_logs(user_id, logged_date);

-- 7. Chat History Table
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role chat_role_type not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_chat_user on public.chat_messages(user_id);

-- 8. Health Memories Table (AI behavior observations)
create table public.health_memories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  observation text not null check (char_length(observation) > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_memories_user on public.health_memories(user_id);

-- 9. Achievements Table
create table public.achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  icon text not null default '🏆',
  achievement_type text not null check (achievement_type in ('hydration', 'sleep', 'habits', 'nutrition', 'consistency')),
  unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, title)
);

create index idx_achievements_user on public.achievements(user_id);

-- ────────────────────────────────────────────────────────
-- SECURITY RULES (ROW-LEVEL SECURITY)
-- ────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.hydration_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.meal_logs enable row level security;
alter table public.chat_messages enable row level security;
alter table public.health_memories enable row level security;
alter table public.achievements enable row level security;

-- Policies for profile access
create policy "Users can view and edit their own profiles."
  on public.profiles for all
  using (auth.uid() = id);

-- Policies for sub-resource tables
create policy "Users can manage their own hydration logs."
  on public.hydration_logs for all
  using (auth.uid() = user_id);

create policy "Users can manage their own sleep logs."
  on public.sleep_logs for all
  using (auth.uid() = user_id);

create policy "Users can manage their own habits."
  on public.habits for all
  using (auth.uid() = user_id);

create policy "Users can manage their own habit logs."
  on public.habit_logs for all
  using (auth.uid() = (select user_id from public.habits where id = habit_id));

create policy "Users can manage their own meal logs."
  on public.meal_logs for all
  using (auth.uid() = user_id);

create policy "Users can manage their own chat threads."
  on public.chat_messages for all
  using (auth.uid() = user_id);

create policy "Users can manage their own health memories."
  on public.health_memories for all
  using (auth.uid() = user_id);

create policy "Users can view their own unlocked achievements."
  on public.achievements for all
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP
-- Runs after every new Supabase Auth user is created,
-- including email/password and Google OAuth sign-ups.
-- ────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Friend'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
