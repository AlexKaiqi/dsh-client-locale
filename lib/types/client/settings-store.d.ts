import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client';
export interface LanguageOptionRow {
    id: string;
    label: string;
}
export interface LanguageRowState {
    active: string;
    options: LanguageOptionRow[];
    revision: number;
}
type LanguageRowActions = {
    sync: (draft: LanguageRowState, active: string, options: LanguageOptionRow[], revision: number) => void;
};
export declare function createLanguageRowStore(): EngineStoreHandle<LanguageRowState, LanguageRowActions>;
export {};
//# sourceMappingURL=settings-store.d.ts.map