import { useState } from 'react'
import { CATEGORY_BY_ID } from '../domain/categories'
import type { InstallmentPlan } from '../domain/installments'
import { formatEur, formatMonth, monthOf, parseEur, shiftMonth } from '../domain/money'
import { normalize } from '../domain/rules'
import { newId } from '../domain/storage'
import type { CategoryId, Expense, Installment } from '../domain/types'
import type { SetState } from '../useAppState'
import { CategoryPicker } from './CategoryPicker'
import { Modal } from './Modal'

const NEW_PLAN = 'new'
const MAX_INSTALLMENTS = 120

interface Props {
  /** Gasto a editar; sem ele, o modal cria um novo. */
  expense?: Expense
  initialCategory?: CategoryId
  defaultDate: string
  plans: InstallmentPlan[]
  setState: SetState
  onClose: () => void
  onSaved: (date: string) => void
}

export function ExpenseModal({ expense, initialCategory, defaultDate, plans, setState, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState(expense ? (expense.amount / 100).toFixed(2).replace('.', ',') : '')
  const [date, setDate] = useState(expense?.date ?? defaultDate)
  const [description, setDescription] = useState(expense?.description ?? '')
  const [category, setCategory] = useState<CategoryId>(expense?.category ?? initialCategory ?? 'ess')
  const [subcategory, setSubcategory] = useState(expense?.subcategory ?? CATEGORY_BY_ID[category].subcategories[0])

  // Prestações
  const current = expense?.installment
  const [isInstallment, setIsInstallment] = useState(!!current)
  const [planChoice, setPlanChoice] = useState(current?.planId ?? NEW_PLAN)
  const [planName, setPlanName] = useState(current?.name ?? '')
  const [number, setNumber] = useState(String(current?.number ?? 1))
  const [total, setTotal] = useState(String(current?.total ?? ''))
  // Planos que se podem escolher: os que ainda não acabaram, mais o deste gasto (se estiver a ser editado).
  const choosable = plans.filter(p => !p.done || p.planId === current?.planId)

  function choosePlan(id: string) {
    setPlanChoice(id)
    const plan = plans.find(p => p.planId === id)
    if (!plan) return
    setNumber(String(plan.planId === current?.planId ? current.number : plan.paid + 1))
    setTotal(String(plan.total))
    setCategory(plan.category)
    setSubcategory(plan.subcategory)
  }

  const cents = parseEur(amount)
  const n = Number(number)
  const t = Number(total)
  const installmentError = !isInstallment
    ? null
    : !Number.isInteger(t) || t < 2 || t > MAX_INSTALLMENTS
      ? `O total de prestações tem de ser entre 2 e ${MAX_INSTALLMENTS}.`
      : !Number.isInteger(n) || n < 1 || n > t
        ? `O número da prestação tem de ser entre 1 e ${t}.`
        : null
  // Valores negativos só fazem sentido para reembolsos vindos do extrato.
  const valid = cents !== null && (cents > 0 || (expense?.importKey && cents !== 0)) && description.trim() && date && !installmentError

  function save() {
    if (!valid || cents === null) return
    let installment: Installment | undefined
    if (isInstallment) {
      const existing = plans.find(p => p.planId === planChoice)
      installment = {
        planId: existing ? existing.planId : newId(),
        name: existing ? existing.name : planName.trim() || description.trim(),
        number: n,
        total: t,
      }
    }
    const data = { date, amount: cents, description: description.trim(), category, subcategory, installment }
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

  const remaining = t - n
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

      <label className="check">
        <input id="exp-is-installment" type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} />
        <span>É uma prestação (compra a prestações, Klarna, crédito…)</span>
      </label>
      {isInstallment && (
        <div className="installment">
          <div className="field">
            <label htmlFor="exp-plan">Compra</label>
            <select id="exp-plan" value={planChoice} onChange={e => choosePlan(e.target.value)}>
              {choosable.map(p => (
                <option key={p.planId} value={p.planId}>{p.name} ({p.paid} de {p.total})</option>
              ))}
              <option value={NEW_PLAN}>Nova compra a prestações…</option>
            </select>
          </div>
          {planChoice === NEW_PLAN && (
            <div className="field">
              <label htmlFor="exp-plan-name">Nome da compra</label>
              <input id="exp-plan-name" maxLength={60} placeholder={description || 'Ex.: Portátil PCDIGA'} value={planName} onChange={e => setPlanName(e.target.value)} />
            </div>
          )}
          <div className="two">
            <div className="field">
              <label htmlFor="exp-inst-number">Esta é a prestação nº</label>
              <input id="exp-inst-number" type="number" inputMode="numeric" min={1} value={number} onChange={e => setNumber(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="exp-inst-total">De um total de</label>
              <input id="exp-inst-total" type="number" inputMode="numeric" min={2} max={MAX_INSTALLMENTS} placeholder="Ex.: 6" value={total} onChange={e => setTotal(e.target.value)} />
            </div>
          </div>
          {installmentError
            ? total !== '' && <p className="err">{installmentError}</p>
            : (
              <p className="hint">
                {remaining === 0
                  ? 'É a última prestação.'
                  : <>Depois desta faltam {remaining} {remaining === 1 ? 'prestação' : 'prestações'}
                    {cents !== null && cents > 0 && <> (cerca de {formatEur(remaining * cents)})</>}.
                    {' '}A última fica para {formatMonth(shiftMonth(monthOf(date), remaining))}.</>}
              </p>
            )}
        </div>
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
