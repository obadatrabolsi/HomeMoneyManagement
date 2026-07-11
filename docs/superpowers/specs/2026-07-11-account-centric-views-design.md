# Account-centric views, default account & transaction totals

Date: 2026-07-11

## Problem

The app currently aggregates money by **currency**:

- Dashboard groups totals and the month summary per currency.
- Reports filter by currency only.
- The Transactions list shows no running total.
- Accounts have no notion of a "default" account.

The user wants views organized **by account** (each account has a single
currency, so per-account scoping also gives a clean single-currency view),
a running total on the Transactions page that respects the active filter,
and a default account.

## Data model

Add an optional field to `Settings`:

```ts
interface Settings {
  // ...existing
  defaultAccountId?: string
}
```

No Dexie schema-version bump is needed: `settings` is a singleton record with
no index on this field, and the field is optional.

### Default-account rules (settingsRepo / accountsRepo)

- `getDefaultAccountId(): Promise<string | undefined>` — reads settings.
- `setDefaultAccount(accountId: string): Promise<void>` — writes settings.
- On `createAccount`: if no default is set yet, the newly created account
  becomes the default automatically.
- On `archiveAccount`: if the archived account was the default, reassign the
  default to the first remaining non-archived account (or clear it if none).
- A helper `resolveDefaultAccountId()` returns the stored default if it still
  points to a live (non-archived) account, otherwise the first account, else
  `undefined`.

## Repo changes (account scoping)

`transactionsRepo`:

- `rangeTotals(from, to, accountId?)` — optional account filter on income/expense sums.
- `categoryBreakdown(from, to, accountId?)` — optional account filter.

`reportsRepo` — refactor from currency-scoped to account-scoped:

- `scopedTxs(from, to, accountId)`
- `incomeExpenseTotals(from, to, accountId)`
- `categorySpending(from, to, accountId)`
- `monthlyTotals(year, accountId)`
- `statistics(from, to, accountId)`

## Feature 1 — Dashboard by account

Add an account `<select>` at the top of `DashboardPage`.

- Options: `كل الحسابات` (all) followed by each non-archived account.
- Default selection: the resolved default account; `كل الحسابات` if none.
- `كل الحسابات` → the existing by-currency overview (unchanged behaviour,
  preserves current tests).
- A specific account → BalanceCard shows that account's balance and month net;
  today/month income & expense tiles, category pie, and recent transactions are
  all scoped to that account and rendered in the account's currency.

## Feature 2 — Reports by account

Replace the currency selector with an account selector.

- Options: each non-archived account (no "all"; every report metric is
  single-currency by nature).
- Default selection: the resolved default account, else the first account.
- All report computations (`incomeExpenseTotals`, `categorySpending`,
  `monthlyTotals`, `statistics`) are scoped to the selected account and its
  currency.

## Feature 3 — Transactions running total

Add a summary bar above the transaction list on `TransactionsPage`.

- Derived from the already-filtered `txs`, so it recomputes reactively whenever
  the filter changes.
- Grouped by the currency of the displayed transactions: income, expense, net.
- Transfers are excluded from income/expense (internal moves).
- Shows the count of displayed transactions.

## Feature 4 — Default account UI

- `AccountForm` (create): a "حساب افتراضي" checkbox; when checked the new
  account is set as default after creation.
- `AccountDetailPage`: a "تعيين كحساب افتراضي" button, or a "الحساب الافتراضي ✓"
  indicator when already default.
- `AccountsPage`: a "افتراضي" badge next to the default account in the list.
- `TransactionForm`: pre-select the resolved default account for the account
  field (both single and transfer "from").

## i18n additions (`ar.ts`)

- `defaultAccount` = "الحساب الافتراضي"
- `setAsDefault` = "تعيين كحساب افتراضي"
- `isDefault` = "افتراضي"
- `count` = "العدد" (for the transactions summary)
- reuse existing `income` / `expense` / `net` / `allAccounts`.

## Testing (TDD)

- `settingsRepo` / `accountsRepo`: default get/set, auto-assign on first create,
  reassignment on archive, `resolveDefaultAccountId` fallbacks.
- `transactionsRepo`: `rangeTotals` and `categoryBreakdown` with an `accountId`.
- `reportsRepo`: account-scoped totals / spending / monthly / statistics.
- Components: dashboard account selector scoping, reports account selector,
  transactions summary totals reacting to a filter, accounts default badge.

## Out of scope

- Cross-account aggregation within a currency on Reports (only Dashboard keeps
  the "all accounts" by-currency overview).
- Multi-currency conversion.
