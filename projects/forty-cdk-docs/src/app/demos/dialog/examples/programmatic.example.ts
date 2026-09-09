import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { ForDialogManager } from 'forty-cdk/dialog';

import { type ConfirmData, ConfirmDialog, type ConfirmResult } from './confirm-dialog';

@Component({
  selector: 'app-dialog-programmatic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <button class="programmatic-trigger" type="button" (click)="askToDelete()">
      Delete account…
    </button>
  `,
  styles: `
    app-dialog-programmatic-example {
      display: contents;
    }

    .programmatic-trigger {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-danger);
      background: var(--pg-danger);
      color: var(--pg-danger-contrast);
      cursor: pointer;
    }
  `,
})
export class DialogProgrammaticExample {
  protected readonly dialogs = inject(ForDialogManager);

  protected async askToDelete(): Promise<void> {
    const ref = this.dialogs.open<ConfirmDialog, ConfirmResult, ConfirmData>(ConfirmDialog, {
      data: {
        title: 'Delete account?',
        message: 'This action is permanent and cannot be undone.',
      },
      alert: true,
      dismissible: false,
      class: 'programmatic-dialog programmatic-dialog--pop',
      animateLeave: 'programmatic-out',
      backdropAnimateLeave: 'programmatic-backdrop-out',
    });
    await ref.closed;
  }
}
