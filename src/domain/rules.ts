import type { Rule } from './types'

/** "Pingo Doce" e "PINGO  DOCE " passam a ser a mesma chave. */
export function normalize(description: string): string {
  return description
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Sugestões de partida. As escolhas do utilizador (regras aprendidas) têm sempre prioridade.
const BUILT_IN: [RegExp, Rule][] = [
  [/pingo doce|continente|mercadona|lidl|aldi|auchan|intermarche|froiz|minipreco|el corte ingles super/, { category: 'ess', subcategory: 'Alimentação' }],
  [/via verde|galp|repsol|\bbp\b|prio|cepsa|metro do porto|carris|\bcp\b|navegante|andante/, { category: 'ess', subcategory: 'Transportes' }],
  [/\bnos\b|meo|vodafone|nowo|digi|edp|endesa|goldenergy|iberdrola|agere|aguas|epal|galp gas/, { category: 'ess', subcategory: 'Contas da casa' }],
  [/farmacia|wells|clinica|hospital|cuf|lusiadas/, { category: 'ess', subcategory: 'Saúde' }],
  [/autoridade tributaria|financas|seguranca social/, { category: 'ess', subcategory: 'Impostos e obrigações' }],
  [/uber eats|glovo|bolt food|mcdonald|burger king|kfc|telepizza|sushi|templesu|cafe|restaurante|tasca|pastelaria|my break|o neca/, { category: 'nao', subcategory: 'Alimentação fora de casa' }],
  [/spotify|netflix|amazon prime|disney|hbo|max\.com|youtube|steam|playstation|cinema|nos cinemas|ticketline/, { category: 'nao', subcategory: 'Lazer e entretenimento' }],
  [/cabeleireiro|barbearia|sephora|douglas|perfumes|ginasio|fitness|solinca|holmes place/, { category: 'nao', subcategory: 'Cuidados pessoais e estética' }],
  [/amazon|pcdiga|radio popular|worten|fnac|zara|primark|h&m|shein|aliexpress|temu/, { category: 'nao', subcategory: 'Compras supérfluas' }],
]

export function suggest(description: string, learned: Record<string, Rule>): Rule | null {
  const key = normalize(description)
  if (learned[key]) return learned[key]
  for (const [re, rule] of BUILT_IN) if (re.test(key)) return rule
  return null
}
