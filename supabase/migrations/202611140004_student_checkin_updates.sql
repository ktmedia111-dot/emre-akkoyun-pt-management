-- Let students revise today's check-in and workout details without accessing other records.
create policy "workout logs own update" on public.workout_logs for update to authenticated
  using (public.owns_student(student_id))
  with check (public.owns_student(student_id));

create policy "nutrition logs own update" on public.nutrition_logs for update to authenticated
  using (public.owns_student(student_id))
  with check (public.owns_student(student_id));
