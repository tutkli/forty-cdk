import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ForDialogBackdrop,
  ForDialogClose,
  ForDialogDescription,
  ForDialogTitle,
  injectDialogData,
} from 'forty-cdk';

export interface ConfirmData {
  readonly title: string;
  readonly message: string;
}

export type ConfirmResult = 'confirm' | 'cancel';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pg-dialog pg-dialog--pop' },
  imports: [ForDialogBackdrop, ForDialogTitle, ForDialogDescription, ForDialogClose],
  template: `
    <div forDialogBackdrop class="pg-backdrop"></div>
    <h2 forDialogTitle>{{ data.title }}</h2>
    <p forDialogDescription>{{ data.message }}</p>
    <div class="pg-dialog-actions">
      <button class="pg-btn" forDialogClose [closeWith]="cancel">Cancel</button>
      <button class="pg-btn pg-btn--danger" forDialogClose [closeWith]="confirm">Delete</button>
    </div>
  `,
})
export class ConfirmDialog {
  protected readonly data = injectDialogData<ConfirmData>();
  protected readonly cancel: ConfirmResult = 'cancel';
  protected readonly confirm: ConfirmResult = 'confirm';
}
