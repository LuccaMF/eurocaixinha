import { useState } from 'react'
import { CATEGORIES, CATEGORY_BY_ID, type CategoryDef } from '../domain/categories'
import { installmentPlans, type InstallmentPlan } from '../domain/installments'
import { formatDay, formatEur, formatMonth, monthOf } from '../domain/money'
import { summarizeMonth, type CategorySummary } from '../domain/summary'
import type { AppState, Expense, MonthKey } from '../domain/types'

interface Props {
  state: AppState
  month: MonthKey
  onEditSalary: () => void
  onEditExpense: (e: Expense) => void
}

export function Home({ state, month, onEditSalary, onEditExpense }: Props) {
  const s = summarizeMonth(state, month)
  const monthExpenses = state.expenses
    .filter(e => monthOf(e.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const barBase = Math.max(s.salary + s.fromSavings, s.spent) || 1
  const activePlans = installmentPlans(state.expenses).filter(p => !p.done)

  return (
    <>
      <div className="overview">
        <section className="balance" aria-label="Saldo do mês">
          <span className="label">Salário restante</span>
          <div className={`big ${s.remaining < 0 ? 'neg' : ''}`}>{formatEur(s.remaining)}</div>
          <div className="sub">
            <span>
              de <b className="num">{formatEur(s.salary)}</b>
              {s.fromSavings > 0 && <> + <b className="num">{formatEur(s.fromSavings)}</b> da poupança</>}
              {' '}· gasto <b className="num">{formatEur(s.spent)}</b>
            </span>
            <button className="link" onClick={onEditSalary}>Alterar salário</button>
          </div>
          <div className="bar" aria-hidden="true">
            {s.categories.map(c => (
              <i key={c.id} style={{ width: `${(Math.max(c.spent, 0) / barBase) * 100}%`, background: CATEGORY_BY_ID[c.id].color }} />
            ))}
          </div>
        </section>

        <section className="chartbox" aria-label="Gráfico de gastos">
          <Donut values={s.categories.map(c => ({ color: CATEGORY_BY_ID[c.id].color, value: Math.max(c.spent, 0) }))} total={s.spent} />
          <div className="legend">
            {s.categories.map(c => (
              <div key={c.id}>
                <i style={{ background: CATEGORY_BY_ID[c.id].color }} />
                <span>{CATEGORY_BY_ID[c.id].name}</span>
                <b className="num">{formatEur(c.spent)}</b>
                <span className="num pct">{s.spent > 0 ? Math.round((c.spent / s.spent) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={`board ${activePlans.length ? 'with-side' : ''}`}>
        <div className="columns">
          {CATEGORIES.map(def => (
            <CategoryColumn
              key={def.id}
              def={def}
              summary={s.categories.find(c => c.id === def.id)!}
              percent={state.percentages[def.id]}
              expenses={monthExpenses.filter(e => e.category === def.id)}
              onEdit={onEditExpense}
            />
          ))}
        </div>
        {activePlans.length > 0 && <PlansPanel plans={activePlans} />}
      </div>
    </>
  )
}

const VISIBLE = 8

function CategoryColumn({ def, summary, percent, expenses, onEdit }: {
  def: CategoryDef
  summary: CategorySummary
  percent: number
  expenses: Expense[]
  onEdit: (e: Expense) => void
}) {
  const [filter, setFilter] = useState('')
  const [showAll, setShowAll] = useState(false)
  const isSavings = def.id === 'pou'
  const left = summary.budget - summary.spent

  // Só mostramos no filtro as subcategorias que têm gastos neste mês.
  const counts = new Map<string, number>()
  for (const e of expenses) counts.set(e.subcategory, (counts.get(e.subcategory) ?? 0) + 1)
  const subs = def.subcategories.filter(sub => counts.has(sub))
  const activeFilter = filter && counts.has(filter) ? filter : ''
  const shown = activeFilter ? expenses.filter(e => e.subcategory === activeFilter) : expenses
  const shownTotal = shown.reduce((sum, e) => sum + e.amount, 0)
  const visible = showAll ? shown : shown.slice(0, VISIBLE)

  return (
    <section className="column" style={{ '--c': def.color } as React.CSSProperties} aria-label={def.name}>
      <header className="column-head">
        <h3>{def.name}<span className="num">{percent}%</span></h3>
        <div className="bar"><i style={{ width: `${Math.min(100, summary.budget ? (Math.max(summary.spent, 0) / summary.budget) * 100 : 0)}%`, background: def.color }} /></div>
        <div className="row"><span>{isSavings ? 'Guardado' : 'Gasto'}</span><b className="num">{formatEur(summary.spent)}</b></div>
        <div className={`row ${left < 0 && !isSavings ? 'over' : ''}`}>
          <span>{left < 0 ? (isSavings ? 'Acima da meta' : 'Acima do limite') : isSavings ? 'Falta para a meta' : 'Disponível'}</span>
          <b className="num">{formatEur(Math.abs(left))}</b>
        </div>
        <div className="row"><span>{isSavings ? 'Meta' : 'Limite'}</span><span className="num">{formatEur(summary.budget)}</span></div>
      </header>

      {subs.length > 1 && (
        <select id={`filter-${def.id}`} className="column-filter" aria-label={`Filtrar ${def.name} por subcategoria`} value={activeFilter} onChange={e => { setFilter(e.target.value); setShowAll(false) }}>
          <option value="">Todas as subcategorias ({expenses.length})</option>
          {subs.map(sub => <option key={sub} value={sub}>{sub} ({counts.get(sub)})</option>)}
        </select>
      )}
      {activeFilter && (
        <p className="hint">{activeFilter}: <b className="num">{formatEur(shownTotal)}</b> em {shown.length} {shown.length === 1 ? 'gasto' : 'gastos'}</p>
      )}

      <div className="list">
        {shown.length === 0 && <p className="empty">Sem gastos neste mês.</p>}
        {visible.map(e => (
          <button className="item" key={e.id} onClick={() => onEdit(e)}>
            <span className="stripe" style={{ background: def.color }} />
            <span className="item-main">
              <span className="desc">{e.description}</span>
              <span className="meta">
                {formatDay(e.date)} · {e.subcategory}
                {e.installment && <> · {e.installment.number}/{e.installment.total}</>}
              </span>
            </span>
            <b className={`num ${e.amount < 0 ? 'pos' : ''}`}>{e.amount < 0 ? '+' + formatEur(-e.amount) : formatEur(e.amount)}</b>
          </button>
        ))}
        {shown.length > VISIBLE && (
          <button className="link more" onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Mostrar menos' : `Ver todos (${shown.length})`}
          </button>
        )}
      </div>
    </section>
  )
}

function PlansPanel({ plans }: { plans: InstallmentPlan[] }) {
  const owed = plans.reduce((sum, p) => sum + p.remainingAmount, 0)
  return (
    <aside className="side" aria-label="Prestações em curso">
      <h3>Prestações em curso</h3>
      <p className="hint">Faltam pagar <b className="num">{formatEur(owed)}</b></p>
      <div className="side-list">
        {plans.map(p => (
          <div className="plan" key={p.planId}>
            <ProgressRing paid={p.paid} total={p.total} color={CATEGORY_BY_ID[p.category].color} />
            <div className="plan-info">
              <span className="desc">{p.name}</span>
              <span className="meta"><span className="num">{formatEur(p.amount)}</span> por mês</span>
              <span className="meta">Faltam <span className="num">{formatEur(p.remainingAmount)}</span> · última em {formatMonth(p.endMonth)}</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

/** Círculo que se vai preenchendo à medida que as prestações são pagas. */
function ProgressRing({ paid, total, color }: { paid: number; total: number; color: string }) {
  const R = 22
  const C = 2 * Math.PI * R
  const filled = (Math.min(paid, total) / total) * C
  return (
    <svg className="ring" viewBox="0 0 56 56" width="56" height="56" role="img" aria-label={`Prestação ${paid} de ${total}`}>
      <circle cx="28" cy="28" r={R} fill="none" stroke="var(--line)" strokeWidth="5" />
      <circle cx="28" cy="28" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${filled} ${C - filled}`} transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle" fill="var(--fg)" fontSize="12" fontFamily="var(--f-mono)">{paid}/{total}</text>
    </svg>
  )
}

function Donut({ values, total }: { values: { color: string; value: number }[]; total: number }) {
  const R = 70
  const C = 2 * Math.PI * R
  const sum = values.reduce((a, v) => a + v.value, 0)
  let offset = 0
  return (
    <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Gráfico de gastos por categoria">
      <circle cx="90" cy="90" r={R} fill="none" stroke="var(--line)" strokeWidth="22" />
      {sum > 0 && values.map((v, i) => {
        const len = (v.value / sum) * C
        const arc = len > 0 && (
          <circle key={i} cx="90" cy="90" r={R} fill="none" stroke={v.color} strokeWidth="22"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)" />
        )
        offset += len
        return arc
      })}
      <text x="90" y="86" textAnchor="middle" fill="var(--muted)" fontSize="11">TOTAL GASTO</text>
      <text x="90" y="106" textAnchor="middle" fill="var(--fg)" fontSize="17" fontWeight="500" fontFamily="var(--f-mono)">{formatEur(total)}</text>
    </svg>
  )
}
