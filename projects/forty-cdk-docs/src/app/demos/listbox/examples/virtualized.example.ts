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
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .vlb:focus-visible {
      outline: 2px solid var(--pg-primary);
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
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text);
      cursor: pointer;
    }

    .vlb-option[data-highlighted] {
      background: var(--pg-surface-2);
    }

    .vlb-option[data-state='checked'] {
      color: var(--pg-primary);
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
      color: var(--pg-primary);
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
