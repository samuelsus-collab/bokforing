import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const sekFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  minimumFractionDigits: 2,
})

export function formatSEK(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return sekFormatter.format(Number.isFinite(n) ? n : 0)
}

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? parseISO(value) : value
  return format(d, 'yyyy-MM-dd', { locale: sv })
}

// Summera debet/kredit över rader där belopp kommer som string (Prisma Decimal).
export function sumAmount(rows: { debit: string | number; credit: string | number }[], field: 'debit' | 'credit'): number {
  return rows.reduce((s, r) => s + parseFloat(String(r[field]) || '0'), 0)
}
