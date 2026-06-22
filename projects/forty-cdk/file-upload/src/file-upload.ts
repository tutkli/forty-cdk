import { booleanAttribute, Directive, input, output, signal } from '@angular/core';

import { FOR_FILE_UPLOAD_CONTEXT, type ForFileUploadContext } from './file-upload-context';

/**
 * Root drop zone for the FileUpload primitive. Composes with
 * `[forFileUploadInput]` (the accessible native file input) and
 * `[forFileUploadTrigger]` (the button that opens the dialog).
 *
 * `filesChange` is a plain `output<FileList>()` — this primitive is not a
 * Signal Forms control; the native `<input type="file">` is the form participant.
 *
 * Reflects `data-dragging` while files are dragged over the zone and
 * `data-disabled` when the input is disabled.
 */
@Directive({
  selector: '[forFileUpload]',
  exportAs: 'forFileUpload',
  host: {
    '[attr.data-dragging]': "dragging() ? '' : null",
    '[attr.data-disabled]': "disabled() ? '' : null",
    '(dragenter)': 'onDragEnter($event)',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave()',
    '(drop)': 'onDrop($event)',
  },
  providers: [{ provide: FOR_FILE_UPLOAD_CONTEXT, useExisting: ForFileUpload }],
})
export class ForFileUpload implements ForFileUploadContext {
  /** MIME types or file extensions accepted by the file chooser (e.g. `"image/*,.pdf"`). */
  readonly accept = input<string | null>(null);
  /** Whether multiple files can be selected at once. */
  readonly multiple = input(false, { transform: booleanAttribute });
  /**
   * When `true`, the native picker selects a whole folder; the emitted
   * `FileList` then contains every file inside it (each carrying a
   * `webkitRelativePath` so the consumer can reconstruct the tree).
   */
  readonly directory = input(false, { transform: booleanAttribute });
  /** Whether the file upload zone and all its pieces are disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Emitted when files are chosen via the dialog or dropped onto the zone. */
  readonly filesChange = output<FileList>();

  readonly #dragging = signal(false);
  protected readonly dragging = this.#dragging.asReadonly();
  #dragDepth = 0;
  #input: HTMLInputElement | null = null;

  /** Registers the native input so the root can open the dialog and sync dropped files. */
  registerInput(el: HTMLInputElement): void {
    this.#input = el;
  }

  /** Opens the native file chooser dialog if not disabled. */
  openFileDialog(): void {
    if (this.disabled()) return;
    this.#input?.click();
  }

  /** Emits `filesChange` with the provided `FileList` if it contains at least one file. */
  emitFiles(files: FileList): void {
    if (files.length > 0) this.filesChange.emit(files);
  }

  protected onDragEnter(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.#dragDepth++;
    this.#dragging.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onDragLeave(): void {
    if (this.disabled()) return;
    this.#dragDepth = Math.max(0, this.#dragDepth - 1);
    if (this.#dragDepth === 0) this.#dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.#dragDepth = 0;
    this.#dragging.set(false);
    const dropped = event.dataTransfer?.files;
    if (!dropped || dropped.length === 0) return;
    const files = this.#resolveFiles(dropped);
    if (this.#input) this.#input.files = files;
    this.emitFiles(files);
  }

  #resolveFiles(files: FileList): FileList {
    if (this.multiple() || files.length <= 1) return files;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(files[0]!);
    return dataTransfer.files;
  }
}
