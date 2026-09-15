import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  ForCombobox,
  ForComboboxAction,
  ForComboboxContent,
  ForComboboxEmpty,
  ForComboboxIndicator,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';

const SEED_TAGS = ['design', 'engineering', 'marketing', 'product', 'sales'] as const;

@Component({
  selector: 'app-combobox-create-action-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    ForComboboxIndicator,
    ForComboboxEmpty,
    ForComboboxAction,
  ],
  template: `
    <div
      forCombobox
      class="ca-combobox"
      [(query)]="query"
      [(value)]="value"
      [(open)]="open"
      ariaLabel="Tag search"
    >
      <input forComboboxInput class="ca-combobox-input" placeholder="Search or create a tag…" />

      @if (open()) {
        <div forComboboxContent class="ca-combobox-content" animate.enter="ca-combobox-pop-in">
          @if (canCreate()) {
            <button forComboboxAction class="ca-combobox-action" (activate)="createTag()">
              <span aria-hidden="true">＋</span> Create "{{ query().trim() }}"
            </button>
          }

          @for (tag of filtered(); track tag) {
            <div forComboboxOption [value]="tag" [label]="tag" class="ca-combobox-option">
              <span forComboboxIndicator class="ca-combobox-indicator">✓</span>
              {{ tag }}
            </div>
          }

          <div forComboboxEmpty class="ca-combobox-empty">Type a name, then "Create".</div>
        </div>
      }
    </div>

    <p class="ca-hint">
      Selected: <strong>{{ value().at(0) ?? '—' }}</strong
      >. Type a name that isn't in the list and the <em>Create</em> action appears at the top —
      <kbd>Tab</kbd> reaches it without walking the options, and activating it never touches
      <code>value()</code> until your handler decides to.
    </p>
  `,
  styles: `
    app-combobox-create-action-example {
      display: contents;
    }

    .ca-combobox {
      display: block;
      width: min(300px, 100%);
    }

    .ca-combobox-input {
      font: inherit;
      font-size: 0.9rem;
      width: 100%;
      padding: 0.55rem 0.7rem;
      color: var(--ex-text, #17191c);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius-sm, 14px);
      background: var(--ex-surface, #ffffff);
    }

    .ca-combobox-input:focus-visible {
      outline: none;
      border-color: var(--ex-accent, #0e7c6b);
      box-shadow: 0 0 0 1px var(--ex-accent, #0e7c6b);
    }

    .ca-combobox-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: var(--for-floating-anchor-width);
      min-width: 12rem;
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
    }

    .ca-combobox-action {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font: inherit;
      font-size: 0.875rem;
      text-align: start;
      padding: 0.45rem 0.6rem;
      border: 0;
      border-radius: var(--ex-radius-sm, 14px);
      background: transparent;
      color: var(--ex-accent, #0e7c6b);
      cursor: pointer;
    }

    .ca-combobox-action[data-highlighted],
    .ca-combobox-action:hover {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 12%, transparent);
    }

    .ca-combobox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      padding: 0.45rem 0.6rem;
      border-radius: var(--ex-radius-sm, 14px);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .ca-combobox-option[data-highlighted],
    .ca-combobox-option:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .ca-combobox-option[data-state='checked'] {
      color: var(--ex-accent, #0e7c6b);
      font-weight: 600;
    }

    .ca-combobox-indicator {
      flex: none;
      display: inline-flex;
      width: 1.1em;
      color: var(--ex-accent, #0e7c6b);
    }

    .ca-combobox-empty {
      padding: 0.6rem;
      font-size: 0.85rem;
      color: var(--ex-muted, #585d66);
      text-align: center;
    }

    .ca-hint {
      margin-top: 0.75rem;
      font-size: 0.8rem;
      color: var(--ex-muted, #585d66);
      max-width: 34rem;
    }

    .ca-combobox-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: ca-combobox-pop-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
    }

    @keyframes ca-combobox-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ca-combobox-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ComboboxCreateActionExample {
  protected readonly query = signal('');
  protected readonly value = signal<readonly string[]>([]);
  protected readonly open = signal(false);
  protected readonly tags = signal<readonly string[]>([...SEED_TAGS]);

  protected readonly filtered = computed<readonly string[]>(() => {
    const q = this.query().toLowerCase().trim();
    const all = this.tags();
    return q === '' ? all : all.filter((t) => t.toLowerCase().includes(q));
  });

  /** The typed name is non-empty and not already an existing tag (case-insensitive). */
  protected readonly canCreate = computed(() => {
    const name = this.query().trim().toLowerCase();
    return name !== '' && !this.tags().some((t) => t.toLowerCase() === name);
  });

  protected createTag(): void {
    const name = this.query().trim();
    if (name === '') {
      return;
    }
    this.tags.update((list) => [...list, name]);
    this.value.set([name]);
    this.open.set(false);
  }
}
