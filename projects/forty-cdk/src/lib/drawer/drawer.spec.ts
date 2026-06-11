import { Component, ErrorHandler, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ForDrawerScaleCoordinator } from '../_internal/drawer-scale/drawer-scale-coordinator';
import { ForDrawerStack, type DrawerStackHandle } from '../_internal/drawer-stack/drawer-stack';
import type {
  VetoableEvent,
  VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  afterEachOverlayCleanup,
  flush,
  pressKey,
  renderHost,
  withReducedMotion,
} from '../../test-utils';
import { assertDismissableLayerContract } from '../../test-utils/contract';
import { ForDrawer } from './drawer';
import { ForDrawerBackdrop } from './drawer-backdrop';
import { ForDrawerClose } from './drawer-close';
import type { ForDrawerCloseReason, ForDrawerSide, ForDrawerSnapPoint } from './drawer-context';
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

@Component({
  imports: [ForDrawer, ForDrawerTitle],
  template: `
    @if (open()) {
      <div forDrawer (close)="open.set(false)" [ariaLabel]="''">
        <h2 forDrawerTitle>Drawer title</h2>
      </div>
    }
  `,
})
class EmptyAriaLabelHost {
  readonly open = signal(false);
}

describe('ForDrawer (declarative)', () => {
  afterEachOverlayCleanup();

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

    it('emits no aria-label for an empty ariaLabel and keeps aria-labelledby', async () => {
      const r = renderHost(EmptyAriaLabelHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      const title = drawer.querySelector<HTMLElement>('[forDrawerTitle]')!;
      expect(drawer.hasAttribute('aria-label')).toBe(false);
      expect(drawer.getAttribute('aria-labelledby')).toBe(title.id);
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

  // The swipe engine's geometry assertions (drag percentage math, willClose
  // past closeThreshold * dimension, snap-point resolution against a real
  // dimension, "NNpx" conversion) live in `drawer.e2e.ts`, where a real
  // browser produces a real `getBoundingClientRect()`. Vitest covers only
  // what does not depend on a measured layout: the `data-dragging` host
  // attribute toggles, and the `[handleOnly]` listener-arm wiring. See
  // CLAUDE.md "Testing notes" / "E2E (Playwright)" and issue #195 for the
  // geometry-vs-Playwright split.
  describe('swipe gesture wiring', () => {
    function dispatchPointer(
      el: HTMLElement,
      type: 'pointerdown' | 'pointermove' | 'pointerup',
      clientX: number,
      clientY: number,
    ): void {
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          pointerId: 1,
          pointerType: 'touch',
          button: 0,
        }),
      );
    }

    it('reflects data-dragging="" during a swipe and clears it on release', async () => {
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      expect(drawer.hasAttribute('data-dragging')).toBe(false);

      // ARM_DISTANCE_PX inside swipe-dismiss is 4px — the move must clear
      // that to arm the gesture and let the directive flip `#dragging`.
      dispatchPointer(drawer, 'pointerdown', 0, 0);
      dispatchPointer(drawer, 'pointermove', 0, 20);
      await flush(r.fixture);
      expect(drawer.getAttribute('data-dragging')).toBe('');

      dispatchPointer(drawer, 'pointerup', 0, 20);
      await flush(r.fixture);
      expect(drawer.hasAttribute('data-dragging')).toBe(false);
    });

    it('mirrors data-dragging onto the backdrop and publishes --for-drawer-drag-progress', async () => {
      // Wiring only — the exact fade fraction is geometry (jsdom returns a
      // zero rect), so its numeric value during the gesture is asserted in
      // drawer.e2e.ts. Here we check the rest value and that the backdrop,
      // which is portaled away from the surface, tracks the drag state.
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      const backdrop = document.querySelector<HTMLElement>('[forDrawerBackdrop]')!;
      expect(backdrop.hasAttribute('data-dragging')).toBe(false);
      expect(backdrop.style.getPropertyValue('--for-drawer-drag-progress')).toBe('0');

      dispatchPointer(drawer, 'pointerdown', 0, 0);
      dispatchPointer(drawer, 'pointermove', 0, 20);
      await flush(r.fixture);
      expect(backdrop.getAttribute('data-dragging')).toBe('');

      dispatchPointer(drawer, 'pointerup', 0, 20);
      await flush(r.fixture);
      expect(backdrop.hasAttribute('data-dragging')).toBe(false);
      expect(backdrop.style.getPropertyValue('--for-drawer-drag-progress')).toBe('0');
    });

    it('does not arm the swipe when [handleOnly]="true" and pointerdown lands off the handle', async () => {
      // With `handleOnly` on, a pointerdown that does not originate on the
      // registered `[forDrawerHandle]` element must NOT flip `#dragging`,
      // emit `(drag)`, or surface `data-dragging`. The drawer host fields
      // pointer events the same as in the positive case — the gating lives
      // entirely in `#onSwipeStart`.
      @Component({
        imports: [ForDrawer, ForDrawerHandle],
        template: `
          @if (open()) {
            <div
              forDrawer
              [handleOnly]="true"
              (drag)="onDrag()"
              (close)="open.set(false)"
              ariaLabel="t"
            >
              <div forDrawerHandle id="handle"></div>
              <div id="surface-target">surface</div>
            </div>
          }
        `,
      })
      class HandleOnlyHost {
        readonly open = signal(false);
        dragCount = 0;
        onDrag(): void {
          this.dragCount += 1;
        }
      }

      const r = renderHost(HandleOnlyHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      const surface = document.querySelector<HTMLElement>('#surface-target')!;

      // The pointer events must originate on the off-handle target — set
      // `target` explicitly so `#onSwipeStart` sees a non-handle origin.
      const downEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 0,
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
      });
      Object.defineProperty(downEvent, 'target', { value: surface, configurable: true });
      Object.defineProperty(downEvent, 'composedPath', {
        value: () => [surface],
        configurable: true,
      });
      surface.dispatchEvent(downEvent);

      const moveEvent = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 20,
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
      });
      Object.defineProperty(moveEvent, 'target', { value: surface, configurable: true });
      Object.defineProperty(moveEvent, 'composedPath', {
        value: () => [surface],
        configurable: true,
      });
      surface.dispatchEvent(moveEvent);
      await flush(r.fixture);

      expect(r.instance.dragCount).toBe(0);
      expect(drawer.hasAttribute('data-dragging')).toBe(false);
    });

    it('with snapPoints, an upward swipe (away from the edge) arms the gesture', async () => {
      // Bug regression: with snap points the drag is bidirectional, so a
      // pointer travelling away from the anchored edge must arm so the
      // surface can grow toward a larger snap. (Geometry — how far it grows
      // — is covered in drawer.e2e.ts; this asserts only the arming wiring.)
      const r = renderHost(SnapPointsHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      expect(drawer.hasAttribute('data-dragging')).toBe(false);

      dispatchPointer(drawer, 'pointerdown', 0, 40);
      dispatchPointer(drawer, 'pointermove', 0, 10);
      await flush(r.fixture);
      expect(drawer.getAttribute('data-dragging')).toBe('');

      dispatchPointer(drawer, 'pointerup', 0, 10);
      await flush(r.fixture);
      expect(drawer.hasAttribute('data-dragging')).toBe(false);
    });

    it('without snapPoints, an upward swipe does not arm (dismiss is one-way toward the edge)', async () => {
      // A plain drawer only dismisses by swiping toward its anchored edge;
      // an upward gesture has nowhere to go and must be dropped by the swipe
      // helper rather than arming a no-op drag.
      const r = renderHost(DrawerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
      dispatchPointer(drawer, 'pointerdown', 0, 40);
      dispatchPointer(drawer, 'pointermove', 0, 10);
      await flush(r.fixture);
      expect(drawer.hasAttribute('data-dragging')).toBe(false);

      dispatchPointer(drawer, 'pointerup', 0, 10);
      await flush(r.fixture);
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
      Object.defineProperty(event, 'composedPath', { value: () => [backdrop], configurable: true });
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
      Object.defineProperty(event, 'composedPath', { value: () => [child], configurable: true });
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
      await flush(fixture);

      expect(
        captured.some((e) => e instanceof Error && /strictly increasing/.test(e.message)),
      ).toBe(true);
    });

    // Shape-only validation paths that don't depend on layout — the
    // strict-increase check and the finite-number check fire before the
    // directive ever measures the host. The cross-dimension counterparts
    // (`['200px', 0.5]` non-monotonic at the live dimension) live in
    // `drawer.e2e.ts`, where real layout produces a real measurement;
    // jsdom returns zero for `getBoundingClientRect` and faking it via
    // `*.prototype` overrides would only verify the directive's plumbing
    // under a forged input, not the behaviour a consumer sees. See
    // CLAUDE.md "Testing notes" / "E2E (Playwright)" for the rule.
    describe('snap point shape rejections', () => {
      function captureDrawerErrors(
        host: new (...args: unknown[]) => { open: { set(v: boolean): void } },
      ): Promise<unknown[]> {
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
        const fixture = TestBed.createComponent(host);
        fixture.detectChanges();
        fixture.componentInstance.open.set(true);
        return flush(fixture).then(() => captured);
      }

      it("rejects pure-px ['300px', '200px'] at mount via the shape check", async () => {
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
          readonly snaps: ReadonlyArray<ForDrawerSnapPoint> = ['300px', '200px'];
        }

        const captured = await captureDrawerErrors(BadHost);
        expect(
          captured.some((e) => e instanceof Error && /strictly increasing/.test(e.message)),
        ).toBe(true);
      });

      it('rejects pure-fraction [0.5, 0.3] at mount via the shape check', async () => {
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
          readonly snaps: ReadonlyArray<ForDrawerSnapPoint> = [0.5, 0.3];
        }

        const captured = await captureDrawerErrors(BadHost);
        expect(
          captured.some((e) => e instanceof Error && /strictly increasing/.test(e.message)),
        ).toBe(true);
      });

      it('rejects [NaN, 0.5] at mount via the shape check', async () => {
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
          readonly snaps: ReadonlyArray<ForDrawerSnapPoint> = [Number.NaN, 0.5];
        }

        const captured = await captureDrawerErrors(BadHost);
        expect(
          captured.some(
            (e) =>
              e instanceof Error &&
              /\[forty-cdk\/drawer\] Snap point must be a finite number/.test(e.message),
          ),
        ).toBe(true);
      });
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
      await flush(fixture);

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
      await flush(fixture);

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
      await flush(fixture);

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
      await flush(fixture);

      expect(captured.some((e) => e instanceof Error && /fadeFromIndex/.test(e.message))).toBe(
        true,
      );
    });

    describe('runtime snapPoints rebind', () => {
      // The cross-dimension monotonicity check is geometry (jsdom returns a
      // zero rect, so the live-dimension branch defers) and lives in
      // drawer.e2e.ts. What is asserted here is the dimension-independent
      // wiring: a runtime rebind re-runs the shape / fadeFromIndex-range
      // validation rather than trusting the cache from the previous array.
      @Component({
        imports: [ForDrawer],
        template: `
          @if (open()) {
            <div
              forDrawer
              [snapPoints]="snaps()"
              [fadeFromIndex]="fadeFromIndex()"
              (close)="open.set(false)"
              ariaLabel="t"
            ></div>
          }
        `,
      })
      class RebindHost {
        readonly open = signal(false);
        readonly snaps = signal<ReadonlyArray<ForDrawerSnapPoint>>([0.25, 0.5, 1]);
        readonly fadeFromIndex = signal<number | undefined>(undefined);
      }

      function mountRebindHost(): {
        fixture: ReturnType<typeof TestBed.createComponent<RebindHost>>;
        captured: unknown[];
      } {
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
        const fixture = TestBed.createComponent(RebindHost);
        fixture.detectChanges();
        return { fixture, captured };
      }

      it('re-validates the shape when a non-monotonic array is bound at runtime', async () => {
        const { fixture, captured } = mountRebindHost();
        fixture.componentInstance.open.set(true);
        await flush(fixture);
        // The initial monotonic array mounts cleanly.
        expect(
          captured.some((e) => e instanceof Error && /strictly increasing/.test(e.message)),
        ).toBe(false);

        // Swap in a non-monotonic array at runtime — the rebind effect must
        // re-run the shape check rather than trusting the previous validation.
        fixture.componentInstance.snaps.set([0.5, 0.25, 1]);
        await flush(fixture);

        expect(
          captured.some((e) => e instanceof Error && /strictly increasing/.test(e.message)),
        ).toBe(true);
      });

      it('re-validates the fadeFromIndex range when snapPoints shrinks at runtime', async () => {
        const { fixture, captured } = mountRebindHost();
        fixture.componentInstance.fadeFromIndex.set(2);
        fixture.componentInstance.open.set(true);
        await flush(fixture);
        // fadeFromIndex 2 is valid for the 3-element initial array.
        expect(captured.some((e) => e instanceof Error && /fadeFromIndex/.test(e.message))).toBe(
          false,
        );

        // Shrink the array so index 2 is now out of range — the rebind effect
        // must catch it.
        fixture.componentInstance.snaps.set([0.25, 0.5]);
        await flush(fixture);

        expect(captured.some((e) => e instanceof Error && /fadeFromIndex/.test(e.message))).toBe(
          true,
        );
      });

      it('accepts a still-valid array swapped in at runtime without error', async () => {
        const { fixture, captured } = mountRebindHost();
        fixture.componentInstance.open.set(true);
        await flush(fixture);

        fixture.componentInstance.snaps.set([0.1, 0.4, 0.8, 1]);
        await flush(fixture);

        expect(captured.filter((e) => e instanceof Error)).toEqual([]);
      });
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
            <div forDrawer (close)="open.set(false)" [autoFocusOnOpen]="vetoOpen" ariaLabel="t">
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
        callCount = 0;
        readonly vetoClose = (event: VetoableEvent): void => {
          this.callCount += 1;
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

      // Modal-path regression: callback fires exactly once and the veto is
      // honoured by the focus-trap deactivate (focus stays on sentinel,
      // does not return to #trigger).
      expect(r.instance.callCount).toBe(1);
      expect(document.activeElement?.id).toBe('sentinel');
      sentinel.remove();
    });

    it('fires [autoFocusOnClose] exactly once on close when [modal]="false" (issue #174)', async () => {
      // Issue #174: callback was previously skipped on the non-modal close
      // path because the invocation lived inside the `if (#activatedAsModal)`
      // branch of the destroy hook. After the fix, the callback fires on
      // every close path regardless of mode — matching `ForDrawerManager`.
      @Component({
        imports: [ForDrawer],
        template: `
          <button id="trigger" (click)="open.set(true)">open</button>
          @if (open()) {
            <div forDrawer [modal]="false" [autoFocusOnClose]="onClose" ariaLabel="t">
              <button id="inside">inside</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        callCount = 0;
        readonly onClose = (_event: VetoableEvent): void => {
          this.callCount += 1;
        };
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(r.instance.callCount).toBe(1);
    });

    it('exposes the veto state on the non-modal close event for consumer inspection (issue #174)', async () => {
      // Non-modal mode never moves focus on close, so the veto is purely
      // informational — but the callback still receives a VetoableEvent so
      // consumers' code path is identical regardless of mode.
      @Component({
        imports: [ForDrawer],
        template: `
          @if (open()) {
            <div forDrawer [modal]="false" [autoFocusOnClose]="vetoClose" ariaLabel="t">
              <button id="inside">inside</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        captured: VetoableEvent | null = null;
        readonly vetoClose = (event: VetoableEvent): void => {
          event.preventDefault();
          this.captured = event;
        };
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(r.instance.captured?.defaultPrevented).toBe(true);
    });
  });
});

