import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FOR_DRAWER_CONTEXT,
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerTitle,
  injectDrawerData,
} from 'forty-cdk';

export interface ConfirmData {
  readonly title: string;
  readonly message: string;
}

export type ConfirmResult = 'confirm' | 'cancel';

@Component({
  selector: 'app-confirm-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <div
      forDrawerBackdrop
      class="pg-drawer-backdrop"
      animate.enter="pg-backdrop-in"
      animate.leave="pg-backdrop-out"
    ></div>
    <div forDrawerHandle class="pg-drawer-handle"></div>
    <h2 forDrawerTitle class="pg-drawer-title">{{ data.title }}</h2>
    <p forDrawerDescription class="pg-drawer-desc">{{ data.message }}</p>
    <div class="pg-drawer-actions">
      <button class="pg-btn" forDrawerClose [closeWith]="cancel">Cancel</button>
      <button class="pg-btn pg-btn--danger" forDrawerClose [closeWith]="confirm">Delete</button>
    </div>
  `,
})
export class ConfirmDrawer {
  protected readonly data = injectDrawerData<ConfirmData>();
  protected readonly cancel: ConfirmResult = 'cancel';
  protected readonly confirm: ConfirmResult = 'confirm';

  constructor() {
    inject(FOR_DRAWER_CONTEXT).hostElement.classList.add('pg-drawer');
  }
}
