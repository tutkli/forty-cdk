import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import {
  ForDialog,
  ForDialogBackdrop,
  ForDialogClose,
  ForDialogDescription,
  ForDialogTitle,
  ForDialogTrigger,
} from 'forty-cdk/dialog';

@Component({
  selector: 'app-dialog-anatomy-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForDialog,
    ForDialogTrigger,
    ForDialogTitle,
    ForDialogDescription,
    ForDialogClose,
    ForDialogBackdrop,
  ],
  template: `
    <button
      forDialogTrigger
      class="anatomy-btn anatomy-btn--primary"
      [(open)]="open"
      controls="anatomy-dialog"
    >
      Open dialog
    </button>

    @if (open()) {
      <div
        forDialog
        id="anatomy-dialog"
        class="anatomy-dialog"
        (dismiss)="open.set(false)"
        animate.enter="anatomy-fade-in"
        animate.leave="anatomy-fade-out"
      >
        <div
          forDialogBackdrop
          class="anatomy-backdrop"
          animate.enter="anatomy-backdrop-in"
          animate.leave="anatomy-backdrop-out"
        ></div>
        <h2 forDialogTitle>Delete account?</h2>
        <p forDialogDescription>This action is permanent and cannot be undone.</p>
        <div class="anatomy-actions">
          <button class="anatomy-btn" forDialogClose>Cancel</button>
          <button class="anatomy-btn anatomy-btn--danger" type="button" (click)="open.set(false)">
            Delete
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    app-dialog-anatomy-example {
      display: contents;
    }

    .anatomy-btn {
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

    .anatomy-btn:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .anatomy-btn--primary,
    .anatomy-btn--primary:hover {
      background: var(--ex-accent, #0e7c6b);
      border-color: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .anatomy-btn--primary:hover {
      background: var(--ex-accent-hover, #0a5a4d);
      border-color: var(--ex-accent-hover, #0a5a4d);
    }

    .anatomy-btn--danger,
    .anatomy-btn--danger:hover {
      background: var(--ex-danger, #b3261e);
      border-color: var(--ex-danger, #b3261e);
      color: var(--ex-danger-contrast, #ffffff);
    }

    .anatomy-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(10, 12, 16, 0.5);
      backdrop-filter: blur(2px);
    }

    .anatomy-dialog {
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

    .anatomy-dialog h2 {
      margin: 0 0 0.5rem;
      font-size: 1.15rem;
    }

    .anatomy-dialog p {
      margin: 0 0 1.5rem;
      color: var(--ex-muted, #585d66);
    }

    .anatomy-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
    }

    @keyframes anatomy-fade-in {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.92);
      }
    }

    @keyframes anatomy-fade-out {
      to {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.96);
      }
    }

    @keyframes anatomy-backdrop-in {
      from {
        opacity: 0;
      }
    }

    @keyframes anatomy-backdrop-out {
      to {
        opacity: 0;
      }
    }

    .anatomy-fade-in {
      animation: anatomy-fade-in 0.24s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
    }

    .anatomy-fade-out {
      animation: anatomy-fade-out 0.15s ease both;
    }

    .anatomy-backdrop-in {
      animation: anatomy-backdrop-in 0.18s ease both;
    }

    .anatomy-backdrop-out {
      animation: anatomy-backdrop-out 0.15s ease both;
    }

    @media (prefers-reduced-motion: reduce) {
      .anatomy-fade-in,
      .anatomy-fade-out,
      .anatomy-backdrop-in,
      .anatomy-backdrop-out {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DialogAnatomyExample {
  protected readonly open = signal(false);
}
