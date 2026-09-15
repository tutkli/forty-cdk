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
  ForSelect,
  ForSelectContent,
  ForSelectIndicator,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';
import { injectVirtualizer } from 'forty-cdk/virtualization';

@Component({
  selector: 'app-select-virtualized-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    ForSelectIndicator,
  ],
  template: `
    <div
      forSelect
      #select="forSelect"
      class="virt-select-field"
      [(value)]="value"
      [itemToLabel]="identity"
      [totalCount]="items.length"
      [visibleRange]="v.range()"
      (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
      placeholder="Pick a city"
      ariaLabel="City"
    >
      <button forSelectTrigger type="button" class="virt-select-trigger">
        <span forSelectValue></span>
        <svg class="virt-select-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      @if (select.open()) {
        <div
          #scroll
          forSelectContent
          class="virt-select-content"
          animate.enter="virt-select-pop-in"
        >
          <div class="virt-select-track" [style.height.px]="v.totalSize()">
            @for (vi of v.virtualItems(); track vi.key) {
              <button
                forSelectOption
                type="button"
                class="virt-select-option"
                [value]="items[vi.index]!"
                [posInSet]="vi.index"
                [style.transform]="'translateY(' + vi.start + 'px)'"
              >
                <span forSelectIndicator class="virt-select-indicator">
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
                {{ items[vi.index]! }}
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    app-select-virtualized-example {
      display: contents;
    }

    .virt-select-field {
      display: block;
      width: min(260px, 100%);
    }

    .virt-select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      font: inherit;
      font-size: 0.875rem;
      padding: 0.4rem 0.6rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .virt-select-trigger:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .virt-select-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--ex-muted, #585d66);
      transition: transform 0.15s ease;
    }

    .virt-select-trigger[aria-expanded='true'] .virt-select-chevron {
      transform: rotate(180deg);
    }

    .virt-select-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: var(--for-floating-anchor-width);
      max-height: 260px;
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

    .virt-select-track {
      position: relative;
      flex: none;
      width: 100%;
    }

    .virt-select-option {
      position: absolute;
      inset-inline: 0;
      height: 36px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      padding: 0.4rem 0.6rem;
      border: 0;
      border-radius: var(--ex-radius-sm, 14px);
      background: transparent;
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .virt-select-option[data-highlighted],
    .virt-select-option:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .virt-select-option[data-state='checked'] {
      color: var(--ex-accent, #0e7c6b);
      font-weight: 600;
    }

    .virt-select-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--ex-accent, #0e7c6b);
    }

    .virt-select-indicator[hidden] {
      display: none;
    }

    .virt-select-indicator svg {
      width: 100%;
      height: 100%;
    }

    .virt-select-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: virt-select-pop-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
    }

    @keyframes virt-select-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .virt-select-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class SelectVirtualizedExample {
  protected readonly items: readonly string[] = Array.from(
    { length: 5000 },
    (_, i) => `City ${String(i + 1).padStart(4, '0')}`,
  );

  protected readonly value = signal<readonly string[]>([]);

  protected readonly identity = (item: string): string => item;

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);

  protected readonly v = injectVirtualizer({
    count: signal(this.items.length),
    estimateSize: () => 36,
    scrollElement: this.scrollElement,
  });
}
