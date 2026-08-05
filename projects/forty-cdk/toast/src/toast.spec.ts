import {
  Component,
  inject,
  provideZonelessChangeDetection,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import type {
  ForToastInstance,
  ForToastSwipeDirection,
  ForToastTemplateContext,
} from './toast-context';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { afterEachOverlayCleanup } from '../../src/test-utils/overlay-cleanup';
import { flush, nextMacrotask } from '../../src/test-utils/flush';
import { renderHost } from '../../src/test-utils/render';
import { withReducedMotion } from '../../src/test-utils/reduced-motion';
import { ForToast } from './toast';
import { ForToastAction } from './toast-action';
import { ForToastClose } from './toast-close';
import { ForToastDescription } from './toast-description';
import { ForToastTitle } from './toast-title';
import { ForToastViewport } from './toast-viewport';
import { provideForToastDefaults } from './toast-defaults';
import { ForToastManager } from './toast-manager';
import { type ForToastStackShift } from './toast-stack-shift';
import { type SwipeEventDetail } from 'forty-cdk/core';

function pointer(
  el: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: { clientX?: number; clientY?: number; pointerId?: number; button?: number } = {},
): PointerEvent {
  const ev = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    pointerId: init.pointerId ?? 1,
    button: init.button ?? 0,
    pointerType: 'touch',
  });
  el.dispatchEvent(ev);
  return ev;
}

@Component({
  imports: [ForToastViewport, ForToastTitle, ForToastDescription, ForToastAction, ForToastClose],
  template: `
    <button #opener type="button" data-test-id="opener">Opener</button>
    <for-toast-viewport
      [maxVisible]="maxVisible()"
      [hotkey]="hotkey()"
      [animateEnter]="vpAnimateEnter()"
      [animateLeave]="vpAnimateLeave()"
    />
    <ng-template #titleOnly let-toast let-data="data">
      <span data-test-id="custom-title">{{ data.label }}</span>
      <button type="button" data-test-id="custom-dismiss" (click)="toast.dismiss()">x</button>
    </ng-template>
    <ng-template #wired let-toast let-data="data">
      <div forToastTitle data-test-id="wired-title">{{ data.label }}</div>
      <div forToastDescription data-test-id="wired-desc">{{ data.desc }}</div>
      <button forToastAction [altText]="data.altText" data-test-id="wired-action">Undo</button>
      <button forToastClose data-test-id="wired-close">×</button>
    </ng-template>
  `,
})
class ProgrammaticHost {
  readonly toasts = inject(ForToastManager);
  readonly maxVisible = signal<number | null>(null);
  readonly hotkey = signal<string>('');
  readonly vpAnimateEnter = signal<string>('');
  readonly vpAnimateLeave = signal<string>('');
  readonly tpl =
    viewChild.required<TemplateRef<ForToastTemplateContext<{ label: string }>>>('titleOnly');
  readonly wiredTpl =
    viewChild.required<
      TemplateRef<ForToastTemplateContext<{ label: string; desc: string; altText: string }>>
    >('wired');
}

@Component({
  imports: [ForToast, ForToastTitle, ForToastDescription, ForToastAction, ForToastClose],
  template: `
    @if (open()) {
      <div
        forToast
        [variant]="variant()"
        [duration]="duration()"
        [dismissible]="dismissible()"
        [swipeDirection]="swipeDirection()"
        [swipeThreshold]="swipeThreshold()"
        (dismiss)="onClose($event)"
        (swipeStart)="onSwipeStart($event)"
        (swipeMove)="onSwipeMove($event)"
        (swipeEnd)="onSwipeEnd($event)"
        (swipeCancel)="onSwipeCancel($event)"
        data-test-id="declarative"
      >
        <div forToastTitle>{{ title() }}</div>
        @if (description()) {
          <div forToastDescription>{{ description() }}</div>
        }
        @if (showAction()) {
          <button forToastAction (click)="onAction()" data-test-id="action">Action</button>
        }
        @if (dismissible()) {
          <button forToastClose data-test-id="close">×</button>
        }
      </div>
    }
  `,
})
class DeclarativeHost {
  readonly open = signal(true);
  readonly variant = signal<'info' | 'success' | 'warning' | 'error'>('info');
  readonly duration = signal(5000);
  readonly dismissible = signal(true);
  readonly title = signal('Saved');
  readonly description = signal('Your changes are live.');
  readonly showAction = signal(false);
  readonly swipeDirection = signal<ForToastSwipeDirection>(null);
  readonly swipeThreshold = signal(50);
  readonly closes: string[] = [];
  readonly actionsClicked = signal(0);
  readonly swipeStarts: SwipeEventDetail[] = [];
  readonly swipeMoves: SwipeEventDetail[] = [];
  readonly swipeEnds: SwipeEventDetail[] = [];
  readonly swipeCancels: SwipeEventDetail[] = [];

  onClose(reason: string): void {
    this.closes.push(reason);
    this.open.set(false);
  }

  onAction(): void {
    this.actionsClicked.update((n) => n + 1);
  }

  onSwipeStart(detail: SwipeEventDetail): void {
    this.swipeStarts.push(detail);
  }
  onSwipeMove(detail: SwipeEventDetail): void {
    this.swipeMoves.push(detail);
  }
  onSwipeEnd(detail: SwipeEventDetail): void {
    this.swipeEnds.push(detail);
  }
  onSwipeCancel(detail: SwipeEventDetail): void {
    this.swipeCancels.push(detail);
  }
}

@Component({
  imports: [ForToast, ForToastTitle, ForToastDescription, ForToastAction],
  template: `
    <div forToast [variant]="variant()" [duration]="duration()" data-test-id="alt-toast">
      <div forToastTitle>{{ title() }}</div>
      @if (description()) {
        <div forToastDescription>{{ description() }}</div>
      }
      <button forToastAction [altText]="altText()" data-test-id="alt-action">Undo</button>
    </div>
  `,
})
class AltTextHost {
  readonly variant = signal<'info' | 'success' | 'warning' | 'error'>('info');
  readonly duration = signal(5000);
  readonly title = signal('Saved');
  readonly description = signal('Your changes are live.');
  readonly altText = signal('');
}

@Component({
  imports: [ForToastViewport],
  template: `
    <button #opener type="button" data-test-id="opener">Opener</button>
    @if (showA()) {
      <for-toast-viewport [region]="regionA()" data-test-id="vp-a" />
    }
    @if (showB()) {
      <for-toast-viewport [region]="regionB()" data-test-id="vp-b" />
    }
  `,
})
class MultiViewportHost {
  readonly toasts = inject(ForToastManager);
  readonly showA = signal(true);
  readonly showB = signal(true);
  readonly regionA = signal('default');
  readonly regionB = signal('default');
}

