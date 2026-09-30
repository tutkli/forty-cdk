import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ForVirtualFor, ForVirtualViewport, injectVirtualizer } from 'forty-cdk/virtualization';

const ROW_HEIGHT = 40;
const ROW_COUNT = 1000;

@Component({
  selector: 'app-reattach-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="panel">
        <ng-content />
      </div>
    }
  `,
})
export class ReattachPanel {
  readonly open = input.required<boolean>();
}

@Component({
  selector: 'app-reattach-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .viewport {
        overflow: auto;
        width: 300px;
        height: 300px;
        border: 1px solid #ccc;
      }
    `,
  ],
  template: `
    <div #scroll class="viewport" data-testid="list-viewport">
      <div [style.height.px]="v.totalSize()" style="position: relative">
        @for (item of v.virtualItems(); track item.key) {
          <div
            [attr.data-index]="item.index"
            [style.position]="'absolute'"
            [style.top.px]="item.start"
            [style.height.px]="item.size"
            [style.width]="'100%'"
          >
            Row {{ item.index }}
          </div>
        }
      </div>
    </div>
  `,
})
export class ReattachList {
  readonly count = input.required<number>();
  readonly scrollRef = viewChild.required<ElementRef<HTMLElement>>('scroll');

  protected readonly v = injectVirtualizer({
    count: computed(() => this.count()),
    estimateSize: () => ROW_HEIGHT,
    scrollElement: computed(() => this.scrollRef().nativeElement),
  });
}

@Component({
  selector: 'app-virtualization-reattach-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReattachPanel, ReattachList, ForVirtualViewport, ForVirtualFor],
  styles: [
    `
      :host {
        display: flex;
        gap: 24px;
        padding: 24px;
      }
      [forVirtualViewport] {
        width: 300px;
        height: 300px;
        border: 1px solid #ccc;
      }
    `,
  ],
  template: `
    <section>
      <button data-testid="toggle-list" (click)="listOpen.set(!listOpen())">list</button>
      <app-reattach-panel [open]="listOpen()">
        <app-reattach-list [count]="count" />
      </app-reattach-panel>
    </section>
    <section>
      <button data-testid="toggle-viewport" (click)="viewportOpen.set(!viewportOpen())">
        viewport
      </button>
      <app-reattach-panel [open]="viewportOpen()">
        <div
          forVirtualViewport
          data-testid="viewport-viewport"
          [virtualCount]="rows.length"
          [estimateSize]="rowHeight"
        >
          <div *forVirtualFor="let row of rows" [style.height.px]="rowHeight">Row {{ row }}</div>
        </div>
      </app-reattach-panel>
    </section>
  `,
})
export class VirtualizationReattachFixture {
  protected readonly count = ROW_COUNT;
  protected readonly rowHeight = ROW_HEIGHT;
  protected readonly rows = Array.from({ length: ROW_COUNT }, (_, index) => index);
  protected readonly listOpen = signal(true);
  protected readonly viewportOpen = signal(true);
}
