import { describe, expect, it } from 'vitest'
import { parseEur } from './money'
import { emptyState } from './storage'
import { savingsHistory, summarizeMonth } from './summary'

const state = {
  ...emptyState(),
  salaries: { '2026-10': 180000 },
  expenses: [
    { id: 'a', date: '2026-10-02', amount: 75000, description: 'Renda', category: 'ess' as const, subcategory: 'Habitação' },
    { id: 'b', date: '2026-10-05', amount: 20000, description: 'Reforço', category: 'pou' as const, subcategory: 'Reserva de emergência' },
    { id: 'c', date: '2026-09-05', amount: 30000, description: 'PPR', category: 'pou' as const, subcategory: 'Investimentos e dívidas' },
  ],
  withdrawals: [{ id: 'w', date: '2026-10-10', amount: 5000, reason: 'Reparar carro', subcategory: 'Reserva de emergência' }],
}

describe('summarizeMonth', () => {
  it('desconta gastos e poupança e devolve as retiradas ao disponível', () => {
    const s = summarizeMonth(state, '2026-10')
    expect(s.spent).toBe(95000)
    expect(s.remaining).toBe(180000 + 5000 - 95000)
    expect(s.categories.find(c => c.id === 'ess')).toEqual({ id: 'ess', budget: 90000, spent: 75000 })
  })
})

describe('savingsHistory', () => {
  it('acumula ao longo dos meses e regista retiradas', () => {
    const h = savingsHistory(state)
    expect(h.total).toBe(30000 + 20000 - 5000)
    expect(h.moves[0]).toMatchObject({ id: 'w', amount: -5000, balance: 45000 })
    expect(h.bySub['Reserva de emergência']).toBe(15000)
  })
})

describe('parseEur', () => {
  it('aceita formatos portugueses e recusa lixo', () => {
    expect(parseEur('12,34')).toBe(1234)
    expect(parseEur('1.234,5')).toBe(123450)
    expect(parseEur('0.1')).toBe(10)
    expect(parseEur('abc')).toBeNull()
    expect(parseEur('')).toBeNull()
  })
})
