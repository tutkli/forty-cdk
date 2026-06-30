import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { moveItemInArray } from 'forty-cdk/drag-drop';
import {
  ForListbox,
  ForListboxOption,
  ForListboxReorder,
  type ForListboxReorderEvent,
} from 'forty-cdk/listbox';

@Component({
  selector: 'app-listbox-reorder-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForListbox, ForListboxOption, ForListboxReorder],
  template: `
    <ul
      forListbox
      forListboxReorder
      multiple
      class="chips"
      [(value)]="selected"
      (optionReorder)="onReorder($event)"
      aria-label="Tags"
    >
      @for (tag of tags(); track tag) {
        <li>
          <button type="button" forListboxOption class="chip" [value]="tag">{{ tag }}</button>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: contents;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      width: min(420px, 100%);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .chips > li {
      display: contents;
    }

    .chip {
      font: inherit;
      font-size: 0.85rem;
      padding: 0.4rem 0.85rem;
      border: 1px solid var(--pg-border-strong);
      border-radius: 999px;
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: grab;
      user-select: none;
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .chip[data-highlighted] {
      border-color: var(--pg-primary);
    }

    .chip[data-state='checked'] {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .chip[data-dragging] {
      cursor: grabbing;
      box-shadow: var(--pg-shadow);
      opacity: 0.9;
    }

    @media (prefers-reduced-motion: reduce) {
      .chip {
        transition: none;
      }
    }
  `,
})
export class ListboxReorderExample {
  protected readonly tags = signal<readonly string[]>([
    'urgent',
    'bug',
    'ui',
    'docs',
    'a11y',
    'backend',
  ]);
  protected readonly selected = signal<readonly string[]>(['bug']);

  protected onReorder({ from, to }: ForListboxReorderEvent): void {
    this.tags.update((tags) => moveItemInArray(tags, from, to));
  }
}
