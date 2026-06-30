function escapeField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n')
}

export function parseCsv(text: string): string[][] {
  let s = text
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1) // strip BOM
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += c; i++; continue
    }
    if (c === '"') { inQuotes = true; i++; continue }
    if (c === ',') { row.push(field); field = ''; i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += c; i++
  }
  // flush last field/row unless it's a trailing empty line
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}
