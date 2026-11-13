# Emre Akkoyun PT Management

Responsive PT management app built with React, Vite, and Supabase. Includes an admin dashboard, student directory, daily sessions, payment overview, student login portal, and database row-level security.

## Run locally

1. Install Node.js 20+ and pnpm.
2. Run `pnpm install` and `pnpm dev`.
3. Without Supabase environment variables the app opens in preview mode. Added students are kept in this browser's local storage.

## Connect Supabase

1. Copy `.env.example` to `.env.local`.
2. In Supabase, open **Project Settings → API Keys** and copy the Project URL and publishable/anon key into the two `VITE_SUPABASE_*` entries. These are public client values; never put a `service_role` key in this app.
3. The database schema is in `supabase/migrations/202611130001_initial_schema.sql`. It was applied to the current Supabase project through SQL Editor.
4. Restart the Vite dev server after changing env values.

## Set up Emre as the first admin

Create Emre's account in **Authentication → Users** (or use the app's Supabase Auth sign-in flow after creating the account). Then run this in SQL Editor, replacing the email with the account's exact address:

```sql
update public.profiles p
set role = 'admin', full_name = 'Emre Akkoyun'
from auth.users u
where p.id = u.id and lower(u.email) = lower('EMRE_LOGIN_EMAIL');
```

To connect a student login to an existing student record, find both rows and link them as admin:

```sql
update public.students
set profile_id = 'AUTH_USER_UUID'
where id = 'STUDENT_UUID';
```

The app uses Supabase Row Level Security: administrators manage all records, students can read only their own records, and students can add only their own workout/nutrition logs. Progress photos are kept in a private `progress-photos` storage bucket.

## Deploy with GitHub Pages

Push to `main`; the included GitHub Actions workflow builds the Vite app and publishes `dist/` to GitHub Pages. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository Actions variables before publishing a connected app. Set the site's Supabase Auth redirect URLs to the GitHub Pages URL.
