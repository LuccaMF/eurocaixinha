import { useEffect, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  onSubmit: () => void
  submitLabel: string
  submitDisabled?: boolean
  children: ReactNode
}

export function Modal({ title, onClose, onSubmit, submitLabel, submitDisabled, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form
        className="sheet"
        onSubmit={e => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <h2>{title}</h2>
        {children}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={submitDisabled}>{submitLabel}</button>
        </div>
      </form>
    </div>
  )
}
