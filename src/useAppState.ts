import { useCallback, useEffect, useRef, useState } from 'react'
import { encrypt, newKey, openVault, type UnlockedKey, type Vault, isVault } from './domain/crypto'
import { emptyState, loadLegacyState, loadVault, parseState, removeLegacyState, saveVault } from './domain/storage'
import type { AppState } from './domain/types'

/** Tempo sem atividade até a app se bloquear sozinha. */
export const AUTO_LOCK_MS = 5 * 60 * 1000

export type Status = 'setup' | 'locked' | 'unlocked'
export type SetState = React.Dispatch<React.SetStateAction<AppState>>

/**
 * Estado da app, guardado encriptado no navegador.
 * Enquanto está bloqueada, os dados só existem encriptados; a chave e os dados desencriptados
 * vivem apenas em memória e são descartados ao bloquear.
 */
export function useAppState() {
  const [hasVault, setHasVault] = useState(() => loadVault() !== null)
  const [key, setKey] = useState<UnlockedKey | null>(null)
  const [state, setStateRaw] = useState<AppState | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)

  const status: Status = key && state ? 'unlocked' : hasVault ? 'locked' : 'setup'

  // Guardar a cada alteração. A encriptação é assíncrona, por isso as gravações vão numa fila:
  // assim uma gravação antiga nunca se sobrepõe a uma mais recente.
  const queue = useRef(Promise.resolve())
  useEffect(() => {
    if (!key || !state) return
    queue.current = queue.current.then(async () => {
      setSaveFailed(!saveVault(await encrypt(JSON.stringify(state), key)))
    })
  }, [key, state])

  const lock = useCallback(() => {
    setKey(null)
    setStateRaw(null)
  }, [])

  // Bloqueio automático por inatividade. Verificamos a hora da última atividade em vez de
  // confiar só num temporizador, porque os navegadores atrasam temporizadores em separadores escondidos.
  useEffect(() => {
    if (status !== 'unlocked') return
    let last = Date.now()
    const touch = () => { last = Date.now() }
    const check = () => { if (Date.now() - last > AUTO_LOCK_MS) lock() }
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, touch, { passive: true }))
    document.addEventListener('visibilitychange', check)
    const timer = setInterval(check, 15_000)
    return () => {
      events.forEach(e => window.removeEventListener(e, touch))
      document.removeEventListener('visibilitychange', check)
      clearInterval(timer)
    }
  }, [status, lock])

  /** Primeira utilização: cria a palavra-passe e migra dados antigos sem encriptação, se houver. */
  async function create(password: string) {
    const k = await newKey(password)
    const initial = loadLegacyState() ?? emptyState()
    if (!saveVault(await encrypt(JSON.stringify(initial), k))) throw new Error('O navegador não deixou guardar os dados.')
    removeLegacyState()
    setHasVault(true)
    setKey(k)
    setStateRaw(initial)
  }

  /** Lança WrongPasswordError se a palavra-passe estiver errada. */
  async function unlock(password: string) {
    const vault = loadVault()
    if (!vault) { setHasVault(false); return }
    const { plaintext, key: k } = await openVault(vault, password)
    setKey(k)
    setStateRaw(parseState(plaintext))
  }

  async function changePassword(current: string, next: string) {
    const vault = loadVault()
    if (!vault || !state) return
    await openVault(vault, current) // confirma a palavra-passe atual
    const k = await newKey(next) // novo sal, nova chave
    if (!saveVault(await encrypt(JSON.stringify(state), k))) throw new Error('O navegador não deixou guardar os dados.')
    setKey(k)
  }

  /** Backup encriptado com a palavra-passe atual. */
  async function exportBackup(): Promise<string> {
    if (!key || !state) throw new Error('A app está bloqueada.')
    return JSON.stringify(await encrypt(JSON.stringify(state), key))
  }

  /** Repõe um backup. Um backup encriptado precisa da palavra-passe com que foi feito. */
  async function restoreBackup(fileText: string, password: string): Promise<AppState> {
    const parsed: unknown = JSON.parse(fileText)
    const restored = isVault(parsed)
      ? parseState((await openVault(parsed as Vault, password)).plaintext)
      : parseState(fileText) // backups antigos, sem encriptação
    setStateRaw(restored)
    return restored
  }

  const setState: SetState = useCallback(action => {
    setStateRaw(s => (s ? (typeof action === 'function' ? action(s) : action) : s))
  }, [])

  return { status, state, setState, saveFailed, create, unlock, lock, changePassword, exportBackup, restoreBackup }
}

export type AppStore = ReturnType<typeof useAppState>
