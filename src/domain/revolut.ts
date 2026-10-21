import type { Cents, ISODate } from './types'

export type RowKind = 'debit' | 'credit' | 'topup'

export interface StatementRow {
  /** Identifica a linha entre importações (ver buildImportKeys). */
  key: string
  date: ISODate
  description: string
  /** Sempre positivo; o sentido está em `kind`. Já inclui a comissão. */
  amount: Cents
  kind: RowKind
  pending: boolean
  type: string
}

export interface ParseResult {
  rows: StatementRow[]
  /** Linhas ignoradas (revertidas, outra moeda, etc.), com o motivo. */
  skipped: { line: number; reason: string }[]
}

// O Revolut exporta os cabeçalhos na língua da app, por isso aceitamos PT e EN.
const HEADERS = {
  type: ['Tipo', 'Type'],
  started: ['Data de início', 'Started Date'],
  description: ['Descrição', 'Description'],
  amount: ['Montante', 'Amount'],
  fee: ['Comissão', 'Fee'],
  currency: ['Moeda', 'Currency'],
  state: ['Estado', 'State'],
} as const

const COMPLETED = ['CONCLUÍDA', 'COMPLETED']
const PENDING = ['PENDENTE', 'PENDING']
const TOPUP = ['Carregamento', 'Topup', 'Top-up', 'Top-Up']

/** Divide um CSV em linhas e campos, respeitando aspas ("A, B" é um só campo). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let quoted = false
  const src = text.replace(/^\uFEFF/, '') // remove o BOM do início, se existir
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(f => f !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some(f => f !== '')) rows.push(row)
  return rows
}

function toCents(value: string): Cents {
  const n = parseFloat(value.replace(',', '.'))
  if (Number.isNaN(n)) throw new Error(`Valor inválido: "${value}"`)
  return Math.round(n * 100)
}

export function parseRevolutCsv(text: string): ParseResult {
  const [header, ...lines] = parseCsv(text)
  if (!header) throw new Error('O ficheiro está vazio.')

  const col = {} as Record<keyof typeof HEADERS, number>
  for (const [name, options] of Object.entries(HEADERS) as [keyof typeof HEADERS, readonly string[]][]) {
    const idx = header.findIndex(h => options.includes(h.trim()))
    if (idx < 0) throw new Error(`Este ficheiro não parece um extrato CSV do Revolut (falta a coluna "${options[0]}").`)
    col[name] = idx
  }

  const rows: StatementRow[] = []
  const skipped: ParseResult['skipped'] = []
  // Conta quantas vezes já vimos cada movimento, para a chave (ver comentário abaixo).
  const seen = new Map<string, number>()

  lines.forEach((f, i) => {
    const line = i + 2
    const state = f[col.state]?.trim().toUpperCase()
    const pending = PENDING.includes(state)
    if (!pending && !COMPLETED.includes(state)) {
      skipped.push({ line, reason: `estado ${f[col.state] || 'desconhecido'}` })
      return
    }
    if (f[col.currency] !== 'EUR') {
      skipped.push({ line, reason: `moeda ${f[col.currency]}` })
      return
    }
    // Uma comissão positiva é dinheiro que sai, por isso subtrai ao montante.
    const signed = toCents(f[col.amount]) - toCents(f[col.fee] || '0')
    if (signed === 0) return

    const startedAt = f[col.started].trim()
    const description = f[col.description].trim()
    const type = f[col.type].trim()

    // A chave usa data/hora de início + descrição + montante. Não usamos a data de conclusão
    // porque uma linha PENDENTE ainda não a tem e passa a tê-la mais tarde.
    // Há movimentos genuinamente iguais (ex.: duas transferências de 39,90 € no mesmo segundo),
    // por isso acrescentamos um contador de ocorrência: "#1", "#2", ...
    const base = `${startedAt}|${description}|${signed}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)

    rows.push({
      key: `${base}#${n}`,
      date: startedAt.slice(0, 10),
      description,
      amount: Math.abs(signed),
      kind: signed < 0 ? 'debit' : TOPUP.includes(type) ? 'topup' : 'credit',
      pending,
      type,
    })
  })

  return { rows, skipped }
}
