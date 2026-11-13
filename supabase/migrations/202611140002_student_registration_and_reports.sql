-- Student reporting and private coach notes.
create table if not exists public.student_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  report_date date not null default current_date,
  weight_kg numeric(6,2),
  energy_level smallint check (energy_level between 1 and 5),
  sleep_hours numeric(4,1),
  workout_done boolean,
  nutrition_adherence smallint check (nutrition_adherence between 1 and 5),
  notes text,
  coach_feedback text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  note text not null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists students_profile_idx on public.students(profile_id);
create index if not exists students_pending_idx on public.students(status, created_at desc);
create index if not exists student_reports_date_idx on public.student_reports(student_id, report_date desc);
create index if not exists coach_notes_student_idx on public.coach_notes(student_id, created_at desc);

-- New Auth users become pending students. Role always comes from trusted server code.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  registered_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, registered_name, 'student');

  insert into public.students (profile_id, full_name, email, status)
  values (new.id, registered_name, new.email, 'pending');
  return new;
end;
$$;

-- Students may complete their own profile, but cannot change ownership, email, enrollment,
-- or approval status. Admins retain full control through the existing RLS policy.
create or replace function public.guard_student_self_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    if old.profile_id is distinct from (select auth.uid())
       or new.profile_id is distinct from old.profile_id
       or new.status is distinct from old.status
       or new.email is distinct from old.email
       or new.joined_on is distinct from old.joined_on then
      raise exception 'Students may only update their own profile details';
    end if;
  end if;
  return new;
end;
$$;
create trigger students_guard_self_update before update on public.students
for each row execute function public.guard_student_self_update();

alter table public.student_reports enable row level security;
alter table public.coach_notes enable row level security;

create policy "students own profile update" on public.students for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "student reports admin all" on public.student_reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "student reports own read" on public.student_reports for select to authenticated
  using (public.owns_student(student_id));
create policy "student reports own insert" on public.student_reports for insert to authenticated
  with check (public.owns_student(student_id));

create policy "coach notes admin all" on public.coach_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
