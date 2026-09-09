import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  ForDialogBackdrop,
  ForDialogClose,
  ForDialogDescription,
  ForDialogTitle,
  injectDialogData,
} from 'forty-cdk/dialog';

export interface ConfirmData {
  readonly title: string;
  readonly message: string;
}

export type ConfirmResult = 'confirm' | 'cancel';

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
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-lg);
      box-shadow: var(--pg-shadow);
    }

    .programmatic-dialog h2 {
      margin: 0 0 0.5rem;
      font-size: 1.15rem;
    }

    .programmatic-dialog p {
      margin: 0 0 1.5rem;
      color: var(--pg-text-muted);
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
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .programmatic-btn:hover {
      background: var(--pg-surface-2);
    }

    .programmatic-btn--danger,
    .programmatic-btn--danger:hover {
      background: var(--pg-danger);
      border-color: var(--pg-danger);
      color: var(--pg-danger-contrast);
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
      animation: programmatic-pop 0.22s var(--pg-ease-spring) both;
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
export class ConfirmDialog {
  protected readonly data = injectDialogData<ConfirmData>();
  protected readonly cancel: ConfirmResult = 'cancel';
  protected readonly confirm: ConfirmResult = 'confirm';
}
