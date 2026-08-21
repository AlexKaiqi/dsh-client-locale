import { defineStore } from '@deepseek-ai/dsh-client-runtime/client';
export function createLanguageRowStore() {
    return defineStore({
        init: () => ({ active: '', options: [], revision: -1 }),
        actions: {
            sync: (draft, active, options, revision) => {
                if (revision <= draft.revision)
                    return;
                draft.active = active;
                draft.options = options;
                draft.revision = revision;
            },
        },
    });
}
//# sourceMappingURL=settings-store.js.map