import { useState } from 'react'
import { CATEGORIES } from '../domain/categories'
import { passwordProblem, WrongPasswordError } from '../domain/crypto'
import type { AppState, Percentages } from '../domain/types'
import type { AppStore } from '../useAppState'

function errorText(e: unknown): string {
  if (e instanceof WrongPasswordError) return 'Palavra-passe errada.'
  if (e instanceof SyntaxError) return 'Este ficheiro não é um backup do EuroCaixinha.'
  return e instanceof Error ? e.message : 'Algo correu mal.'
}

export function Settings({ state, store }: { state: AppState; store: AppStore }) {
  const { setState } = store
  const [pct, setPct] = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIES.map(c => [c.id, String(state.percentages[c.id])])),
  )
  const [message, setMessage] = useState('')
  const sum = CATEGORIES.reduce((s, c) => s + (Number(pct[c.id]) || 0), 0)

  // Repor backup: primeiro escolhe-se o ficheiro, depois confirma-se com a palavra-passe dele.
  const [restoreFile, setRestoreFile] = useState<{ name: string; text: string } | null>(null)
  const [restorePassword, setRestorePassword] = useState('')
  const [busy, setBusy] = useState(false)

  // Mudar palavra-passe
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [nextConfirm, setNextConfirm] = useState('')
  const nextProblem = next ? passwordProblem(next) : null

  async function download() {
    try {
      const url = URL.createObjectURL(new Blob([await store.exportBackup()], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `eurocaixinha-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Backup encriptado descarregado. Para o repor vais precisar da palavra-passe atual.')
    } catch (e) {
      setMessage(errorText(e))
    }
  }

  async function restore() {
    if (!restoreFile) return
    setBusy(true)
    try {
      const restored = await store.restoreBackup(restoreFile.text, restorePassword)
      setMessage(`Backup reposto: ${restored.expenses.length} gastos.`)
      setRestoreFile(null)
      setRestorePassword('')
    } catch (e) {
      setMessage(errorText(e))
    }
    setBusy(false)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (nextProblem || next !== nextConfirm) return
    setBusy(true)
    try {
      await store.changePassword(current, next)
      setMessage('Palavra-passe alterada. Os backups antigos continuam a precisar da palavra-passe antiga.')
      setCurrent(''); setNext(''); setNextConfirm('')
    } catch (err) {
      setMessage(errorText(err))
    }
    setBusy(false)
  }

  return (
    <>
      {message && <p className="notice" role="status">{message}</p>}

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

      <section className="stack">
        <h2>Backup</h2>
        <p className="hint">
          Os dados ficam só neste navegador. Se limpares os dados do navegador ou mudares de computador, perdes tudo.
          Descarrega um backup de vez em quando. O ficheiro sai encriptado com a tua palavra-passe atual.
        </p>
        <div className="row-actions">
          <button className="btn" onClick={download}>Descarregar backup</button>
          <label className="btn file">
            Repor backup…
            <input
              id="restore-file"
              type="file"
              accept=".json,application/json"
              onChange={async e => {
                const f = e.target.files?.[0]
                if (f) setRestoreFile({ name: f.name, text: await f.text() })
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {restoreFile && (
          <form className="lock-card" onSubmit={e => { e.preventDefault(); restore() }}>
            <p className="hint">
              Vais repor <b>{restoreFile.name}</b>. Isto substitui todos os dados atuais.
            </p>
            <div className="field">
              <label htmlFor="restore-password">Palavra-passe com que este backup foi feito</label>
              <input id="restore-password" type="password" autoComplete="current-password" value={restorePassword} onChange={e => setRestorePassword(e.target.value)} />
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => { setRestoreFile(null); setRestorePassword('') }}>Cancelar</button>
              <button className="btn danger" disabled={busy}>Substituir os dados</button>
            </div>
          </form>
        )}
      </section>

      <section>
        <h2>Palavra-passe</h2>
        <form className="pcts" onSubmit={changePassword}>
          <div className="field">
            <label htmlFor="pw-current">Palavra-passe atual</label>
            <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pw-next">Nova palavra-passe</label>
            <input id="pw-next" type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} />
            {nextProblem && <span className="err">{nextProblem}</span>}
          </div>
          <div className="field">
            <label htmlFor="pw-confirm">Repete a nova palavra-passe</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" value={nextConfirm} onChange={e => setNextConfirm(e.target.value)} />
            {nextConfirm && next !== nextConfirm && <span className="err">As palavras-passe não são iguais.</span>}
          </div>
          <button className="btn primary" disabled={busy || !current || !!nextProblem || !next || next !== nextConfirm}>Mudar palavra-passe</button>
        </form>
      </section>
    </>
  )
}
