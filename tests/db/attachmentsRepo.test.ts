// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'
import { addAttachment, listAttachments, getAttachment, deleteAttachment, deleteAttachmentsFor, transactionIdsWithAttachments } from '../../src/db/attachmentsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

function img(text = 'data'): Blob {
  return new Blob([text], { type: 'image/jpeg' })
}

describe('schema v6', () => {
  it('is version 6 and exposes attachments', () => {
    expect(SCHEMA_VERSION).toBe(6)
    expect(db.attachments).toBeTruthy()
  })
})

describe('attachmentsRepo', () => {
  it('adds and lists attachments for a transaction with mime/size derived', async () => {
    const a = await addAttachment({ transactionId: 't1', blob: img('hello') })
    expect(a.mime).toBe('image/jpeg')
    expect(a.size).toBe(5)
    const list = await listAttachments('t1')
    expect(list).toHaveLength(1)
    expect(list[0].blob).toBeInstanceOf(Blob)
  })
  it('gets and deletes a single attachment', async () => {
    const a = await addAttachment({ transactionId: 't1', blob: img() })
    expect(await getAttachment(a.id)).toBeTruthy()
    await deleteAttachment(a.id)
    expect(await getAttachment(a.id)).toBeUndefined()
  })
  it('deletes all attachments for a transaction', async () => {
    await addAttachment({ transactionId: 't1', blob: img() })
    await addAttachment({ transactionId: 't1', blob: img() })
    await addAttachment({ transactionId: 't2', blob: img() })
    await deleteAttachmentsFor('t1')
    expect(await listAttachments('t1')).toHaveLength(0)
    expect(await listAttachments('t2')).toHaveLength(1)
  })
  it('returns the set of transaction ids that have attachments', async () => {
    await addAttachment({ transactionId: 't1', blob: img() })
    await addAttachment({ transactionId: 't1', blob: img() })
    await addAttachment({ transactionId: 't3', blob: img() })
    const ids = await transactionIdsWithAttachments()
    expect(ids.has('t1')).toBe(true)
    expect(ids.has('t3')).toBe(true)
    expect(ids.has('t2')).toBe(false)
  })
})
