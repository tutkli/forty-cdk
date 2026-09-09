import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForCheckbox } from 'forty-cdk/checkbox';

interface Topping {
  readonly id: number;
  readonly label: string;
  selected: boolean;
}

@Component({
  selector: 'app-checkbox-select-all-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCheckbox],
  template: `
    <fieldset class="group">
      <button
        forCheckbox
        class="cb-row"
        [checked]="allChecked()"
        [indeterminate]="someChecked()"
        (click)="toggleAll()"
      >
        <span class="cb">
          <span class="cb-check" aria-hidden="true"></span>
          <span class="cb-dash" aria-hidden="true"></span>
        </span>
        Select all toppings
      </button>

      <div class="children">
        @for (topping of toppings(); track topping.id) {
          <button forCheckbox class="cb-row" [(checked)]="topping.selected">
            <span class="cb">
              <span class="cb-check" aria-hidden="true"></span>
            </span>
            {{ topping.label }}
          </button>
        }
      </div>
    </fieldset>
  `,
  styles: `
    :host {
      display: contents;
    }

    .group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      border: 0;
    }

    .children {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      padding-inline-start: 1.75rem;
    }

    .cb-row {
      display: inline-flex;
      align-items: center;
      align-self: flex-start;
      gap: 0.6rem;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--pg-text);
      cursor: pointer;
    }

    .cb {
      flex: none;
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border: 2px solid var(--pg-border-strong);
      border-radius: 6px;
      background: var(--pg-surface);
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .cb-row[data-state='checked'] .cb,
    .cb-row[data-state='indeterminate'] .cb {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
    }

    .cb-check,
    .cb-dash {
      display: none;
    }

    .cb-check {
      width: 12px;
      height: 12px;
      border: solid var(--pg-primary-contrast);
      border-width: 0 2.5px 2.5px 0;
      transform: rotate(45deg) translate(-1px, -1px);
    }

    .cb-row[data-state='checked'] .cb-check {
      display: block;
    }

    .cb-dash {
      width: 12px;
      height: 2px;
      border-radius: 1px;
      background: var(--pg-primary-contrast);
    }

    .cb-row[data-state='indeterminate'] .cb-dash {
      display: block;
    }

    @media (prefers-reduced-motion: reduce) {
      .cb {
        transition: none;
      }
    }
  `,
})
export class CheckboxSelectAllExample {
  protected readonly toppings = signal<Topping[]>([
    { id: 1, label: 'Mozzarella', selected: true },
    { id: 2, label: 'Mushrooms', selected: false },
    { id: 3, label: 'Pepperoni', selected: false },
  ]);

  protected readonly allChecked = computed(() => this.toppings().every((t) => t.selected));
  protected readonly someChecked = computed(() => {
    const some = this.toppings().some((t) => t.selected);
    return some && !this.allChecked();
  });

  protected toggleAll(): void {
    const next = !this.allChecked();
    this.toppings.update((list) => list.map((t) => ({ ...t, selected: next })));
  }
}
