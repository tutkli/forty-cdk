import { Directive, ElementRef, inject } from '@angular/core';
import { registerHandle } from 'forty-cdk/core';

import { injectFileUploadContext } from './file-upload-context';

/**
 * The native `<input type="file">` piece of the FileUpload primitive.
 * Apply on a real `<input>` element inside `[forFileUpload]`.
 *
 * The directive forces `type="file"` and mirrors `accept`, `multiple`,
 * `directory` (as `webkitdirectory`), and `disabled` from the root context.
 * When the user selects files via the native dialog the `change` event routes
 * them through the root's shared `accept` and `maxSize` filters — so a
 * selection made through the dialog's "All files" override, or an oversized
 * one, is rejected consistently with a drop —
 * emitting `filesChange` (accepted) / `filesRejected` (rejected) on the root.
 *
 * Consumers are expected to visually hide this input with their own CSS
 * (e.g. an `sr-only` / `visually-hidden` utility). Next to a
 * `[forFileUploadTrigger]`, also give it `tabindex="-1"` and
 * `aria-hidden="true"` so the button is the single control; without a
 * trigger, keep it focusable and labelled. The directive never sets
 * `hidden`, `display:none`, `visibility:hidden` or `tabindex` — it remains
 * strictly headless.
 */
@Directive({
  selector: 'input[forFileUploadInput]',
  exportAs: 'forFileUploadInput',
  host: {
    type: 'file',
    '[attr.accept]': 'ctx.accept()',
    '[attr.multiple]': "ctx.multiple() ? '' : null",
    '[attr.webkitdirectory]': "ctx.directory() ? '' : null",
    '[disabled]': 'ctx.effectiveDisabled()',
    '(change)': 'onChange()',
  },
})
export class ForFileUploadInput {
  readonly #el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly ctx = injectFileUploadContext('[forFileUploadInput]');

  constructor() {
    registerHandle(
      this.#el,
      (el) => this.ctx.registerInput(el),
      (el) => this.ctx.unregisterInput(el),
    );
  }

  private onChange(): void {
    const files = this.#el.files;
    if (files && files.length > 0) this.ctx.acceptFiles(files);
  }
}
