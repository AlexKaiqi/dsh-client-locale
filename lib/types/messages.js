/**
 * Marks source messages for static extraction while preserving their exact types.
 *
 * Keep the descriptor ID equal to its object key. The runtime enforces this so a
 * rename cannot silently disconnect generated catalogs from their source.
 */
export function defineMessages(messages) {
    return messages;
}
//# sourceMappingURL=messages.js.map