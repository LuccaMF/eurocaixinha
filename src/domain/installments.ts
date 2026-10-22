import { monthOf, shiftMonth } from './money'
import { normalize } from './rules'
import type { Cents, CategoryId, Expense, MonthKey } from './types'

export interface InstallmentPlan {
  planId: string
  name: string
  total: number
  /** Número da prestação mais alta já registada (ex.: 3 em "3 de 6"). */
  paid: number
  remaining: number
  /** Valor da última prestação registada; usamos para estimar o que falta pagar. */
  amount: Cents
  remainingAmount: Cents
  /** Mês em que se prevê pagar a última prestação. */
  endMonth: MonthKey
  done: boolean
  category: CategoryId
  subcategory: string
  /** Descrição da última prestação no extrato (ex.: "Klarna"), para reconhecer a seguinte. */
  lastDescription: string
  lastMonth: MonthKey
}

/** Agrupa os gastos com prestação em planos. Os planos por acabar aparecem primeiro. */
export function installmentPlans(expenses: Expense[]): InstallmentPlan[] {
  const byPlan = new Map<string, Expense[]>()
  for (const e of expenses) {
    if (!e.installment) continue
    const list = byPlan.get(e.installment.planId) ?? []
    list.push(e)
    byPlan.set(e.installment.planId, list)
  }

  const plans: InstallmentPlan[] = []
  for (const [planId, list] of byPlan) {
    // A prestação com o número mais alto é a mais recente.
    const last = list.reduce((a, b) => (b.installment!.number > a.installment!.number ? b : a))
    const { name, number: paid, total } = last.installment!
    const remaining = Math.max(total - paid, 0)
    plans.push({
      planId,
      name,
      total,
      paid,
      remaining,
      amount: last.amount,
      remainingAmount: remaining * last.amount,
      endMonth: shiftMonth(monthOf(last.date), remaining),
      done: remaining === 0,
      category: last.category,
      subcategory: last.subcategory,
      lastDescription: last.description,
      lastMonth: monthOf(last.date),
    })
  }
  return plans.sort((a, b) => Number(a.done) - Number(b.done) || a.endMonth.localeCompare(b.endMonth))
}

/**
 * Procura o plano a que um movimento do extrato pertence: mesma descrição e mesmo valor
 * da última prestação, num mês posterior. Não é infalível (dois planos iguais na Klarna
 * confundem-se), por isso a importação mostra sempre a ligação para poderes desfazê-la.
 */
export function matchPlan(plans: InstallmentPlan[], description: string, amount: Cents, date: string): InstallmentPlan | null {
  const key = normalize(description)
  return plans.find(p => !p.done && p.amount === amount && normalize(p.lastDescription) === key && monthOf(date) > p.lastMonth) ?? null
}
