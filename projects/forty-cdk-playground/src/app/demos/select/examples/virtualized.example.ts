import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import {
  ForSelect,
  ForSelectContent,
  ForSelectIndicator,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
  injectVirtualizer,
} from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-select-virtualized-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    ForSelectIndicator,
    Icon,
  ],
  template: `
    <playground-demo
      title="Virtualized (5,000 options)"
      subtitle="Setting [totalCount] switches ForSelect to the virtualized activedescendant model: [forSelectContent] becomes the single Tab stop and the active option is tracked by aria-activedescendant instead of DOM focus, so rows can recycle as the listbox scrolls. We render the window with the library's injectVirtualizer core, give each option its absolute [posInSet], and forward (scrollToIndex) so arrow / Home / End can reach options outside the window."
      sourcePath="projects/forty-cdk-playground/src/app/demos/select/examples/virtualized.example.ts"
    >
      <div demo class="select-demo">
        <div
          forSelect
          #select="forSelect"
          class="select-field"
          [(value)]="value"
          [itemToLabel]="identity"
          [totalCount]="items.length"
          [visibleRange]="v.range()"
          (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
          placeholder="Pick a city"
          ariaLabel="City"
        >
          <button forSelectTrigger type="button" class="pg-select-trigger">
            <span forSelectValue></span>
            <app-icon class="pg-select-chevron" name="chevron-down" />
          </button>
          @if (select.open()) {
            <div #scroll forSelectContent class="pg-select-content" animate.enter="pg-pop-in">
              <div class="pg-select-vtrack" [style.height.px]="v.totalSize()">
                @for (vi of v.virtualItems(); track vi.key) {
                  <button
                    forSelectOption
                    type="button"
                    class="pg-select-option pg-select-option--virtual"
                    [value]="items[vi.index]!"
                    [posInSet]="vi.index"
                    [style.transform]="'translateY(' + vi.start + 'px)'"
                  >
                    <span forSelectIndicator class="pg-select-indicator">
                      <app-icon name="check" />
                    </span>
                    {{ items[vi.index]! }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-hint">
          Open and type-jump with the arrow keys — try End to leap to the last option. Only the
          visible window is in the DOM at any time.
        </p>
        <p class="pg-state">
          open: <b>{{ select.open() }}</b
          ><br />
          value: <b>{{ value().at(0) ?? '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .select-demo {
      display: flex;
      justify-content: center;
      padding: 2.5rem 0;
      width: 100%;
    }

    .select-field {
      display: block;
      width: min(260px, 100%);
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
