import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForVirtualFor, ForVirtualViewport } from 'forty-cdk';

@Component({
  selector: 'app-virtualization-infinite-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForVirtualViewport, ForVirtualFor],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      [forVirtualViewport] {
        width: 300px;
        height: 400px;
        border: 1px solid #ccc;
      }
      .row {
        box-sizing: border-box;
        height: 40px;
        border-bottom: 1px solid #eee;
        background: #fff;
      }
    `,
  ],
  template: `
    <div data-testid="row-count">{{ rows().length }}</div>
    <div data-testid="page-count">{{ pages() }}</div>
    <div
      forVirtualViewport
      data-testid="viewport"
      [virtualCount]="rows().length"
      [estimateSize]="40"
      (endReached)="loadMore()"
    >
      <div class="row" *forVirtualFor="let row of rows()">Row {{ row.index }}</div>
    </div>
  `,
})
export class VirtualizationInfiniteFixture {
  protected readonly rows = signal<{ index: number }[]>(
    Array.from({ length: 30 }, (_, index) => ({ index })),
  );
  protected readonly pages = signal(0);

  protected loadMore(): void {
    this.pages.update((n) => n + 1);
    const start = this.rows().length;
    this.rows.update((rows) => [
      ...rows,
      ...Array.from({ length: 20 }, (_, i) => ({ index: start + i })),
    ]);
  }
}
