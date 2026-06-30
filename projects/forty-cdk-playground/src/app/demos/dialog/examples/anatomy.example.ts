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
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .anatomy-btn:hover {
      background: var(--pg-surface-2);
    }

    .anatomy-btn--primary,
    .anatomy-btn--primary:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .anatomy-btn--primary:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .anatomy-btn--danger,
    .anatomy-btn--danger:hover {
      background: var(--pg-danger);
      border-color: var(--pg-danger);
      color: var(--pg-danger-contrast);
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
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-lg);
      box-shadow: var(--pg-shadow);
    }

    .anatomy-dialog h2 {
      margin: 0 0 0.5rem;
      font-size: 1.15rem;
    }

    .anatomy-dialog p {
      margin: 0 0 1.5rem;
      color: var(--pg-text-muted);
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
      animation: anatomy-fade-in 0.24s var(--pg-ease-spring) both;
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
