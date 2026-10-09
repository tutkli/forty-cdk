import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type TemplateRef,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import {
  ForDialog,
  ForDialogClose,
  type ForDialogCloseReason,
  ForDialogTrigger,
} from 'forty-cdk/dialog';
import { ForToastManager, type ForToastTemplateContext, ForToastViewport } from 'forty-cdk/toast';

/**
 * Fixture for the toast-over-modal coordination (#1083): a toast shown while a
 * modal `ForDialog` is open must stay interactive and clicking it must not
 * dismiss the dialog.
 *
 * The viewport is declared in this fixture's own template, the documented
 * setup, and moves itself to `document.body` after its first render.
 *
 * `ViewEncapsulation.None` lets the styles below reach the moved viewport and
 * the toast rendered inside it, both of which live outside this fixture's own
 * view once it moves.
 */
@Component({
  selector: 'app-toast-over-dialog-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForDialog, ForDialogTrigger, ForDialogClose, ForToastViewport],
  styles: [
    `
      for-toast-viewport {
        position: fixed;
        top: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 100;
      }
      for-toast-viewport [data-testid='toast-action'] {
        padding: 8px 16px;
        background: #222;
        color: #fff;
        border-radius: 6px;
      }
    `,
  ],
  template: `
    <button data-testid="trigger" forDialogTrigger [(open)]="open" controls="test-dialog">
      Open dialog
    </button>

    @if (open()) {
      <div
        forDialog
        id="test-dialog"
        data-testid="dialog"
        ariaLabel="Test dialog"
        (dismiss)="onClose($event)"
      >
        <button data-testid="show-toast" type="button" (click)="showToast()">Show toast</button>
        <button data-testid="close-btn" forDialogClose>Close</button>
      </div>
    }

    <for-toast-viewport data-testid="viewport" />

    <ng-template #toastTpl>
      <button data-testid="toast-action" type="button" (click)="onToastClick()">
        Toast button
      </button>
      <button data-testid="toast-secondary" type="button">Toast secondary</button>
    </ng-template>

    <output data-testid="last-close-reason">{{ lastCloseReason() ?? 'none' }}</output>
    <output data-testid="toast-clicks">{{ toastClicks() }}</output>
  `,
})
export class ToastOverDialogFixture {
  protected readonly manager = inject(ForToastManager);
  protected readonly open = signal(false);
  protected readonly lastCloseReason = signal<ForDialogCloseReason | null>(null);
  protected readonly toastClicks = signal(0);

  protected readonly toastTpl =
    viewChild.required<TemplateRef<ForToastTemplateContext>>('toastTpl');

  protected showToast(): void {
    this.manager.show({ id: 'confirm', template: this.toastTpl() });
  }

  protected onToastClick(): void {
    this.toastClicks.update((n) => n + 1);
  }

  protected onClose(reason: ForDialogCloseReason): void {
    this.lastCloseReason.set(reason);
    this.open.set(false);
  }
}
