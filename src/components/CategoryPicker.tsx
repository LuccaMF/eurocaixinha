import { CATEGORIES, CATEGORY_BY_ID } from '../domain/categories'
import type { CategoryId } from '../domain/types'

interface Props {
  idPrefix: string
  category: CategoryId | ''
  subcategory: string
  onChange: (category: CategoryId, subcategory: string) => void
  compact?: boolean
}

/** Dois selects ligados: mudar a categoria escolhe a primeira subcategoria dela. */
export function CategoryPicker({ idPrefix, category, subcategory, onChange, compact }: Props) {
  const subs = category ? CATEGORY_BY_ID[category].subcategories : []
  const catSelect = (
    <select
      id={`${idPrefix}-cat`}
      aria-label="Categoria"
      value={category}
      onChange={e => {
        const c = e.target.value as CategoryId
        onChange(c, CATEGORY_BY_ID[c].subcategories[0])
      }}
    >
      {!category && <option value="">Escolher…</option>}
      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  )
  const subSelect = (
    <select
      id={`${idPrefix}-sub`}
      aria-label="Subcategoria"
      value={subcategory}
      disabled={!category}
      onChange={e => category && onChange(category, e.target.value)}
    >
      {subs.map(s => <option key={s}>{s}</option>)}
    </select>
  )

  if (compact) return <div className="picker">{catSelect}{subSelect}</div>
  return (
    <>
      <div className="field"><label htmlFor={`${idPrefix}-cat`}>Categoria</label>{catSelect}</div>
      <div className="field"><label htmlFor={`${idPrefix}-sub`}>Subcategoria</label>{subSelect}</div>
    </>
  )
}
