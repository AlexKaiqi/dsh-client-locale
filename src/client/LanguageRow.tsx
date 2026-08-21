import { useState, type CSSProperties } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { createLanguageRowStore } from './settings-store.ts'

const styles = {
  row: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0',
    borderBottom: '1px solid var(--dsw-alias-border-l2)',
  },
  rowText: {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4,
    paddingInlineEnd: 48,
  },
  title: {
    fontSize: 14, fontWeight: 400, lineHeight: '22px', color: 'var(--dsw-alias-label-primary)',
  },
  selector: {
    display: 'inline-flex', alignItems: 'center', gap: 12, minWidth: 112, height: 36,
    padding: '0 14px', border: 'none', borderRadius: 18,
    background: 'var(--dsw-alias-bg-module-platform)', font: 'inherit', fontSize: 14,
    lineHeight: '22px', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer',
  },
  chevron: { flex: 'none', marginInlineStart: 'auto' },
} satisfies Record<string, CSSProperties>

export interface LanguageRowInjected {
  setLocale: (id: string) => void
}

export type LanguageRowComponentProps =
  PropsRuntime<'settings.general.item'>
  & PropsStore<ReturnType<typeof createLanguageRowStore>>
  & PropsLocale<'settings.locale'>
  & LanguageRowInjected

export function LanguageRow({ t, setLocale, useStore }: LanguageRowComponentProps) {
  const active = useStore(state => state.active)
  const options = useStore(state => state.options)
  const [open, setOpen] = useState(false)
  const activeLabel = options.find(option => option.id === active)?.label ?? active

  return (
    <div style={styles.row}>
      <div style={styles.rowText}>
        <div style={styles.title}>{t('language.title')}</div>
      </div>
      <Menu
        open={open}
        onClose={() => { setOpen(false) }}
        items={options.map(option => ({ id: option.id, label: option.label }))}
        selectedId={active}
        onSelect={id => {
          setLocale(id)
          setOpen(false)
        }}
        align="end"
        portal
        anchor={(
          <button
            type="button"
            style={styles.selector}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => { setOpen(value => !value) }}
          >
            {activeLabel}
            <span style={styles.chevron}><IconChevronDownOutline14 /></span>
          </button>
        )}
      />
    </div>
  )
}
