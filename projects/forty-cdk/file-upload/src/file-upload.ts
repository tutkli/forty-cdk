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
 * Files chosen through either entry point — the native dialog or a drag&drop —
 * are filtered against `accept` (file-extension and `type/*` MIME matching)
 * before `filesChange`. The native `accept` attribute only constrains the
 * dialog's default filter, so a drop, or a dialog selection made through the
 * "All files" override, could otherwise leak a rejected file into `filesChange`
 * and into the input's `files` (native form submission). Files that fail the
 * filter are emitted on `filesRejected` instead.
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
  /**
   * Emitted with the files that were rejected by `accept`, from either the
   * drag&drop path or a dialog selection made through the "All files" override.
   * Fires only when at least one selected file failed the filter.
   */
  readonly filesRejected = output<File[]>();

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

  /**
   * Filters `files` against `accept`, caps the result to a single file when not
   * `multiple`, syncs the registered input's `files` for native form submission,
   * then emits `filesChange` with the accepted set and `filesRejected` with the
   * rest. Shared by the drag&drop and dialog paths so `accept` is enforced
   * identically through both entry points and they cannot diverge.
   */
  acceptFiles(files: FileList): void {
    const all = Array.from(files);
    if (all.length === 0) return;

    const accepted: File[] = [];
    const rejected: File[] = [];
    for (const file of all) {
      (this.#acceptsFile(file) ? accepted : rejected).push(file);
    }
    const limited = this.multiple() ? accepted : accepted.slice(0, 1);

    if (limited.length > 0) {
      const keptAll = limited.length === all.length;
      const list = keptAll ? files : this.#toFileList(limited);
      if (this.#input && this.#input.files !== list) this.#input.files = list;
      this.filesChange.emit(list);
    }
    if (rejected.length > 0) this.filesRejected.emit(rejected);
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
    this.acceptFiles(dropped);
  }

  #acceptsFile(file: File): boolean {
    const accept = this.accept();
    if (!accept) return true;
    const tokens = accept
      .split(',')
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean);
    if (tokens.length === 0) return true;
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return tokens.some((token) => {
      if (token.startsWith('.')) return name.endsWith(token);
      if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
      return type === token;
    });
  }

  #toFileList(files: readonly File[]): FileList {
    const dataTransfer = new DataTransfer();
    for (const file of files) dataTransfer.items.add(file);
    return dataTransfer.files;
  }
}
