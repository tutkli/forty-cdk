/**
 * Why `[forFileUpload]` refused a selected file.
 *
 * - `'accept'` — the file failed the root's `accept` filter (file-extension or
 *   `type/*` MIME matching), from a drop or from a dialog selection made
 *   through the "All files" override.
 * - `'multiple'` — the file passed `accept` but arrived past the single-file
 *   cap imposed by `multiple="false"`.
 *
 * Treat the union as open: a future constraint adds a member, so a consumer
 * switching on it should keep a default branch.
 */
export type ForFileUploadRejectionReason = 'accept' | 'multiple';

/** A file `[forFileUpload]` refused, paired with the constraint that refused it. */
export interface ForFileUploadRejection {
  /** The refused file. */
  readonly file: File;
  /** Which constraint refused it. */
  readonly reason: ForFileUploadRejectionReason;
}
