import type { CategoryId } from './types'

export interface CategoryDef {
  id: CategoryId
  name: string
  color: string
  subcategories: string[]
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'ess',
    name: 'Essenciais',
    color: 'var(--c-ess)',
    subcategories: ['Habitação', 'Contas da casa', 'Alimentação', 'Transportes', 'Saúde', 'Impostos e obrigações', 'Outros'],
  },
  {
    id: 'nao',
    name: 'Não essenciais',
    color: 'var(--c-nao)',
    subcategories: ['Alimentação fora de casa', 'Lazer e entretenimento', 'Cuidados pessoais e estética', 'Compras supérfluas', 'Outros'],
  },
  {
    id: 'pou',
    name: 'Poupança e Investimento',
    color: 'var(--c-pou)',
    subcategories: ['Reserva de emergência', 'Investimentos e dívidas', 'Outros'],
  },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c])) as Record<CategoryId, CategoryDef>
