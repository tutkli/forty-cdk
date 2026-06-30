import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  ForCombobox,
  ForComboboxClear,
  ForComboboxContent,
  ForComboboxEmpty,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';

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
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    ForComboboxEmpty,
    ForComboboxClear,
  ],
  template: `
    <div
      forCombobox
      #combobox="forCombobox"
      class="virt-combobox"
      [(query)]="query"
      [(value)]="value"
      [totalCount]="filtered().length"
      [visibleRange]="range()"
      (scrollToIndex)="scrollToIndex($event)"
      ariaLabel="Virtualized item search"
    >
      <div class="virt-combobox-single">
        <input
          forComboboxInput
          class="virt-combobox-input virt-combobox-input--boxed"
          placeholder="Search 1,000 items…"
        />
        <button
          forComboboxClear
          class="virt-combobox-clear virt-combobox-clear--inset"
          aria-label="Clear"
        >
          ×
        </button>
      </div>

      @if (combobox.open()) {
        <div
          #scrollEl
          forComboboxContent
          class="virt-combobox-content"
          (scroll)="onScroll($event)"
          animate.enter="virt-combobox-pop-in"
        >
          <div class="virt-combobox-track" [style.height.px]="totalSize()">
            @for (row of visibleRows(); track row.index) {
              <div
                forComboboxOption
                [value]="row.label"
                [label]="row.label"
                [posInSet]="row.index"
                class="virt-combobox-option"
                [style.transform]="'translateY(' + row.top + 'px)'"
              >
                {{ row.label }}
              </div>
            }
          </div>
          <div forComboboxEmpty class="virt-combobox-empty">No items match "{{ query() }}".</div>
        </div>
      }
    </div>
  `,
  styles: `
    app-combobox-virtualized-example {
      display: contents;
    }

    .virt-combobox {
      display: block;
      width: min(300px, 100%);
    }

    .virt-combobox-single {
      position: relative;
      width: 100%;
    }

    .virt-combobox-input {
      font: inherit;
      font-size: 0.9rem;
      color: var(--pg-text);
    }

    .virt-combobox-input--boxed {
      width: 100%;
      padding: 0.55rem 2.2rem 0.55rem 0.7rem;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .virt-combobox-input--boxed:focus-visible {
      outline: none;
    }

    .virt-combobox-single:focus-within .virt-combobox-input--boxed {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .virt-combobox-clear {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      font-size: 1.1rem;
      line-height: 1;
      border: 0;
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text-muted);
      cursor: pointer;
    }

    .virt-combobox-clear:hover {
      background: var(--pg-surface-2);
      color: var(--pg-text);
    }

    .virt-combobox-clear--inset {
      position: absolute;
      top: 50%;
      inset-inline-end: 0.35rem;
      transform: translateY(-50%);
    }

    .virt-combobox-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: var(--for-anchor-width);
      min-width: 12rem;
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .virt-combobox-track {
      position: relative;
      flex: none;
      width: 100%;
    }

    .virt-combobox-option {
      position: absolute;
      inset-inline: 0;
      height: 36px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      padding: 0.45rem 0.6rem;
      border-radius: var(--pg-radius-sm);
      color: var(--pg-text);
      cursor: pointer;
    }

    .virt-combobox-option[data-highlighted],
    .virt-combobox-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .virt-combobox-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .virt-combobox-empty {
      padding: 0.6rem;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
      text-align: center;
    }

    .virt-combobox-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: virt-combobox-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes virt-combobox-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .virt-combobox-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ComboboxVirtualizedExample {
  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');

  protected readonly query = signal('');
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
