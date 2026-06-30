import { db } from './schema'
import { id } from '../lib/uuid'
import type { Attachment } from './types'

export interface AddAttachmentInput {
  transactionId: string
  blob: Blob
  thumb?: Blob
  mime?: string
}

export async function addAttachment(input: AddAttachmentInput): Promise<Attachment> {
  const att: Attachment = {
    id: id(),
    transactionId: input.transactionId,
    blob: input.blob,
    thumb: input.thumb,
    mime: input.mime ?? input.blob.type ?? 'application/octet-stream',
    size: input.blob.size,
    createdAt: new Date().toISOString(),
  }
  await db.attachments.add(att)
  return att
}

export async function listAttachments(transactionId: string): Promise<Attachment[]> {
  return db.attachments.where('transactionId').equals(transactionId).toArray()
}

export async function getAttachment(attId: string): Promise<Attachment | undefined> {
  return db.attachments.get(attId)
}

export async function deleteAttachment(attId: string): Promise<void> {
  await db.attachments.delete(attId)
}

export async function deleteAttachmentsFor(transactionId: string): Promise<void> {
  await db.attachments.where('transactionId').equals(transactionId).delete()
}

export async function transactionIdsWithAttachments(): Promise<Set<string>> {
  const keys = await db.attachments.orderBy('transactionId').uniqueKeys()
  return new Set(keys as string[])
}
