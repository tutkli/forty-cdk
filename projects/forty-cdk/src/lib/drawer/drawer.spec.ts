import {
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type {
  VetoableEvent,
  VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import { flush, pressKey, renderHost, withReducedMotion } from '../../test-utils';
import { assertDismissableLayerContract } from '../../test-utils/contract';
import { ForDrawer } from './drawer';
import { ForDrawerBackdrop } from './drawer-backdrop';
import { ForDrawerClose } from './drawer-close';
import type {
  ForDrawerCloseReason,
  ForDrawerSide,
  ForDrawerSnapPoint,
} from './drawer-context';
import { ForDrawerDescription } from './drawer-description';
import { provideForDrawerDefaults } from './drawer-defaults';
import { ForDrawerHandle } from './drawer-handle';
import { ForDrawerTitle } from './drawer-title';
import { ForDrawerTrigger } from './drawer-trigger';
import { ForDrawerWrapper } from './drawer-wrapper';

@Component({
  imports: [
    ForDrawer,
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <button #trigger type="button" (click)="open.set(true)">Open</button>
    @if (open()) {
      <div
        forDrawer
        [side]="side()"
        [dismissible]="dismissible()"
        [alert]="alert()"
        (close)="onClose($event)"
      >
        <div forDrawerBackdrop></div>
        <div forDrawerHandle></div>
        <h2 forDrawerTitle>Drawer title</h2>
        <p forDrawerDescription>Helper text.</p>
        <button id="ok" type="button">OK</button>
        <button id="cancel" forDrawerClose>Cancel</button>
      </div>
    }
  `,
})
class DrawerHost {
  readonly open = signal(false);
  readonly side = signal<ForDrawerSide>('bottom');
  readonly dismissible = signal(true);
  readonly alert = signal(false);
  readonly reasons: ForDrawerCloseReason[] = [];
  onClose(reason: ForDrawerCloseReason): void {
    this.reasons.push(reason);
    this.open.set(false);
  }
}

@Component({
  imports: [ForDrawer],
  template: `
    @if (open()) {
      <div
        forDrawer
        [dismissible]="dismissible()"
        (close)="open.set(false)"
        (escapeKeyDown)="onEscape($event)"
        (pointerDownOutside)="onPointer($event)"
        (focusOutside)="onFocus($event)"
        (interactOutside)="onInteract($event)"
        ariaLabel="t"
      ></div>
    }
  `,
})
class DismissableContractHost {
  readonly open = signal(false);
  readonly dismissible = signal(true);
  escapeVeto = false;
  pointerVeto = false;
  eCount = 0;
  pCount = 0;
  fCount = 0;
  iCount = 0;
  onEscape(event: VetoableNativeEvent<KeyboardEvent>): void {
    this.eCount += 1;
    if (this.escapeVeto) event.preventDefault();
  }
  onPointer(event: VetoableNativeEvent<PointerEvent>): void {
    this.pCount += 1;
    if (this.pointerVeto) event.preventDefault();
  }
  onFocus(_event: VetoableNativeEvent<FocusEvent>): void {
    this.fCount += 1;
  }
  onInteract(_event: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.iCount += 1;
  }
}

@Component({
  imports: [ForDrawer, ForDrawerBackdrop],
  template: `
    @if (open()) {
      <div
        forDrawer
        [snapPoints]="snaps"
        [(activeSnapPoint)]="active"
        (activeSnapPointChange)="changes.push($event)"
        [fadeFromIndex]="fadeFromIndex()"
        (close)="open.set(false)"
        ariaLabel="t"
      >
        <div forDrawerBackdrop></div>
      </div>
    }
  `,
})
class SnapPointsHost {
  readonly open = signal(false);
  readonly snaps: ReadonlyArray<ForDrawerSnapPoint> = ['148px', '50%', 1];
  readonly active = signal<ForDrawerSnapPoint | null>(null);
  readonly fadeFromIndex = signal<number | undefined>(undefined);
  readonly changes: Array<ForDrawerSnapPoint | null> = [];
}

describe('ForDrawer (declarative)', () => {
  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  describe('a11y baseline', () => {
    it('sets role=dialog, aria-modal, and ties labelledby/describedby to title/description', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      const title = drawer.querySelector<HTMLElement>('[forDrawerTitle]')!;
      const desc = drawer.querySelector<HTMLElement>('[forDrawerDescription]')!;

      expect(drawer.getAttribute('role')).toBe('dialog');
      expect(drawer.getAttribute('aria-modal')).toBe('true');
      expect(drawer.getAttribute('aria-labelledby')).toBe(title.id);
      expect(drawer.getAttribute('aria-describedby')).toBe(desc.id);
    });

    it('switches role to alertdialog when alert=true', async () => {
      const r = renderHost(DrawerHost);
      r.instance.alert.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      expect(drawer.getAttribute('role')).toBe('alertdialog');
    });

    it('marks the handle as aria-hidden', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const handle = document.querySelector<HTMLElement>('[forDrawerHandle]')!;
      expect(handle.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('data-* reflection', () => {
    it('reflects data-state="open" on host, backdrop, and close while mounted', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      const backdrop = document.querySelector<HTMLElement>('[forDrawerBackdrop]')!;
      const closeBtn = document.querySelector<HTMLElement>('[forDrawerClose]')!;

      expect(drawer.getAttribute('data-state')).toBe('open');
      expect(backdrop.getAttribute('data-state')).toBe('open');
      expect(closeBtn.getAttribute('data-state')).toBe('open');
    });

    it('reflects data-side from the side input', async () => {
      const r = renderHost(DrawerHost);
      r.instance.side.set('right');
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      expect(drawer.getAttribute('data-side')).toBe('right');
    });

    it('omits data-dragging while at rest (boolean truthy-only)', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      expect(drawer.hasAttribute('data-dragging')).toBe(false);
    });
  });

  describe('mount/unmount', () => {
    it('portals the drawer to document.body once opened', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      expect(drawer.parentElement).toBe(document.body);
    });

    it('removes the drawer entirely when consumer signal flips false', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector('[forDrawer]')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelector('[forDrawer]')).toBeNull();
    });

    it('moves focus into the drawer on mount (first focusable)', async () => {
      const r = renderHost(DrawerHost);
      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('ok');
    });

    it('returns focus to the previous element on unmount', async () => {
      const r = renderHost(DrawerHost);
      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(document.activeElement).toBe(trigger);
    });
  });

  assertDismissableLayerContract({
    mount: async (options = {}) => {
      const r = renderHost(DismissableContractHost);
      r.instance.dismissible.set(options.dismissible ?? true);
      r.instance.escapeVeto = options.escapeVeto ?? false;
      r.instance.pointerVeto = options.pointerVeto ?? false;
      r.instance.open.set(true);
      await flush(r.fixture);
      return {
        flush: () => flush(r.fixture),
        isOpen: () => r.instance.open(),
        escapeCount: () => r.instance.eCount,
        pointerOutsideCount: () => r.instance.pCount,
        focusOutsideCount: () => r.instance.fCount,
        interactOutsideCount: () => r.instance.iCount,
      };
    },
  });

  describe('Escape / close-button / backdrop', () => {
    it('emits (close) with reason "escape"', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.reasons).toEqual(['escape']);
    });

    it('emits (close) with reason "closeButton" from [forDrawerClose]', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const close = document.querySelector<HTMLButtonElement>('#cancel')!;
      close.click();
      await flush(r.fixture);

      expect(r.instance.reasons).toEqual(['closeButton']);
    });

    it('emits (close) with reason "backdrop" on direct backdrop click', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const backdrop = document.querySelector<HTMLElement>('[data-for-drawer-backdrop]')!;
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: backdrop, configurable: true });
      backdrop.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.reasons).toEqual(['backdrop']);
    });

    it('does NOT close on backdrop click bubbled from a child', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const backdrop = document.querySelector<HTMLElement>('[data-for-drawer-backdrop]')!;
      const child = document.createElement('div');
      backdrop.appendChild(child);

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: child, configurable: true });
      backdrop.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('close button always emits regardless of dismissible', async () => {
      const r = renderHost(DrawerHost);
      r.instance.dismissible.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      const close = document.querySelector<HTMLButtonElement>('#cancel')!;
      close.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });
  });

  describe('snap points', () => {
    it('initialises activeSnapPoint to snapPoints[0] when consumer left it null', async () => {
      const r = renderHost(SnapPointsHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(r.instance.active()).toBe('148px');
      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      expect(drawer.getAttribute('data-active-snap-point')).toBe('148px');
    });

    it('emits activeSnapPointChange once with snapPoints[0] when initialised from null', async () => {
      const r = renderHost(SnapPointsHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(r.instance.changes).toEqual(['148px']);
    });

    it('respects a programmatically-set activeSnapPoint', async () => {
      const r = renderHost(SnapPointsHost);
      r.instance.active.set('50%');
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(r.instance.active()).toBe('50%');
    });

    it('reflects data-fade-from-active on the backdrop when active >= fadeFromIndex', async () => {
      const r = renderHost(SnapPointsHost);
      r.instance.fadeFromIndex.set(1);
      r.instance.open.set(true);
      await flush(r.fixture);

      const backdrop = document.querySelector<HTMLElement>('[forDrawerBackdrop]')!;
      // Initial active is snaps[0] ('148px'), index 0 < fadeFromIndex 1 → not faded.
      expect(backdrop.hasAttribute('data-fade-from-active')).toBe(false);

      r.instance.active.set('50%');
      await flush(r.fixture);
      expect(backdrop.getAttribute('data-fade-from-active')).toBe('');

      r.instance.active.set(1);
      await flush(r.fixture);
      expect(backdrop.getAttribute('data-fade-from-active')).toBe('');
    });

    it('throws when snapPoints are not strictly increasing', async () => {
      @Component({
        imports: [ForDrawer],
        template: `
          @if (open()) {
            <div forDrawer [snapPoints]="snaps" (close)="open.set(false)" ariaLabel="t"></div>
          }
        `,
      })
      class BadHost {
        readonly open = signal(false);
        readonly snaps: ReadonlyArray<ForDrawerSnapPoint> = [0.5, 0.25, 1];
      }

      const captured: unknown[] = [];
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });
      const fixture = TestBed.createComponent(BadHost);
      fixture.detectChanges();
      fixture.componentInstance.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(captured.some((e) => e instanceof Error && /strictly increasing/.test(e.message))).toBe(
        true,
      );
    });

    it('throws when closeThreshold is greater than 1', async () => {
      @Component({
        imports: [ForDrawer],
        template: `
          @if (open()) {
            <div forDrawer [closeThreshold]="2" (close)="open.set(false)" ariaLabel="t"></div>
          }
        `,
      })
      class BadHost {
        readonly open = signal(false);
      }

      const captured: unknown[] = [];
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });
      const fixture = TestBed.createComponent(BadHost);
      fixture.detectChanges();
      fixture.componentInstance.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(
        captured.some(
          (e) =>
            e instanceof Error &&
            e.message === '[forty-cdk/drawer] closeThreshold must be in [0, 1], got 2.',
        ),
      ).toBe(true);
    });

    it('throws when closeThreshold is NaN', async () => {
      @Component({
        imports: [ForDrawer],
        template: `
          @if (open()) {
            <div forDrawer [closeThreshold]="bad" (close)="open.set(false)" ariaLabel="t"></div>
          }
        `,
      })
      class BadHost {
        readonly open = signal(false);
        readonly bad = Number.NaN;
      }

      const captured: unknown[] = [];
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });
      const fixture = TestBed.createComponent(BadHost);
      fixture.detectChanges();
      fixture.componentInstance.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(
        captured.some(
          (e) =>
            e instanceof Error &&
            e.message === '[forty-cdk/drawer] closeThreshold must be in [0, 1], got NaN.',
        ),
      ).toBe(true);
    });

    it('mounts cleanly with closeThreshold = 0.5', async () => {
      @Component({
        imports: [ForDrawer],
        template: `
          @if (open()) {
            <div forDrawer [closeThreshold]="0.5" (close)="open.set(false)" ariaLabel="t"></div>
          }
        `,
      })
      class GoodHost {
        readonly open = signal(false);
      }

      const captured: unknown[] = [];
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });
      const fixture = TestBed.createComponent(GoodHost);
      fixture.detectChanges();
      fixture.componentInstance.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(captured.some((e) => e instanceof Error && /closeThreshold/.test(e.message))).toBe(
        false,
      );
    });

    it('throws when fadeFromIndex is out of range', async () => {
      @Component({
        imports: [ForDrawer],
        template: `
          @if (open()) {
            <div
              forDrawer
              [snapPoints]="snaps"
              [fadeFromIndex]="5"
              (close)="open.set(false)"
              ariaLabel="t"
            ></div>
          }
        `,
      })
      class BadHost {
        readonly open = signal(false);
        readonly snaps: ReadonlyArray<ForDrawerSnapPoint> = [0.25, 0.5, 1];
      }

      const captured: unknown[] = [];
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });
      const fixture = TestBed.createComponent(BadHost);
      fixture.detectChanges();
      fixture.componentInstance.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(captured.some((e) => e instanceof Error && /fadeFromIndex/.test(e.message))).toBe(
        true,
      );
    });
  });

  describe('used outside [forDrawer]', () => {
    function expectThrows(host: new (...args: unknown[]) => unknown, regex: RegExp): void {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(host as never)).toThrow(regex);
    }

    it('throws from ForDrawerTitle', () => {
      @Component({
        imports: [ForDrawerTitle],
        template: `<h2 forDrawerTitle></h2>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/drawer\] ForDrawerTitle/);
    });

    it('throws from ForDrawerDescription', () => {
      @Component({
        imports: [ForDrawerDescription],
        template: `<p forDrawerDescription></p>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/drawer\] ForDrawerDescription/);
    });

    it('throws from ForDrawerClose', () => {
      @Component({
        imports: [ForDrawerClose],
        template: `<button forDrawerClose></button>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/drawer\] ForDrawerClose/);
    });

    it('throws from ForDrawerBackdrop', () => {
      @Component({
        imports: [ForDrawerBackdrop],
        template: `<div forDrawerBackdrop></div>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/drawer\] ForDrawerBackdrop/);
    });

    it('throws from ForDrawerHandle', () => {
      @Component({
        imports: [ForDrawerHandle],
        template: `<div forDrawerHandle></div>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/drawer\] ForDrawerHandle/);
    });
  });

  describe('duplicate slot registration', () => {
    it('throws when two [forDrawerHandle] are mounted inside the same [forDrawer]', () => {
      @Component({
        imports: [ForDrawer, ForDrawerHandle],
        template: `
          @if (open()) {
            <div forDrawer (close)="open.set(false)" ariaLabel="t">
              <div forDrawerHandle></div>
              <div forDrawerHandle></div>
            </div>
          }
        `,
      })
      class TwoHandlesHost {
        readonly open = signal(true);
      }

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(TwoHandlesHost);
      expect(() => fixture.detectChanges()).toThrow(
        /\[forty-cdk\/drawer\] Multiple \[forDrawerHandle\]/,
      );
    });

    it('throws when two [forDrawerBackdrop] are mounted inside the same [forDrawer]', () => {
      @Component({
        imports: [ForDrawer, ForDrawerBackdrop],
        template: `
          @if (open()) {
            <div forDrawer (close)="open.set(false)" ariaLabel="t">
              <div forDrawerBackdrop></div>
              <div forDrawerBackdrop></div>
            </div>
          }
        `,
      })
      class TwoBackdropsHost {
        readonly open = signal(true);
      }

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(TwoBackdropsHost);
      expect(() => fixture.detectChanges()).toThrow(
        /\[forty-cdk\/drawer\] Multiple \[forDrawerBackdrop\]/,
      );
    });

    it('does not throw when a handle is re-registered after the previous unmounted', async () => {
      @Component({
        imports: [ForDrawer, ForDrawerHandle],
        template: `
          @if (open()) {
            <div forDrawer (close)="open.set(false)" ariaLabel="t">
              @if (showFirst()) {
                <div forDrawerHandle data-which="first"></div>
              }
              @if (showSecond()) {
                <div forDrawerHandle data-which="second"></div>
              }
            </div>
          }
        `,
      })
      class SwapHandleHost {
        readonly open = signal(false);
        readonly showFirst = signal(true);
        readonly showSecond = signal(false);
      }

      const r = renderHost(SwapHandleHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector('[forDrawerHandle][data-which="first"]')).not.toBeNull();

      // Unmount the first, then mount the second — should not throw.
      r.instance.showFirst.set(false);
      await flush(r.fixture);
      r.instance.showSecond.set(true);
      await flush(r.fixture);

      expect(document.querySelector('[forDrawerHandle][data-which="first"]')).toBeNull();
      expect(document.querySelector('[forDrawerHandle][data-which="second"]')).not.toBeNull();
    });
  });

  describe('mode flags', () => {
    it('skips aria-modal, focus trap, and body scroll lock when modal=false', async () => {
      @Component({
        imports: [ForDrawer],
        template: `
          @if (open()) {
            <div forDrawer (close)="open.set(false)" [modal]="false" ariaLabel="t">
              <button id="inside">In</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      document.body.style.overflow = 'auto';
      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      expect(drawer.hasAttribute('aria-modal')).toBe(false);
      expect(document.body.style.overflow).toBe('auto');
    });

    it('locks body scroll while modal drawer is mounted', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.body.style.overflow).toBe('hidden');

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.body.style.overflow).toBe('');
    });

    it('inerts body siblings while modal is open and unhides on close', async () => {
      const sibling = document.createElement('section');
      sibling.id = 'app-shell';
      document.body.appendChild(sibling);

      try {
        const r = renderHost(DrawerHost);
        r.instance.open.set(true);
        await flush(r.fixture);

        expect(sibling.hasAttribute('inert')).toBe(true);
        expect(sibling.getAttribute('aria-hidden')).toBe('true');

        r.instance.open.set(false);
        await flush(r.fixture);

        expect(sibling.hasAttribute('inert')).toBe(false);
      } finally {
        sibling.remove();
      }
    });
  });

  describe('prefers-reduced-motion: reduce', () => {
    let restoreReducedMotion: () => void;
    beforeEach(() => {
      restoreReducedMotion = withReducedMotion();
    });
    afterEach(() => {
      restoreReducedMotion();
    });

    it('does not register a swipe listener (no pointerdown listener wires drag state)', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      // Dispatch a swipe — without the listener, no data-dragging gets set.
      drawer.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          clientX: 0,
          clientY: 0,
          pointerId: 1,
          pointerType: 'touch',
        }),
      );
      drawer.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          clientX: 0,
          clientY: 200,
          pointerId: 1,
          pointerType: 'touch',
        }),
      );
      await flush(r.fixture);

      expect(drawer.hasAttribute('data-dragging')).toBe(false);
    });

    it('Escape and close button still work under reduced-motion', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
      expect(r.instance.reasons).toEqual(['escape']);
    });
  });

  describe('zoneless reactivity', () => {
    it('mounts, traps focus, returns focus on close without Zone.js', async () => {
      const r = renderHost(DrawerHost);
      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.focus();

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.activeElement?.id).toBe('ok');

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('autoFocusOnOpen / autoFocusOnClose', () => {
    it('skips initial focus when [autoFocusOnOpen] calls preventDefault', async () => {
      @Component({
        imports: [ForDrawer],
        template: `
          <input #q id="search" type="search" />
          @if (open()) {
            <div
              forDrawer
              (close)="open.set(false)"
              [autoFocusOnOpen]="vetoOpen"
              ariaLabel="t"
            >
              <button id="inside">inside</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly vetoOpen = (event: VetoableEvent): void => {
          event.preventDefault();
        };
      }

      const r = renderHost(Host);
      const search = (r.fixture.nativeElement as HTMLElement).querySelector(
        '#search',
      ) as HTMLInputElement;
      search.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('search');
    });

    it('skips return-focus when [autoFocusOnClose] calls preventDefault', async () => {
      @Component({
        imports: [ForDrawer],
        template: `
          <button id="trigger" (click)="open.set(true)">open</button>
          @if (open()) {
            <div forDrawer [autoFocusOnClose]="vetoClose" ariaLabel="t">
              <button id="inside">inside</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly vetoClose = (event: VetoableEvent): void => {
          event.preventDefault();
        };
      }

      const r = renderHost(Host);
      const trigger = (r.fixture.nativeElement as HTMLElement).querySelector(
        '#trigger',
      ) as HTMLButtonElement;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      const sentinel = document.createElement('button');
      sentinel.id = 'sentinel';
      document.body.appendChild(sentinel);
      sentinel.focus();

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('sentinel');
      sentinel.remove();
    });
  });
});

describe('ForDrawerTrigger', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  @Component({
    imports: [ForDrawer, ForDrawerTrigger],
    template: `
      <button forDrawerTrigger [(open)]="open" [controls]="drawerId" [disabled]="disabled()">
        Open
      </button>
      @if (open()) {
        <div forDrawer [id]="drawerId" (close)="open.set(false)" ariaLabel="t"></div>
      }
    `,
  })
  class TriggerHost {
    readonly open = signal(false);
    readonly disabled = signal(false);
    readonly drawerId = 'my-drawer';
  }

  it('reflects type=button, aria-haspopup, and aria-expanded=false when closed', async () => {
    const r = renderHost(TriggerHost);
    await flush(r.fixture);
    const trigger = r.query<HTMLButtonElement>('[forDrawerTrigger]')!;

    expect(trigger.getAttribute('type')).toBe('button');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('flips aria-expanded, aria-controls, data-state when drawer opens', async () => {
    const r = renderHost(TriggerHost);
    await flush(r.fixture);
    const trigger = r.query<HTMLButtonElement>('[forDrawerTrigger]')!;

    trigger.click();
    await flush(r.fixture);

    expect(r.instance.open()).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe('my-drawer');
    expect(trigger.getAttribute('data-state')).toBe('open');
  });

  it('ignores clicks and reflects data-disabled when disabled=true', async () => {
    const r = renderHost(TriggerHost);
    r.instance.disabled.set(true);
    await flush(r.fixture);
    const trigger = r.query<HTMLButtonElement>('[forDrawerTrigger]')!;

    expect(trigger.getAttribute('data-disabled')).toBe('');
    trigger.click();
    await flush(r.fixture);

    expect(r.instance.open()).toBe(false);
  });
});

describe('ForDrawer scaleBackground / ForDrawerWrapper', () => {
  @Component({
    imports: [ForDrawer, ForDrawerWrapper],
    template: `
      <div forDrawerWrapper id="shell">
        <button id="trigger" type="button" (click)="open.set(true)">Open</button>
      </div>
      @if (open()) {
        <div
          forDrawer
          id="drawer"
          [scaleBackground]="scaleBackground()"
          [setBackgroundColorOnScale]="setBackgroundColorOnScale()"
          (close)="open.set(false)"
          ariaLabel="Scaled drawer"
        ></div>
      }
    `,
  })
  class ScaleHost {
    readonly open = signal(false);
    readonly scaleBackground = signal(true);
    readonly setBackgroundColorOnScale = signal(true);
  }

  @Component({
    imports: [ForDrawer],
    template: `
      @if (open()) {
        <div
          forDrawer
          id="drawer"
          [scaleBackground]="true"
          (close)="open.set(false)"
          ariaLabel="Wrapperless"
        ></div>
      }
    `,
  })
  class WrapperlessHost {
    readonly open = signal(false);
  }

  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.backgroundColor = '';
  });

  it('does not throw when scaleBackground=true but no [forDrawerWrapper] is mounted', async () => {
    const r = renderHost(WrapperlessHost);
    r.instance.open.set(true);
    await flush(r.fixture);

    const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
    expect(drawer).not.toBeNull();
    expect(drawer.hasAttribute('data-scale-background')).toBe(false);
  });

  it('applies wrapper transform + body color while drawer is open and reverts on close', async () => {
    const r = renderHost(ScaleHost);
    const shell = r.query<HTMLElement>('#shell')!;

    r.instance.open.set(true);
    await flush(r.fixture);

    expect(shell.style.transform).toContain('scale(0.95)');
    expect(shell.style.borderRadius).toBe('8px');
    expect(shell.getAttribute('data-state')).toBe('scaled');
    expect(document.body.style.backgroundColor).toBe('black');

    const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
    expect(drawer.getAttribute('data-scale-background')).toBe('');

    r.instance.open.set(false);
    await flush(r.fixture);

    expect(shell.style.transform).toBe('');
    expect(shell.style.borderRadius).toBe('');
    expect(shell.getAttribute('data-state')).toBe('idle');
    expect(document.body.style.backgroundColor).toBe('');
  });

  it('skips body color when [setBackgroundColorOnScale]="false"', async () => {
    const r = renderHost(ScaleHost);
    r.instance.setBackgroundColorOnScale.set(false);
    r.instance.open.set(true);
    await flush(r.fixture);

    const shell = r.query<HTMLElement>('#shell')!;
    expect(shell.style.transform).toContain('scale(0.95)');
    expect(document.body.style.backgroundColor).toBe('');
  });

  it('skips the effect entirely when scaleBackground=false', async () => {
    const r = renderHost(ScaleHost);
    r.instance.scaleBackground.set(false);
    r.instance.open.set(true);
    await flush(r.fixture);

    const shell = r.query<HTMLElement>('#shell')!;
    expect(shell.style.transform).toBe('');
    expect(document.body.style.backgroundColor).toBe('');

    const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
    expect(drawer.hasAttribute('data-scale-background')).toBe(false);
  });

  it('respects provideForDrawerDefaults({ scaleAmount }) override', async () => {
    @Component({
      imports: [ForDrawer, ForDrawerWrapper],
      providers: [provideForDrawerDefaults({ scaleAmount: 0.9, scaleTranslateYpx: 20 })],
      template: `
        <div forDrawerWrapper id="shell"></div>
        @if (open()) {
          <div forDrawer [scaleBackground]="true" (close)="open.set(false)" ariaLabel="t"></div>
        }
      `,
    })
    class DefaultsHost {
      readonly open = signal(false);
    }

    const r = renderHost(DefaultsHost);
    r.instance.open.set(true);
    await flush(r.fixture);

    const shell = r.query<HTMLElement>('#shell')!;
    expect(shell.style.transform).toContain('scale(0.9)');
    expect(shell.style.transform).toContain('20px');
  });

  describe('prefers-reduced-motion: reduce', () => {
    let restoreReducedMotion: () => void;
    beforeEach(() => {
      restoreReducedMotion = withReducedMotion();
    });
    afterEach(() => {
      restoreReducedMotion();
    });

    it('does not transform the wrapper or paint the body', async () => {
      const r = renderHost(ScaleHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const shell = r.query<HTMLElement>('#shell')!;
      expect(shell.style.transform).toBe('');
      expect(shell.getAttribute('data-state')).toBe('idle');
      expect(document.body.style.backgroundColor).toBe('');

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      expect(drawer.hasAttribute('data-scale-background')).toBe(false);
    });
  });
});
