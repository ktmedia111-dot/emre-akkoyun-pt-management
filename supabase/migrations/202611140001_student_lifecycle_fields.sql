-- Extend student records for self registration, onboarding and progress tracking.
alter type public.student_status add value if not exists 'pending';

alter table public.students
  add column if not exists birth_date date,
  add column if not exists gender text,
  add column if not exists height_cm numeric(5,2),
  add column if not exists current_weight_kg numeric(6,2),
  add column if not exists activity_level text,
  add column if not exists training_history text,
  add column if not exists health_notes text,
  add column if not exists allergies text,
  add column if not exists profile_complete boolean not null default false,
  add column if not exists privacy_consented_at timestamptz;

alter table public.measurements
  add column if not exists abdomen_cm numeric(6,2),
  add column if not exists neck_cm numeric(6,2);

alter table public.workout_plans
  add column if not exists starts_on date,
  add column if not exists ends_on date,
  add column if not exists weekly_days jsonb not null default '[]'::jsonb,
  add column if not exists goal text;

alter table public.workout_logs
  add column if not exists exercise_results jsonb not null default '[]'::jsonb,
  add column if not exists completed boolean not null default true;

alter table public.nutrition_plans
  add column if not exists water_target_ml integer,
  add column if not exists meal_count smallint,
  add column if not exists starts_on date,
  add column if not exists ends_on date;

alter table public.nutrition_logs
  add column if not exists water_ml integer,
  add column if not exists meals_completed jsonb not null default '[]'::jsonb;
