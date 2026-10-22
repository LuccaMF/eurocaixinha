import { useMemo, useState } from 'react'
import { installmentPlans, matchPlan } from '../domain/installments'
import { formatDay, formatEur, monthOf } from '../domain/money'
import { parseRevolutCsv, type ParseResult, type StatementRow } from '../domain/revolut'
import { normalize, suggest } from '../domain/rules'
import { newId } from '../domain/storage'
import type { AppState, CategoryId, Installment, Rule } from '../domain/types'
import type { SetState } from '../useAppState'
import { CategoryPicker } from './CategoryPicker'
import { Amount } from './FlowIcon'

// Descrições que não dizem nada sobre o gasto: não vale a pena aprender uma regra para elas.
const VAGUE = ['payment', 'sepa+ credit transfer', 'transferencia']

interface Choice {
  include: boolean
  category: CategoryId | ''
  subcategory: string
  /** Prestação seguinte de um plano já conhecido, reconhecida automaticamente. */
  installment?: Installment
}

export function Import({ state, setState, onDone }: { state: AppState; setState: SetState; onDone: (count: number) => void }) {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState('')
  const [choices, setChoices] = useState<Record<string, Choice>>({})

  const imported = useMemo(
    () => new Set([...state.expenses, ...state.incomes].map(e => e.importKey).filter(Boolean)),
    [state.expenses, state.incomes],
  )

  async function onFile(file: File) {
    setError('')
    try {
      const parsed = parseRevolutCsv(await file.text())
      const links = linkInstallments(parsed.rows)
      const initial: Record<string, Choice> = {}
      for (const r of parsed.rows) {
        if (r.kind === 'topup') {
          initial[r.key] = { include: !r.pending && !imported.has(r.key), category: '', subcategory: '' }
          continue
        }
        const link = links[r.key]
        const rule = link ? { category: link.category, subcategory: link.subcategory } : suggest(r.description, state.rules)
        initial[r.key] = {
          // Por defeito: importar gastos concluídos; entradas e pendentes ficam para decidir.
          include: r.kind === 'debit' && !r.pending && !imported.has(r.key),
          category: rule?.category ?? '',
          subcategory: rule?.subcategory ?? '',
          installment: link?.installment,
        }
      }
      setChoices(initial)
      setResult(parsed)
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : 'Não consegui ler o ficheiro.')
    }
  }

  /**
   * Liga movimentos do extrato à prestação seguinte de planos já registados (mesma descrição e valor).
   * Percorre por ordem de data, para que dois meses do mesmo plano no mesmo extrato fiquem 4 e 5, e não 4 e 4.
   */
  function linkInstallments(rows: StatementRow[]) {
    const plans = installmentPlans(state.expenses).map(p => ({ ...p }))
    const links: Record<string, { installment: Installment; category: CategoryId; subcategory: string }> = {}
    for (const r of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
      if (r.kind !== 'debit' || imported.has(r.key)) continue
      const plan = matchPlan(plans, r.description, r.amount, r.date)
      if (!plan) continue
      plan.paid += 1
      plan.remaining -= 1
      plan.done = plan.remaining <= 0
      plan.lastMonth = monthOf(r.date)
      links[r.key] = {
        installment: { planId: plan.planId, name: plan.name, number: plan.paid, total: plan.total },
        category: plan.category,
        subcategory: plan.subcategory,
      }
    }
    return links
  }

  // Os que ainda não têm categoria aparecem primeiro, para não ter de os procurar.
  const rows = (result?.rows.filter(r => r.kind !== 'topup') ?? []).sort(
    (a, b) => Number(!!suggest(a.description, state.rules)) - Number(!!suggest(b.description, state.rules)),
  )
  const topups = result?.rows.filter(r => r.kind === 'topup') ?? []
  const selected = rows.filter(r => choices[r.key]?.include && !imported.has(r.key))
  const missing = selected.filter(r => !choices[r.key].category).length
  const selectedIncomes = topups.filter(r => choices[r.key]?.include && !imported.has(r.key))
  const total = selected.length + selectedIncomes.length

  function update(key: string, patch: Partial<Choice>) {
    setChoices(c => ({ ...c, [key]: { ...c[key], ...patch } }))
  }

  function confirm() {
    if (missing > 0) return
    setState(s => {
      const rules: Record<string, Rule> = { ...s.rules }
      const expenses = selected.map(r => {
        const { category, subcategory, installment } = choices[r.key] as Choice & { category: CategoryId }
        const key = normalize(r.description)
        if (!VAGUE.some(v => key.startsWith(v))) rules[key] = { category, subcategory }
        return {
          id: newId(),
          date: r.date,
          // Uma entrada (ex.: alguém te devolve dinheiro) entra como gasto negativo: um reembolso.
          amount: r.kind === 'credit' ? -r.amount : r.amount,
          description: r.description,
          category,
          subcategory,
          importKey: r.key,
          installment,
        }
      })
      const incomes = selectedIncomes.map(r => ({ id: newId(), date: r.date, amount: r.amount, description: r.description, importKey: r.key }))
      return { ...s, rules, expenses: [...s.expenses, ...expenses], incomes: [...s.incomes, ...incomes] }
    })
    onDone(total)
    setResult(null)
  }

  return (
    <section className="import">
      <h2>Importar extrato do Revolut</h2>
      <p className="hint">
        Na app do Revolut: Conta › Extrato › Excel/CSV. Os movimentos que já importaste antes são reconhecidos e não ficam duplicados.
      </p>
      <label className="btn primary file">
        Escolher ficheiro CSV
        <input type="file" accept=".csv,text/csv" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {error && <p className="err">{error}</p>}

      {result && (
        <>
          <div className="notice">
            <span>
              {rows.length + topups.length} movimentos · {total} selecionados
              {missing > 0 && <> · <b className="warn">{missing} sem categoria</b></>}
            </span>
            <button className="btn primary" onClick={confirm} disabled={total === 0 || missing > 0}>
              Importar {total}
            </button>
          </div>
          {topups.length > 0 && (
            <div className="import-group">
              <h3>Entradas</h3>
              <p className="hint">
                Carregamentos vindos de outra conta tua, normalmente o salário. Aparecem no Início como entradas,
                mas não mudam o saldo: esse continua a usar o salário que indicas.
              </p>
              <div className="import-list">
                {topups.map(r => {
                  const id = `imp-${r.key.replace(/[^a-z0-9]/gi, '')}`
                  const done = imported.has(r.key)
                  return (
                    <div className={`import-row ${done ? 'done' : ''}`} key={r.key}>
                      <input id={id} type="checkbox" checked={!!choices[r.key]?.include && !done} disabled={done} onChange={e => update(r.key, { include: e.target.checked })} aria-label={`Importar ${r.description}`} />
                      <label htmlFor={id} className="item-main">
                        <span className="desc">{r.description}</span>
                        <span className="meta">{formatDay(r.date)}{r.pending && ' · pendente'}{done && ' · já importado'}</span>
                      </label>
                      <Amount cents={r.amount} incoming format={formatEur} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {result.skipped.length > 0 && (
            <p className="hint">Ignorei {result.skipped.length} linha(s): {result.skipped.map(s => s.reason).join(', ')}.</p>
          )}
          <h3>Gastos e reembolsos</h3>
          <div className="import-list">
            {rows.map(r => (
              <ImportRow key={r.key} row={r} choice={choices[r.key]} done={imported.has(r.key)} onChange={p => update(r.key, p)} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function ImportRow({ row, choice, done, onChange }: { row: StatementRow; choice: Choice; done: boolean; onChange: (p: Partial<Choice>) => void }) {
  const id = `imp-${row.key.replace(/[^a-z0-9]/gi, '')}`
  const needsCategory = choice.include && !done && !choice.category
  return (
    <div className={`import-row ${done ? 'done' : ''} ${needsCategory ? 'needs' : ''}`}>
      <input id={id} type="checkbox" checked={choice.include && !done} disabled={done} onChange={e => onChange({ include: e.target.checked })} aria-label={`Importar ${row.description}`} />
      <label htmlFor={id} className="item-main">
        <span className="desc">{row.description}</span>
        <span className="meta">
          {formatDay(row.date)}
          {row.pending && ' · pendente'}
          {row.kind === 'credit' && ' · entrada (conta como reembolso)'}
          {done && ' · já importado'}
        </span>
        {!done && choice.include && choice.installment && (
          <span className="meta inst-link">
            Prestação {choice.installment.number} de {choice.installment.total} · {choice.installment.name}{' '}
            <button type="button" className="link" onClick={() => onChange({ installment: undefined })}>não é</button>
          </span>
        )}
      </label>
      <Amount cents={row.amount} incoming={row.kind !== 'debit'} format={formatEur} />
      {!done && choice.include && (
        <CategoryPicker compact idPrefix={id} category={choice.category} subcategory={choice.subcategory} onChange={(category, subcategory) => onChange({ category, subcategory })} />
      )}
    </div>
  )
}
