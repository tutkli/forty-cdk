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
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .guarded-btn:hover {
      background: var(--pg-surface-2);
    }

    .guarded-btn--primary,
    .guarded-btn--primary:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .guarded-btn--primary:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
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
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-lg);
      box-shadow: var(--pg-shadow);
    }

    .guarded-dialog h2 {
      margin: 0 0 0.5rem;
      font-size: 1.15rem;
    }

    .guarded-dialog > p {
      margin: 0 0 1.5rem;
      color: var(--pg-text-muted);
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
      color: var(--pg-text);
    }

    .guarded-input {
      width: 100%;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.5rem 0.7rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
    }

    .guarded-warn {
      margin: 0 0 1.25rem;
      padding: 0.6rem 0.8rem;
      border-radius: var(--pg-radius-sm);
      border-left: 3px solid var(--pg-warning);
      background: color-mix(in srgb, var(--pg-warning) 14%, var(--pg-surface));
      font-size: 0.85rem;
      color: var(--pg-text);
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
      animation: guarded-fade-in 0.24s var(--pg-ease-spring) both;
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
