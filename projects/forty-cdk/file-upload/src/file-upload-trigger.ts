import { Directive } from '@angular/core';

import { hostButtonType, reflectDisabled } from 'forty-cdk/core';
import { injectFileUploadContext } from './file-upload-context';

/**
 * Trigger button that opens the native file chooser dialog.
 * Apply on a native `<button>` inside `[forFileUpload]`.
 *
 * `type="button"` is forced to prevent accidental form submission.
 * The native `disabled` attribute is reflected imperatively so the button
 * is visually and functionally disabled when the root zone is disabled.
 */
@Directive({
  selector: '[forFileUploadTrigger]',
  exportAs: 'forFileUploadTrigger',
  host: {
    '[attr.type]': 'buttonType()',
    '(click)': 'onClick()',
  },
})
export class ForFileUploadTrigger {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectFileUploadContext('[forFileUploadTrigger]');

  constructor() {
    reflectDisabled(this.ctx.disabled);
  }

  protected onClick(): void {
    this.ctx.openFileDialog();
  }
}
