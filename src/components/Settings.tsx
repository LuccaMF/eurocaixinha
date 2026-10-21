import { useState } from 'react'
import { CATEGORIES } from '../domain/categories'
import { parseState } from '../domain/storage'
import type { AppState, Percentages } from '../domain/types'
import type { SetState } from '../useAppState'

export function Settings({ state, setState }: { state: AppState; setState: SetState }) {
  const [pct, setPct] = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIES.map(c => [c.id, String(state.percentages[c.id])])),
  )
  const [message, setMessage] = useState('')
  const sum = CATEGORIES.reduce((s, c) => s + (Number(pct[c.id]) || 0), 0)
  const backup = JSON.stringify(state)

  function download() {
    const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `eurocaixinha-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function restore(file: File) {
    try {
      const restored = parseState(await file.text())
      setState(restored)
      setMessage(`Backup reposto: ${restored.expenses.length} gastos.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não consegui ler o backup.')
    }
  }

  return (
    <>
      <section>
        <h2>Divisão do salário</h2>
        <form
          className="pcts"
          onSubmit={e => {
            e.preventDefault()
            if (sum !== 100) return
            setState(s => ({ ...s, percentages: Object.fromEntries(CATEGORIES.map(c => [c.id, Number(pct[c.id])])) as Percentages }))
            setMessage('Percentagens guardadas.')
          }}
        >
          {CATEGORIES.map(c => (
            <div className="pct-row" key={c.id}>
              <label htmlFor={`pct-${c.id}`}>{c.name}</label>
              <input id={`pct-${c.id}`} type="number" min={0} max={100} step={1} value={pct[c.id]} onChange={e => setPct(p => ({ ...p, [c.id]: e.target.value }))} />
            </div>
          ))}
          <p className={sum === 100 ? 'hint' : 'err'}>Total: {sum}%{sum !== 100 && ' (tem de ser 100%)'}</p>
          <button className="btn primary" disabled={sum !== 100}>Guardar percentagens</button>
        </form>
      </section>

      <section>
        <h2>Backup</h2>
        <p className="hint">
          Os dados ficam só neste navegador. Se limpares os dados do navegador ou mudares de computador, perdes tudo.
          Descarrega um backup de vez em quando.
        </p>
        <div className="row-actions">
          <button className="btn" onClick={download}>Descarregar backup</button>
          <label className="btn file">
            Repor backup
            <input type="file" accept=".json,application/json" onChange={e => e.target.files?.[0] && restore(e.target.files[0])} />
          </label>
        </div>
      </section>
      {message && <p className="notice" role="status">{message}</p>}
    </>
  )
}
