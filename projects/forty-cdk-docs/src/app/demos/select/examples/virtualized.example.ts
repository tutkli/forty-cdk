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
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .virt-select-trigger:hover {
      background: var(--pg-surface-2);
    }

    .virt-select-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
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
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
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
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text);
      cursor: pointer;
    }

    .virt-select-option[data-highlighted],
    .virt-select-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .virt-select-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .virt-select-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
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
      animation: virt-select-pop-in 0.2s var(--pg-ease-spring) both;
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
