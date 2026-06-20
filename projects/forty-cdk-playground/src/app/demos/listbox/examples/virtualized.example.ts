import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { ForListbox, ForListboxOption, ForListboxOptionIndicator } from 'forty-cdk';
import { injectVirtualizer } from 'forty-cdk/virtualization';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-listbox-virtualized-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForListbox, ForListboxOption, ForListboxOptionIndicator, Icon],
  template: `
    <playground-demo
      title="Virtualized (10,000 options)"
      subtitle="Setting [totalCount] switches ForListbox from roving tabindex to the activedescendant model: the listbox container becomes the single Tab stop and the active option is tracked by aria-activedescendant, so options can recycle as you scroll. The listbox itself is the scroll container; we feed it the library's injectVirtualizer window, tag each option with its absolute [posInSet], and forward (scrollToIndex) so arrow / Home / End reach options outside the rendered window."
      sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/virtualized.example.ts"
    >
      <div demo class="vlb-demo">
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
                <span forListboxOptionIndicator class="pg-listbox-indicator">
                  <app-icon name="check" />
                </span>
              </button>
            }
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-hint">
          Tab into the list, then arrow through it — Home / End jump to the very first / last option
          even though they aren't rendered until you arrive.
        </p>
        <p class="pg-state">
          value: <b>{{ value().at(0) ?? '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .vlb-demo {
      display: flex;
      justify-content: center;
      padding: 1.5rem 0;
      width: 100%;
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