describe('ForDrawerTrigger', () => {
  afterEachOverlayCleanup();

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
    // Disabled-related attributes are absent when not disabled — never
    // emitted as "false". Consumers must select on `:not([aria-disabled])`.
    expect(trigger.hasAttribute('data-disabled')).toBe(false);
    expect(trigger.hasAttribute('aria-disabled')).toBe(false);
    expect(trigger.hasAttribute('disabled')).toBe(false);
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

  it('ignores clicks and reflects disabled attributes when disabled=true', async () => {
    const r = renderHost(TriggerHost);
    r.instance.disabled.set(true);
    await flush(r.fixture);
    const trigger = r.query<HTMLButtonElement>('[forDrawerTrigger]')!;

    expect(trigger.getAttribute('data-disabled')).toBe('');
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect(trigger.getAttribute('disabled')).toBe('');
    trigger.click();
    await flush(r.fixture);

    expect(r.instance.open()).toBe(false);
  });
});

describe('ForDrawer scaleBackground / ForDrawerWrapper', () => {
  afterEachOverlayCleanup();

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
    document.body.style.backgroundColor = '';
  });

  it('does not throw when scaleBackground=true but no [forDrawerWrapper] is mounted', async () => {
    const r = renderHost(WrapperlessHost);
    r.instance.open.set(true);
    await flush(r.fixture);

    const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
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

describe('ForDrawer teardown order', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    document.body.style.backgroundColor = '';
  });

  // Pins the deliberate teardown sequence inside the single
  // `DestroyRef.onDestroy` hook (swipe → scale → drawer-stack pop) so the
  // ordering can't silently regress to depending on hook-registration order.
  // The swipe cleanup leaves no DI-observable trace, so the assertion pins
  // the two coordinator-backed steps (scale before stack), which is the pair
  // whose order matters for the DrawerStack out-of-order guard.
  @Component({
    imports: [ForDrawer, ForDrawerWrapper],
    template: `
      <div forDrawerWrapper id="shell"></div>
      @if (open()) {
        <div forDrawer [scaleBackground]="true" (close)="open.set(false)" ariaLabel="t"></div>
      }
    `,
  })
  class TeardownHost {
    readonly open = signal(false);
  }

  it('tears down scale before the drawer-stack pop in one destroy hook', async () => {
    const order: string[] = [];

    class RecordingScaleCoordinator extends ForDrawerScaleCoordinator {
      override registerDrawer(
        config: Parameters<ForDrawerScaleCoordinator['registerDrawer']>[0],
      ): () => void {
        const cleanup = super.registerDrawer(config);
        return () => {
          order.push('scale');
          cleanup();
        };
      }
    }

    class RecordingDrawerStack extends ForDrawerStack {
      override push(node: Parameters<ForDrawerStack['push']>[0]): DrawerStackHandle {
        const handle = super.push(node);
        return {
          depth: handle.depth,
          cleanup: () => {
            order.push('stack');
            handle.cleanup();
          },
        };
      }
    }

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ForDrawerScaleCoordinator, useClass: RecordingScaleCoordinator },
        { provide: ForDrawerStack, useClass: RecordingDrawerStack },
      ],
    });
    const fixture = TestBed.createComponent(TeardownHost);
    fixture.detectChanges();
    fixture.componentInstance.open.set(true);
    await flush(fixture);

    expect(order).toEqual([]);

    fixture.componentInstance.open.set(false);
    await flush(fixture);

    expect(order).toEqual(['scale', 'stack']);
  });

  it('re-opens cleanly after close (drawer-stack pop ran, no stale-stack throw)', async () => {
    const r = renderHost(TeardownHost);
    r.instance.open.set(true);
    await flush(r.fixture);
    expect(document.querySelector('[forDrawer]')).not.toBeNull();

    r.instance.open.set(false);
    await flush(r.fixture);
    expect(document.querySelector('[forDrawer]')).toBeNull();
    expect(document.body.style.overflow).toBe('');

    // A second open/close cycle would throw the DrawerStack out-of-order
    // error if the previous pop had been skipped.
    expect(() => r.instance.open.set(true)).not.toThrow();
    await flush(r.fixture);
    const shell = r.query<HTMLElement>('#shell')!;
    expect(shell.style.transform).toContain('scale(0.95)');

    r.instance.open.set(false);
    await flush(r.fixture);
    expect(shell.style.transform).toBe('');
  });
});

