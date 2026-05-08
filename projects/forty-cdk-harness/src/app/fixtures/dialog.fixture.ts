import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDialog,
  ForDialogClose,
  type ForDialogCloseReason,
  ForDialogTrigger,
  type VetoableEvent,
} from 'forty-cdk';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-dialog-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDialog, ForDialogTrigger, ForDialogClose],
  template: `
    <input id="before" placeholder="before-trigger" />
    <button id="trigger" forDialogTrigger [(open)]="open">Open dialog</button>
    <input id="after" placeholder="after-trigger" />

    @if (open()) {
      <div
        forDialog
        id="dialog"
        ariaLabel="Test dialog"
        [autoFocusOnOpen]="vetoOpen ? veto : undefined"
        [autoFocusOnClose]="vetoClose ? veto : undefined"
        (close)="onClose($event)"
      >
        <button id="first">First</button>
        <button id="second">Second</button>
        <input id="text-input" />
        <button id="close-btn" forDialogClose>Close</button>
      </div>
    }

    <output id="last-close-reason">{{ lastCloseReason() ?? 'none' }}</output>
  `,
})
export class DialogFixture {
  protected readonly open = signal(false);
  protected readonly lastCloseReason = signal<ForDialogCloseReason | null>(null);

  protected readonly vetoOpen = queryFlag('vetoOpen');
  protected readonly vetoClose = queryFlag('vetoClose');

  protected readonly veto = (event: VetoableEvent): void => event.preventDefault();

  protected onClose(reason: ForDialogCloseReason): void {
    this.lastCloseReason.set(reason);
    this.open.set(false);
  }
}
