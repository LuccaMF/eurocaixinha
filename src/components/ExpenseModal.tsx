import { useState } from 'react'
import { CATEGORY_BY_ID } from '../domain/categories'
import { formatEur, parseEur } from '../domain/money'
import { normalize } from '../domain/rules'
import { newId } from '../domain/storage'
import type { CategoryId, Expense } from '../domain/types'
import type { SetState } from '../useAppState'
import { CategoryPicker } from './CategoryPicker'
import { Modal } from './Modal'

interface Props {
  /** Gasto a editar; sem ele, o modal cria um novo. */
  expense?: Expense
  initialCategory?: CategoryId
  defaultDate: string
  setState: SetState
  onClose: () => void
  onSaved: (date: string) => void
}

export function ExpenseModal({ expense, initialCategory, defaultDate, setState, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState(expense ? (expense.amount / 100).toFixed(2).replace('.', ',') : '')
  const [date, setDate] = useState(expense?.date ?? defaultDate)
  const [description, setDescription] = useState(expense?.description ?? '')
  const [category, setCategory] = useState<CategoryId>(expense?.category ?? initialCategory ?? 'ess')
  const [subcategory, setSubcategory] = useState(expense?.subcategory ?? CATEGORY_BY_ID[category].subcategories[0])

  const cents = parseEur(amount)
  // Valores negativos só fazem sentido para reembolsos vindos do extrato.
  const valid = cents !== null && (cents > 0 || (expense?.importKey && cents !== 0)) && description.trim() && date

  function save() {
    if (!valid || cents === null) return
    const data = { date, amount: cents, description: description.trim(), category, subcategory }
    setState(s => {
      const expenses = expense
        ? s.expenses.map(e => (e.id === expense.id ? { ...e, ...data } : e))
        : [...s.expenses, { id: newId(), ...data }]
      // Ao corrigir um gasto importado, a app aprende para a próxima importação.
      const rules = expense?.importKey
        ? { ...s.rules, [normalize(expense.description)]: { category, subcategory } }
        : s.rules
      return { ...s, expenses, rules }
    })
    onSaved(date)
  }

  return (
    <Modal title={expense ? 'Editar gasto' : 'Novo gasto'} onClose={onClose} onSubmit={save} submitLabel={expense ? 'Guardar' : 'Adicionar'} submitDisabled={!valid}>
      <div className="two">
        <div className="field">
          <label htmlFor="exp-amount">Valor (€)</label>
          <input id="exp-amount" inputMode="decimal" autoFocus placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="exp-date">Data</label>
          <input id="exp-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="exp-desc">Descrição</label>
        <input id="exp-desc" maxLength={80} placeholder="Ex.: Dinheiro para a minha mulher" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <CategoryPicker idPrefix="exp" category={category} subcategory={subcategory} onChange={(c, s) => { setCategory(c); setSubcategory(s) }} />
      {category === 'pou' && cents !== null && cents > 0 && (
        <p className="hint">Este valor desconta do salário do mês e soma {formatEur(cents)} à tua poupança.</p>
      )}
      {expense && (
        <button
          type="button"
          className="link danger"
          onClick={() => {
            setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== expense.id) }))
            onClose()
          }}
        >
          Apagar este gasto
        </button>
      )}
    </Modal>
  )
}
