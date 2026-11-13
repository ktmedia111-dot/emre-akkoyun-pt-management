alter table public.progress_photos
  add column if not exists category text not null default 'front';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'progress_photos_category_check') then
    alter table public.progress_photos add constraint progress_photos_category_check check (category in ('front','side','back'));
  end if;
end $$;

create policy "measurements own insert" on public.measurements for insert to authenticated
  with check (public.owns_student(student_id));
create policy "progress photos own insert" on public.progress_photos for insert to authenticated
  with check (public.owns_student(student_id));
