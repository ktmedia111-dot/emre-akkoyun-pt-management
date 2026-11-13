-- Emre Akkoyun PT Management: initial schema
-- Run once in Supabase SQL Editor. Set the first administrator after creating their Auth user;
-- see README.md for the one-line role update.

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'student');
create type public.student_status as enum ('active', 'inactive');
create type public.appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
create type public.payment_status as enum ('pending', 'paid', 'overdue', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  status public.student_status not null default 'active',
  goal text,
  start_weight numeric(6,2),
  target_weight numeric(6,2),
  notes text,
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  description text,
  week_day smallint check (week_day between 1 and 7),
  exercises jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  workout_plan_id uuid references public.workout_plans(id) on delete set null,
  completed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  daily_calories integer check (daily_calories is null or daily_calories >= 0),
  protein_g numeric(7,2),
  carbs_g numeric(7,2),
  fat_g numeric(7,2),
  meals jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(6,2),
  body_fat_pct numeric(5,2),
  muscle_mass_kg numeric(6,2),
  waist_cm numeric(6,2),
  hip_cm numeric(6,2),
  chest_cm numeric(6,2),
  arm_cm numeric(6,2),
  thigh_cm numeric(6,2),
  notes text,
  created_at timestamptz not null default now()
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  storage_path text not null,
  taken_on date not null default current_date,
  caption text,
  created_at timestamptz not null default now(),
  unique(storage_path)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.appointment_status not null default 'scheduled',
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  description text not null default 'PT paketi',
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'TRY',
  status public.payment_status not null default 'pending',
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  logged_on date not null default current_date,
  calories integer check (calories is null or calories >= 0),
  protein_g numeric(7,2),
  carbs_g numeric(7,2),
  fat_g numeric(7,2),
  notes text,
  created_at timestamptz not null default now(),
  unique(student_id, logged_on)
);

create index students_status_idx on public.students(status);
create index workout_plans_student_idx on public.workout_plans(student_id);
create index measurements_student_date_idx on public.measurements(student_id, measured_on desc);
create index appointments_start_idx on public.appointments(starts_at);
create index appointments_student_idx on public.appointments(student_id);
create index payments_student_status_idx on public.payments(student_id, status);
create index nutrition_logs_student_date_idx on public.nutrition_logs(student_id, logged_on desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- A user must never be able to grant themselves the admin role via profile updates.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;
create trigger profiles_prevent_role_escalation before update on public.profiles for each row execute function public.prevent_role_escalation();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger students_updated_at before update on public.students for each row execute function public.set_updated_at();
create trigger workout_plans_updated_at before update on public.workout_plans for each row execute function public.set_updated_at();
create trigger nutrition_plans_updated_at before update on public.nutrition_plans for each row execute function public.set_updated_at();
create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

-- Create a student profile automatically when someone signs up. Never trust client-supplied role metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'student');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;

create or replace function public.owns_student(target_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.students s where s.id = target_student_id and s.profile_id = (select auth.uid()));
$$;

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_logs enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.appointments enable row level security;
alter table public.payments enable row level security;
alter table public.nutrition_logs enable row level security;

create policy "profiles read self or admin" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "profiles update self or admin" on public.profiles for update to authenticated using (id = (select auth.uid()) or public.is_admin()) with check (id = (select auth.uid()) or public.is_admin());

create policy "students admin all" on public.students for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "students read own" on public.students for select to authenticated using (profile_id = (select auth.uid()));

create policy "workout plans admin all" on public.workout_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "workout plans own read" on public.workout_plans for select to authenticated using (public.owns_student(student_id));
create policy "workout logs admin all" on public.workout_logs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "workout logs own read" on public.workout_logs for select to authenticated using (public.owns_student(student_id));
create policy "workout logs own insert" on public.workout_logs for insert to authenticated with check (public.owns_student(student_id));

create policy "nutrition plans admin all" on public.nutrition_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "nutrition plans own read" on public.nutrition_plans for select to authenticated using (public.owns_student(student_id));
create policy "measurements admin all" on public.measurements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "measurements own read" on public.measurements for select to authenticated using (public.owns_student(student_id));
create policy "progress photos admin all" on public.progress_photos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "progress photos own read" on public.progress_photos for select to authenticated using (public.owns_student(student_id));

create policy "appointments admin all" on public.appointments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "appointments own read" on public.appointments for select to authenticated using (public.owns_student(student_id));
create policy "payments admin all" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "payments own read" on public.payments for select to authenticated using (public.owns_student(student_id));
create policy "nutrition logs admin all" on public.nutrition_logs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "nutrition logs own read" on public.nutrition_logs for select to authenticated using (public.owns_student(student_id));
create policy "nutrition logs own insert" on public.nutrition_logs for insert to authenticated with check (public.owns_student(student_id));

-- Private storage bucket. Store files at: <student-uuid>/<filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "photos admin all" on storage.objects for all to authenticated using (bucket_id = 'progress-photos' and public.is_admin()) with check (bucket_id = 'progress-photos' and public.is_admin());
create policy "students read own photos" on storage.objects for select to authenticated using (
  bucket_id = 'progress-photos' and public.owns_student(((storage.foldername(name))[1])::uuid)
);
create policy "students upload own photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'progress-photos' and public.owns_student(((storage.foldername(name))[1])::uuid)
);
