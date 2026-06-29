export function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100)
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100
}

export function parseAmount(input: string): number {
  let s = input.replace(/\s/g, '').replace(/٫/g, '.') // arabic decimal -> dot
  if (s.includes('.')) {
    s = s.replace(/[,٬]/g, '')        // dot is decimal; strip thousands separators
  } else {
    s = s.replace(/[,٬]/g, '.')       // no dot; a comma is the decimal separator
  }
  if (s === '' || isNaN(Number(s))) {
    throw new Error(`Invalid amount: ${input}`)
  }
  return toCents(Number(s))
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('ar', {
    style: 'currency',
    currency,
    numberingSystem: 'latn',
  }).format(fromCents(cents))
}
