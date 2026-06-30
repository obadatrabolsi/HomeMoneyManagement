// The only currencies the app supports.
export const CURRENCIES = [
  { code: 'SYP', label: 'ليرة سورية' },
  { code: 'USD', label: 'دولار أمريكي' },
  { code: 'EUR', label: 'يورو' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export const CURRENCY_CODES: readonly string[] = CURRENCIES.map((c) => c.code)
