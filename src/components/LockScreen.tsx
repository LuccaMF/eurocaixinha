import { useState } from 'react'
import { passwordProblem, WrongPasswordError } from '../domain/crypto'
import { deleteAllData } from '../domain/storage'

interface Props {
  mode: 'setup' | 'locked'
  onCreate: (password: string) => Promise<void>
  onUnlock: (password: string) => Promise<void>
}

export function LockScreen({ mode, onCreate, onUnlock }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetText, setResetText] = useState('')

  const problem = mode === 'setup' ? passwordProblem(password) : null
  const mismatch = mode === 'setup' && confirm !== '' && confirm !== password
  const canSubmit = mode === 'locked'
    ? password !== ''
    : !problem && confirm === password && understood

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    setError('')
    try {
      await (mode === 'setup' ? onCreate(password) : onUnlock(password))
    } catch (err) {
      setError(err instanceof WrongPasswordError ? 'Palavra-passe errada.' : err instanceof Error ? err.message : 'Algo correu mal.')
      setBusy(false)
    }
  }

  return (
    <div className="wrap lock">
      <h1 className="brand">Euro<span>Caixinha</span></h1>
      <form className="lock-card" onSubmit={submit}>
        {mode === 'setup' ? (
          <>
            <h2>Cria uma palavra-passe</h2>
            <p className="hint">
              Os teus dados ficam encriptados neste navegador com esta palavra-passe.
              Sem ela, ninguém os consegue ler, nem tu.
            </p>
          </>
        ) : (
          <h2>Desbloquear</h2>
        )}
        <div className="field">
          <label htmlFor="lock-password">Palavra-passe</label>
          <input id="lock-password" type="password" autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} autoFocus value={password} onChange={e => setPassword(e.target.value)} />
          {mode === 'setup' && password !== '' && problem && <span className="err">{problem}</span>}
        </div>
        {mode === 'setup' && (
          <>
            <div className="field">
              <label htmlFor="lock-confirm">Repete a palavra-passe</label>
              <input id="lock-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
              {mismatch && <span className="err">As palavras-passe não são iguais.</span>}
            </div>
            <label className="check">
              <input id="lock-understood" type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} />
              <span>Percebo que, se me esquecer da palavra-passe, perco os dados. Não há forma de a recuperar.</span>
            </label>
          </>
        )}
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn primary" disabled={!canSubmit || busy}>
          {busy ? 'A processar…' : mode === 'setup' ? 'Criar e entrar' : 'Desbloquear'}
        </button>
      </form>

      {mode === 'locked' && (
        <div className="lock-reset">
          {!resetting ? (
            <button className="link" onClick={() => setResetting(true)}>Esqueci-me da palavra-passe</button>
          ) : (
            <form
              className="lock-card"
              onSubmit={e => {
                e.preventDefault()
                if (resetText !== 'APAGAR') return
                deleteAllData()
                location.reload()
              }}
            >
              <p className="hint">
                Sem a palavra-passe não é possível recuperar os dados. Podes apagar tudo e começar de novo,
                e depois repor um backup se te lembrares da palavra-passe dele.
              </p>
              <div className="field">
                <label htmlFor="lock-reset">Escreve APAGAR para confirmar</label>
                <input id="lock-reset" value={resetText} onChange={e => setResetText(e.target.value)} />
              </div>
              <div className="actions">
                <button type="button" className="btn" onClick={() => { setResetting(false); setResetText('') }}>Cancelar</button>
                <button className="btn danger" disabled={resetText !== 'APAGAR'}>Apagar tudo</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
