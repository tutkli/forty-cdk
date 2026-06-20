import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { ForListbox, ForListboxOption } from 'forty-cdk';
import { injectVirtualizer } from 'forty-cdk/virtualization';

interface Item {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-listbox-virtualized-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForListbox, ForListboxOption],
  template: `
    <div
      forListbox
      #scroll
      data-testid="listbox"
      aria-label="Virtualized listbox"
      [(value)]="value"
      [totalCount]="items.length"
      [visibleRange]="v.range()"
      (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
      style="overflow: auto; max-height: 300px; position: relative"
    >
      <div [style.height.px]="v.totalSize()" style="position: relative">
        @for (vi of v.virtualItems(); track vi.key) {
          <button
            type="button"
            forListboxOption
            data-testid="option"
            [value]="items[vi.index]!.id"
            [posInSet]="vi.index"
            [attr.data-index]="vi.index"
            [style.transform]="'translateY(' + vi.start + 'px)'"
            style="position: absolute; left: 0; right: 0;"
          >
            {{ items[vi.index]!.label }}
          </button>
        }
      </div>
    </div>
  `,
})
export class ListboxVirtualizedFixture {
  protected readonly items: readonly Item[] = Array.from({ length: 10000 }, (_, index) => ({
    id: `item-${index}`,
    label: `Item ${index}`,
  }));

  protected readonly value = signal<readonly string[]>([]);

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);

  protected readonly v = injectVirtualizer({
    count: computed(() => this.items.length),
    estimateSize: () => 36,
    scrollElement: this.scrollElement,
  });
}
