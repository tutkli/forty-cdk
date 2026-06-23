import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import {
  ForDrawerClose,
  ForDrawerManager,
  ForDrawerTitle,
  injectDrawerData,
} from 'forty-cdk/drawer';
import { queryFlag } from './_query-flag';

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
      /* Long enter animation (?slowEnter=1) so the "animateEnter plays" spec can
         observe a 'running' animation deterministically — the 250ms default
         races the Playwright round-trip under CI load. */
      .prog-drawer-host.prog-entering-slow {
        animation: prog-drawer-enter-kf 3000ms ease-out;
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
    <button data-testid="open-prog-drawer" (click)="openDrawer($event)">
      Open programmatic drawer
    </button>
  `,
})
export class DrawerProgrammaticFixture {
  readonly #manager = inject(ForDrawerManager);
  readonly #slowEnter = queryFlag('slowEnter');

  openDrawer(event: Event): void {
    // Re-focus the opener before opening, mirroring `ForDialogTrigger.onClick`:
    // WebKit/Safari does not focus a `<button>` on `mousedown` and blurs an
    // already-focused one, so by the time this click handler runs the active
    // element is `<body>`. The manager's return-focus contract restores
    // whatever held focus at open time — without this re-focus it would
    // capture `<body>` on WebKit and return-focus would be a no-op (#136).
    // This is the pattern a real consumer opening a drawer from a button uses.
    (event.currentTarget as HTMLElement).focus();
    this.#manager.open(ProgrammaticDrawerContent, {
      data: { message: 'Hello from the drawer manager' },
      class: 'prog-drawer-host',
      animateEnter: this.#slowEnter ? 'prog-entering-slow' : 'prog-entering',
      animateLeave: 'prog-leaving',
    });
  }
}
