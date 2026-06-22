import { Directive, ElementRef, inject } from '@angular/core';

import { injectFileUploadContext } from './file-upload-context';

/**
 * The native `<input type="file">` piece of the FileUpload primitive.
 * Apply on a real `<input>` element inside `[forFileUpload]`.
 *
 * The directive forces `type="file"` and mirrors `accept`, `multiple`,
 * `directory` (as `webkitdirectory`), and `disabled` from the root context.
 * When the user selects files via the native dialog the `change` event emits
 * `filesChange` on the root.
 *
 * Consumers are expected to visually hide this input with their own CSS
 * (e.g. an `sr-only` / `visually-hidden` utility) while keeping it focusable
 * so keyboard users and assistive technology can activate it directly. The
 * directive never sets `hidden`, `display:none`, or `visibility:hidden` — it
 * remains strictly headless.
 */
@Directive({
  selector: 'input[forFileUploadInput]',
  exportAs: 'forFileUploadInput',
  host: {
    type: 'file',
    '[attr.accept]': 'ctx.accept()',
    '[attr.multiple]': "ctx.multiple() ? '' : null",
    '[attr.webkitdirectory]': "ctx.directory() ? '' : null",
    '[disabled]': 'ctx.disabled()',
    '(change)': 'onChange()',
  },
})
export class ForFileUploadInput {
  readonly #el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  protected readonly ctx = injectFileUploadContext('[forFileUploadInput]');

  constructor() {
    this.ctx.registerInput(this.#el);
  }

  protected onChange(): void {
    const files = this.#el.files;
    if (files && files.length > 0) this.ctx.emitFiles(files);
  }
}
