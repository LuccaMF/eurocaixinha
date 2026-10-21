import type { AppState } from './types'

const KEY = 'eurocaixinha'

export function emptyState(): AppState {
  return {
    version: 1,
    percentages: { ess: 50, nao: 30, pou: 20 },
    salaries: {},
    expenses: [],
    withdrawals: [],
    rules: {},
  }
}

/** Valida o mínimo para não rebentar a app com um ficheiro de backup estragado. */
export function parseState(json: string): AppState {
  const data = JSON.parse(json)
  if (data?.version !== 1 || !Array.isArray(data.expenses) || !Array.isArray(data.withdrawals)) {
    throw new Error('Este ficheiro não é um backup do EuroCaixinha.')
  }
  return { ...emptyState(), ...data }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? parseState(raw) : emptyState()
  } catch {
    return emptyState()
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
