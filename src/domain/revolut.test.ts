import { describe, expect, it } from 'vitest'
import { parseCsv, parseRevolutCsv } from './revolut'
import { suggest } from './rules'

// Extrato inventado com o mesmo formato do CSV do Revolut (PT).
const CSV = `Tipo,Produto,Data de início,Data de Conclusão,Descrição,Montante,Comissão,Moeda,Estado,Saldo
Pagamento com cartão,Atual,2026-09-30 07:09:33,2026-10-01 09:32:40,My Break,-0.45,0.00,EUR,CONCLUÍDA,187.22
Transferência,Atual,2026-10-02 10:03:42,2026-10-02 10:03:42,Transferência imediata intrabancária para MARIA SILVA,-16.00,0.00,EUR,CONCLUÍDA,171.22
Carregamento,Atual,2026-10-09 13:13:36,2026-10-09 13:13:38,Carregamento com Apple Pay através de *1234,881.31,0.00,EUR,CONCLUÍDA,977.96
Transferência,Atual,2026-10-15 01:00:00,2026-10-15 13:03:45,SEPA+ credit transfer,-39.90,0.00,EUR,CONCLUÍDA,544.37
Transferência,Atual,2026-10-15 01:00:00,2026-10-15 13:03:45,SEPA+ credit transfer,-39.90,0.00,EUR,CONCLUÍDA,504.47
Transferência,Atual,2026-10-20 20:18:53,2026-10-20 20:18:55,"AGERE-EMP.DE AGUAS,EFL.E RESIDUOS BRAGA",-24.76,0.00,EUR,CONCLUÍDA,690.71
Pagamento com cartão,Atual,2026-10-20 20:19:50,,Templesushi Braga,-47.40,0.00,EUR,PENDENTE,
Transferência,Atual,2026-10-20 22:20:46,2026-10-20 22:20:47,Transferência imediata intrabancária de JOAO SANTOS,31.90,0.00,EUR,CONCLUÍDA,722.61
Pagamento com cartão,Atual,2026-10-21 10:00:00,2026-10-21 11:00:00,Loja em Londres,-10.00,0.00,GBP,CONCLUÍDA,0
Pagamento com cartão,Atual,2026-10-21 12:00:00,,Compra cancelada,-5.00,0.00,EUR,REVERTIDA,
Câmbio,Atual,2026-10-21 13:00:00,2026-10-21 13:00:00,Câmbio para USD,-20.00,0.50,EUR,CONCLUÍDA,600.00
`

describe('parseCsv', () => {
  it('mantém vírgulas dentro de aspas', () => {
    expect(parseCsv('a,"b, c",d\n')).toEqual([['a', 'b, c', 'd']])
  })
  it('aceita aspas escapadas e CRLF', () => {
    expect(parseCsv('"diz ""olá""",x\r\ny,z')).toEqual([['diz "olá"', 'x'], ['y', 'z']])
  })
})

describe('parseRevolutCsv', () => {
  const { rows, skipped } = parseRevolutCsv(CSV)

  it('usa a data de início, não a de conclusão', () => {
    expect(rows[0].date).toBe('2026-09-30')
  })

  it('converte montantes para cêntimos positivos e classifica o sentido', () => {
    expect(rows[0]).toMatchObject({ amount: 45, kind: 'debit' })
    expect(rows.find(r => r.type === 'Carregamento')).toMatchObject({ amount: 88131, kind: 'topup' })
    expect(rows.find(r => r.description.includes('JOAO'))).toMatchObject({ amount: 3190, kind: 'credit' })
  })

  it('soma a comissão ao gasto', () => {
    expect(rows.find(r => r.type === 'Câmbio')?.amount).toBe(2050)
  })

  it('lê descrições com vírgulas entre aspas', () => {
    expect(rows.some(r => r.description === 'AGERE-EMP.DE AGUAS,EFL.E RESIDUOS BRAGA')).toBe(true)
  })

  it('marca pendentes e ignora revertidas e outras moedas', () => {
    expect(rows.find(r => r.description === 'Templesushi Braga')?.pending).toBe(true)
    expect(skipped.map(s => s.reason)).toEqual(['moeda GBP', 'estado REVERTIDA'])
  })

  it('dá chaves diferentes a movimentos iguais e chaves estáveis entre importações', () => {
    const sepa = rows.filter(r => r.description === 'SEPA+ credit transfer')
    expect(sepa).toHaveLength(2)
    expect(sepa[0].key).not.toBe(sepa[1].key)
    expect(parseRevolutCsv(CSV).rows.map(r => r.key)).toEqual(rows.map(r => r.key))
  })

  it('um pendente que fica concluído mantém a mesma chave', () => {
    const done = CSV.replace(',Templesushi Braga,-47.40,0.00,EUR,PENDENTE,', '2026-10-21 09:00:00,Templesushi Braga,-47.40,0.00,EUR,CONCLUÍDA,600')
    const before = rows.find(r => r.description === 'Templesushi Braga')!.key
    const after = parseRevolutCsv(done).rows.find(r => r.description === 'Templesushi Braga')!
    expect(after.pending).toBe(false)
    expect(after.key).toBe(before)
  })

  it('aceita cabeçalhos em inglês', () => {
    const en = 'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\nCard Payment,Current,2026-10-01 10:00:00,2026-10-01 11:00:00,Lidl,-12.50,0.00,EUR,COMPLETED,10\n'
    expect(parseRevolutCsv(en).rows[0]).toMatchObject({ description: 'Lidl', amount: 1250 })
  })

  it('recusa ficheiros que não são do Revolut', () => {
    expect(() => parseRevolutCsv('data,valor\n2026-01-01,10\n')).toThrow(/Revolut/)
  })
})

describe('suggest', () => {
  it('reconhece supermercados e serviços conhecidos', () => {
    expect(suggest('Pingo Doce', {})).toEqual({ category: 'ess', subcategory: 'Alimentação' })
    expect(suggest('NOS COMUNICACOES SA', {})?.subcategory).toBe('Contas da casa')
    expect(suggest('Amazon Prime', {})?.subcategory).toBe('Assinaturas')
    expect(suggest('Spotify', {})?.subcategory).toBe('Assinaturas')
    expect(suggest('NOS Cinemas', {})?.subcategory).toBe('Lazer e entretenimento')
    expect(suggest('Amazon', {})?.subcategory).toBe('Compras supérfluas')
  })
  it('dá prioridade ao que o utilizador escolheu antes', () => {
    expect(suggest('PINGO  DOCE', { 'pingo doce': { category: 'nao', subcategory: 'Outros' } })?.category).toBe('nao')
  })
  it('não inventa categoria para descrições vagas', () => {
    expect(suggest('Payment', {})).toBeNull()
  })
})
