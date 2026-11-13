-- Prevent student clients from inserting fake trainer feedback into their own reports.
create or replace function public.guard_student_report_feedback()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_admin()
     and (new.coach_feedback is not null or new.reviewed_at is not null) then
    raise exception 'Students cannot write coach feedback or review status';
  end if;
  return new;
end;
$$;
create trigger student_reports_guard_feedback before insert on public.student_reports
for each row execute function public.guard_student_report_feedback();
