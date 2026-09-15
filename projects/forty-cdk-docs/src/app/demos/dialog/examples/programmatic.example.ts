import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import {
  ForDialogBackdrop,
  ForDialogClose,
  ForDialogDescription,
  ForDialogManager,
  ForDialogTitle,
  injectDialogData,
} from 'forty-cdk/dialog';

interface ConfirmData {
  readonly title: string;
  readonly message: string;
}

type ConfirmResult = 'confirm' | 'cancel';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForDialogBackdrop, ForDialogTitle, ForDialogDescription, ForDialogClose],
  template: `
    <div
      forDialogBackdrop
      class="programmatic-backdrop"
      animate.enter="programmatic-backdrop-in"
    ></div>
    <h2 forDialogTitle>{{ data?.title }}</h2>
    <p forDialogDescription>{{ data?.message }}</p>
    <div class="programmatic-actions">
      <button class="programmatic-btn" forDialogClose [closeWith]="cancel">Cancel</button>
      <button
        class="programmatic-btn programmatic-btn--danger"
        forDialogClose
        [closeWith]="confirm"
      >
        Delete
      </button>
    </div>
  `,
  styles: `
    .programmatic-dialog {
      position: fixed;
      z-index: 51;
      display: block;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(440px, calc(100vw - 2rem));
      padding: 1.5rem;
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-lg, 34px);
      corner-shape: squircle;
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
    }

    .programmatic-dialog h2 {
      margin: 0 0 0.5rem;
      font-size: 1.15rem;
    }

    .programmatic-dialog p {
      margin: 0 0 1.5rem;
      color: var(--ex-muted, #585d66);
    }

    .programmatic-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(10, 12, 16, 0.5);
      backdrop-filter: blur(2px);
    }

    .programmatic-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
    }

    .programmatic-btn {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .programmatic-btn:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .programmatic-btn--danger,
    .programmatic-btn--danger:hover {
      background: var(--ex-danger, #b3261e);
      border-color: var(--ex-danger, #b3261e);
      color: var(--ex-danger-contrast, #ffffff);
    }

    @keyframes programmatic-pop {
      from {
        opacity: 0;
        scale: 0.94;
      }
    }

    @keyframes programmatic-out {
      to {
        opacity: 0;
        scale: 0.96;
      }
    }

    @keyframes programmatic-backdrop-in {
      from {
        opacity: 0;
      }
    }

    @keyframes programmatic-backdrop-out {
      to {
        opacity: 0;
      }
    }

    .programmatic-dialog--pop {
      animation: programmatic-pop 0.22s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
    }

    .programmatic-out {
      animation: programmatic-out 0.15s ease both;
    }

    .programmatic-backdrop-in {
      animation: programmatic-backdrop-in 0.18s ease both;
    }

    .programmatic-backdrop-out {
      animation: programmatic-backdrop-out 0.15s ease both;
    }

    @media (prefers-reduced-motion: reduce) {
      .programmatic-dialog--pop,
      .programmatic-out,
      .programmatic-backdrop-in,
      .programmatic-backdrop-out {
        animation-duration: 0.01ms;
      }
    }
  `,
})
class ConfirmDialog {
  protected readonly data = injectDialogData<ConfirmData>();
  protected readonly cancel: ConfirmResult = 'cancel';
  protected readonly confirm: ConfirmResult = 'confirm';
}

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
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-danger, #b3261e);
      background: var(--ex-danger, #b3261e);
      color: var(--ex-danger-contrast, #ffffff);
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
