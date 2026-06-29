export function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100)
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100
}

export function parseAmount(input: string): number {
  const normalized = input
    .replace(/[٬,\s]/g, '')   // strip thousands separators (arabic + latin)
    .replace(/٫/g, '.')       // arabic decimal sep -> dot
    .trim()
  if (normalized === '' || isNaN(Number(normalized))) {
    throw new Error(`Invalid amount: ${input}`)
  }
  return toCents(Number(normalized))
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('ar', {
    style: 'currency',
    currency,
    numberingSystem: 'latn',
  }).format(fromCents(cents))
}
