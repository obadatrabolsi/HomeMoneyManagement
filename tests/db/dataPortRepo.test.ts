import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createCategory } from '../../src/db/categoriesRepo'
import { createTransaction } from '../../src/db/transactionsRepo'
import { transactionsToCsv, importTransactionsCsv, CSV_HEADER } from '../../src/db/dataPortRepo'

let accId = '', catId = ''
beforeEach(async () => {
  await db.delete(); await db.open()
  accId = (await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })).id
  catId = (await createCategory({ name: 'الطعام', type: 'expense', icon: 'food', color: '#f00' })).id
})

describe('dataPortRepo export', () => {
  it('exports a BOM + header + one row per transaction with names and major-unit amount', async () => {
    await createTransaction({ type: 'expense', amount: 1250, accountId: accId, categoryId: catId, date: '2026-06-01', merchant: 'مقهى' })
    const csv = await transactionsToCsv()
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe(CSV_HEADER.join(','))
    expect(lines[1]).toContain('2026-06-01')
    expect(lines[1]).toContain('expense')
    expect(lines[1]).toContain('12.5')
    expect(lines[1]).toContain('نقد')
    expect(lines[1]).toContain('الطعام')
    expect(lines[1]).toContain('مقهى')
  })
})

describe('dataPortRepo import', () => {
  it('imports income/expense rows by account/category name', async () => {
    const csv = '﻿' + CSV_HEADER.join(',') + '\r\n' +
      ['2026-06-02', 'expense', '5.00', 'EUR', 'نقد', 'الطعام', 'مطعم', 'غداء', ''].join(',') + '\r\n' +
      ['2026-06-03', 'income', '100', 'EUR', 'نقد', '', '', '', ''].join(',')
    const res = await importTransactionsCsv(csv)
    expect(res.imported).toBe(2)
    expect(res.skipped).toBe(0)
    const txs = await db.transactions.toArray()
    expect(txs).toHaveLength(2)
    expect(txs.find(t => t.type === 'expense')?.amount).toBe(500)
  })
  it('skips transfer rows and rows whose account does not exist', async () => {
    const csv = CSV_HEADER.join(',') + '\r\n' +
      ['2026-06-02', 'transfer', '5.00', 'EUR', 'نقد', '', '', '', ''].join(',') + '\r\n' +
      ['2026-06-02', 'expense', '5.00', 'EUR', 'غير موجود', '', '', '', ''].join(',')
    const res = await importTransactionsCsv(csv)
    expect(res.imported).toBe(0)
    expect(res.skipped).toBe(2)
    expect(res.errors.length).toBe(2)
  })
  it('resolves category by type+name, not name alone', async () => {
    const expCatId = (await createCategory({ name: 'راتب', type: 'expense', icon: 'x', color: '#e00' })).id
    const incCatId = (await createCategory({ name: 'راتب', type: 'income', icon: 'y', color: '#0e0' })).id
    const csv = '﻿' + CSV_HEADER.join(',') + '\r\n' +
      ['2026-06-10', 'income', '200', 'EUR', 'نقد', 'راتب', '', '', ''].join(',')
    const res = await importTransactionsCsv(csv)
    expect(res.imported).toBe(1)
    const txs = await db.transactions.toArray()
    expect(txs[0].categoryId).toBe(incCatId)
    expect(txs[0].categoryId).not.toBe(expCatId)
  })
  it('round-trips export then import', async () => {
    await createTransaction({ type: 'expense', amount: 1250, accountId: accId, categoryId: catId, date: '2026-06-01', merchant: 'مقهى' })
    const csv = await transactionsToCsv()
    await db.transactions.clear()
    const res = await importTransactionsCsv(csv)
    expect(res.imported).toBe(1)
    expect((await db.transactions.toArray())[0].amount).toBe(1250)
  })
})
