export declare function escapeHtml(value: string): string;

/**
 * The text a fragment of rendered HTML reads as — what a label, an accessible
 * name or a comparison against prose needs.
 *
 * Tags are removed rather than parsed, so a literal `<b>` written as prose is
 * removed along with the markup that surrounds it.
 */
export declare function stripText(html: string): string;
