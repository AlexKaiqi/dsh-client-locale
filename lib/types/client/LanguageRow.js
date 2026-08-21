import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives';
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
};
export function LanguageRow({ t, setLocale, useStore }) {
    const active = useStore(state => state.active);
    const options = useStore(state => state.options);
    const [open, setOpen] = useState(false);
    const activeLabel = options.find(option => option.id === active)?.label ?? active;
    return (_jsxs("div", { style: styles.row, children: [_jsx("div", { style: styles.rowText, children: _jsx("div", { style: styles.title, children: t('language.title') }) }), _jsx(Menu, { open: open, onClose: () => { setOpen(false); }, items: options.map(option => ({ id: option.id, label: option.label })), selectedId: active, onSelect: id => {
                    setLocale(id);
                    setOpen(false);
                }, align: "end", portal: true, anchor: (_jsxs("button", { type: "button", style: styles.selector, "aria-haspopup": "menu", "aria-expanded": open, onClick: () => { setOpen(value => !value); }, children: [activeLabel, _jsx("span", { style: styles.chevron, children: _jsx(IconChevronDownOutline14, {}) })] })) })] }));
}
//# sourceMappingURL=LanguageRow.js.map