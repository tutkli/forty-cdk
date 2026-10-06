import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { createSingleSlot, FOR_FIELDSET_CONTEXT } from 'forty-cdk/core';

import { FOR_FILE_UPLOAD_CONTEXT, type ForFileUploadContext } from './file-upload-context';
import type { ForFileUploadRejection } from './file-upload-rejection';

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
 * filter are emitted on `filesRejected` instead, as are files larger than
 * `maxSize` and valid files that arrive past the single-file cap of
 * `multiple="false"` — every selected file lands in exactly one of the two
 * outputs.
 *
 * Reflects `data-dragging` while files are dragged over the zone and
 * `data-disabled` when the zone is disabled, either through its own
 * `disabled` or through a surrounding disabled `[forFieldset]`.
 */
@Directive({
  selector: '[forFileUpload]',
  exportAs: 'forFileUpload',
  host: {
    '[attr.data-dragging]': "dragging() ? '' : null",
    '[attr.data-disabled]': "effectiveDisabled() ? '' : null",
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
  /**
   * Largest accepted file size, in bytes; a file of exactly this size is
   * accepted. `null` (default) sets no limit.
   */
  readonly maxSize = input<number | null>(null, {
    transform: (v: unknown): number | null => (v == null ? null : numberAttribute(v)),
  });
  readonly #fieldset = inject(FOR_FIELDSET_CONTEXT, { optional: true });
  /**
   * Whether the file upload zone and all its pieces are disabled. Read
   * {@link effectiveDisabled} for the value that actually gates the zone.
   */
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * The zone's own {@link disabled} OR'd with a surrounding disabled
   * `[forFieldset]`. Gates the dialog, drag and drop, the trigger and the
   * native input, and drives `data-disabled`.
   */
  readonly effectiveDisabled = computed(
    () => this.disabled() || (this.#fieldset?.disabled() ?? false),
  );
  /** Emitted when files are chosen via the dialog or dropped onto the zone. */
  readonly filesChange = output<FileList>();
  /**
   * Emitted with the files that were not accepted, each paired with the
   * constraint that refused it: `'accept'` for a file that failed the `accept`
   * filter (from a drop or a dialog selection made through the "All files"
   * override), `'size'` for a file larger than `maxSize`, `'multiple'` for a
   * valid file that arrived past the single-file cap of `multiple="false"`.
   * Fires only when at least one file was refused.
   */
  readonly filesRejected = output<ForFileUploadRejection[]>();

  readonly #dragging = signal(false);
  protected readonly dragging = this.#dragging.asReadonly();
  #dragDepth = 0;
  readonly #input = createSingleSlot<HTMLInputElement>({
    primitive: 'file-upload',
    owner: '[forFileUpload]',
    claimant: '[forFileUploadInput]',
  });

  /**
   * Registers the native input so the root can open the dialog and sync
   * dropped files. Pair with {@link unregisterInput} through the core
   * `registerHandle` helper so an unmounted input is dropped.
   */
  registerInput(el: HTMLInputElement): void {
    this.#input.register(el);
  }

  /** Removes a previously registered native input (no-op unless it is registered). */
  unregisterInput(el: HTMLInputElement): void {
    this.#input.unregister(el);
  }

  /** Opens the native file chooser dialog if not disabled. */
  openFileDialog(): void {
    if (this.effectiveDisabled()) return;
    this.#input.value()?.click();
  }

  /**
   * Filters `files` against `accept`, `maxSize` and the single-file cap of
   * `multiple="false"`, in that order, syncs the registered input's `files`
   * for native form submission, then emits `filesChange` with the accepted set and
   * `filesRejected` with every refused file plus the reason it was refused.
   * Shared by the drag&drop and dialog paths so every constraint is enforced
   * identically through either entry point and they cannot diverge. Every
   * selected file lands in exactly one of the two outputs. When nothing is
   * accepted and `files` is the registered input's own `FileList` (the dialog
   * path), the input is cleared so a native form submission cannot ship a file
   * the primitive rejected.
   */
  acceptFiles(files: FileList): void {
    const all = Array.from(files);
    if (all.length === 0) return;

    const input = this.#input.value();
    const single = !this.multiple();
    const maxSize = this.maxSize();
    const accepted: File[] = [];
    const rejected: ForFileUploadRejection[] = [];
    for (const file of all) {
      if (!this.#acceptsFile(file)) rejected.push({ file, reason: 'accept' });
      else if (maxSize !== null && file.size > maxSize) rejected.push({ file, reason: 'size' });
      else if (single && accepted.length === 1) rejected.push({ file, reason: 'multiple' });
      else accepted.push(file);
    }

    if (accepted.length > 0) {
      const keptAll = accepted.length === all.length;
      const list = keptAll ? files : this.#toFileList(accepted);
      if (input && input.files !== list) input.files = list;
      this.filesChange.emit(list);
    } else if (input && input.files === files) {
      input.value = '';
    }
    if (rejected.length > 0) this.filesRejected.emit(rejected);
  }

  protected onDragEnter(event: DragEvent): void {
    if (this.effectiveDisabled()) return;
    event.preventDefault();
    this.#dragDepth++;
    this.#dragging.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (this.effectiveDisabled()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onDragLeave(): void {
    this.#dragDepth = Math.max(0, this.#dragDepth - 1);
    if (this.#dragDepth === 0) this.#dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    this.#dragDepth = 0;
    this.#dragging.set(false);
    if (this.effectiveDisabled()) return;
    event.preventDefault();
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
