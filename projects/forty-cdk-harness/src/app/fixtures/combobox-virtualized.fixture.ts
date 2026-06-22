import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';
import { injectVirtualizer } from 'forty-cdk/virtualization';

interface Item {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'app-combobox-virtualized-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div
      forCombobox
      [(query)]="query"
      [(value)]="value"
      [(open)]="open"
      [totalCount]="filtered().length"
      [visibleRange]="v.range()"
      (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
    >
      <input data-testid="input" forComboboxInput placeholder="Search items…" />
      @if (open()) {
        <div
          forComboboxContent
          #scroll
          style="overflow: auto; max-height: 300px; position: relative"
        >
          <div [style.height.px]="v.totalSize()" style="position: relative">
            @for (vi of v.virtualItems(); track vi.key) {
              <div
                forComboboxOption
                data-testid="option"
                [value]="filtered()[vi.index]!.id"
                [label]="filtered()[vi.index]!.label"
                [posInSet]="vi.index"
                [attr.data-index]="vi.index"
                [style.transform]="'translateY(' + vi.start + 'px)'"
                style="position: absolute; left: 0; right: 0;"
              >
                {{ filtered()[vi.index]!.label }}
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ComboboxVirtualizedFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly items: readonly Item[] = Array.from(
    { length: this.#num('count', 10000) },
    (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }),
  );

  protected readonly query = signal('');
  protected readonly value = signal<readonly string[]>([]);
  protected readonly open = model(true);

  protected readonly filtered = computed<readonly Item[]>(() => {
    const q = this.query().toLowerCase();
    return q === '' ? this.items : this.items.filter((it) => it.label.toLowerCase().includes(q));
  });

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);

  protected readonly v = injectVirtualizer({
    count: computed(() => this.filtered().length),
    estimateSize: () => 36,
    scrollElement: this.scrollElement,
  });

  #num(key: string, fallback: number): number {
    const raw = this.#route.snapshot.queryParamMap.get(key);
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
}
