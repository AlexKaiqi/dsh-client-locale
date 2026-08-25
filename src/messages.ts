/** A source message understood by FormatJS extraction and the DSH locale runtime. */
export interface MessageDescriptor {
  /** Stable semantic ID. Do not derive this from the displayed text. */
  id: string
  /** Authoritative message in the namespace source locale. */
  defaultMessage: string
  /** Short product context for translators and translation models. */
  description?: string
  /** Optional extraction location, populated by the DSH i18n CLI. */
  file?: string
  start?: { line: number; column: number; offset?: number }
  end?: { line: number; column: number; offset?: number }
}

export type MessageDescriptors = Record<string, MessageDescriptor>

/**
 * Marks source messages for static extraction while preserving their exact types.
 *
 * Keep the descriptor ID equal to its object key. The runtime enforces this so a
 * rename cannot silently disconnect generated catalogs from their source.
 */
export function defineMessages<const T extends MessageDescriptors>(messages: T): T {
  return messages
}

export interface SourceCatalog {
  schemaVersion: 1
  namespace: string
  sourceLocale: string
  messages: MessageDescriptors
}

export type TranslationReviewState = 'machine' | 'mixed' | 'reviewed'

/** Generated translation artifact consumed by language packs and the runtime. */
export interface TranslationCatalog {
  schemaVersion: 1
  namespace: string
  sourceLocale: string
  locale: string
  sourceHash: string
  sourceHashes: Record<string, string>
  messages: Record<string, string>
  /** Keys maintained by a person; automated updates must preserve their values. */
  locked?: readonly string[]
  provider?: string
  reviewState: TranslationReviewState
  generatedAt: string
}

export interface MessageRegistration {
  sourceLocale: string
  messages: MessageDescriptors
  translations?: readonly TranslationCatalog[]
}
