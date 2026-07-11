import { db } from '../db/schema'
import { SYNCED_TABLES } from '../db/syncTracking'

/**
 * On first login, tag every existing local row with the signed-in user and
 * queue it for upload. Non-destructive: it only stamps `userId`/`syncState`
 * (via a patch that keeps `updatedAt` — the LWW clock — untouched), so the
 * client's pre-account data is preserved and uploaded, never overwritten.
 *
 * Idempotent: rows already owned by this user and already synced are skipped.
 * Returns the number of rows (re)claimed.
 */
export async function claimLocalDataForUser(userId: string): Promise<number> {
  let claimed = 0
  for (const table of SYNCED_TABLES) {
    const rows = await db.table(table).toArray() as Array<{ id: string; userId?: string; syncState?: string }>
    for (const row of rows) {
      if (row.userId === userId && row.syncState === 'synced') continue
      await db.table(table).update(row.id, { userId, syncState: 'pending' })
      claimed++
    }
  }
  return claimed
}
