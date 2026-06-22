import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForListbox,
  ForListboxOption,
  ForListboxReorder,
  moveItemInArray,
  type ForListboxReorderEvent,
} from 'forty-cdk';

/**
 * Selectable + sortable chip grid: `[forListbox]` (multi-select) composed with
 * `[forListboxReorder]`. Exercises that a single composition can both select
 * (listbox semantics) and reorder (pointer + keyboard) with no `[forDraggable]`
 * stacked on the options — the collision `[forListboxReorder]` exists to avoid.
 */
@Component({
  selector: 'app-listbox-reorder-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForListbox, ForListboxOption, ForListboxReorder],
  template: `
    <input data-testid="before" placeholder="before-listbox" />
    <ul
      forListbox
      forListboxReorder
      multiple
      [(value)]="value"
      (optionReorder)="onReorder($event)"
      data-testid="listbox"
      aria-label="Sortable tags"
      style="display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; max-width: 360px"
    >
      @for (tag of tags(); track tag) {
        <li>
          <button
            type="button"
            forListboxOption
            [value]="tag"
            [attr.data-testid]="'opt-' + tag"
            style="padding: 8px 12px; border: 1px solid #888"
          >
            {{ tag }}
          </button>
        </li>
      }
    </ul>
    <div data-testid="order">{{ order() }}</div>
    <div data-testid="selected">{{ selectedText() }}</div>
    <div data-testid="last-event">{{ lastEvent() }}</div>
  `,
})
export class ListboxReorderFixture {
  protected readonly tags = signal<readonly string[]>([
    'alpha',
    'bravo',
    'charlie',
    'delta',
    'echo',
    'foxtrot',
  ]);
  protected readonly value = signal<readonly string[]>([]);
  protected readonly lastEvent = signal('');
  protected readonly order = computed(() => this.tags().join(','));
  protected readonly selectedText = computed(() => this.value().join(','));

  protected onReorder(event: ForListboxReorderEvent): void {
    this.lastEvent.set(`${event.from}->${event.to}`);
    this.tags.update((tags) => moveItemInArray(tags, event.from, event.to));
  }
}
