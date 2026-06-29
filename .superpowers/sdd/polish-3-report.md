# Polish 3 Report

## Status: DONE

## Fixes Applied

### Fix A — RecurringForm endDate >= startDate validation
`src/features/recurring/RecurringForm.tsx`: Added guard after account check in `submit` handler:
```ts
if (endDate && endDate < startDate) { setError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية'); return }
```

### Fix B — Recurring active toggle awaited
`src/features/recurring/RecurringPage.tsx`: Changed onClick to `async () => { await updateRule(...) }`.

### Fix C — Goal over-withdrawal percent clamped
`src/features/goals/GoalsPage.tsx`: Changed `({p.percent}%)` to `({Math.max(p.percent, 0)}%)`.

### Fix D — Backup import validates optional table fields are arrays
`src/db/backupRepo.ts`: Added loop checking all optional table fields are arrays before the write transaction; throws `INVALID_BACKUP` if any non-undefined field is not an array.

## Tests Added

1. `tests/db/backupRepo.test.ts` — new test: "rejects backup where optional table field is not an array" (passes `transactions: "oops"`, expects `rejects.toThrow('INVALID_BACKUP')`).
2. `tests/features/RecurringValidation.test.tsx` — new test file: "shows error and does not call onDone when endDate < startDate", renders RecurringForm, selects account, sets startDate > endDate, submits, asserts onDone not called and error message shown.

## Test Suite
- **124 tests passed** across 47 test files (previously 122).
- **Build**: clean (`tsc -b && vite build` succeeded, pre-existing chunk size warning only).
