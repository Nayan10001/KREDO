-- Run this in Supabase SQL Editor once.

create extension if not exists pgcrypto;

create table if not exists public.history_entries (
    id uuid primary key default gen_random_uuid(),
    url text not null,
    timestamp timestamptz not null,
    overall_credibility text not null,
    avg_score integer not null check (avg_score >= 0 and avg_score <= 100),
    bottom_line text not null default '',
    verdicts jsonb not null default '[]'::jsonb,
    explanations jsonb not null default '{}'::jsonb,
    source text not null default 'webapp',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_history_entries_timestamp_desc
    on public.history_entries (timestamp desc);

create index if not exists idx_history_entries_credibility
    on public.history_entries (overall_credibility);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_history_entries_updated_at on public.history_entries;
create trigger trg_history_entries_updated_at
before update on public.history_entries
for each row
execute function public.set_updated_at();
