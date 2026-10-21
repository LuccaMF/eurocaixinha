import { useState } from 'react'
import { CATEGORY_BY_ID } from '../domain/categories'
import { formatDay, formatEur, parseEur, todayISO } from '../domain/money'
import { newId } from '../domain/storage'
import { savingsHistory } from '../domain/summary'
import type { AppState } from '../domain/types'
import type { SetState } from '../useAppState'
import { Modal } from './Modal'

const SUBS = CATEGORY_BY_ID.pou.subcategories

export function Savings({ state, setState, onDeposit }: { state: AppState; setState: SetState; onDeposit: () => void }) {
  const { moves, total, bySub } = savingsHistory(state)
  const [withdrawing, setWithdrawing] = useState(false)

  return (
    <>
      <section className="balance">
        <span className="label">Total poupado</span>
        <div className={`big ${total < 0 ? 'neg' : ''}`}>{formatEur(total)}</div>
        <div className="sub">
          {SUBS.filter(s => bySub[s]).map(s => (
            <span key={s}>{s}: <b className="num">{formatEur(bySub[s])}</b></span>
          ))}
        </div>
        <div className="row-actions">
          <button className="btn primary" onClick={onDeposit}>Depositar</button>
          <button className="btn" onClick={() => setWithdrawing(true)} disabled={total <= 0}>Retirar</button>
        </div>
        <p className="hint">
          Depositar cria um gasto na categoria Poupança, por isso desconta do salário do mês.
          Retirar devolve o valor ao disponível do mês em que retiras.
        </p>
      </section>

      <section>
        <h2>Histórico</h2>
        <div className="list">
          {moves.length === 0 && <p className="empty">Ainda não há movimentos na poupança.</p>}
          {moves.map(m => (
            <div className="item static" key={m.id}>
              <span className="stripe" style={{ background: m.amount < 0 ? 'var(--danger)' : 'var(--c-pou)' }} />
              <span className="item-main">
                <span className="desc">{m.description}</span>
                <span className="meta">{formatDay(m.date)} · {m.subcategory} · saldo {formatEur(m.balance)}</span>
              </span>
              <b className={`num ${m.amount < 0 ? 'neg-text' : 'pos'}`}>{m.amount < 0 ? '−' : '+'}{formatEur(Math.abs(m.amount))}</b>
            </div>
          ))}
        </div>
      </section>

      {withdrawing && <WithdrawModal max={total} setState={setState} onClose={() => setWithdrawing(false)} />}
    </>
  )
}

function WithdrawModal({ max, setState, onClose }: { max: number; setState: SetState; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(todayISO())
  const [subcategory, setSubcategory] = useState(SUBS[0])
  const cents = parseEur(amount)
  const tooMuch = cents !== null && cents > max
  const valid = cents !== null && cents > 0 && !tooMuch && reason.trim() !== ''

  return (
    <Modal
      title="Retirar da poupança"
      onClose={onClose}
      submitLabel="Retirar"
      submitDisabled={!valid}
      onSubmit={() => {
        if (!valid || cents === null) return
        setState(s => ({ ...s, withdrawals: [...s.withdrawals, { id: newId(), date, amount: cents, reason: reason.trim(), subcategory }] }))
        onClose()
      }}
    >
      <div className="two">
        <div className="field">
          <label htmlFor="wd-amount">Valor (€)</label>
          <input id="wd-amount" inputMode="decimal" autoFocus placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="wd-date">Data</label>
          <input id="wd-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="wd-reason">Motivo</label>
        <input id="wd-reason" maxLength={80} placeholder="Ex.: Reparação do carro" value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="wd-sub">Retirar de</label>
        <select id="wd-sub" value={subcategory} onChange={e => setSubcategory(e.target.value)}>
          {SUBS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {tooMuch && <p className="err">Só tens {formatEur(max)} na poupança.</p>}
    </Modal>
  )
}
