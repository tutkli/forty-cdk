import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  afterEveryRender,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { injectVirtualizer } from 'forty-cdk';

const ESTIMATE = 30;

@Component({
  selector: 'app-virtualization-dynamic-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .viewport {
        position: relative;
        overflow: auto;
        width: 300px;
        height: 300px;
        border: 1px solid #ccc;
      }
      .row {
        box-sizing: border-box;
        background: #fff;
        border-bottom: 1px solid #eee;
      }
    `,
  ],
  template: `
    <output data-testid="total-size">{{ v.totalSize() }}</output>
    <output data-testid="estimate-total">{{ rows().length * estimate }}</output>
    <div #scroll class="viewport" data-testid="viewport">
      <div [style.height.px]="v.totalSize()" style="position: relative; width: 100%">
        @for (item of v.virtualItems(); track item.key) {
          <div
            #row
            class="row"
            [attr.data-index]="item.index"
            [attr.data-start]="item.start"
            [style.position]="'absolute'"
            [style.top.px]="item.start"
            [style.width]="'100%'"
            [style.height.px]="heightFor(item.index)"
          >
            Row {{ item.index }}
          </div>
        }
      </div>
    </div>
  `,
})
export class VirtualizationDynamicFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly estimate = ESTIMATE;

  protected readonly rows = signal<number[]>(
    Array.from({ length: this.#num('count', 200) }, (_, index) => index),
  );

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly rowRefs = viewChildren<ElementRef<HTMLElement>>('row');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);

  protected readonly v = injectVirtualizer({
    count: computed(() => this.rows().length),
    estimateSize: () => ESTIMATE,
    scrollElement: this.scrollElement,
  });

  constructor() {
    afterEveryRender(() => {
      for (const ref of this.rowRefs()) {
        this.v.measureElement(ref.nativeElement);
      }
    });
  }

  protected heightFor(index: number): number {
    return ESTIMATE + (index % 5) * 20;
  }

  #num(key: string, fallback: number): number {
    const raw = this.#route.snapshot.queryParamMap.get(key);
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
}
