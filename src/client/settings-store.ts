import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

export interface LanguageOptionRow {
  id: string
  label: string
}

export interface LanguageRowState {
  active: string
  options: LanguageOptionRow[]
  revision: number
}

type LanguageRowActions = {
  sync: (draft: LanguageRowState, active: string, options: LanguageOptionRow[], revision: number) => void
}

export function createLanguageRowStore(): EngineStoreHandle<LanguageRowState, LanguageRowActions> {
  return defineStore({
    init: (): LanguageRowState => ({ active: '', options: [], revision: -1 }),
    actions: {
      sync: (draft, active, options, revision) => {
        if (revision <= draft.revision) return
        draft.active = active
        draft.options = options
        draft.revision = revision
      },
    },
  })
}
