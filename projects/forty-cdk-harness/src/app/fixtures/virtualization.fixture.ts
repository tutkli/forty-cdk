import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForVirtualFor, ForVirtualViewport } from 'forty-cdk/virtualization';

interface Row {
  readonly index: number;
  readonly label: string;
}

@Component({
  selector: 'app-virtualization-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForVirtualViewport, ForVirtualFor],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      [forVirtualViewport] {
        border: 1px solid #ccc;
        background: #fafafa;
      }
      [forVirtualViewport][data-orientation='vertical'] {
        width: 300px;
        height: 400px;
      }
      [forVirtualViewport][data-orientation='horizontal'] {
        width: 400px;
        height: 200px;
      }
      .row {
        box-sizing: border-box;
        border-bottom: 1px solid #eee;
        background: #fff;
        overflow: hidden;
      }
    `,
  ],
  template: `
    <button
      data-testid="scroll-to-index"
      (click)="vp.scrollToIndex(scrollIndex, { align: 'start' })"
    >
      go
    </button>
    <div
      forVirtualViewport
      #vp="forVirtualViewport"
      data-testid="viewport"
      [attr.data-orientation]="orientation"
      [virtualCount]="rows().length"
      [estimateSize]="itemSize"
      [orientation]="orientation"
      [overscan]="overscan"
    >
      <div
        class="row"
        *forVirtualFor="let row of rows()"
        [style.height.px]="orientation === 'vertical' ? itemSize : null"
        [style.width.px]="orientation === 'horizontal' ? itemSize : null"
      >
        Row {{ row.index }}
      </div>
    </div>
  `,
})
export class VirtualizationFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly orientation: 'vertical' | 'horizontal' =
    this.#route.snapshot.queryParamMap.get('orientation') === 'horizontal'
      ? 'horizontal'
      : 'vertical';

  protected readonly itemSize = this.#num('itemSize', 40);
  protected readonly overscan = this.#num('overscan', 5);
  protected readonly scrollIndex = this.#num('scrollIndex', 5000);

  protected readonly rows = signal<Row[]>(
    Array.from({ length: this.#num('count', 10000) }, (_, index) => ({
      index,
      label: `Row ${index}`,
    })),
  );

  #num(key: string, fallback: number): number {
    const raw = this.#route.snapshot.queryParamMap.get(key);
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
}
