import { db } from './schema'
import { toCsv, parseCsv } from '../lib/csv'
import { createTransaction } from './transactionsRepo'
import { fromCents, parseAmount } from '../lib/money'

export const CSV_HEADER = ['date', 'type', 'amount', 'currency', 'account', 'category', 'merchant', 'notes', 'tags']

export async function transactionsToCsv(): Promise<string> {
  const [accounts, categories, txs] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
  ])
  const accName: Record<string, string> = {}
  for (const a of accounts) accName[a.id] = a.name
  const catName: Record<string, string> = {}
  for (const c of categories) catName[c.id] = c.name

  const accCurrency: Record<string, string> = {}
  for (const a of accounts) accCurrency[a.id] = a.currency

  const rows: string[][] = [CSV_HEADER]
  for (const t of txs.filter((x) => !x.deletedAt)) {
    rows.push([
      t.date,
      t.type,
      String(fromCents(t.amount)),
      accCurrency[t.accountId] ?? '',
      accName[t.accountId] ?? '',
      t.categoryId ? (catName[t.categoryId] ?? '') : '',
      t.merchant ?? '',
      t.notes ?? '',
      (t.tags ?? []).join('|'),
    ])
  }
  return '﻿' + toCsv(rows)
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export async function importTransactionsCsv(text: string): Promise<ImportResult> {
  const rows = parseCsv(text)
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }
  if (rows.length === 0) return result

  const header = rows[0].map((h) => h.trim())
  const idx = (name: string) => header.indexOf(name)
  const di = idx('date'), ti = idx('type'), ai = idx('amount'),
    acc = idx('account'), cat = idx('category'), mer = idx('merchant'),
    note = idx('notes'), tag = idx('tags')

  const accounts = await db.accounts.toArray()
  const categories = await db.categories.toArray()
  const accByName: Record<string, string> = {}
  for (const a of accounts) accByName[a.name] = a.id
  const catByType: Record<string, string> = {}
  for (const c of categories) catByType[`${c.type} ${c.name}`] = c.id

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.length === 1 && row[0] === '') continue // blank line
    const type = (row[ti] ?? '').trim()
    if (type === 'transfer') { result.skipped++; result.errors.push(`سطر ${r + 1}: تحويل (متجاهل)`); continue }
    if (type !== 'income' && type !== 'expense') { result.skipped++; result.errors.push(`سطر ${r + 1}: نوع غير صالح`); continue }
    const accountId = accByName[(row[acc] ?? '').trim()]
    if (!accountId) { result.skipped++; result.errors.push(`سطر ${r + 1}: حساب غير موجود`); continue }
    let cents: number
    try { cents = parseAmount(row[ai] ?? '') } catch { result.skipped++; result.errors.push(`سطر ${r + 1}: مبلغ غير صالح`); continue }
    if (!(cents > 0)) { result.skipped++; result.errors.push(`سطر ${r + 1}: مبلغ غير صالح`); continue }
    const categoryId = cat >= 0 ? catByType[`${type} ${(row[cat] ?? '').trim()}`] : undefined
    const tags = tag >= 0 && row[tag] ? row[tag].split('|').filter(Boolean) : []
    await createTransaction({
      type,
      amount: cents,
      accountId,
      categoryId,
      date: (row[di] ?? '').trim(),
      merchant: mer >= 0 ? ((row[mer] ?? '').trim() || undefined) : undefined,
      notes: note >= 0 ? ((row[note] ?? '').trim() || undefined) : undefined,
      tags,
    })
    result.imported++
  }
  return result
}
