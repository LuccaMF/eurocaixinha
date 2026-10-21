import { useEffect, useState } from 'react'
import { loadState, saveState } from './domain/storage'
import type { AppState } from './domain/types'

/** Estado da app guardado no navegador (localStorage) a cada alteração. */
export function useAppState() {
  const [state, setState] = useState<AppState>(loadState)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    setSaveFailed(!saveState(state))
  }, [state])

  return { state, setState, saveFailed }
}

export type SetState = React.Dispatch<React.SetStateAction<AppState>>