const $ = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-id="${id}"]`);

const toastsIn = (host: HTMLElement, id: string): HTMLElement[] =>
  Array.from($(host, id)!.querySelectorAll<HTMLElement>('[forToast]'));

// LiveAnnouncer schedules every text write through `setTimeout(…, 0)` (a
// macrotask — see the LiveAnnouncer JSDoc for the screen-reader rationale), so
// the altText announcement specs below need a macrotask hop after the render
// before the region is populated. `await r.flush()` already includes one; specs
// that drive change detection directly use `await nextMacrotask()`.

function getLiveAnnouncerRegion(politeness: 'polite' | 'assertive'): HTMLElement | null {
  // The toast directive itself binds aria-live to its host. LiveAnnouncer
  // inserts its own region directly under document.body — distinguish by
  // matching the body-level element specifically.
  const matches = document.querySelectorAll<HTMLElement>(`[aria-live="${politeness}"]`);
  for (const el of matches) {
    if (el.parentElement === document.body) {
      return el;
    }
  }
  return null;
}

describe('ForToast (declarative)', () => {
  afterEachOverlayCleanup();

  describe('static accessibility', () => {
    it('non-error variants get role=status with the host aria-live silenced', () => {
      const { el } = renderHost(DeclarativeHost);
      const t = $(el, 'declarative')!;
      expect(t.getAttribute('role')).toBe('status');
      expect(t.getAttribute('aria-live')).toBe('off');
      expect(t.getAttribute('aria-atomic')).toBe('true');
    });

    it('error variant (no action altText) keeps role=alert + a live host aria-live=assertive', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.variant.set('error');
      await r.flush();
      const t = $(r.el, 'declarative')!;
      expect(t.getAttribute('role')).toBe('alert');
      expect(t.getAttribute('aria-live')).toBe('assertive');
    });

    it('aria-labelledby + aria-describedby are wired from title and description', () => {
      const { el } = renderHost(DeclarativeHost);
      const t = $(el, 'declarative')!;
      const titleId = t.querySelector('[forToastTitle]')!.id;
      const descId = t.querySelector('[forToastDescription]')!.id;
      expect(t.getAttribute('aria-labelledby')).toBe(titleId);
      expect(t.getAttribute('aria-describedby')).toBe(descId);
    });

    it('reflects data-variant', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.variant.set('warning');
      await r.flush();
      expect($(r.el, 'declarative')!.getAttribute('data-variant')).toBe('warning');
    });

    it('keeps tabindex=0 so the toast is reachable via the viewport hotkey', () => {
      const { el } = renderHost(DeclarativeHost);
      expect($(el, 'declarative')!.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('auto-dismiss', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('emits (dismiss) with reason "auto" after duration', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      vi.advanceTimersByTime(4_999);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      await r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });

    it('duration=0 stays sticky', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.duration.set(0);
      await r.flush();
      vi.advanceTimersByTime(60_000);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
    });

    it('changing duration mid-flight resets the timer', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      vi.advanceTimersByTime(2_000);
      await r.flush();
      r.instance.duration.set(1_000);
      await r.flush();
      vi.advanceTimersByTime(999);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      await r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });
  });

  describe('hover / focus pause', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('pointerenter pauses, pointerleave resumes', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      vi.advanceTimersByTime(2_000);
      await r.flush();
      t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await r.flush();
      expect(t.getAttribute('data-paused')).toBe('');
      vi.advanceTimersByTime(60_000);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);
      vi.advanceTimersByTime(2_999);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      await r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });

    it('focus inside pauses; focus leaving resumes', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.showAction.set(true);
      await r.flush();
      const t = $(r.el, 'declarative')!;
      const action = $(r.el, 'action')!;
      action.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await r.flush();
      expect(t.getAttribute('data-paused')).toBe('');
      vi.advanceTimersByTime(60_000);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      action.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
      await r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);
      outside.remove();
    });

    it('focus moving between elements within the toast keeps it paused', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.showAction.set(true);
      await r.flush();
      const t = $(r.el, 'declarative')!;
      const action = $(r.el, 'action')!;
      const close = $(r.el, 'close')!;
      action.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      action.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: close }));
      close.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await r.flush();
      expect(t.getAttribute('data-paused')).toBe('');
    });

    it('a non-duration re-render while paused preserves the captured remaining time', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;

      vi.advanceTimersByTime(2_000);
      await r.flush();
      t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await r.flush();
      expect(t.getAttribute('data-paused')).toBe('');

      r.instance.variant.set('warning');
      await r.flush();
      expect(r.instance.closes).toEqual([]);

      t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await r.flush();
      vi.advanceTimersByTime(2_999);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      await r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });

    it('a duration update while paused restarts the countdown at the full new duration on resume', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;

      vi.advanceTimersByTime(2_000);
      await r.flush();
      t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await r.flush();
      expect(t.getAttribute('data-paused')).toBe('');

      r.instance.duration.set(10_000);
      await r.flush();
      expect(r.instance.closes).toEqual([]);

      t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await r.flush();
      vi.advanceTimersByTime(9_999);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      await r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });

    it('pausing exactly at the expiry instant still dismisses on resume (never goes sticky)', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      vi.setSystemTime(Date.now() + 5000);
      t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await r.flush();
      vi.advanceTimersByTime(1);
      await r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });
  });

  describe('document visibility pause', () => {
    afterEach(() => {
      vi.useRealTimers();
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
    });

    function setVisibility(state: 'visible' | 'hidden'): void {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => state,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }

    it('pauses the auto-dismiss timer when the page becomes hidden', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;

      vi.advanceTimersByTime(2_000);
      await r.flush();

      setVisibility('hidden');
      await r.flush();
      expect(t.getAttribute('data-paused')).toBe('');

      vi.advanceTimersByTime(60_000);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
    });

    it('resumes with the remaining time when the page becomes visible again', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;

      vi.advanceTimersByTime(2_000);
      await r.flush();

      setVisibility('hidden');
      await r.flush();
      vi.advanceTimersByTime(60_000);
      await r.flush();
      expect(r.instance.closes).toEqual([]);

      setVisibility('visible');
      await r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);

      vi.advanceTimersByTime(2_999);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      await r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });

    it('keeps paused while hover is also active and only resumes once both clear', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;

      t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      setVisibility('hidden');
      await r.flush();
      expect(t.getAttribute('data-paused')).toBe('');

      // Visibility returns first; hover pause keeps the timer down.
      setVisibility('visible');
      await r.flush();
      expect(t.getAttribute('data-paused')).toBe('');

      // Releasing hover too clears the pause.
      t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);
    });

    it('removes its document listener when the toast unmounts', async () => {
      const r = renderHost(DeclarativeHost);
      await r.flush();
      r.instance.open.set(false);
      await r.flush();

      // Smoke-check: dispatching a visibilitychange after destroy must not throw
      // and the toast (now unmounted) must not be in the DOM.
      expect(() => setVisibility('hidden')).not.toThrow();
      expect($(r.el, 'declarative')).toBeNull();
    });
  });

  describe('mounted while the tab is hidden', () => {
    let visibility: 'visible' | 'hidden';

    beforeEach(() => {
      visibility = 'hidden';
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => visibility,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
    });

    it('does not count down until the tab becomes visible', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      expect(t.getAttribute('data-paused')).toBe('');

      vi.advanceTimersByTime(60_000);
      await r.flush();
      expect(r.instance.closes).toEqual([]);

      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      await r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);

      vi.advanceTimersByTime(4_999);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      await r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });
  });

  describe('non-dismissible does not schedule an auto-dismiss timer', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('dismissible=false never wires a timer for the duration', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(DeclarativeHost);
      fixture.componentInstance.dismissible.set(false);
      const spy = vi.spyOn(globalThis, 'setTimeout');
      fixture.detectChanges();
      expect(spy).not.toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('dismissible=true with the same duration DOES schedule a timer', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(DeclarativeHost);
      const spy = vi.spyOn(globalThis, 'setTimeout');
      fixture.detectChanges();
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('dismissible=false does not emit (dismiss) after the duration elapses', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.dismissible.set(false);
      await r.flush();
      vi.advanceTimersByTime(60_000);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
    });
  });

  describe('manual close paths', () => {
    it('Escape closes when dismissible', async () => {
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      t.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await r.flush();
      expect(r.instance.closes).toEqual(['escape']);
    });

    it('Escape is a no-op when dismissible=false', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.dismissible.set(false);
      await r.flush();
      const t = $(r.el, 'declarative')!;
      t.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await r.flush();
      expect(r.instance.closes).toEqual([]);
    });

    it('close button click → reason "manual"', async () => {
      const r = renderHost(DeclarativeHost);
      const close = $(r.el, 'close')!;
      close.click();
      await r.flush();
      expect(r.instance.closes).toEqual(['manual']);
    });

    it('action button click → consumer handler runs, then reason "action"', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.showAction.set(true);
      await r.flush();
      const action = $(r.el, 'action')!;
      action.click();
      await r.flush();
      expect(r.instance.actionsClicked()).toBe(1);
      expect(r.instance.closes).toEqual(['action']);
    });

    it('action close fires even when dismissible=false', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.dismissible.set(false);
      r.instance.showAction.set(true);
      await r.flush();
      $(r.el, 'action')!.click();
      await r.flush();
      expect(r.instance.closes).toEqual(['action']);
    });
  });

  describe('swipe-to-dismiss', () => {
    it('does not arm a swipe when [swipeDirection] is null (default)', async () => {
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 80, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 80, clientY: 0 });
      await r.flush();
      expect(t.hasAttribute('data-swipe')).toBe(false);
      expect(r.instance.swipeStarts).toEqual([]);
      expect(r.instance.closes).toEqual([]);
    });

    it('reflects data-swipe="start"|"move" and CSS movement vars during a swipe', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      await r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 20, clientY: 0 });
      await r.flush();
      expect(t.getAttribute('data-swipe')).toBe('move');
      expect(t.getAttribute('data-swipe-direction')).toBe('right');
      expect(t.style.getPropertyValue('--for-toast-swipe-movement-x')).toBe('20px');
      expect(t.style.getPropertyValue('--for-toast-swipe-movement-y')).toBe('0px');
      expect(r.instance.swipeStarts).toHaveLength(1);
      expect(r.instance.swipeMoves.length).toBeGreaterThanOrEqual(1);
    });

    it('crosses the threshold → swipeEnd, data-swipe="end", and (dismiss) with reason "swipe"', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      r.instance.swipeThreshold.set(50);
      await r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 60, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 60, clientY: 0 });
      await r.flush();
      expect(r.instance.swipeEnds).toHaveLength(1);
      expect(r.instance.swipeCancels).toEqual([]);
      expect(r.instance.closes).toEqual(['swipe']);
    });

    it('releases under threshold → swipeCancel, data-swipe="cancel", no (dismiss)', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      r.instance.swipeThreshold.set(80);
      await r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 30, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 30, clientY: 0 });
      await r.flush();
      expect(r.instance.swipeCancels).toHaveLength(1);
      expect(r.instance.swipeEnds).toEqual([]);
      expect(t.getAttribute('data-swipe')).toBe('cancel');
      expect(r.instance.closes).toEqual([]);
    });

    it('clears the parked data-swipe="cancel" and movement vars on the next pointerdown', async () => {
      // F10: after a cancel the host keeps data-swipe="cancel" + the released
      // movement vars (for the consumer's CSS spring-back), but the next
      // pointerdown is the terminal reset so a stale cancel never lingers.
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      r.instance.swipeThreshold.set(80);
      await r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 30, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 30, clientY: 0 });
      await r.flush();
      expect(t.getAttribute('data-swipe')).toBe('cancel');
      expect(t.style.getPropertyValue('--for-toast-swipe-movement-x')).toBe('30px');

      // Next pointer interaction neutralizes the parked cancel state.
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      await r.flush();
      expect(t.hasAttribute('data-swipe')).toBe(false);
      expect(t.getAttribute('data-swipe-direction')).toBeNull();
      expect(t.style.getPropertyValue('--for-toast-swipe-movement-x')).toBe('0px');
      expect(t.style.getPropertyValue('--for-toast-swipe-movement-y')).toBe('0px');
    });

    it('accepts an array of allowed directions', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set(['right', 'down']);
      await r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 0, clientY: 60 });
      pointer(t, 'pointerup', { clientX: 0, clientY: 60 });
      await r.flush();
      expect(r.instance.swipeEnds).toHaveLength(1);
      expect(r.instance.swipeEnds[0]!.direction).toBe('down');
      expect(r.instance.closes).toEqual(['swipe']);
    });

    it('disallowed dominant direction is dropped silently', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      await r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 5, clientY: 80 });
      pointer(t, 'pointerup', { clientX: 5, clientY: 80 });
      await r.flush();
      expect(r.instance.swipeStarts).toEqual([]);
      expect(r.instance.swipeEnds).toEqual([]);
      expect(r.instance.closes).toEqual([]);
    });

    it('dismissible=false disables swipe entirely (no events, no close)', async () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      r.instance.dismissible.set(false);
      await r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 200, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 200, clientY: 0 });
      await r.flush();
      expect(r.instance.swipeStarts).toEqual([]);
      expect(r.instance.closes).toEqual([]);
    });

    it('a swipe past threshold dismisses', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(DeclarativeHost);
      fixture.componentInstance.swipeDirection.set('right');
      fixture.detectChanges();
      const t = fixture.nativeElement.querySelector('[data-test-id="declarative"]') as HTMLElement;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 80, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 80, clientY: 0 });
      fixture.detectChanges();
      expect(fixture.componentInstance.closes).toEqual(['swipe']);
    });
  });

  describe('announcements (LiveAnnouncer)', () => {
    afterEach(() => {
      // LiveAnnouncer keeps two off-screen regions in document.body across
      // tests by design; detach them so each test starts from a clean slate
      // rather than matching a stale (text-cleared) region from a prior test.
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('silences the host aria-live even when no action carries altText', () => {
      const r = renderHost(AltTextHost);
      expect($(r.el, 'alt-toast')!.getAttribute('aria-live')).toBe('off');
    });

    it('announces title + description via LiveAnnouncer without any altText', async () => {
      const r = renderHost(AltTextHost);
      await r.flush();

      expect(getLiveAnnouncerRegion('polite')!.textContent).toBe('Saved. Your changes are live.');
      expect($(r.el, 'alt-toast')!.textContent).toContain('Saved');
    });

    it('error with no action altText keeps its host live, off the LiveAnnouncer path', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AltTextHost);
      fixture.componentInstance.variant.set('error');
      fixture.componentInstance.title.set('Save failed');
      fixture.detectChanges();
      await nextMacrotask();

      const t = fixture.nativeElement.querySelector('[data-test-id="alt-toast"]') as HTMLElement;
      expect(t.getAttribute('aria-live')).toBe('assertive');
      expect(getLiveAnnouncerRegion('assertive')?.textContent ?? '').toBe('');
      expect(getLiveAnnouncerRegion('polite')?.textContent ?? '').toBe('');
    });

    it('silences the host aria-live and announces composed message via LiveAnnouncer', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AltTextHost);
      // Set altText BEFORE first change detection so the action mounts with
      // the value already in place.
      fixture.componentInstance.altText.set('Undo (Cmd+Z)');
      fixture.detectChanges();
      await nextMacrotask();

      const t = fixture.nativeElement.querySelector('[data-test-id="alt-toast"]') as HTMLElement;
      expect(t.getAttribute('aria-live')).toBe('off');

      const region = getLiveAnnouncerRegion('polite');
      expect(region!.textContent).toBe('Saved. Your changes are live.. Undo (Cmd+Z)');
    });

    it('appends a late-bound altText set after first render (F1)', async () => {
      // The reactive announcement effect fires on the edge altText becomes
      // non-empty, folding the recovery hint into the already-announced
      // title / description without re-mounting anything.
      const r = renderHost(AltTextHost);
      await r.flush();
      expect($(r.el, 'alt-toast')!.getAttribute('aria-live')).toBe('off');
      expect(getLiveAnnouncerRegion('polite')!.textContent).toBe('Saved. Your changes are live.');

      r.instance.altText.set('Undo (Cmd+Z)');
      await r.flush();

      expect($(r.el, 'alt-toast')!.getAttribute('aria-live')).toBe('off');
      expect(getLiveAnnouncerRegion('polite')!.textContent).toBe(
        'Saved. Your changes are live.. Undo (Cmd+Z)',
      );
    });

    it('re-announces when the title changes while on the silenced path (F2)', async () => {
      // A text change (the declarative analogue of ref.update()) re-composes
      // and re-announces through LiveAnnouncer — aria-atomic does nothing on
      // the silenced path, so the directive drives the re-announce.
      const r = renderHost(AltTextHost);
      r.instance.altText.set('Undo (Cmd+Z)');
      await r.flush();
      expect(getLiveAnnouncerRegion('polite')!.textContent).toBe(
        'Saved. Your changes are live.. Undo (Cmd+Z)',
      );

      r.instance.title.set('Saved to cloud');
      await r.flush();
      expect(getLiveAnnouncerRegion('polite')!.textContent).toBe(
        'Saved to cloud. Your changes are live.. Undo (Cmd+Z)',
      );
    });

    it('routes error variant announcements through the assertive region', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AltTextHost);
      fixture.componentInstance.variant.set('error');
      fixture.componentInstance.title.set('Save failed');
      fixture.componentInstance.description.set('Network unreachable.');
      fixture.componentInstance.altText.set('Retry (Cmd+R)');
      fixture.detectChanges();
      await nextMacrotask();

      const t = fixture.nativeElement.querySelector('[data-test-id="alt-toast"]') as HTMLElement;
      expect(t.getAttribute('aria-live')).toBe('off');

      const region = getLiveAnnouncerRegion('assertive');
      expect(region!.textContent).toBe('Save failed. Network unreachable.. Retry (Cmd+R)');
    });
  });

  describe('prefers-reduced-motion: reduce', () => {
    let restoreReducedMotion: () => void;
    beforeEach(() => {
      restoreReducedMotion = withReducedMotion();
    });
    afterEach(() => {
      restoreReducedMotion();
      vi.useRealTimers();
    });

    it('still auto-dismisses after [duration] under reduced-motion', async () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      vi.advanceTimersByTime(4_999);
      await r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      await r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });
  });
});

describe('ForToastManager (programmatic)', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    vi.useRealTimers();
    // The re-announce specs route through LiveAnnouncer, which keeps its
    // off-screen regions in document.body across tests by design — detach them
    // so the next spec doesn't match a stale region.
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  it('show() pushes a toast and renders it through the viewport', async () => {
    const r = renderHost(ProgrammaticHost);
    expect(r.el.querySelectorAll('[forToast]').length).toBe(0);
    r.instance.toasts.show({ title: 'Saved' });
    await r.flush();
    const rendered = r.el.querySelectorAll('[forToast]');
    expect(rendered.length).toBe(1);
    expect(rendered[0]!.querySelector('[forToastTitle]')?.textContent).toContain('Saved');
  });

  it('viewport host opts into modal coexistence via data-for-modal-exempt', () => {
    const r = renderHost(ProgrammaticHost);
    const viewport = r.el.querySelector('for-toast-viewport')!;
    expect(viewport.hasAttribute('data-for-modal-exempt')).toBe(true);
  });

  it('description and close button render by default', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'Saved', description: 'Your changes are live.' });
    await r.flush();
    const t = r.el.querySelector('[forToast]')!;
    expect(t.querySelector('[forToastDescription]')?.textContent).toContain('Your changes');
    expect(t.querySelector('[forToastClose]')).not.toBeNull();
  });

  it('action button invokes handler and dismisses the toast', async () => {
    const r = renderHost(ProgrammaticHost);
    let clicked = 0;
    const ref = r.instance.toasts.show({
      title: 'Item deleted',
      action: { label: 'Undo', activate: () => clicked++ },
    });
    await r.flush();
    const action = r.el.querySelector<HTMLElement>('[forToastAction]')!;
    action.click();
    await r.flush();
    expect(clicked).toBe(1);
    expect(ref.isClosed()).toBe(true);
  });

  it('close button click removes the toast from the manager', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    await r.flush();
    expect(r.instance.toasts.count()).toBe(2);
    r.el.querySelectorAll<HTMLElement>('[forToastClose]')[0]!.click();
    await r.flush();
    expect(r.instance.toasts.count()).toBe(1);
  });

  it('ref.dismiss() closes programmatically', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'Saved' });
    await r.flush();
    expect(r.instance.toasts.count()).toBe(1);
    ref.dismiss();
    await r.flush();
    expect(r.instance.toasts.count()).toBe(0);
    expect(ref.isClosed()).toBe(true);
  });

  it('ref.update() patches config in place', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'Saving…', duration: 0 });
    await r.flush();
    ref.update({ title: 'Saved', variant: 'success' });
    await r.flush();
    const t = r.el.querySelector('[forToast]')!;
    expect(t.querySelector('[forToastTitle]')?.textContent).toContain('Saved');
    expect(t.getAttribute('data-variant')).toBe('success');
  });

  it('ref.update() ignores id and region (immutable after show) (F5)', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ id: 'job', title: 'Saving…' });
    await r.flush();
    // Attempt to mutate the identity / routing fields — both must be ignored.
    ref.update({
      id: 'other',
      region: 'somewhere-else',
      title: 'Saved',
    } as Parameters<typeof ref.update>[0]);
    await r.flush();
    expect(ref.config().id).toBe('job');
    expect(ref.config().region).toBe('default');
    expect(ref.config().title).toBe('Saved');
    // Still dismissible by its original id (the map never drifted).
    r.instance.toasts.dismiss('job');
    await r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('ref.update() re-announces on the silenced path when text changes (F2)', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({
      template: r.instance.wiredTpl(),
      data: { label: 'Saving…', desc: 'Hang tight', altText: 'Undo (Cmd+Z)' },
    });
    await r.flush();
    expect(getLiveAnnouncerRegion('polite')!.textContent).toBe('Saving…. Hang tight. Undo (Cmd+Z)');

    ref.update({ data: { label: 'Saved', desc: 'Hang tight', altText: 'Undo (Cmd+Z)' } });
    await r.flush();
    expect(getLiveAnnouncerRegion('polite')!.textContent).toBe('Saved. Hang tight. Undo (Cmd+Z)');
  });

  it('show() with same id updates the existing toast', async () => {
    const r = renderHost(ProgrammaticHost);
    const a = r.instance.toasts.show({ id: 'job', title: 'Saving…' });
    const b = r.instance.toasts.show({ id: 'job', title: 'Saved' });
    await r.flush();
    expect(a).toBe(b);
    expect(r.instance.toasts.count()).toBe(1);
    expect(r.el.querySelector('[forToastTitle]')?.textContent).toContain('Saved');
  });

  it('re-show with same id restarts the auto-dismiss countdown', async () => {
    vi.useFakeTimers();
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ id: 'ping', duration: 5000 });
    await r.flush();
    vi.advanceTimersByTime(3000);
    await r.flush();
    expect(r.instance.toasts.count()).toBe(1);
    r.instance.toasts.show({ id: 'ping', duration: 5000 });
    await r.flush();
    vi.advanceTimersByTime(3000);
    await r.flush();
    expect(r.instance.toasts.count()).toBe(1);
    vi.advanceTimersByTime(2000);
    await r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('ref.resetTimer() restarts the countdown from full duration', async () => {
    vi.useFakeTimers();
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'A', duration: 5000 });
    await r.flush();
    vi.advanceTimersByTime(4000);
    await r.flush();
    ref.resetTimer();
    await r.flush();
    vi.advanceTimersByTime(4999);
    await r.flush();
    expect(ref.isClosed()).toBe(false);
    vi.advanceTimersByTime(1);
    await r.flush();
    expect(ref.isClosed()).toBe(true);
  });

  it('ref.resetTimer() is a no-op after dismiss', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'A' });
    await r.flush();
    ref.dismiss();
    await r.flush();
    expect(() => ref.resetTimer()).not.toThrow();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('dedupe re-show restarts the auto-dismiss timer', () => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    const toasts = fixture.componentInstance.toasts;
    toasts.show({ id: 'z', duration: 100 });
    fixture.detectChanges();
    vi.advanceTimersByTime(60);
    toasts.show({ id: 'z', duration: 100 });
    fixture.detectChanges();
    vi.advanceTimersByTime(60);
    fixture.detectChanges();
    expect(toasts.count()).toBe(1);
    vi.advanceTimersByTime(40);
    fixture.detectChanges();
    expect(toasts.count()).toBe(0);
  });

  it('ref.update({ duration }) while paused applies on resume', async () => {
    vi.useFakeTimers();
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'Saving…', duration: 5000 });
    await r.flush();
    vi.advanceTimersByTime(2000);
    await r.flush();
    const t = r.el.querySelector<HTMLElement>('[forToast]')!;
    t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    await r.flush();
    ref.update({ duration: 10_000 });
    await r.flush();
    t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    await r.flush();
    vi.advanceTimersByTime(9999);
    await r.flush();
    expect(r.instance.toasts.count()).toBe(1);
    vi.advanceTimersByTime(1);
    await r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('a duration update while paused dismisses on the new duration after resume', () => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    const toasts = fixture.componentInstance.toasts;
    const ref = toasts.show({ title: 'Saving…', duration: 5000 });
    fixture.detectChanges();
    vi.advanceTimersByTime(2000);
    const el = fixture.nativeElement as HTMLElement;
    const t = el.querySelector<HTMLElement>('[forToast]')!;
    t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    fixture.detectChanges();
    ref.update({ duration: 10_000 });
    fixture.detectChanges();
    t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    fixture.detectChanges();
    vi.advanceTimersByTime(9999);
    fixture.detectChanges();
    expect(toasts.count()).toBe(1);
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(toasts.count()).toBe(0);
  });

  it('two synchronous show({id}) calls before any flush yield exactly one entry and one ref', async () => {
    const r = renderHost(ProgrammaticHost);
    // Back-to-back inside the same synchronous tick — no `flush` between
    // calls. The id-keyed lookup must catch the duplicate before the second
    // call pushes a parallel entry.
    const a = r.instance.toasts.show({ id: 'save', title: 'Saving…' });
    const b = r.instance.toasts.show({ id: 'save', title: 'Saving…' });
    await r.flush();
    expect(a).toBe(b);
    expect(r.instance.toasts.count()).toBe(1);
    // Single dismiss by that id must remove the entry entirely (regression
    // guard against the map drifting out of sync with the entries array).
    r.instance.toasts.dismiss('save');
    await r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('auto-generated ids stay unique across rapid show() calls', async () => {
    const r = renderHost(ProgrammaticHost);
    const refs = [
      r.instance.toasts.show({ title: 'A' }),
      r.instance.toasts.show({ title: 'B' }),
      r.instance.toasts.show({ title: 'C' }),
    ];
    await r.flush();
    expect(r.instance.toasts.count()).toBe(3);
    // Each ref is distinct — no aliasing through the id-keyed lookup.
    expect(new Set(refs).size).toBe(3);
  });

  it('dismissAll() closes every live toast', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    r.instance.toasts.show({ title: 'C' });
    await r.flush();
    expect(r.instance.toasts.count()).toBe(3);
    r.instance.toasts.dismissAll();
    await r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('ref.closed promise resolves with reason and result', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show<string>({ title: 'A' });
    await r.flush();
    const closed = ref.closed;
    ref.dismiss('action', 'undo');
    await closed.then((v) => {
      expect(v).toEqual({ reason: 'action', result: 'undo' });
    });
  });

  it('ref.closed resolves with reason "auto" when the viewport timer fires', async () => {
    vi.useFakeTimers();
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'A', duration: 1_000 });
    await r.flush();
    const closed = ref.closed;
    vi.advanceTimersByTime(1_000);
    await r.flush();
    expect(r.instance.toasts.count()).toBe(0);
    await expect(closed).resolves.toEqual({ reason: 'auto', result: undefined });
  });

  it('ref.closed resolves with reason "escape" through the viewport path', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'A' });
    await r.flush();
    const closed = ref.closed;
    const t = r.el.querySelector<HTMLElement>('[forToast]')!;
    t.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await r.flush();
    expect(r.instance.toasts.count()).toBe(0);
    await expect(closed).resolves.toEqual({ reason: 'escape', result: undefined });
  });

  it('error variant gets role=alert', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'Boom', variant: 'error' });
    await r.flush();
    const t = r.el.querySelector('[forToast]')!;
    expect(t.getAttribute('role')).toBe('alert');
  });

  it('respects custom template via show({ template, data })', async () => {
    const r = renderHost(ProgrammaticHost);
    const tpl = r.instance.tpl();
    r.instance.toasts.show({ template: tpl, data: { label: 'Custom!' } });
    await r.flush();
    const titles = r.el.querySelectorAll<HTMLElement>('[data-test-id="custom-title"]');
    expect(titles.length).toBe(1);
    expect(titles[0]!.textContent).toContain('Custom!');
  });

  it('custom template can dismiss via the $implicit toast handle', async () => {
    const r = renderHost(ProgrammaticHost);
    const tpl = r.instance.tpl();
    r.instance.toasts.show({ template: tpl, data: { label: 'X' } });
    await r.flush();
    expect(r.instance.toasts.count()).toBe(1);
    r.el.querySelector<HTMLElement>('[data-test-id="custom-dismiss"]')!.click();
    await r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  describe('consumer class (show({ class }) / classList)', () => {
    it('applies a single class to the rendered toast root', async () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({ title: 'Saved', class: 'ds-toast' });
      await r.flush();
      const t = r.el.querySelector<HTMLElement>('[forToast]')!;
      expect(t.classList.contains('ds-toast')).toBe(true);
    });

    it('applies a space-separated class string', async () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({ title: 'Saved', class: 'ds-toast ds-toast--compact' });
      await r.flush();
      const t = r.el.querySelector<HTMLElement>('[forToast]')!;
      expect(t.classList.contains('ds-toast')).toBe(true);
      expect(t.classList.contains('ds-toast--compact')).toBe(true);
    });

    it('applies an array via classList', async () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({ title: 'Saved', classList: ['ds-toast', 'ds-toast--error'] });
      await r.flush();
      const t = r.el.querySelector<HTMLElement>('[forToast]')!;
      expect(t.classList.contains('ds-toast')).toBe(true);
      expect(t.classList.contains('ds-toast--error')).toBe(true);
    });

    it('does not clobber the directive-owned host attributes', async () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({ title: 'Saved', variant: 'success', class: 'ds-toast' });
      await r.flush();
      const t = r.el.querySelector<HTMLElement>('[forToast]')!;
      // Consumer class lands alongside the directive's own reflected state.
      expect(t.classList.contains('ds-toast')).toBe(true);
      expect(t.getAttribute('data-state')).toBe('open');
      expect(t.getAttribute('data-variant')).toBe('success');
      expect(t.getAttribute('role')).toBe('status');
    });
  });

  describe('helper directives inside a custom template', () => {
    it('wires aria-labelledby / aria-describedby from [forToastTitle] / [forToastDescription]', async () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({
        template: r.instance.wiredTpl(),
        data: { label: 'Archived', desc: 'Moved to trash', altText: 'Undo (Cmd+Z)' },
      });
      await r.flush();
      const t = r.el.querySelector<HTMLElement>('[forToast]')!;
      const titleId = $(t, 'wired-title')!.id;
      const descId = $(t, 'wired-desc')!.id;
      expect(titleId).not.toBe('');
      expect(descId).not.toBe('');
      expect(t.getAttribute('aria-labelledby')).toBe(titleId);
      expect(t.getAttribute('aria-describedby')).toBe(descId);
    });

    it('[forToastClose] inside a custom template dismisses the toast', async () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({
        template: r.instance.wiredTpl(),
        data: { label: 'Archived', desc: 'Moved to trash', altText: '' },
      });
      await r.flush();
      expect(r.instance.toasts.count()).toBe(1);
      $(r.el, 'wired-close')!.click();
      await r.flush();
      expect(r.instance.toasts.count()).toBe(0);
    });

    it('[forToastAction] inside a custom template dismisses the toast', async () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({
        template: r.instance.wiredTpl(),
        data: { label: 'Archived', desc: 'Moved to trash', altText: 'Undo (Cmd+Z)' },
      });
      await r.flush();
      expect(r.instance.toasts.count()).toBe(1);
      $(r.el, 'wired-action')!.click();
      await r.flush();
      expect(r.instance.toasts.count()).toBe(0);
    });

    it('helper directives in a custom template still wire aria-labelledby', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ProgrammaticHost);
      fixture.detectChanges();
      fixture.componentInstance.toasts.show({
        template: fixture.componentInstance.wiredTpl(),
        data: { label: 'Archived', desc: 'Moved to trash', altText: '' },
      });
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const t = el.querySelector<HTMLElement>('[forToast]')!;
      const titleId = $(t, 'wired-title')!.id;
      expect(titleId).not.toBe('');
      expect(t.getAttribute('aria-labelledby')).toBe(titleId);
    });
  });

  it('default variant info → role=status', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'Hello' });
    await r.flush();
    expect(r.el.querySelector('[forToast]')!.getAttribute('role')).toBe('status');
  });

  it('emits no toasts initially', () => {
    const r = renderHost(ProgrammaticHost);
    expect(r.instance.toasts.count()).toBe(0);
  });
});

@Component({
  imports: [ForToastViewport],
  template: `<for-toast-viewport [ariaLabel]="ariaLabel()" />`,
})
class ViewportAriaLabelHost {
  readonly ariaLabel = signal<string | null>('Alerts');
}

describe('ForToastViewport', () => {
  afterEachOverlayCleanup();

  it('host has role=region with default aria-label "Notifications"', () => {
    const r = renderHost(ProgrammaticHost);
    const v = r.el.querySelector<HTMLElement>('for-toast-viewport, [forToastViewport]')!;
    expect(v.getAttribute('role')).toBe('region');
    expect(v.getAttribute('aria-label')).toBe('Notifications');
  });

  it('[ariaLabel] overrides the default and null drops the attribute', async () => {
    const r = renderHost(ViewportAriaLabelHost);
    const v = r.el.querySelector<HTMLElement>('for-toast-viewport')!;
    expect(v.getAttribute('aria-label')).toBe('Alerts');

    r.instance.ariaLabel.set(null);
    await r.flush();
    expect(v.hasAttribute('aria-label')).toBe(false);
  });

  it('a static aria-label on the host wins over the default', () => {
    @Component({
      imports: [ForToastViewport],
      template: `<for-toast-viewport aria-label="Static name" />`,
    })
    class StaticAriaLabelHost {}

    const r = renderHost(StaticAriaLabelHost);
    const v = r.el.querySelector<HTMLElement>('for-toast-viewport')!;
    expect(v.getAttribute('aria-label')).toBe('Static name');
  });

  it('exposes data-toast-count reflecting visible toasts', async () => {
    const r = renderHost(ProgrammaticHost);
    const v = r.el.querySelector<HTMLElement>('for-toast-viewport, [forToastViewport]')!;
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    await r.flush();
    expect(v.getAttribute('data-toast-count')).toBe('2');
  });

  it('maxVisible caps the rendered window to the newest entries', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.maxVisible.set(2);
    await r.flush();
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    r.instance.toasts.show({ title: 'C' });
    await r.flush();
    const titles = Array.from(r.el.querySelectorAll<HTMLElement>('[forToastTitle]')).map((e) =>
      e.textContent?.trim(),
    );
    expect(titles).toEqual(['B', 'C']);
    expect(r.instance.toasts.count()).toBe(3);
  });

  it('F6 hotkey focuses the first rendered toast', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'A' });
    await r.flush();
    const opener = $(r.el, 'opener')!;
    opener.focus();
    expect(document.activeElement).toBe(opener);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }),
    );
    await r.flush();
    const first = r.el.querySelector<HTMLElement>('[forToast]')!;
    expect(document.activeElement).toBe(first);
  });

  it('per-viewport [hotkey] override takes precedence', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.hotkey.set('F8');
    await r.flush();
    r.instance.toasts.show({ title: 'A' });
    await r.flush();
    const opener = $(r.el, 'opener')!;
    opener.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }),
    );
    await r.flush();
    expect(document.activeElement).toBe(opener);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F8', bubbles: true, cancelable: true }),
    );
    await r.flush();
    expect(document.activeElement).toBe(r.el.querySelector('[forToast]'));
  });
});

describe('ForToastViewport regions (multi-viewport)', () => {
  afterEachOverlayCleanup();

  it('reflects the resolved region on data-region (default when unset)', async () => {
    const r = renderHost(MultiViewportHost);
    r.instance.regionA.set('alerts');
    await r.flush();
    expect($(r.el, 'vp-a')!.getAttribute('data-region')).toBe('alerts');
    // vp-b keeps the default region.
    expect($(r.el, 'vp-b')!.getAttribute('data-region')).toBe('default');
  });

  it('routes each toast to the viewport whose region matches', async () => {
    const r = renderHost(MultiViewportHost);
    r.instance.regionA.set('alerts');
    r.instance.regionB.set('confirms');
    await r.flush();

    r.instance.toasts.show({ region: 'alerts', title: 'Alert' });
    r.instance.toasts.show({ region: 'confirms', title: 'Confirm' });
    await r.flush();

    const a = toastsIn(r.el, 'vp-a');
    const b = toastsIn(r.el, 'vp-b');
    expect(a.length).toBe(1);
    expect(b.length).toBe(1);
    expect(a[0]!.querySelector('[forToastTitle]')?.textContent).toContain('Alert');
    expect(b[0]!.querySelector('[forToastTitle]')?.textContent).toContain('Confirm');
    // A single show() per region yields exactly one node across all viewports.
    expect(r.el.querySelectorAll('[forToast]').length).toBe(2);
  });

  it('a region-less show() lands in the default-region viewport only', async () => {
    const r = renderHost(MultiViewportHost);
    r.instance.regionB.set('confirms');
    await r.flush();

    r.instance.toasts.show({ title: 'Default' });
    await r.flush();

    expect(toastsIn(r.el, 'vp-a').length).toBe(1);
    expect(toastsIn(r.el, 'vp-b').length).toBe(0);
  });

  it('two viewports sharing a region render the toast once (first one wins)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = renderHost(MultiViewportHost);
    // Both keep the default region.
    r.instance.toasts.show({ title: 'Once' });
    await r.flush();

    // Exactly one node total — the second viewport stays dormant.
    expect(r.el.querySelectorAll('[forToast]').length).toBe(1);
    expect(toastsIn(r.el, 'vp-a').length).toBe(1);
    expect(toastsIn(r.el, 'vp-b').length).toBe(0);
    // The dormant viewport warns in dev so the footgun is loud, not silent.
    expect(warn).toHaveBeenCalled();
  });

  it('promotes the dormant viewport when the active one unmounts', async () => {
    const r = renderHost(MultiViewportHost);
    r.instance.toasts.show({ title: 'Survivor' });
    await r.flush();
    expect(toastsIn(r.el, 'vp-a').length).toBe(1);
    expect(toastsIn(r.el, 'vp-b').length).toBe(0);

    // The active viewport leaves; the surviving one takes over its region.
    r.instance.showA.set(false);
    await r.flush();

    expect($(r.el, 'vp-a')).toBeNull();
    expect(toastsIn(r.el, 'vp-b').length).toBe(1);
    expect(r.el.querySelectorAll('[forToast]').length).toBe(1);
  });

  it('F6 does not double-fire across viewports — the first viewport wins', async () => {
    const r = renderHost(MultiViewportHost);
    r.instance.regionA.set('alerts');
    r.instance.regionB.set('confirms');
    await r.flush();

    r.instance.toasts.show({ region: 'alerts', title: 'A' });
    r.instance.toasts.show({ region: 'confirms', title: 'B' });
    await r.flush();

    const opener = $(r.el, 'opener')!;
    opener.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }),
    );
    await r.flush();

    // A single centralized handler focuses the first viewport's toast and
    // stops. With per-viewport listeners the later one would steal focus.
    expect(document.activeElement).toBe(toastsIn(r.el, 'vp-a')[0]);
  });

  it('region routing works', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(MultiViewportHost);
    fixture.componentInstance.regionA.set('alerts');
    fixture.componentInstance.regionB.set('confirms');
    fixture.detectChanges();

    fixture.componentInstance.toasts.show({ region: 'confirms', title: 'Z' });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(toastsIn(el, 'vp-a').length).toBe(0);
    expect(toastsIn(el, 'vp-b').length).toBe(1);
    expect(toastsIn(el, 'vp-b')[0]!.querySelector('[forToastTitle]')?.textContent).toContain('Z');
  });
});

describe('global defaults via provideForToastDefaults', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    vi.useRealTimers();
  });

  it('default duration applies when a toast omits it', () => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForToastDefaults({ duration: 1_000 })],
    });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    fixture.componentInstance.toasts.show({ title: 'Quick' });
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(1);
    vi.advanceTimersByTime(999);
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(1);
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(0);
  });

  it('viewportAriaLabel names a viewport that leaves [ariaLabel] unset', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideForToastDefaults({ viewportAriaLabel: 'Notificaciones' }),
      ],
    });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    const v = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      'for-toast-viewport',
    )!;
    expect(v.getAttribute('aria-label')).toBe('Notificaciones');
  });

  it('default maxVisible caps a viewport that leaves [maxVisible] unset', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForToastDefaults({ maxVisible: 3 })],
    });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    const toasts = fixture.componentInstance.toasts;
    toasts.show({ title: 'A' });
    toasts.show({ title: 'B' });
    toasts.show({ title: 'C' });
    toasts.show({ title: 'D' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const titles = Array.from(el.querySelectorAll<HTMLElement>('[forToastTitle]')).map((e) =>
      e.textContent?.trim(),
    );
    expect(titles).toEqual(['B', 'C', 'D']);
    expect(toasts.count()).toBe(4);
  });

  it('per-viewport [maxVisible] overrides the global default', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForToastDefaults({ maxVisible: 3 })],
    });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.componentInstance.maxVisible.set(1);
    fixture.detectChanges();
    const toasts = fixture.componentInstance.toasts;
    toasts.show({ title: 'A' });
    toasts.show({ title: 'B' });
    toasts.show({ title: 'C' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const titles = Array.from(el.querySelectorAll<HTMLElement>('[forToastTitle]')).map((e) =>
      e.textContent?.trim(),
    );
    expect(titles).toEqual(['C']);
    expect(toasts.count()).toBe(3);
  });

  it('default hotkey applies when viewport leaves [hotkey] empty', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForToastDefaults({ hotkey: 'F2' })],
    });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    fixture.componentInstance.toasts.show({ title: 'A' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const opener = $(el, 'opener')!;
    opener.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(document.activeElement).toBe(el.querySelector('[forToast]'));
  });

  it('viewport keeps data-for-modal-exempt under the default overModal', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    const viewport = (fixture.nativeElement as HTMLElement).querySelector('for-toast-viewport')!;
    expect(viewport.hasAttribute('data-for-modal-exempt')).toBe(true);
  });

  it('overModal: "inert" drops data-for-modal-exempt from the viewport', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideForToastDefaults({ overModal: 'inert' }),
      ],
    });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    const viewport = (fixture.nativeElement as HTMLElement).querySelector('for-toast-viewport')!;
    expect(viewport.hasAttribute('data-for-modal-exempt')).toBe(false);
  });
});

describe('exit / enter animation cascade (config → viewport)', () => {
  afterEachOverlayCleanup();

  interface AnimateResolver {
    toastAnimateEnter(toast: ForToastInstance): string;
    toastAnimateLeave(toast: ForToastInstance): string;
  }

  function resolver(fixture: ComponentFixture<ProgrammaticHost>): AnimateResolver {
    return fixture.debugElement.query(By.directive(ForToastViewport))!
      .componentInstance as unknown as AnimateResolver;
  }

  it('per-toast animateLeave wins over the viewport [animateLeave]; viewport applies when omitted', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.vpAnimateLeave.set('vp-leave');
    await r.flush();
    r.instance.toasts.show({ title: 'own', animateLeave: 'own-leave' });
    r.instance.toasts.show({ title: 'fallback' });
    await r.flush();
    const res = resolver(r.fixture);
    const [own, fallback] = r.instance.toasts.toasts();
    expect(res.toastAnimateLeave(own!)).toBe('own-leave');
    expect(res.toastAnimateLeave(fallback!)).toBe('vp-leave');
  });

  it('animateEnter cascades the same way (per-toast wins, viewport is the fallback)', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.vpAnimateEnter.set('vp-enter');
    await r.flush();
    r.instance.toasts.show({ title: 'own', animateEnter: 'own-enter' });
    r.instance.toasts.show({ title: 'fallback' });
    await r.flush();
    const res = resolver(r.fixture);
    const [own, fallback] = r.instance.toasts.toasts();
    expect(res.toastAnimateEnter(own!)).toBe('own-enter');
    expect(res.toastAnimateEnter(fallback!)).toBe('vp-enter');
  });

  it('resolves to empty when neither per-toast nor viewport set a class (synchronous unmount preserved)', async () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'plain' });
    await r.flush();
    const res = resolver(r.fixture);
    const [plain] = r.instance.toasts.toasts();
    expect(res.toastAnimateLeave(plain!)).toBe('');
    expect(res.toastAnimateEnter(plain!)).toBe('');
  });

  it('a toast shown with animateLeave still dismisses through the close path (no regression)', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'A', animateLeave: 'toast-out' });
    await r.flush();
    expect(r.instance.toasts.count()).toBe(1);
    ref.dismiss();
    await r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('show + dismiss with animateLeave resolves', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    const ref = fixture.componentInstance.toasts.show({ title: 'Z', animateLeave: 'toast-out' });
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(1);
    const res = fixture.debugElement.query(By.directive(ForToastViewport))!
      .componentInstance as unknown as AnimateResolver;
    expect(res.toastAnimateLeave(fixture.componentInstance.toasts.toasts()[0]!)).toBe('toast-out');
    ref.dismiss();
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(0);
  });
});

describe('programmatic auto-dismiss', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    vi.useRealTimers();
  });

  it('show() mounts a toast and the duration timer closes it', () => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    const ref = fixture.componentInstance.toasts.show({ title: 'A', duration: 50 });
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(1);
    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(0);
    expect(ref.isClosed()).toBe(true);
  });
});

@Component({
  imports: [ForToastViewport],
  template: ` <for-toast-viewport [stackShift]="stackShift()" /> `,
})
class StackShiftHost {
  readonly toasts = inject(ForToastManager);
  readonly stackShift = signal<ForToastStackShift | number | null>(null);
}

class FakeAnimation {
  playState: AnimationPlayState = 'running';

  cancel(): void {
    this.playState = 'idle';
  }
}

interface RecordedGlide {
  readonly row: HTMLElement;
  readonly from: number;
  readonly duration: number;
  readonly easing: string;
  readonly animation: FakeAnimation;
}

const titleOf = (row: HTMLElement): string =>
  row.querySelector('[forToastTitle]')?.textContent?.trim() ?? '';

const parseTranslateY = (value: string): number =>
  Number.parseFloat(/translateY\((-?[\d.]+)px\)/.exec(value)?.[1] ?? 'NaN');

/**
 * jsdom implements no part of the Web Animations API, so `row.animate` has to
 * be installed before the viewport's FLIP pass can be observed at all. The stub
 * records what each glide was started with and hands back a controllable
 * `FakeAnimation` so a spec can put a row mid-flight (`playState`) and assert
 * the burst path cancelled it.
 */
function installAnimateStub(): { glides: RecordedGlide[]; restore: () => void } {
  const glides: RecordedGlide[] = [];
  const proto = Element.prototype as unknown as {
    animate?: (keyframes: unknown, options: unknown) => unknown;
  };
  const had = 'animate' in proto;
  const original = proto.animate;

  proto.animate = function (this: HTMLElement, keyframes: unknown, options: unknown): unknown {
    const [first] = keyframes as { transform: string }[];
    const timing = options as { duration: number; easing: string };
    const animation = new FakeAnimation();
    glides.push({
      row: this,
      from: parseTranslateY(first?.transform ?? ''),
      duration: timing.duration,
      easing: timing.easing,
      animation,
    });
    return animation;
  };

  return {
    glides,
    restore: () => {
      if (had) {
        proto.animate = original;
      } else {
        delete proto.animate;
      }
    },
  };
}

const rowOf = (host: HTMLElement, title: string): HTMLElement =>
  Array.from(host.querySelectorAll<HTMLElement>('[forToast]')).find(
    (row) => titleOf(row) === title,
  )!;

/**
 * A FLIP offset is the inverse of the travel: a row that moved *down* starts
 * above the spot it now occupies and glides to zero, so its offset is negative.
 */
const startedAbove = (glide: RecordedGlide): boolean => glide.from < 0;

/** The mirror of {@link startedAbove}: the row moved up, so it starts below. */
const startedBelow = (glide: RecordedGlide): boolean => glide.from > 0;

/**
 * Models the row offset jsdom cannot lay out. Per element, never on a prototype
 * (`forty-cdk/no-prototype-rect-stub`), and always installed *after* the row's
 * first measurement — which costs the specs nothing, since a row the viewport
 * has never measured is never glided.
 */
function setOffsetTop(row: HTMLElement, top: number): void {
  Object.defineProperty(row, 'offsetTop', { configurable: true, value: top });
}

/**
 * Models the viewport's own box, the half of the measurement `offsetTop` cannot
 * express: a bottom-anchored stack grows away from its anchor, so its rows move
 * on screen while their offset inside it never changes.
 */
function stubViewportTop(viewport: HTMLElement): (top: number) => void {
  let top = 0;
  vi.spyOn(viewport, 'getBoundingClientRect').mockImplementation(() => ({ top }) as DOMRect);
  return (next: number) => {
    top = next;
  };
}

/**
 * `withReducedMotion` hands back a `MediaQueryList` whose listeners are inert,
 * which is enough for a preference read once at construction. The baseline case
 * below needs the preference to flip mid-test, so this variant keeps the
 * listeners and re-emits to them.
 */
function withFlippableReducedMotion(): { set: (matches: boolean) => void; restore: () => void } {
  const target = window as unknown as { matchMedia?: (query: string) => MediaQueryList };
  const had = 'matchMedia' in target;
  const original = target.matchMedia;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const reduced = {
    matches: true,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  };

  Object.defineProperty(target, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList =>
      (/prefers-reduced-motion:\s*reduce/i.test(query)
        ? reduced
        : { ...reduced, matches: false }) as unknown as MediaQueryList,
  });

  return {
    set: (matches: boolean) => {
      reduced.matches = matches;
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent);
      }
    },
    restore: () => {
      if (had) {
        Object.defineProperty(target, 'matchMedia', {
          configurable: true,
          writable: true,
          value: original,
        });
      } else {
        delete target.matchMedia;
      }
    },
  };
}

describe('stack-shift glide (ForToastViewport)', () => {
  afterEachOverlayCleanup();

  let probe: { glides: RecordedGlide[]; restore: () => void };

  beforeEach(() => {
    probe = installAnimateStub();
  });

  afterEach(() => {
    probe.restore();
  });

  const glidedTitles = (): string[] => probe.glides.map((glide) => titleOf(glide.row));

  it('leaves a row whose position did not change alone, and never animates the entering row', async () => {
    const r = renderHost(StackShiftHost);
    r.instance.stackShift.set(200);
    r.instance.toasts.show({ title: 'A', duration: 0 });
    await r.flush();

    r.instance.toasts.show({ title: 'B', duration: 0 });
    await r.flush();

    expect(r.queryAll('[forToast]')).toHaveLength(2);
    expect(glidedTitles()).toEqual([]);
  });

  it('glides a row a mutation pushed to a new position, with the configured duration / easing', async () => {
    const r = renderHost(StackShiftHost);
    r.instance.stackShift.set({ duration: 240, easing: 'ease-out' });
    r.instance.toasts.show({ title: 'A', duration: 0 });
    await r.flush();

    setOffsetTop(rowOf(r.el, 'A'), 60);
    r.instance.toasts.show({ title: 'B', duration: 0 });
    await r.flush();

    expect(glidedTitles()).toEqual(['A']);
    const [glide] = probe.glides;
    expect(glide!.duration).toBe(240);
    expect(glide!.easing).toBe('ease-out');
    expect(startedAbove(glide!)).toBe(true);
  });

  it('glides a row whose offset inside the viewport never moved, because the box grew upwards under it', async () => {
    const r = renderHost(StackShiftHost);
    r.instance.stackShift.set(200);
    const setViewportTop = stubViewportTop(r.query('for-toast-viewport')!);

    r.instance.toasts.show({ title: 'A', duration: 0 });
    await r.flush();

    setViewportTop(-60);
    r.instance.toasts.show({ title: 'B', duration: 0 });
    await r.flush();

    expect(glidedTitles()).toEqual(['A']);
    expect(startedBelow(probe.glides[0]!)).toBe(true);
  });

  it('glides the surviving row when the toast pinned to the anchored edge is dismissed', async () => {
    const r = renderHost(StackShiftHost);
    r.instance.stackShift.set(200);
    const setViewportTop = stubViewportTop(r.query('for-toast-viewport')!);
    r.instance.toasts.show({ title: 'A', duration: 0 });
    const last = r.instance.toasts.show({ title: 'B', duration: 0 });
    await r.flush();

    setViewportTop(60);
    last.dismiss();
    await r.flush();

    expect(glidedTitles()).toEqual(['A']);
    expect(startedAbove(probe.glides[0]!)).toBe(true);
  });

  it('animates nothing when [stackShift] is unset', async () => {
    const r = renderHost(StackShiftHost);
    r.instance.toasts.show({ title: 'A', duration: 0 });
    await r.flush();

    setOffsetTop(rowOf(r.el, 'A'), 60);
    r.instance.toasts.show({ title: 'B', duration: 0 });
    await r.flush();

    expect(glidedTitles()).toEqual([]);
  });

  it('carries the in-flight offset into the glide a burst restarts, cancelling the one it interrupts', async () => {
    const r = renderHost(StackShiftHost);
    r.instance.stackShift.set(300);
    r.instance.toasts.show({ title: 'A', duration: 0 });
    await r.flush();

    const row = rowOf(r.el, 'A');
    setOffsetTop(row, 60);
    r.instance.toasts.show({ title: 'B', duration: 0 });
    await r.flush();
    const inFlight = probe.glides[0]!;

    const computed = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) =>
      el === row
        ? ({ transform: 'matrix(1, 0, 0, 1, 0, -24)' } as CSSStyleDeclaration)
        : computed(el, pseudo),
    );

    setOffsetTop(row, 90);
    r.instance.toasts.show({ title: 'C', duration: 0 });
    await r.flush();
    const carried = probe.glides[1]!;

    expect(inFlight.animation.playState).toBe('idle');

    carried.animation.playState = 'finished';
    setOffsetTop(row, 120);
    r.instance.toasts.show({ title: 'D', duration: 0 });
    await r.flush();
    const uncarriedSameSizedMove = probe.glides[2]!;

    expect(carried.from).toBeLessThan(uncarriedSameSizedMove.from);
  });

  it('tracks positions but plays nothing under prefers-reduced-motion, so the next shift is measured from the fresh baseline', async () => {
    const motion = withFlippableReducedMotion();
    try {
      const r = renderHost(StackShiftHost);
      r.instance.stackShift.set(200);
      r.instance.toasts.show({ title: 'A', duration: 0 });
      await r.flush();

      const row = rowOf(r.el, 'A');
      setOffsetTop(row, 40);
      r.instance.toasts.show({ title: 'B', duration: 0 });
      await r.flush();
      expect(glidedTitles()).toEqual([]);

      motion.set(false);
      setOffsetTop(row, 20);
      r.instance.toasts.show({ title: 'C', duration: 0 });
      await r.flush();

      expect(glidedTitles()).toEqual(['A']);
      expect(startedBelow(probe.glides[0]!)).toBe(true);
    } finally {
      motion.restore();
    }
  });

  it('provideForToastDefaults({ stackShift }) glides a viewport that leaves the input unset', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForToastDefaults({ stackShift: 150 })],
    });
    const fixture = TestBed.createComponent(StackShiftHost);
    fixture.detectChanges();
    const toasts = fixture.componentInstance.toasts;

    toasts.show({ title: 'A', duration: 0 });
    await flush(fixture);
    setOffsetTop(rowOf(fixture.nativeElement as HTMLElement, 'A'), 60);
    toasts.show({ title: 'B', duration: 0 });
    await flush(fixture);

    expect(glidedTitles()).toEqual(['A']);
    expect(probe.glides[0]!.duration).toBe(150);
    expect(probe.glides[0]!.easing).toBe('linear');
  });

  it('a per-viewport [stackShift] wins over the scope default', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForToastDefaults({ stackShift: 150 })],
    });
    const fixture = TestBed.createComponent(StackShiftHost);
    fixture.componentInstance.stackShift.set({ duration: 320, easing: 'ease-in-out' });
    fixture.detectChanges();
    const toasts = fixture.componentInstance.toasts;

    toasts.show({ title: 'A', duration: 0 });
    await flush(fixture);
    setOffsetTop(rowOf(fixture.nativeElement as HTMLElement, 'A'), 60);
    toasts.show({ title: 'B', duration: 0 });
    await flush(fixture);

    expect(probe.glides[0]!.duration).toBe(320);
    expect(probe.glides[0]!.easing).toBe('ease-in-out');
  });

  it('[stackShift]="0" opts a viewport out of the scope default', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForToastDefaults({ stackShift: 150 })],
    });
    const fixture = TestBed.createComponent(StackShiftHost);
    fixture.componentInstance.stackShift.set(0);
    fixture.detectChanges();
    const toasts = fixture.componentInstance.toasts;

    toasts.show({ title: 'A', duration: 0 });
    await flush(fixture);
    setOffsetTop(rowOf(fixture.nativeElement as HTMLElement, 'A'), 60);
    toasts.show({ title: 'B', duration: 0 });
    await flush(fixture);

    expect(glidedTitles()).toEqual([]);
  });
});
