-- Home Money Management — cloud sync backend (Supabase / Postgres)
-- ---------------------------------------------------------------------------
-- Offline-first design: the client (IndexedDB/Dexie) is the source of truth.
-- The cloud only needs to (a) isolate each user's rows and (b) let a device
-- pull "everything changed since my last cursor". So instead of mirroring all
-- 9 entity tables with hand-mapped snake_case columns, we use ONE generic
-- table: the sync-critical fields are real columns (for RLS + the pull cursor)
-- and the full client record travels verbatim in a JSONB `doc`.
--
-- Benefits: one trivially-auditable RLS policy, no camelCase<->snake_case
-- mapping in the engine, and adding a client field never needs a migration.
-- ---------------------------------------------------------------------------

create table if not exists public.sync_records (
  table_name  text        not null,               -- 'transactions', 'accounts', ...
  id          text        not null,               -- client UUID (crypto.randomUUID)
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,
  updated_at  timestamptz not null,               -- Last-Write-Wins clock + pull cursor
  deleted_at  timestamptz,                         -- tombstone (null = live)
  doc         jsonb       not null,               -- full client record (minus local-only fields)
  primary key (user_id, table_name, id)
);

-- Pull query is: where user_id = auth.uid() and table_name = $1 and updated_at > $cursor
create index if not exists sync_records_pull_idx
  on public.sync_records (user_id, table_name, updated_at);

-- Row Level Security: a user can only ever see or write their own rows.
alter table public.sync_records enable row level security;

-- A user can only ever read or write their own rows. The WITH CHECK also makes
-- it impossible to spoof someone else's user_id on insert/update, so no trigger
-- is needed. The client sends its own user_id (from the session) so the
-- composite-key upsert (user_id, table_name, id) resolves unambiguously.
drop policy if exists "own rows" on public.sync_records;
create policy "own rows" on public.sync_records
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
