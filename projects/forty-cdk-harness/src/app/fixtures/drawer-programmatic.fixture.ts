import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import {
  ForDrawerClose,
  ForDrawerManager,
  ForDrawerTitle,
  injectDrawerData,
} from 'forty-cdk/drawer';

interface ProgrammaticDrawerData {
  message: string;
}

@Component({
  imports: [ForDrawerTitle, ForDrawerClose],
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .prog-drawer-host {
        position: fixed;
        inset: auto 0 0 0;
        height: 200px;
        padding: 24px;
        background: white;
        opacity: 1;
        transition: opacity 250ms ease-out;
      }
      .prog-drawer-host.prog-leaving {
        opacity: 0;
      }
      @keyframes prog-drawer-enter-kf {
        from {
          opacity: 0;
        }
      }
      .prog-drawer-host.prog-entering {
        animation: prog-drawer-enter-kf 250ms ease-out;
      }
    `,
  ],
  template: `
    <div data-testid="prog-drawer-panel">
      <h2 data-testid="prog-drawer-title" forDrawerTitle>Programmatic Drawer</h2>
      <p>{{ data.message }}</p>
      <button data-testid="prog-drawer-close" forDrawerClose>Close</button>
    </div>
  `,
})
class ProgrammaticDrawerContent {
  protected readonly data = injectDrawerData<ProgrammaticDrawerData>();
}

@Component({
  selector: 'app-drawer-programmatic-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button data-testid="open-prog-drawer" (click)="openDrawer()">Open programmatic drawer</button>
  `,
})
export class DrawerProgrammaticFixture {
  readonly #manager = inject(ForDrawerManager);

  openDrawer(): void {
    this.#manager.open(ProgrammaticDrawerContent, {
      data: { message: 'Hello from the drawer manager' },
      class: 'prog-drawer-host',
      animateEnter: 'prog-entering',
      animateLeave: 'prog-leaving',
    });
  }
}
