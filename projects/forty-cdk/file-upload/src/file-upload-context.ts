import { inject, InjectionToken, type Signal } from '@angular/core';

/**
 * Shared state contract between the pieces of a FileUpload primitive.
 * Provided by `ForFileUpload`, consumed by `ForFileUploadInput` and
 * `ForFileUploadTrigger`.
 */
export interface ForFileUploadContext {
  readonly accept: Signal<string | null>;
  readonly multiple: Signal<boolean>;
  readonly directory: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  /**
   * Registers the native `<input type="file">` so the root can open the dialog
   * and sync dropped files. Pair with {@link ForFileUploadContext.unregisterInput}
   * so an unmounted input is dropped instead of leaving the root holding a
   * detached element.
   */
  registerInput(el: HTMLInputElement): void;
  /** Removes a previously registered native `<input type="file">` (no-op unless it is registered). */
  unregisterInput(el: HTMLInputElement): void;
  /** Opens the native file chooser dialog by programmatically clicking the registered input. */
  openFileDialog(): void;
  /**
   * Filters the given `FileList` against `accept` and against the single-file
   * cap of `multiple="false"`, syncs the registered input's `files` for native
   * form submission, then emits `filesChange` (accepted) and `filesRejected`
   * (every refused file plus the constraint that refused it). Shared by the
   * drag&drop and dialog paths.
   */
  acceptFiles(files: FileList): void;
}

export const FOR_FILE_UPLOAD_CONTEXT = new InjectionToken<ForFileUploadContext>(
  'FOR_FILE_UPLOAD_CONTEXT',
);

/**
 * Injects the file-upload context or throws a prefixed, actionable error
 * naming the piece that was used outside `[forFileUpload]`.
 */
export function injectFileUploadContext(piece: string): ForFileUploadContext {
  const ctx = inject(FOR_FILE_UPLOAD_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/file-upload] ${piece} must be used inside a [forFileUpload] element.`,
    );
  }
  return ctx;
}
