// Todos os valores em dinheiro são guardados em cêntimos (inteiros),
// para evitar erros de arredondamento como 0.1 + 0.2 = 0.30000000000000004.
export type Cents = number

export type CategoryId = 'ess' | 'nao' | 'pou'

/** "AAAA-MM-DD" */
export type ISODate = string
/** "AAAA-MM" */
export type MonthKey = string

export interface Expense {
  id: string
  date: ISODate
  amount: Cents
  description: string
  category: CategoryId
  subcategory: string
  /** Presente quando o gasto veio de um extrato; serve para não importar duas vezes. */
  importKey?: string
}

/** Retirada da poupança. Os depósitos são os gastos da categoria 'pou'. */
export interface Withdrawal {
  id: string
  date: ISODate
  amount: Cents
  reason: string
  subcategory: string
}

export type Percentages = Record<CategoryId, number>

export interface Rule {
  category: CategoryId
  subcategory: string
}

export interface AppState {
  version: 1
  percentages: Percentages
  salaries: Record<MonthKey, Cents>
  expenses: Expense[]
  withdrawals: Withdrawal[]
  /** Regras aprendidas: descrição normalizada -> categoria escolhida. */
  rules: Record<string, Rule>
}
