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
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';
import { injectVirtualizer } from 'forty-cdk/virtualization';

interface Item {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-select-virtualized-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSelect, ForSelectTrigger, ForSelectValue, ForSelectContent, ForSelectOption],
  template: `
    <div
      forSelect
      ariaLabel="Virtualized select"
      [(value)]="value"
      [(open)]="open"
      [totalCount]="items.length"
      [visibleRange]="v.range()"
      (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
    >
      <button forSelectTrigger data-testid="trigger" style="display:block; height:36px">
        <span forSelectValue></span>
      </button>
      @if (open()) {
        <div
          forSelectContent
          #scroll
          data-testid="content"
          style="overflow: auto; max-height: 300px; position: relative"
        >
          <div [style.height.px]="v.totalSize()" style="position: relative">
            @for (vi of v.virtualItems(); track vi.key) {
              <button
                forSelectOption
                data-testid="option"
                [value]="items[vi.index]!.id"
                [posInSet]="vi.index"
                [attr.data-index]="vi.index"
                [style.transform]="'translateY(' + vi.start + 'px)'"
                style="position: absolute; left: 0; right: 0; height: 36px; display: block"
              >
                {{ items[vi.index]!.label }}
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class SelectVirtualizedFixture {
  protected readonly items: readonly Item[] = Array.from({ length: 10000 }, (_, index) => ({
    id: `item-${index}`,
    label: `Item ${index}`,
  }));

  protected readonly value = signal<readonly string[]>([]);
  protected readonly open = signal(false);

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);

  protected readonly v = injectVirtualizer({
    count: computed(() => this.items.length),
    estimateSize: () => 36,
    scrollElement: this.scrollElement,
  });
}
