-- COE Training Portal Supabase setup
-- Run this in your Supabase SQL editor before using COE cross-device login/signup.

create extension if not exists pgcrypto;

create table if not exists public.coe_trainees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  qualifications text not null,
  university text not null,
  cnic text not null unique,
  reason text not null,
  role text not null default 'trainee',
  enrolled_courses jsonb not null default '[]'::jsonb,
  course_progress jsonb not null default '{}'::jsonb,
  completed_modules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_coe_trainees()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_coe_trainees_updated_at on public.coe_trainees;
create trigger trg_coe_trainees_updated_at
before update on public.coe_trainees
for each row execute function public.set_updated_at_coe_trainees();

alter table public.coe_trainees enable row level security;

-- Read-only list for app users
drop policy if exists "Allow anon read coe trainees" on public.coe_trainees;
create policy "Allow anon read coe trainees"
on public.coe_trainees
for select
using (true);

-- Allow app sign-up and admin inserts
drop policy if exists "Allow anon insert coe trainees" on public.coe_trainees;
create policy "Allow anon insert coe trainees"
on public.coe_trainees
for insert
with check (true);

-- Allow profile/progress updates by app client
drop policy if exists "Allow anon update coe trainees" on public.coe_trainees;
create policy "Allow anon update coe trainees"
on public.coe_trainees
for update
using (true)
with check (true);

-- Allow admin deletes from app client
drop policy if exists "Allow anon delete coe trainees" on public.coe_trainees;
create policy "Allow anon delete coe trainees"
on public.coe_trainees
for delete
using (true);
