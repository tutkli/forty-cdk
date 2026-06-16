import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDrawer, ForDrawerBackdrop, type ForDrawerCloseReason, ForDrawerClose } from 'forty-cdk';

@Component({
  selector: 'app-drawer-contained-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDrawer, ForDrawerBackdrop, ForDrawerClose],
  styles: [
    `
      [data-testid='container'] {
        position: relative;
        width: 400px;
        height: 300px;
        overflow: hidden;
        border: 2px solid #aaa;
        background: #f5f5f5;
      }
      [forDrawerBackdrop] {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 0;
      }
      [forDrawer] {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        padding: 16px;
        box-sizing: border-box;
        z-index: 1;
      }
    `,
  ],
  template: `
    <div data-testid="container" #container>
      @if (open()) {
        <div
          forDrawer
          data-testid="drawer"
          ariaLabel="Contained drawer"
          [modal]="false"
          [container]="container"
          (dismiss)="onClose($event)"
        >
          <div forDrawerBackdrop data-testid="backdrop"></div>
          <button data-testid="first">First</button>
          <button data-testid="second">Second</button>
          <button data-testid="close-btn" forDrawerClose>Close</button>
        </div>
      }
    </div>

    <button data-testid="trigger" (click)="open.set(true)">Open contained drawer</button>
    <button data-testid="outside" type="button">Outside target</button>
    <output data-testid="last-close-reason">{{ lastCloseReason() ?? 'none' }}</output>
  `,
})
export class DrawerContainedFixture {
  readonly open = signal(false);
  readonly lastCloseReason = signal<ForDrawerCloseReason | null>(null);

  onClose(reason: ForDrawerCloseReason): void {
    this.lastCloseReason.set(reason);
    this.open.set(false);
  }
}
