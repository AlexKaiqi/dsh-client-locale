import type { MessageDescriptor, SourceCatalog, TranslationCatalog } from './messages.ts';
export type CatalogIssueCode = 'invalid-message' | 'missing-key' | 'extra-key' | 'argument-mismatch' | 'tag-mismatch' | 'stale-source';
export interface CatalogIssue {
    code: CatalogIssueCode;
    key: string;
    message: string;
}
export interface MessageSignature {
    arguments: readonly string[];
    tags: readonly string[];
}
export declare function messageSourceHash(id: string, descriptor: MessageDescriptor): string;
export declare function sourceCatalogHash(source: SourceCatalog): string;
export declare function messageSignature(message: string): MessageSignature;
/** Validate syntax, source freshness, placeholders, tags, and catalog coverage. */
export declare function validateTranslationCatalog(source: SourceCatalog, translation: TranslationCatalog): CatalogIssue[];
export declare function pseudoLocalize(message: string, locale?: 'en-XA' | 'ar-XB'): string;
export declare function createPseudoCatalog(source: SourceCatalog, locale?: 'en-XA' | 'ar-XB', generatedAt?: string): TranslationCatalog;
//# sourceMappingURL=tooling.d.ts.map