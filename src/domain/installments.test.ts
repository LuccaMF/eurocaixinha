import { describe, expect, it } from 'vitest'
import { installmentPlans, matchPlan } from './installments'
import type { Expense } from './types'

const klarna = (id: string, date: string, number: number): Expense => ({
  id, date, amount: 7664, description: 'Klarna', category: 'nao', subcategory: 'Compras supérfluas',
  installment: { planId: 'p1', name: 'Portátil', number, total: 6 },
})

describe('installmentPlans', () => {
  it('calcula o que falta pagar e quando acaba', () => {
    const [plan] = installmentPlans([klarna('a', '2026-09-17', 2), klarna('b', '2026-10-17', 3)])
    expect(plan).toMatchObject({ name: 'Portátil', paid: 3, total: 6, remaining: 3, remainingAmount: 3 * 7664, endMonth: '2027-01', done: false })
  })

  it('marca como acabado quando a última prestação está paga', () => {
    const [plan] = installmentPlans([klarna('a', '2027-01-17', 6)])
    expect(plan.done).toBe(true)
    expect(plan.remainingAmount).toBe(0)
  })

  it('ignora gastos sem prestação', () => {
    expect(installmentPlans([{ ...klarna('a', '2026-10-01', 1), installment: undefined }])).toEqual([])
  })
})

describe('matchPlan', () => {
  const plans = installmentPlans([klarna('a', '2026-10-17', 3)])
  it('reconhece a prestação seguinte pela descrição e valor', () => {
    expect(matchPlan(plans, 'KLARNA', 7664, '2026-11-17')?.planId).toBe('p1')
  })
  it('não liga valores diferentes nem o mesmo mês', () => {
    expect(matchPlan(plans, 'Klarna', 5000, '2026-11-17')).toBeNull()
    expect(matchPlan(plans, 'Klarna', 7664, '2026-10-20')).toBeNull()
  })
})