describe('ForDrawer runtime prefers-reduced-motion flip', () => {
  afterEachOverlayCleanup();

  interface FakeMql {
    matches: boolean;
    media: string;
    listeners: Array<(event: { matches: boolean }) => void>;
    addEventListener(type: 'change', l: (event: { matches: boolean }) => void): void;
    removeEventListener(type: 'change', l: (event: { matches: boolean }) => void): void;
    dispatch(matches: boolean): void;
  }

  function makeMql(query: string, matches: boolean): FakeMql {
    return {
      matches,
      media: query,
      listeners: [],
      addEventListener(_type, l) {
        this.listeners.push(l);
      },
      removeEventListener(_type, l) {
        this.listeners = this.listeners.filter((x) => x !== l);
      },
      dispatch(next) {
        this.matches = next;
        for (const l of this.listeners) {
          l({ matches: next });
        }
      },
    };
  }

  let restore: () => void = () => {};
  let mql: FakeMql;

  beforeEach(() => {
    mql = makeMql('(prefers-reduced-motion: reduce)', false);
    const target = window as unknown as { matchMedia?: (query: string) => MediaQueryList };
    const had = 'matchMedia' in target;
    const original = target.matchMedia;
    Object.defineProperty(target, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => {
        mql.media = query;
        return mql as unknown as MediaQueryList;
      },
    });
    restore = () => {
      if (had) {
        Object.defineProperty(target, 'matchMedia', {
          configurable: true,
          writable: true,
          value: original,
        });
      } else {
        delete target.matchMedia;
      }
    };
  });

  afterEach(() => {
    restore();
  });

  function dispatchPointer(
    el: HTMLElement,
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    clientX: number,
    clientY: number,
  ): void {
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
      }),
    );
  }

  it('disarms the swipe gesture when reduced-motion flips on at runtime', async () => {
    const r = renderHost(DrawerHost);
    r.instance.open.set(true);
    await flush(r.fixture);

    const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
    // Baseline: swipe is armed (motion not reduced), so a drag flips dragging.
    dispatchPointer(drawer, 'pointerdown', 0, 0);
    dispatchPointer(drawer, 'pointermove', 0, 20);
    await flush(r.fixture);
    expect(drawer.getAttribute('data-dragging')).toBe('');
    dispatchPointer(drawer, 'pointerup', 0, 20);
    await flush(r.fixture);

    // Flip reduced-motion on at runtime — the gesture must disarm.
    mql.dispatch(true);
    await flush(r.fixture);

    dispatchPointer(drawer, 'pointerdown', 0, 0);
    dispatchPointer(drawer, 'pointermove', 0, 20);
    await flush(r.fixture);
    expect(drawer.hasAttribute('data-dragging')).toBe(false);
  });

  it('arms the swipe gesture when reduced-motion flips off at runtime', async () => {
    mql.matches = true;
    const r = renderHost(DrawerHost);
    r.instance.open.set(true);
    await flush(r.fixture);

    const drawer = document.querySelector<HTMLElement>('[forDrawer]')!;
    // Baseline: motion reduced at mount, so no swipe listener is armed.
    dispatchPointer(drawer, 'pointerdown', 0, 0);
    dispatchPointer(drawer, 'pointermove', 0, 20);
    await flush(r.fixture);
    expect(drawer.hasAttribute('data-dragging')).toBe(false);

    // Flip reduced-motion off at runtime — the gesture must arm.
    mql.dispatch(false);
    await flush(r.fixture);

    dispatchPointer(drawer, 'pointerdown', 0, 0);
    dispatchPointer(drawer, 'pointermove', 0, 20);
    await flush(r.fixture);
    expect(drawer.getAttribute('data-dragging')).toBe('');
  });
});
