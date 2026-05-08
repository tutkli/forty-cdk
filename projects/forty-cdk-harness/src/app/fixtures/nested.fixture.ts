import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDialog,
  ForDialogClose,
  type ForDialogCloseReason,
  ForDialogTrigger,
  ForPopover,
  ForPopoverContent,
  ForPopoverTrigger,
} from 'forty-cdk';

/**
 * Fixture for the "Escape closes the topmost layer only" criterion in
 * issue #90 — a popover mounted inside an open dialog. Two Escapes should
 * be required to fully dismiss: the first closes the popover, the second
 * closes the dialog.
 */
@Component({
  selector: 'app-nested-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDialog,
    ForDialogTrigger,
    ForDialogClose,
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
  ],
  template: `
    <button data-testid="dialog-trigger" forDialogTrigger [(open)]="dialogOpen">
      Open dialog
    </button>

    @if (dialogOpen()) {
      <div forDialog data-testid="dialog" ariaLabel="Outer dialog" (close)="dialogOpen.set(false)">
        <div forPopover [(open)]="popoverOpen" ariaLabel="Inner popover">
          <button data-testid="popover-trigger" forPopoverTrigger>Open popover</button>
          @if (popoverOpen()) {
            <div forPopoverContent data-testid="popover">
              <button data-testid="popover-content-button">Inside popover</button>
            </div>
          }
        </div>
        <button data-testid="dialog-close" forDialogClose>Close dialog</button>
      </div>
    }
  `,
})
export class NestedFixture {
  protected readonly dialogOpen = signal(false);
  protected readonly popoverOpen = signal(false);

  protected onDialogClose(_reason: ForDialogCloseReason): void {
    this.dialogOpen.set(false);
  }
}
