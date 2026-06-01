import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import {
  ForCombobox,
  ForComboboxClear,
  ForComboboxContent,
  ForComboboxEmpty,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

const ITEM_HEIGHT = 36;
const VIEWPORT_HEIGHT = 280;
const OVERSCAN = 6;

const ALL_ITEMS: readonly string[] = Array.from(
  { length: 1000 },
  (_, i) => `Item ${String(i + 1).padStart(4, '0')}`,
);

interface VirtualRow {
  readonly label: string;
  readonly index: number;
  readonly top: number;
}

@Component({
  selector: 'app-combobox-virtualized-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    ForComboboxEmpty,
    ForComboboxClear,
  ],
  template: `
    <playground-demo
      title="Virtualized (1,000 options)"
      subtitle="The primitive never owns the scroll container, so it virtualizes with any windowing strategy — here a dependency-free one. The consumer renders only the visible window and wires three hooks: [totalCount] (drives aria-setsize), [visibleRange] (what's in the DOM), and [forComboboxOption][posInSet] (each row's absolute index). When arrow keys or Home/End target a row outside the window, the directive emits (scrollToIndex); we scroll it into view and it seeds aria-activedescendant once mounted."
      sourcePath="projects/forty-cdk-playground/src/app/demos/combobox/examples/virtualized.example.ts"
    >
      <div demo class="combobox-demo">
        <div
          forCombobox
          class="pg-combobox"
          [(query)]="query"
          [(value)]="value"
          [(open)]="open"
          [totalCount]="filtered().length"
          [visibleRange]="range()"
          (scrollToIndex)="scrollToIndex($event)"
          ariaLabel="Virtualized item search"
        >
          <div class="pg-combobox-single">
            <input
              forComboboxInput
              class="pg-combobox-input pg-combobox-input--boxed"
              placeholder="Search 1,000 items…"
            />
            <button
              forComboboxClear
              class="pg-combobox-clear pg-combobox-clear--inset"
              aria-label="Clear"
            >
              ×
            </button>
          </div>

          @if (open()) {
            <div
              #scrollEl
              forComboboxContent
              class="pg-combobox-content"
              (scroll)="onScroll($event)"
              animate.enter="pg-pop-in"
            >
              <div class="pg-combobox-vtrack" [style.height.px]="totalSize()">
                @for (row of visibleRows(); track row.index) {
                  <div
                    forComboboxOption
                    [value]="row.label"
                    [label]="row.label"
                    [posInSet]="row.index"
                    class="pg-combobox-option pg-combobox-option--virtual"
                    [style.transform]="'translateY(' + row.top + 'px)'"
                  >
                    {{ row.label }}
                  </div>
                }
              </div>
              <div forComboboxEmpty class="pg-combobox-empty">No items match "{{ query() }}".</div>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          window: <b>{{ windowLabel() }}</b
          ><br />
          rendered nodes: <b>{{ visibleRows().length }}</b
          ><br />
          value: <b>{{ value().at(0) ?? '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .combobox-demo {
      display: flex;
      justify-content: center;
      padding: 2.5rem 0;
      width: 100%;
    }

    .combobox-demo .pg-combobox {
      width: min(300px, 100%);
    }
  `,
})
export class ComboboxVirtualizedExample {
  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');

  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly value = signal<readonly string[]>([]);
  protected readonly scrollTop = signal(0);

  protected readonly filtered = computed<readonly string[]>(() => {
    const q = this.query().toLowerCase().trim();
    if (q === '') {
      return ALL_ITEMS;
    }
    return ALL_ITEMS.filter((item) => item.toLowerCase().includes(q));
  });

  protected readonly totalSize = computed(() => this.filtered().length * ITEM_HEIGHT);

  protected readonly range = computed<readonly [number, number]>(() => {
    const count = this.filtered().length;
    if (count === 0) {
      return [0, 0];
    }
    const maxScroll = Math.max(0, count * ITEM_HEIGHT - VIEWPORT_HEIGHT);
    const top = Math.min(this.scrollTop(), maxScroll);
    const start = Math.max(0, Math.floor(top / ITEM_HEIGHT) - OVERSCAN);
    const end = Math.min(count, Math.ceil((top + VIEWPORT_HEIGHT) / ITEM_HEIGHT) + OVERSCAN);
    return [start, end];
  });

  protected readonly visibleRows = computed<readonly VirtualRow[]>(() => {
    const items = this.filtered();
    const [start, end] = this.range();
    const rows: VirtualRow[] = [];
    for (let i = start; i < end; i++) {
      rows.push({ label: items[i], index: i, top: i * ITEM_HEIGHT });
    }
    return rows;
  });

  protected readonly windowLabel = computed(() => {
    const count = this.filtered().length;
    if (count === 0) {
      return '—';
    }
    const [start, end] = this.range();
    return `rows ${start + 1}–${end} of ${count}`;
  });

  protected onScroll(event: Event): void {
    this.scrollTop.set((event.target as HTMLElement).scrollTop);
  }

  protected scrollToIndex(index: number): void {
    const el = this.scrollEl()?.nativeElement;
    if (!el) {
      return;
    }
    const top = index * ITEM_HEIGHT;
    const bottom = top + ITEM_HEIGHT;
    if (top < el.scrollTop) {
      el.scrollTop = top;
    } else if (bottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = bottom - el.clientHeight;
    }
  }
}
