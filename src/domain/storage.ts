import { isVault, type Vault } from './crypto'
import type { AppState } from './types'

const VAULT_KEY = 'eurocaixinha-vault'
/** Versões antigas guardavam os dados sem encriptação nesta chave. */
const LEGACY_KEY = 'eurocaixinha'

export function emptyState(): AppState {
  return {
    version: 1,
    percentages: { ess: 50, nao: 30, pou: 20 },
    salaries: {},
    expenses: [],
    withdrawals: [],
    incomes: [],
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

export function loadVault(): Vault | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return isVault(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveVault(vault: Vault): boolean {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
    return true
  } catch {
    return false
  }
}

/** Apaga tudo o que a app guardou neste navegador. */
export function deleteAllData() {
  try {
    localStorage.removeItem(VAULT_KEY)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // sem acesso ao armazenamento: não há nada para apagar
  }
}

/** Dados de uma versão antiga, sem encriptação. São migrados quando se cria a palavra-passe. */
export function loadLegacyState(): AppState | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    return raw ? parseState(raw) : null
  } catch {
    return null
  }
}

export function removeLegacyState() {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // ignorar
  }
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
