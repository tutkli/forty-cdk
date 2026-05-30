import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDialog,
  ForDialogBackdrop,
  ForDialogClose,
  type ForDialogCloseReason,
  ForDialogDescription,
  ForDialogTitle,
  ForDialogTrigger,
} from 'forty-cdk';

import { DemoLayout } from '../ui/demo-layout';

@Component({
  selector: 'app-dialog-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDialog,
    ForDialogTrigger,
    ForDialogTitle,
    ForDialogDescription,
    ForDialogClose,
    ForDialogBackdrop,
  ],
  template: `
    <playground-demo
      title="Dialog"
      summary="Modal dialog with focus trap, scroll lock, Escape-to-close and portal rendering. The content moves to <body>, so its styles live in styles.css (global), not in this component."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    >
      <div demo class="dlg-demo">
        <button forDialogTrigger class="pg-btn pg-btn--primary" [(open)]="open">
          Open dialog
        </button>
        <p class="hint">Mount == open: the dialog only exists in the DOM while open() is true.</p>
      </div>

      <div controls class="pg-controls">
        <label class="pg-check">
          <input type="checkbox" [checked]="modal()" (change)="modal.set(isChecked($event))" />
          modal
        </label>
        <label class="pg-check">
          <input
            type="checkbox"
            [checked]="dismissible()"
            (change)="dismissible.set(isChecked($event))"
          />
          dismissible
        </label>
        <label class="pg-check">
          <input type="checkbox" [checked]="alert()" (change)="alert.set(isChecked($event))" />
          alert
        </label>

        <p class="pg-state">last close: <b>{{ lastReason() ?? '—' }}</b></p>
      </div>
    </playground-demo>

    @if (open()) {
      <div
        forDialog
        class="pg-dialog"
        [modal]="modal()"
        [dismissible]="dismissible()"
        [alert]="alert()"
        (close)="onClose($event)"
        animate.enter="pg-fade-in"
        animate.leave="pg-fade-out"
      >
        <div
          forDialogBackdrop
          class="pg-backdrop"
          animate.enter="pg-backdrop-in"
          animate.leave="pg-backdrop-out"
        ></div>
        <h2 forDialogTitle>Delete account?</h2>
        <p forDialogDescription>This action is permanent and cannot be undone.</p>
        <div class="pg-dialog-actions">
          <button class="pg-btn" forDialogClose>Cancel</button>
          <button class="pg-btn pg-btn--primary" (click)="confirm()">Delete</button>
        </div>
      </div>
    }
  `,
  styles: `
    .dlg-demo {
      text-align: center;
    }

    .hint {
      margin: 0.9rem 0 0;
      font-size: 0.82rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class DialogDemo {
  protected readonly open = signal(false);
  protected readonly modal = signal(true);
  protected readonly dismissible = signal(true);
  protected readonly alert = signal(false);
  protected readonly lastReason = signal<ForDialogCloseReason | null>(null);

  protected isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected onClose(reason: ForDialogCloseReason): void {
    this.lastReason.set(reason);
    this.open.set(false);
  }

  protected confirm(): void {
    this.lastReason.set('programmatic');
    this.open.set(false);
  }
}
