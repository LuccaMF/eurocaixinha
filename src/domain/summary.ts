import { CATEGORIES } from './categories'
import { monthOf } from './money'
import type { AppState, Cents, CategoryId, MonthKey } from './types'

export interface CategorySummary {
  id: CategoryId
  budget: Cents
  spent: Cents
}

export interface MonthSummary {
  salary: Cents
  /** Dinheiro retirado da poupança neste mês: volta a ficar disponível para gastar. */
  fromSavings: Cents
  spent: Cents
  remaining: Cents
  categories: CategorySummary[]
}

export function summarizeMonth(state: AppState, month: MonthKey): MonthSummary {
  const salary = state.salaries[month] ?? 0
  const spentBy: Record<CategoryId, Cents> = { ess: 0, nao: 0, pou: 0 }
  for (const e of state.expenses) if (monthOf(e.date) === month) spentBy[e.category] += e.amount
  const fromSavings = state.withdrawals.filter(w => monthOf(w.date) === month).reduce((s, w) => s + w.amount, 0)
  const spent = spentBy.ess + spentBy.nao + spentBy.pou

  return {
    salary,
    fromSavings,
    spent,
    remaining: salary + fromSavings - spent,
    categories: CATEGORIES.map(c => ({
      id: c.id,
      budget: Math.round((salary * state.percentages[c.id]) / 100),
      spent: spentBy[c.id],
    })),
  }
}

export interface SavingsMove {
  id: string
  date: string
  amount: Cents // positivo = depósito, negativo = retirada
  description: string
  subcategory: string
}

/** Histórico completo da poupança, do mais recente para o mais antigo, com o saldo acumulado. */
export function savingsHistory(state: AppState): { moves: (SavingsMove & { balance: Cents })[]; total: Cents; bySub: Record<string, Cents> } {
  const moves: SavingsMove[] = [
    ...state.expenses
      .filter(e => e.category === 'pou')
      .map(e => ({ id: e.id, date: e.date, amount: e.amount, description: e.description, subcategory: e.subcategory })),
    ...state.withdrawals.map(w => ({ id: w.id, date: w.date, amount: -w.amount, description: w.reason, subcategory: w.subcategory })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  let balance = 0
  const bySub: Record<string, Cents> = {}
  const withBalance = moves.map(m => {
    balance += m.amount
    bySub[m.subcategory] = (bySub[m.subcategory] ?? 0) + m.amount
    return { ...m, balance }
  })
  return { moves: withBalance.reverse(), total: balance, bySub }
}
