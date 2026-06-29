# Final Fixes Report — Money Manager MVP

## Fix 1 — `parseAmount` comma decimal separator (TDD)

**RED:** Added two failing assertions to `tests/lib/money.test.ts`:
```ts
expect(parseAmount('12,50')).toBe(1250)   // comma as decimal when no dot present
expect(parseAmount('12٫5')).toBe(1250)    // arabic decimal separator
```
Running `npm test -- money` gave: `AssertionError: expected 125000 to be 1250` (RED confirmed).

**Fix:** Replaced `parseAmount` body in `src/lib/money.ts` with logic that distinguishes comma-as-decimal (no dot present) from comma-as-thousands-separator (dot present). Arabic `٫` is always treated as decimal.

**GREEN:** All 4 money tests pass, including existing `'1٬234.50'` → 123450.

---

## Fix 2 — `TransactionRow` currency prop made REQUIRED

**Files changed:**
- `src/features/transactions/TransactionRow.tsx`: Removed `= 'EUR'` default, made `currency` required.
- `src/features/accounts/AccountDetailPage.tsx`: Added `currency={data.account.currency}` to each `<TransactionRow>`.
- `src/features/transactions/TransactionsPage.tsx`: Added `listAccounts()` call in `useLiveQuery`, built `accCur` map, passed `currency={accCur[tx.accountId] ?? 'EUR'}`.
- `src/features/dashboard/DashboardPage.tsx`: Built `accCur` map in the query (shared with Fix 3), passed `currency={data.accCur[tx.accountId] ?? 'EUR'}` to recent-list rows.
- `tests/features/TransactionRow.test.tsx`: Added `currency="EUR"` to the render call.

---

## Fix 3 — Dashboard currency-grouped totals + month summary (TDD)

### 3a — New repo functions

**Added to `src/db/transactionsRepo.ts`:**
- `rangeTotalsByCurrency(from, to)`: Aggregates income/expense per currency, excluding soft-deleted and transfer rows.
- `dayTotalsByCurrency(date)`: Delegates to `rangeTotalsByCurrency(date, date)`.

**New test file `tests/db/totalsByCurrency.test.ts`** (5 tests):
- Groups per currency without merging across currencies.
- Excludes soft-deleted transactions.
- Excludes transfer transactions.
- Excludes out-of-range transactions.
- `dayTotalsByCurrency` scopes to single day.

Since the functions were added before the test file was written (necessary to write meaningful assertions), all 5 tests were GREEN immediately on first run.

### 3b — Dashboard redesign

**`src/features/dashboard/DashboardPage.tsx`** rewritten to:
- Use `dayTotalsByCurrency` and `rangeTotalsByCurrency` instead of flat `dayTotals`/`rangeTotals`.
- Load accounts and build `accCur` map for Fix 2.
- Render today cards **per currency** with `formatMoney(amt, cur)`.
- Add a real **Month Summary** section (heading `t('monthSummary')`) showing income, expense, net per currency.
- Move the pie chart under its own heading `t('expenseDistribution')`.

### 3c — i18n keys

**`src/i18n/ar.ts`** — Added:
- `net: 'الصافي'`
- `expenseDistribution: 'توزيع المصروفات'`

---

## Fix 4 — Sub-categories UI

**`src/features/categories/CategoryForm.tsx`:**
- Added `useLiveQuery` to load non-archived categories of the same `type`.
- Added a parent `<select>` with default "— (تصنيف رئيسي) —" option and one option per root category.
- Passes `parentId` to `createCategory` when a parent is selected.

**`src/features/categories/CategoriesPage.tsx`:**
- Splits categories into `roots` (no `parentId`) and `children` (have `parentId`).
- Renders each root category, followed by its children indented with `↳` prefix and `mr-4 border-r-2` visual indent.
- Handles orphaned sub-categories (parent archived) by rendering them at top level with `↳` prefix.

**`tests/features/CategoriesPage.test.tsx`:** Updated `getByText` to `getAllByText` since the category name now legitimately appears in both the list and the parent-select dropdown.

---

## Test Counts & Build

- **Test files:** 23 passed (was 22; added `tests/db/totalsByCurrency.test.ts`)
- **Tests:** 57 passed (was 52; added 5 new in totalsByCurrency)
- **Build:** `tsc -b && vite build` — clean (only pre-existing chunk size warning, not an error)

---

## Commit

`fix: currency-correct rows + dashboard totals, month summary, comma parsing, sub-category UI`
