🔖 Smart Bookmark App

A simple bookmark manager built with Next.js App Router and Supabase, featuring Google OAuth authentication, row-level security, and real-time updates.

🔗 Live Demo:
https://smart-bookmark-alpha-one.vercel.app/

📦 GitHub Repository:
https://github.com/OMKARGHATAWADE/smart-bookmark

✨ Features

🔐 Google OAuth Authentication (no email/password)

➕ Add bookmarks (URL + optional title)

🗂 Bookmarks are private per user

🔄 Real-time sync across multiple tabs (no refresh needed)

❌ Delete your own bookmarks

🚀 Deployed on Vercel

🛠 Tech Stack

Frontend: Next.js 14 (App Router)

Backend / Auth / DB: Supabase

Authentication: Google OAuth (Supabase Auth)

Database: PostgreSQL (with Row Level Security)

Realtime: Supabase Realtime

Styling: Tailwind CSS

Deployment: Vercel

📸 How It Works
Authentication

Users sign in using Google OAuth

Supabase manages sessions and tokens

After login, users are redirected to the dashboard

Database & Security

Bookmarks are stored in a bookmarks table

Each bookmark is linked to the authenticated user

Row Level Security (RLS) ensures users can only:

Read their own bookmarks

Insert their own bookmarks

Delete their own bookmarks

Real-time Updates

Supabase Realtime is enabled for the bookmarks table

When a bookmark is added or deleted in one tab, it instantly appears in all other open tabs

🧱 Database Schema
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text,
  created_at timestamptz not null default now()
);

alter table public.bookmarks enable row level security;

create policy "select_own_bookmarks"
on public.bookmarks
for select
using (auth.uid() = user_id);

create policy "insert_own_bookmarks"
on public.bookmarks
for insert
with check (auth.uid() = user_id);

create policy "delete_own_bookmarks"
on public.bookmarks
for delete
using (auth.uid() = user_id);

⚙️ Local Setup
1. Clone the repository
git clone https://github.com/OMKARGHATAWADE/smart-bookmark.git
cd smart-bookmark

2. Install dependencies
npm install

3. Environment variables (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

4. Run the app
npm run dev


App runs at:
http://localhost:3000

🚀 Deployment

Deployed on Vercel

Environment variables configured in Vercel dashboard

Google OAuth redirect URLs configured for both:

Localhost

Production domain
