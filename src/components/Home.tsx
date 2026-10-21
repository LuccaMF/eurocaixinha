import { useState } from 'react'
import { CATEGORY_BY_ID } from '../domain/categories'
import { formatDay, formatEur, monthOf } from '../domain/money'
import { summarizeMonth } from '../domain/summary'
import type { AppState, Expense, MonthKey } from '../domain/types'

interface Props {
  state: AppState
  month: MonthKey
  onEditSalary: () => void
  onEditExpense: (e: Expense) => void
}

export function Home({ state, month, onEditSalary, onEditExpense }: Props) {
  const [showAll, setShowAll] = useState(false)
  const s = summarizeMonth(state, month)
  const recent = state.expenses
    .filter(e => monthOf(e.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const barBase = Math.max(s.salary + s.fromSavings, s.spent) || 1

  return (
    <>
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

      <section className="cats" aria-label="Categorias">
        {s.categories.map(c => {
          const def = CATEGORY_BY_ID[c.id]
          const left = c.budget - c.spent
          return (
            <div className="cat" key={c.id} style={{ '--c': def.color } as React.CSSProperties}>
              <h3>{def.name}<span className="num">{state.percentages[c.id]}%</span></h3>
              <div className="bar"><i style={{ width: `${Math.min(100, c.budget ? (Math.max(c.spent, 0) / c.budget) * 100 : 0)}%`, background: def.color }} /></div>
              <div className="row"><span>{c.id === 'pou' ? 'Guardado' : 'Gasto'}</span><b className="num">{formatEur(c.spent)}</b></div>
              <div className={`row ${left < 0 && c.id !== 'pou' ? 'over' : ''}`}>
                <span>{left < 0 ? (c.id === 'pou' ? 'Acima da meta' : 'Acima do limite') : c.id === 'pou' ? 'Falta para a meta' : 'Disponível'}</span>
                <b className="num">{formatEur(Math.abs(left))}</b>
              </div>
              <div className="row"><span>{c.id === 'pou' ? 'Meta' : 'Limite'}</span><span className="num">{formatEur(c.budget)}</span></div>
            </div>
          )
        })}
      </section>

      <section aria-label="Gráfico de gastos">
        <h2>Para onde foi o dinheiro</h2>
        <div className="chartbox">
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
        </div>
      </section>

      <section aria-label="Gastos do mês">
        <h2>Gastos recentes</h2>
        <div className="list">
          {recent.length === 0 && <p className="empty">Ainda sem gastos neste mês. Usa o botão + ou importa o extrato do Revolut.</p>}
          {(showAll ? recent : recent.slice(0, 10)).map(e => (
            <button className="item" key={e.id} onClick={() => onEditExpense(e)}>
              <span className="stripe" style={{ background: CATEGORY_BY_ID[e.category].color }} />
              <span className="item-main">
                <span className="desc">{e.description}</span>
                <span className="meta">{formatDay(e.date)} · {CATEGORY_BY_ID[e.category].name} › {e.subcategory}</span>
              </span>
              <b className={`num ${e.amount < 0 ? 'pos' : ''}`}>{e.amount < 0 ? '+' + formatEur(-e.amount) : formatEur(e.amount)}</b>
            </button>
          ))}
          {recent.length > 10 && (
            <button className="link more" onClick={() => setShowAll(v => !v)}>
              {showAll ? 'Mostrar menos' : `Ver todos os ${recent.length} gastos do mês`}
            </button>
          )}
        </div>
      </section>
    </>
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
