import { useEffect, useState } from 'react'
import { ExpenseModal } from './components/ExpenseModal'
import { Home } from './components/Home'
import { Import } from './components/Import'
import { LockScreen } from './components/LockScreen'
import { SalaryModal } from './components/SalaryModal'
import { Savings } from './components/Savings'
import { Settings } from './components/Settings'
import { formatMonth, monthKey, monthOf, shiftMonth, todayISO } from './domain/money'
import type { AppState, Expense } from './domain/types'
import { useAppState, type AppStore } from './useAppState'

type Tab = 'home' | 'savings' | 'import' | 'settings'
const TABS: [Tab, string][] = [['home', 'Início'], ['savings', 'Poupança'], ['import', 'Importar'], ['settings', 'Definições']]

type ExpenseDialog = { mode: 'new'; category?: 'pou' } | { mode: 'edit'; expense: Expense } | null

export default function App() {
  const store = useAppState()
  if (store.status !== 'unlocked' || !store.state) {
    return <LockScreen key={store.status} mode={store.status === 'setup' ? 'setup' : 'locked'} onCreate={store.create} onUnlock={store.unlock} />
  }
  return <MainApp store={store} state={store.state} />
}

function MainApp({ store, state }: { store: AppStore; state: AppState }) {
  const { setState, saveFailed } = store
  const [tab, setTab] = useState<Tab>('home')
  const [month, setMonth] = useState(monthKey(new Date()))
  const [expenseDialog, setExpenseDialog] = useState<ExpenseDialog>(null)
  const [editingSalary, setEditingSalary] = useState(false)
  const [salaryAskDismissed, setSalaryAskDismissed] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 8000)
    return () => clearTimeout(t)
  }, [toast])

  const thisMonth = monthKey(new Date())
  // Pede o salário automaticamente quando o mês atual ainda não o tem.
  const askSalary = editingSalary || (!salaryAskDismissed && tab === 'home' && state.salaries[thisMonth] === undefined)
  const defaultDate = month === thisMonth ? todayISO() : `${month}-01`

  return (
    <div className="wrap">
      <header className="top">
        <h1 className="brand">Euro<span>Caixinha</span></h1>
        <div className="top-actions">
          {tab === 'home' && (
            <div className="month">
              <button onClick={() => setMonth(m => shiftMonth(m, -1))} aria-label="Mês anterior">‹</button>
              <strong>{formatMonth(month)}</strong>
              <button onClick={() => setMonth(m => shiftMonth(m, 1))} aria-label="Mês seguinte">›</button>
            </div>
          )}
          <button className="btn small" onClick={store.lock}>Bloquear</button>
        </div>
      </header>

      <nav className="tabs" aria-label="Secções">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {saveFailed && <p className="notice err">Não foi possível guardar no navegador. As alterações perdem-se ao fechar a página.</p>}
      {toast && <p className="notice" role="status">{toast}</p>}

      {tab === 'home' && (
        <Home state={state} month={month} onEditSalary={() => setEditingSalary(true)} onEditExpense={e => setExpenseDialog({ mode: 'edit', expense: e })} />
      )}
      {tab === 'savings' && <Savings state={state} setState={setState} onDeposit={() => setExpenseDialog({ mode: 'new', category: 'pou' })} />}
      {tab === 'import' && (
        <Import state={state} setState={setState} onDone={n => { setToast(`${n} movimentos importados. Já podes apagar o ficheiro CSV da tua pasta de Transferências.`); setTab('home') }} />
      )}
      {tab === 'settings' && <Settings state={state} store={store} />}

      <button className="fab" onClick={() => setExpenseDialog({ mode: 'new' })} aria-label="Adicionar gasto">+</button>

      {expenseDialog && (
        <ExpenseModal
          expense={expenseDialog.mode === 'edit' ? expenseDialog.expense : undefined}
          initialCategory={expenseDialog.mode === 'new' ? expenseDialog.category : undefined}
          defaultDate={defaultDate}
          setState={setState}
          onClose={() => setExpenseDialog(null)}
          onSaved={date => {
            setExpenseDialog(null)
            setMonth(monthOf(date))
          }}
        />
      )}
      {askSalary && <SalaryModal month={editingSalary ? month : thisMonth} state={state} setState={setState} onClose={() => { setEditingSalary(false); setSalaryAskDismissed(true) }} />}
    </div>
  )
}
