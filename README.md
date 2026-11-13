# Emre Akkoyun PT Management

React + Vite + Supabase application for managing PT students, approvals, training, nutrition, progress and payments.

## Run locally

1. Install Node.js 20+ and pnpm.
2. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key.
3. Run `pnpm install` and `pnpm dev`.

The app does not seed demo student, session or payment data. Missing Supabase configuration is shown as a setup notice; records are not saved locally as pretend production data.

## Supabase setup

Apply the migrations in order from `supabase/migrations/` using the Supabase CLI or SQL Editor:

1. `202611130001_initial_schema.sql`
2. `202611140001_student_lifecycle_fields.sql`
3. `202611140002_student_registration_and_reports.sql`
4. `202611140003_student_measurement_and_photo_policies.sql`
5. `202611140004_student_checkin_updates.sql`
6. `202611140005_student_report_guard.sql`

The migrations create the core tables, private progress-photo bucket, student registration/approval fields, student check-in updates, report integrity protections and RLS. A new Auth signup always receives the `student` role and creates a pending student record; role selection is not available to the client. The admin role must be granted by a trusted project owner in SQL Editor.

Set Emre's profile as admin after the Auth account exists:

```sql
update public.profiles p
set role = 'admin', full_name = 'Emre Akkoyun'
from auth.users u
where p.id = u.id and lower(u.email) = lower('EMRE_LOGIN_EMAIL');
```

## Deploy with GitHub Pages

The GitHub repository is the source of truth. GitHub Pages publishes the production build from the `gh-pages` branch. Configure the Supabase project URL and publishable key as build-time variables; never place a `service_role` key in the browser app. Add the deployed app URL to Supabase **Authentication → URL Configuration → Redirect URLs**.
