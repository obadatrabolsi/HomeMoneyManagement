# Supabase cloud sync — setup

This app is offline-first. Cloud sync is optional at build time: set the two env
vars below and login becomes mandatory with background sync; leave them unset and
the app stays a pure-offline PWA.

## One-time setup

1. **Create a Supabase project** at https://supabase.com (free tier is enough).

2. **Run the schema.** In the project's SQL editor, run
   [`migrations/0001_sync_records.sql`](./migrations/0001_sync_records.sql).
   It creates a single `sync_records` table with Row Level Security so each user
   only ever sees their own rows.

3. **Create the account.** Authentication → Users → Add user:
   - Email: `obada.trabolsi@gmail.com`
   - Password: _(choose one in the Supabase dashboard — don't commit it to the repo)_
   - (Optionally disable "email confirm" for this user, or confirm it.)

4. **Configure the client.** Copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<Project Settings → API → anon public key>
   ```

5. **Run the app** (`npm run dev`). You'll be asked to log in. On first login the
   app adopts your existing local data (assigns it to your account) and uploads it,
   then keeps syncing in the background. The session persists across reloads and the
   app keeps working offline until you explicitly sign out.

## How it works

- **Local is the source of truth** (IndexedDB/Dexie). Every write is stamped
  `syncState: 'pending'`; a background engine pushes pending rows and pulls remote
  changes (last-write-wins on `updatedAt`).
- **Deletes** are tombstones (`deletedAt`) so they propagate between devices.
- **The `/sync` screen** lists everything not yet uploaded and clears as it syncs.
- **Data safety:** sync never deletes or overwrites blindly — it merges by id with
  last-write-wins, and your pre-account data is adopted, not replaced.
