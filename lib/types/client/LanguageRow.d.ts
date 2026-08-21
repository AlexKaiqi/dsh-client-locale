import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createLanguageRowStore } from './settings-store.ts';
export interface LanguageRowInjected {
    setLocale: (id: string) => void;
}
export type LanguageRowComponentProps = PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createLanguageRowStore>> & PropsLocale<'settings.locale'> & LanguageRowInjected;
export declare function LanguageRow({ t, setLocale, useStore }: LanguageRowComponentProps): import("react").JSX.Element;
//# sourceMappingURL=LanguageRow.d.ts.map