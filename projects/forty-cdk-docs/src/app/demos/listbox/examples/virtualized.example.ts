import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { ForListbox, ForListboxOption, ForListboxOptionIndicator } from 'forty-cdk/listbox';
import { injectVirtualizer } from 'forty-cdk/virtualization';

@Component({
  selector: 'app-listbox-virtualized-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForListbox, ForListboxOption, ForListboxOptionIndicator],
  template: `
    <div
      forListbox
      #scroll
      class="vlb"
      aria-label="Virtualized items"
      [(value)]="value"
      [totalCount]="items.length"
      [visibleRange]="v.range()"
      (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
    >
      <div class="vlb-track" [style.height.px]="v.totalSize()">
        @for (vi of v.virtualItems(); track vi.key) {
          <button
            type="button"
            forListboxOption
            class="vlb-option"
            [value]="items[vi.index]!"
            [posInSet]="vi.index"
            [style.transform]="'translateY(' + vi.start + 'px)'"
          >
            {{ items[vi.index]! }}
            <span forListboxOptionIndicator class="vlb-indicator">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m4.5 12.75 6 6 9-13.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .vlb {
      position: relative;
      width: min(300px, 100%);
      max-height: 320px;
      overflow: auto;
      margin: 0;
      padding: 5px;
      list-style: none;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
    }

    .vlb:focus-visible {
      outline: 2px solid var(--ex-accent, #0e7c6b);
      outline-offset: -2px;
    }

    .vlb-track {
      position: relative;
      width: 100%;
    }

    .vlb-option {
      position: absolute;
      inset-inline: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      height: 36px;
      box-sizing: border-box;
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      padding: 0 0.65rem;
      border: 0;
      border-radius: var(--ex-radius-sm, 14px);
      background: transparent;
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .vlb-option[data-highlighted] {
      background: var(--ex-surface-2, #f2eee6);
    }

    .vlb-option[data-state='checked'] {
      color: var(--ex-accent, #0e7c6b);
      font-weight: 600;
    }

    .vlb-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      margin-left: auto;
      color: var(--ex-accent, #0e7c6b);
    }

    .vlb-indicator svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class ListboxVirtualizedExample {
  protected readonly items: readonly string[] = Array.from(
    { length: 10000 },
    (_, i) => `Item ${String(i + 1).padStart(5, '0')}`,
  );

  protected readonly value = signal<readonly string[]>([]);

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);

  protected readonly v = injectVirtualizer({
    count: signal(this.items.length),
    estimateSize: () => 36,
    scrollElement: this.scrollElement,
  });
}
