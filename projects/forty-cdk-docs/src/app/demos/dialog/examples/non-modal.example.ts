import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { type VetoableEvent } from 'forty-cdk/core';
import { ForDialog, ForDialogClose } from 'forty-cdk/dialog';

@Component({
  selector: 'app-dialog-non-modal-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForDialog, ForDialogClose],
  template: `
    <div class="non-modal-search">
      <input
        #search
        type="search"
        class="non-modal-input"
        placeholder="Search fruit…"
        aria-label="Search fruit"
        [value]="query()"
        (input)="onQuery($event)"
      />
      <p class="non-modal-hint">Type to open the results — focus never leaves this field.</p>
    </div>

    @if (open()) {
      <div
        forDialog
        class="non-modal-dialog"
        [modal]="false"
        [dismissible]="false"
        ariaLabel="Search results"
        [autoFocusOnOpen]="keepSearchFocused"
        [autoFocusOnClose]="refocusSearch"
        (dismiss)="open.set(false)"
        animate.enter="non-modal-panel-in"
      >
        <div class="non-modal-results">
          @for (item of results(); track item) {
            <div class="non-modal-row">{{ item }}</div>
          } @empty {
            <p class="non-modal-hint">No matches for "{{ query() }}".</p>
          }
        </div>
        <div class="non-modal-actions">
          <button class="non-modal-btn" forDialogClose>Close</button>
        </div>
      </div>
    }
  `,
  styles: `
    app-dialog-non-modal-example {
      display: contents;
    }

    .non-modal-search {
      width: min(360px, 100%);
    }

    .non-modal-input {
      width: 100%;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.5rem 0.7rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
    }

    .non-modal-hint {
      margin: 0.7rem 0 0;
      font-size: 0.8rem;
      color: var(--ex-muted, #585d66);
    }

    .non-modal-dialog {
      position: fixed;
      z-index: 51;
      display: block;
      top: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
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

    .non-modal-results {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-bottom: 1.25rem;
      max-height: 240px;
      overflow-y: auto;
    }

    .non-modal-row {
      flex: none;
      padding: 0.7rem 0.9rem;
      border-radius: var(--ex-radius-sm, 14px);
      background: var(--ex-surface-2, #f2eee6);
      font-size: 0.9rem;
    }

    .non-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
    }

    .non-modal-btn {
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

    .non-modal-btn:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    @keyframes non-modal-panel-in {
      from {
        opacity: 0;
        scale: 0.96;
      }
    }

    .non-modal-panel-in {
      animation: non-modal-panel-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
    }

    @media (prefers-reduced-motion: reduce) {
      .non-modal-panel-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DialogNonModalExample {
  protected readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  protected readonly open = signal(false);
  protected readonly query = signal('');
  readonly #fruits: readonly string[] = [
    'Apple',
    'Apricot',
    'Banana',
    'Blackberry',
    'Blueberry',
    'Cherry',
    'Grape',
    'Mango',
    'Orange',
    'Peach',
    'Pear',
    'Pineapple',
  ];
  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q === '' ? this.#fruits : this.#fruits.filter((f) => f.toLowerCase().includes(q));
  });

  protected onQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.open.set(value.trim().length > 0);
  }

  protected readonly keepSearchFocused = (event: VetoableEvent): void => {
    event.preventDefault();
    this.search()?.nativeElement.focus();
  };

  protected readonly refocusSearch = (): void => {
    this.search()?.nativeElement.focus();
  };
}
