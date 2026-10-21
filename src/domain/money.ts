import type { Cents, ISODate, MonthKey } from './types'

const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

export function formatEur(cents: Cents): string {
  return eur.format(cents / 100)
}

/** Aceita "12,34", "12.34" ou "1 234,56". Devolve null se não for um número válido. */
export function parseEur(text: string): Cents | null {
  const clean = text.trim().replace(/\s/g, '')
  if (!clean) return null
  // Se tem vírgula, a vírgula é o separador decimal e os pontos são milhares.
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(parseFloat(normalized) * 100)
}

export function monthOf(date: ISODate): MonthKey {
  return date.slice(0, 7)
}

export function monthKey(d: Date): MonthKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(key: MonthKey, n: number): MonthKey {
  const [y, m] = key.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + n, 1))
}

/** Data de hoje no fuso local (toISOString() usaria UTC e podia dar o dia errado). */
export function todayISO(): ISODate {
  const d = new Date()
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatMonth(key: MonthKey): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
}

export function formatDay(date: ISODate): string {
  return new Date(date + 'T12:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}
