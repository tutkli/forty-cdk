import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { moveItemInArray } from 'forty-cdk/drag-drop';
import {
  ForListbox,
  ForListboxOption,
  ForListboxReorder,
  type ForListboxReorderEvent,
} from 'forty-cdk/listbox';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-listbox-reorder-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ControlSwitch, ForListbox, ForListboxOption, ForListboxReorder],
  template: `
    <playground-demo
      title="Sortable (reorder)"
      subtitle="Add [forListboxReorder] on the same element as [forListbox] for a selectable AND sortable list, with no @angular/cdk/drag-drop. Drag a chip past a small threshold to move it; a short press still toggles selection. By keyboard: focus a chip, Ctrl+Space (or Cmd+Space) to lift, arrows / Home / End to position, Space / Enter to drop, Escape to cancel. The directive never reorders the data itself — (optionReorder) emits { from, to } and you apply moveItemInArray."
      sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/reorder.example.ts"
    >
      <div demo class="reorder-demo">
        <ul
          forListbox
          forListboxReorder
          multiple
          class="chips"
          [(value)]="selected"
          [reorderDisabled]="reorderDisabled()"
          (optionReorder)="onReorder($event)"
          aria-label="Tags"
        >
          @for (tag of tags(); track tag) {
            <li>
              <button type="button" forListboxOption class="chip" [value]="tag">{{ tag }}</button>
            </li>
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="reorderDisabled"
          hint="Turns off sorting while keeping selection and typeahead. The listbox's own disabled also disables reorder."
          [(checked)]="reorderDisabled"
        />
        <p class="pg-state">
          order: <b>{{ tags().join(', ') }}</b
          ><br />
          selected: <b>{{ selected().join(', ') || '—' }}</b>
        </p>
        <p class="pg-hint">
          Click toggles selection (multi mode); drag or Ctrl+Space reorders. Drop geometry is 2D, so
          the wrapping grid sorts along either axis.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .reorder-demo {
      display: flex;
      justify-content: center;
      padding: 1.5rem 0;
      width: 100%;
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
  protected readonly reorderDisabled = signal(false);

  protected onReorder({ from, to }: ForListboxReorderEvent): void {
    this.tags.update((tags) => moveItemInArray(tags, from, to));
  }
}
