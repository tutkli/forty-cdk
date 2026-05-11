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
    <input data-testid="before" placeholder="before-trigger" />
    <button data-testid="trigger" forDialogTrigger [(open)]="open">Open dialog</button>
    <input data-testid="after" placeholder="after-trigger" />

    @if (open()) {
      <div
        forDialog
        data-testid="dialog"
        ariaLabel="Test dialog"
        [autoFocusOnOpen]="vetoOpen ? veto : undefined"
        [autoFocusOnClose]="vetoClose ? veto : undefined"
        (close)="onClose($event)"
      >
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <input data-testid="text-input" />
        <button data-testid="close-btn" forDialogClose>Close</button>
      </div>
    }

    <output data-testid="last-close-reason">{{ lastCloseReason() ?? 'none' }}</output>
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
