import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import {
  ForDialog,
  ForDialogClose,
  ForDialogDescription,
  ForDialogTitle,
  ForDialogTrigger,
} from 'forty-cdk/dialog';

@Component({
  selector: 'app-dialog-guarded-close-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForDialog, ForDialogTrigger, ForDialogTitle, ForDialogDescription, ForDialogClose],
  template: `
    <button
      forDialogTrigger
      class="guarded-btn guarded-btn--primary"
      [(open)]="open"
      controls="guarded-dialog"
    >
      Edit note
    </button>

    @if (open()) {
      <div
        forDialog
        id="guarded-dialog"
        class="guarded-dialog"
        (escapeKeyDown)="$event.preventDefault()"
        (interactOutside)="$event.preventDefault()"
        (dismiss)="open.set(false)"
        animate.enter="guarded-fade-in"
        animate.leave="guarded-fade-out"
      >
        <h2 forDialogTitle>Edit note</h2>
        <p forDialogDescription>Make a change, then try Escape or click outside.</p>
        <label class="guarded-field">
          <span class="guarded-label">Note</span>
          <input class="guarded-input" [value]="draft()" (input)="onDraftInput($event)" />
        </label>
        <div class="guarded-warn" role="status">
          Dismiss is vetoed — use Discard or Save to close.
        </div>
        <div class="guarded-actions">
          <button class="guarded-btn" forDialogClose>Discard</button>
          <button class="guarded-btn guarded-btn--primary" type="button" (click)="open.set(false)">
            Save
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    app-dialog-guarded-close-example {
      display: contents;
    }

    .guarded-btn {
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

    .guarded-btn:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .guarded-btn--primary,
    .guarded-btn--primary:hover {
      background: var(--ex-accent, #0e7c6b);
      border-color: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .guarded-btn--primary:hover {
      background: var(--ex-accent-hover, #0a5a4d);
      border-color: var(--ex-accent-hover, #0a5a4d);
    }

    .guarded-dialog {
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

    .guarded-dialog h2 {
      margin: 0 0 0.5rem;
      font-size: 1.15rem;
    }

    .guarded-dialog > p {
      margin: 0 0 1.5rem;
      color: var(--ex-muted, #585d66);
    }

    .guarded-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1.25rem;
    }

    .guarded-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ex-text, #17191c);
    }

    .guarded-input {
      width: 100%;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.5rem 0.7rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
    }

    .guarded-warn {
      margin: 0 0 1.25rem;
      padding: 0.6rem 0.8rem;
      border-radius: var(--ex-radius-sm, 14px);
      border-left: 3px solid var(--ex-warning, #a5651a);
      background: color-mix(in srgb, var(--ex-warning, #a5651a) 14%, var(--ex-surface, #ffffff));
      font-size: 0.85rem;
      color: var(--ex-text, #17191c);
    }

    .guarded-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
    }

    @keyframes guarded-fade-in {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.92);
      }
    }

    @keyframes guarded-fade-out {
      to {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.96);
      }
    }

    .guarded-fade-in {
      animation: guarded-fade-in 0.24s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
    }

    .guarded-fade-out {
      animation: guarded-fade-out 0.15s ease both;
    }

    @media (prefers-reduced-motion: reduce) {
      .guarded-fade-in,
      .guarded-fade-out {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DialogGuardedCloseExample {
  protected readonly open = signal(false);
  protected readonly draft = signal('');

  protected onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }
}
