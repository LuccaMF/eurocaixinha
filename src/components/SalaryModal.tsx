import { useState } from 'react'
import { formatMonth, parseEur, shiftMonth } from '../domain/money'
import type { AppState, MonthKey } from '../domain/types'
import type { SetState } from '../useAppState'
import { Modal } from './Modal'

interface Props {
  month: MonthKey
  state: AppState
  setState: SetState
  onClose: () => void
}

export function SalaryModal({ month, state, setState, onClose }: Props) {
  // Pré-preenche com o salário do mês anterior, que costuma ser parecido.
  const initial = state.salaries[month] ?? state.salaries[shiftMonth(month, -1)]
  const [value, setValue] = useState(initial !== undefined ? (initial / 100).toFixed(2).replace('.', ',') : '')
  const cents = parseEur(value)

  return (
    <Modal
      title={`Quanto recebeste em ${formatMonth(month)}?`}
      onClose={onClose}
      onSubmit={() => {
        if (cents === null) return
        setState(s => ({ ...s, salaries: { ...s.salaries, [month]: cents } }))
        onClose()
      }}
      submitLabel="Guardar"
      submitDisabled={cents === null || cents < 0}
    >
      <div className="field">
        <label htmlFor="salary">Salário líquido do mês (€)</label>
        <input id="salary" inputMode="decimal" autoFocus placeholder="0,00" value={value} onChange={e => setValue(e.target.value)} />
      </div>
      <p className="hint">Se recebes em várias partes (ex.: dia 9 e dia 20), põe o total do mês.</p>
    </Modal>
  )
}
