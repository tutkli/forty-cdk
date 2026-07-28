import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  ForDrawerClose,
  ForDrawerHandle,
  ForDrawerManager,
  type ForDrawerRef,
  type ForDrawerSnapPoint,
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
      <p>{{ data?.message }}</p>
      <button data-testid="prog-drawer-close" forDrawerClose>Close</button>
    </div>
  `,
})
class ProgrammaticDrawerContent {
  protected readonly data = injectDrawerData<ProgrammaticDrawerData>();
}

interface ProgrammaticSnapDrawerData {
  drive: (snap: ForDrawerSnapPoint) => void;
}

@Component({
  imports: [ForDrawerHandle, ForDrawerTitle, ForDrawerClose],
  template: `
    <div data-testid="prog-snap-handle" forDrawerHandle></div>
    <h2 data-testid="prog-snap-title" forDrawerTitle>Snap Drawer</h2>
    <button data-testid="prog-snap-148" (click)="data?.drive('148px')">Snap to 148px</button>
    <button data-testid="prog-snap-50" (click)="data?.drive('50%')">Snap to 50%</button>
    <button data-testid="prog-snap-close" forDrawerClose>Close</button>
  `,
})
class ProgrammaticSnapDrawerContent {
  protected readonly data = injectDrawerData<ProgrammaticSnapDrawerData>();
}

@Component({
  selector: 'app-drawer-programmatic-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .prog-snap-drawer-host {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        height: 400px;
        box-sizing: border-box;
        padding: 16px;
        background: white;
        z-index: 1;
        translate: var(--for-drawer-swipe-movement-x, 0px) var(--for-drawer-swipe-movement-y, 0px);
      }
      .prog-snap-drawer-host[data-active-snap-point] {
        transition:
          bottom 0.2s ease,
          translate 0.2s ease;
      }
      .prog-snap-drawer-host[data-active-snap-point][data-dragging] {
        transition: none;
      }
      .prog-snap-drawer-host[data-active-snap-point='148px'] {
        bottom: calc(148px - 400px);
      }
      .prog-snap-drawer-host[data-active-snap-point='50%'] {
        bottom: -200px;
      }
      .prog-snap-drawer-host[data-active-snap-point='1'] {
        bottom: 0;
      }
      .prog-snap-drawer-host [data-testid='prog-snap-handle'] {
        height: 16px;
        margin-bottom: 8px;
        background: #ddd;
        border-radius: 4px;
      }
    `,
  ],
  template: `
    <button data-testid="open-prog-drawer" (click)="openDrawer($event)">
      Open programmatic drawer
    </button>

    <button data-testid="open-prog-snap-drawer" (click)="openSnapDrawer($event)">
      Open programmatic snap drawer
    </button>
    <output data-testid="prog-active-snap">{{ progActiveSnap() }}</output>
  `,
})
export class DrawerProgrammaticFixture {
  readonly #manager = inject(ForDrawerManager);
  readonly #slowEnter = queryFlag('slowEnter');

  protected readonly snapRef = signal<ForDrawerRef | null>(null);
  protected readonly progActiveSnap = computed(() => {
    const snap = this.snapRef()?.activeSnapPoint() ?? null;
    return snap == null ? 'none' : String(snap);
  });

  openDrawer(event: Event): void {
    // Re-focus the opener before opening, mirroring `ForDrawerTrigger.onClick`:
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

  openSnapDrawer(event: Event): void {
    (event.currentTarget as HTMLElement).focus();
    let ref: ForDrawerRef | null = null;
    const drive = (snap: ForDrawerSnapPoint): void => ref?.setActiveSnapPoint(snap);
    ref = this.#manager.open(ProgrammaticSnapDrawerContent, {
      class: 'prog-snap-drawer-host',
      data: { drive },
      snapPoints: ['148px', '50%', 1],
      defaultSnapPoint: '148px',
    });
    this.snapRef.set(ref);
  }
}
