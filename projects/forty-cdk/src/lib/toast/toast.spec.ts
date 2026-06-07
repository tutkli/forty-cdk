import {
  Component,
  inject,
  provideZonelessChangeDetection,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import type { ForToastSwipeDirection, ForToastTemplateContext } from './toast-context';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup } from '../../test-utils/overlay-cleanup';
import { renderHost } from '../../test-utils/render';
import { withReducedMotion } from '../../test-utils/reduced-motion';
import { ForToast } from './toast';
import { ForToastAction } from './toast-action';
import { ForToastClose } from './toast-close';
import { ForToastDescription } from './toast-description';
import { ForToastTitle } from './toast-title';
import { ForToastViewport } from './toast-viewport';
import { ForToastManager, provideForToastDefaults } from './toast-manager';
import type { SwipeEventDetail } from '../_internal/swipe-dismiss/swipe-dismiss';

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
  imports: [
    ForToastViewport,
    ForToastTitle,
    ForToastDescription,
    ForToastAction,
    ForToastClose,
  ],
  template: `
    <button #opener type="button" data-test-id="opener">Opener</button>
    <for-toast-viewport [maxVisible]="maxVisible()" [hotkey]="hotkey()" />
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
        [closable]="closable()"
        [swipeDirection]="swipeDirection()"
        [swipeThreshold]="swipeThreshold()"
        (close)="onClose($event)"
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
        @if (closable()) {
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
  readonly closable = signal(true);
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

// LiveAnnouncer schedules every text write through `queueMicrotask`, so the
// altText announcement specs below need a single microtask hop after the
// first render — not the canonical `flush(fixture)` render drain. Spell the
// hop inline (`await Promise.resolve()`) so the WHY is obvious at the call.

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
    it('non-error variants get role=status + aria-live=polite', () => {
      const { el } = renderHost(DeclarativeHost);
      const t = $(el, 'declarative')!;
      expect(t.getAttribute('role')).toBe('status');
      expect(t.getAttribute('aria-live')).toBe('polite');
      expect(t.getAttribute('aria-atomic')).toBe('true');
    });

    it('error variant becomes role=alert + aria-live=assertive', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.variant.set('error');
      r.flush();
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

    it('reflects data-variant', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.variant.set('warning');
      r.flush();
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

    it('emits (close) with reason "auto" after duration', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      vi.advanceTimersByTime(4_999);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });

    it('duration=0 stays sticky', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.duration.set(0);
      r.flush();
      vi.advanceTimersByTime(60_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);
    });

    it('changing duration mid-flight resets the timer', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      vi.advanceTimersByTime(2_000);
      r.flush();
      r.instance.duration.set(1_000);
      r.flush();
      vi.advanceTimersByTime(999);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });
  });

  describe('hover / focus pause', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('pointerenter pauses, pointerleave resumes', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      vi.advanceTimersByTime(2_000);
      r.flush();
      t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      r.flush();
      expect(t.getAttribute('data-paused')).toBe('');
      vi.advanceTimersByTime(60_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);
      vi.advanceTimersByTime(2_999);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });

    it('focus inside pauses; focus leaving resumes', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.showAction.set(true);
      r.flush();
      const t = $(r.el, 'declarative')!;
      const action = $(r.el, 'action')!;
      action.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      r.flush();
      expect(t.getAttribute('data-paused')).toBe('');
      vi.advanceTimersByTime(60_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      action.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
      r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);
      outside.remove();
    });

    it('focus moving between elements within the toast keeps it paused', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.showAction.set(true);
      r.flush();
      const t = $(r.el, 'declarative')!;
      const action = $(r.el, 'action')!;
      const close = $(r.el, 'close')!;
      action.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      action.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: close }));
      close.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      r.flush();
      expect(t.getAttribute('data-paused')).toBe('');
    });

    it('a re-render while paused does not reset the captured remaining time', () => {
      // F3: the duration effect must not clobber #remainingMs while paused.
      // Pause at 2_000ms in (3_000ms remaining), then trigger an unrelated
      // effect re-run by changing `duration` while still paused; on resume the
      // toast must continue from the captured 3_000ms, not restart at full.
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;

      vi.advanceTimersByTime(2_000);
      r.flush();
      t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      r.flush();
      expect(t.getAttribute('data-paused')).toBe('');

      // Re-render the toast (change an input that re-runs the duration effect)
      // while paused. The captured 3_000ms must survive.
      r.instance.duration.set(10_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);

      t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      r.flush();
      vi.advanceTimersByTime(2_999);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      r.flush();
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

    it('pauses the auto-dismiss timer when the page becomes hidden', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;

      vi.advanceTimersByTime(2_000);
      r.flush();

      setVisibility('hidden');
      r.flush();
      expect(t.getAttribute('data-paused')).toBe('');

      vi.advanceTimersByTime(60_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);
    });

    it('resumes with the remaining time when the page becomes visible again', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;

      vi.advanceTimersByTime(2_000);
      r.flush();

      setVisibility('hidden');
      r.flush();
      vi.advanceTimersByTime(60_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);

      setVisibility('visible');
      r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);

      vi.advanceTimersByTime(2_999);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });

    it('keeps paused while hover is also active and only resumes once both clear', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;

      t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      setVisibility('hidden');
      r.flush();
      expect(t.getAttribute('data-paused')).toBe('');

      // Visibility returns first; hover pause keeps the timer down.
      setVisibility('visible');
      r.flush();
      expect(t.getAttribute('data-paused')).toBe('');

      // Releasing hover too clears the pause.
      t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);
    });

    it('removes its document listener when the toast unmounts', () => {
      const r = renderHost(DeclarativeHost);
      r.flush();
      r.instance.open.set(false);
      r.flush();

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

    it('does not count down until the tab becomes visible', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      expect(t.getAttribute('data-paused')).toBe('');

      vi.advanceTimersByTime(60_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);

      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);

      vi.advanceTimersByTime(4_999);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });
  });

  describe('non-closable does not schedule an auto-dismiss timer', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('closable=false never wires a timer for the duration', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(DeclarativeHost);
      fixture.componentInstance.closable.set(false);
      const spy = vi.spyOn(globalThis, 'setTimeout');
      fixture.detectChanges();
      expect(spy).not.toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('closable=true with the same duration DOES schedule a timer', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(DeclarativeHost);
      const spy = vi.spyOn(globalThis, 'setTimeout');
      fixture.detectChanges();
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('closable=false does not emit (close) after the duration elapses', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.closable.set(false);
      r.flush();
      vi.advanceTimersByTime(60_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);
    });
  });

  describe('manual close paths', () => {
    it('Escape closes when closable', () => {
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      t.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      r.flush();
      expect(r.instance.closes).toEqual(['escape']);
    });

    it('Escape is a no-op when closable=false', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.closable.set(false);
      r.flush();
      const t = $(r.el, 'declarative')!;
      t.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      r.flush();
      expect(r.instance.closes).toEqual([]);
    });

    it('close button click → reason "manual"', () => {
      const r = renderHost(DeclarativeHost);
      const close = $(r.el, 'close')!;
      close.click();
      r.flush();
      expect(r.instance.closes).toEqual(['manual']);
    });

    it('action button click → consumer handler runs, then reason "action"', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.showAction.set(true);
      r.flush();
      const action = $(r.el, 'action')!;
      action.click();
      r.flush();
      expect(r.instance.actionsClicked()).toBe(1);
      expect(r.instance.closes).toEqual(['action']);
    });

    it('action close fires even when closable=false', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.closable.set(false);
      r.instance.showAction.set(true);
      r.flush();
      $(r.el, 'action')!.click();
      r.flush();
      expect(r.instance.closes).toEqual(['action']);
    });
  });

  describe('swipe-to-dismiss', () => {
    it('does not arm a swipe when [swipeDirection] is null (default)', () => {
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 80, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 80, clientY: 0 });
      r.flush();
      expect(t.hasAttribute('data-swipe')).toBe(false);
      expect(r.instance.swipeStarts).toEqual([]);
      expect(r.instance.closes).toEqual([]);
    });

    it('reflects data-swipe="start"|"move" and CSS movement vars during a swipe', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 20, clientY: 0 });
      r.flush();
      expect(t.getAttribute('data-swipe')).toBe('move');
      expect(t.getAttribute('data-swipe-direction')).toBe('right');
      expect(t.style.getPropertyValue('--for-toast-swipe-movement-x')).toBe('20px');
      expect(t.style.getPropertyValue('--for-toast-swipe-movement-y')).toBe('0px');
      expect(r.instance.swipeStarts).toHaveLength(1);
      expect(r.instance.swipeMoves.length).toBeGreaterThanOrEqual(1);
    });

    it('crosses the threshold → swipeEnd, data-swipe="end", and (close) with reason "swipe"', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      r.instance.swipeThreshold.set(50);
      r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 60, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 60, clientY: 0 });
      r.flush();
      expect(r.instance.swipeEnds).toHaveLength(1);
      expect(r.instance.swipeCancels).toEqual([]);
      expect(r.instance.closes).toEqual(['swipe']);
    });

    it('releases under threshold → swipeCancel, data-swipe="cancel", no (close)', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      r.instance.swipeThreshold.set(80);
      r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 30, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 30, clientY: 0 });
      r.flush();
      expect(r.instance.swipeCancels).toHaveLength(1);
      expect(r.instance.swipeEnds).toEqual([]);
      expect(t.getAttribute('data-swipe')).toBe('cancel');
      expect(r.instance.closes).toEqual([]);
    });

    it('clears the parked data-swipe="cancel" and movement vars on the next pointerdown', () => {
      // F10: after a cancel the host keeps data-swipe="cancel" + the released
      // movement vars (for the consumer's CSS spring-back), but the next
      // pointerdown is the terminal reset so a stale cancel never lingers.
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      r.instance.swipeThreshold.set(80);
      r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 30, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 30, clientY: 0 });
      r.flush();
      expect(t.getAttribute('data-swipe')).toBe('cancel');
      expect(t.style.getPropertyValue('--for-toast-swipe-movement-x')).toBe('30px');

      // Next pointer interaction neutralizes the parked cancel state.
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      r.flush();
      expect(t.hasAttribute('data-swipe')).toBe(false);
      expect(t.getAttribute('data-swipe-direction')).toBeNull();
      expect(t.style.getPropertyValue('--for-toast-swipe-movement-x')).toBe('0px');
      expect(t.style.getPropertyValue('--for-toast-swipe-movement-y')).toBe('0px');
    });

    it('accepts an array of allowed directions', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set(['right', 'down']);
      r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 0, clientY: 60 });
      pointer(t, 'pointerup', { clientX: 0, clientY: 60 });
      r.flush();
      expect(r.instance.swipeEnds).toHaveLength(1);
      expect(r.instance.swipeEnds[0]!.direction).toBe('down');
      expect(r.instance.closes).toEqual(['swipe']);
    });

    it('disallowed dominant direction is dropped silently', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 5, clientY: 80 });
      pointer(t, 'pointerup', { clientX: 5, clientY: 80 });
      r.flush();
      expect(r.instance.swipeStarts).toEqual([]);
      expect(r.instance.swipeEnds).toEqual([]);
      expect(r.instance.closes).toEqual([]);
    });

    it('closable=false disables swipe entirely (no events, no close)', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.swipeDirection.set('right');
      r.instance.closable.set(false);
      r.flush();
      const t = $(r.el, 'declarative')!;
      pointer(t, 'pointerdown', { clientX: 0, clientY: 0 });
      pointer(t, 'pointermove', { clientX: 200, clientY: 0 });
      pointer(t, 'pointerup', { clientX: 200, clientY: 0 });
      r.flush();
      expect(r.instance.swipeStarts).toEqual([]);
      expect(r.instance.closes).toEqual([]);
    });

    it('zoneless: a swipe past threshold dismisses without Zone.js', () => {
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

  describe('action altText (WCAG 2.2.1 announcement)', () => {
    afterEach(() => {
      // LiveAnnouncer keeps two off-screen regions in document.body across
      // tests by design; detach them so `getLiveAnnouncerRegion(...)` returns
      // null in the next test rather than matching a stale (text-cleared)
      // region from a previous emission.
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('keeps the host aria-live polite when no action carries altText', () => {
      const r = renderHost(AltTextHost);
      // altText defaults to '' — host announcement remains the active path.
      expect($(r.el, 'alt-toast')!.getAttribute('aria-live')).toBe('polite');
    });

    it('does not announce via LiveAnnouncer when altText is the empty string', async () => {
      const r = renderHost(AltTextHost);
      await Promise.resolve();

      expect(getLiveAnnouncerRegion('polite')).toBeNull();
      expect(getLiveAnnouncerRegion('assertive')).toBeNull();
      // The toast itself still carries the visible content, of course.
      expect($(r.el, 'alt-toast')!.textContent).toContain('Saved');
    });

    it('silences the host aria-live and announces composed message via LiveAnnouncer', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AltTextHost);
      // Set altText BEFORE first change detection so the action mounts with
      // the value already in place.
      fixture.componentInstance.altText.set('Undo (Cmd+Z)');
      fixture.detectChanges();
      await Promise.resolve();

      const t = fixture.nativeElement.querySelector('[data-test-id="alt-toast"]') as HTMLElement;
      expect(t.getAttribute('aria-live')).toBe('off');

      const region = getLiveAnnouncerRegion('polite');
      expect(region!.textContent).toBe('Saved. Your changes are live.. Undo (Cmd+Z)');
    });

    it('announces a late-bound altText set after first render (F1)', async () => {
      // The reactive announcement effect fires on the edge altText becomes
      // non-empty, not only on first render. Mount with no altText, then set
      // it — the silenced path must engage and the announcement must land.
      const r = renderHost(AltTextHost);
      await r.flush();
      expect($(r.el, 'alt-toast')!.getAttribute('aria-live')).toBe('polite');
      expect(getLiveAnnouncerRegion('polite')).toBeNull();

      r.instance.altText.set('Undo (Cmd+Z)');
      await r.flush();
      await Promise.resolve();

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
      await Promise.resolve();
      expect(getLiveAnnouncerRegion('polite')!.textContent).toBe(
        'Saved. Your changes are live.. Undo (Cmd+Z)',
      );

      r.instance.title.set('Saved to cloud');
      await r.flush();
      await Promise.resolve();
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
      await Promise.resolve();

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

    it('still auto-dismisses after [duration] under reduced-motion', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      vi.advanceTimersByTime(4_999);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      r.flush();
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

  it('show() pushes a toast and renders it through the viewport', () => {
    const r = renderHost(ProgrammaticHost);
    expect(r.el.querySelectorAll('[forToast]').length).toBe(0);
    r.instance.toasts.show({ title: 'Saved' });
    r.flush();
    const rendered = r.el.querySelectorAll('[forToast]');
    expect(rendered.length).toBe(1);
    expect(rendered[0]!.querySelector('[forToastTitle]')?.textContent).toContain('Saved');
  });

  it('description and close button render by default', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'Saved', description: 'Your changes are live.' });
    r.flush();
    const t = r.el.querySelector('[forToast]')!;
    expect(t.querySelector('[forToastDescription]')?.textContent).toContain('Your changes');
    expect(t.querySelector('[forToastClose]')).not.toBeNull();
  });

  it('action button invokes handler and dismisses the toast', () => {
    const r = renderHost(ProgrammaticHost);
    let clicked = 0;
    const ref = r.instance.toasts.show({
      title: 'Item deleted',
      action: { label: 'Undo', onClick: () => clicked++ },
    });
    r.flush();
    const action = r.el.querySelector<HTMLElement>('[forToastAction]')!;
    action.click();
    r.flush();
    expect(clicked).toBe(1);
    expect(ref.isClosed()).toBe(true);
  });

  it('close button click removes the toast from the manager', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    r.flush();
    expect(r.instance.toasts.count()).toBe(2);
    r.el.querySelectorAll<HTMLElement>('[forToastClose]')[0]!.click();
    r.flush();
    expect(r.instance.toasts.count()).toBe(1);
  });

  it('ref.dismiss() closes programmatically', () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'Saved' });
    r.flush();
    expect(r.instance.toasts.count()).toBe(1);
    ref.dismiss();
    r.flush();
    expect(r.instance.toasts.count()).toBe(0);
    expect(ref.isClosed()).toBe(true);
  });

  it('ref.update() patches config in place', () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'Saving…', duration: 0 });
    r.flush();
    ref.update({ title: 'Saved', variant: 'success' });
    r.flush();
    const t = r.el.querySelector('[forToast]')!;
    expect(t.querySelector('[forToastTitle]')?.textContent).toContain('Saved');
    expect(t.getAttribute('data-variant')).toBe('success');
  });

  it('ref.update() ignores id and region (immutable after show) (F5)', () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ id: 'job', title: 'Saving…' });
    r.flush();
    // Attempt to mutate the identity / routing fields — both must be ignored.
    ref.update({
      id: 'other',
      region: 'somewhere-else',
      title: 'Saved',
    } as Parameters<typeof ref.update>[0]);
    r.flush();
    expect(ref.config().id).toBe('job');
    expect(ref.config().region).toBe('default');
    expect(ref.config().title).toBe('Saved');
    // Still dismissable by its original id (the map never drifted).
    r.instance.toasts.dismiss('job');
    r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('ref.update() re-announces on the silenced path when text changes (F2)', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({
      template: r.instance.wiredTpl(),
      data: { label: 'Saving…', desc: 'Hang tight', altText: 'Undo (Cmd+Z)' },
    });
    await r.flush();
    await Promise.resolve();
    expect(getLiveAnnouncerRegion('polite')!.textContent).toBe(
      'Saving…. Hang tight. Undo (Cmd+Z)',
    );

    ref.update({ data: { label: 'Saved', desc: 'Hang tight', altText: 'Undo (Cmd+Z)' } });
    await r.flush();
    await Promise.resolve();
    expect(getLiveAnnouncerRegion('polite')!.textContent).toBe('Saved. Hang tight. Undo (Cmd+Z)');
  });

  it('show() with same id updates the existing toast', () => {
    const r = renderHost(ProgrammaticHost);
    const a = r.instance.toasts.show({ id: 'job', title: 'Saving…' });
    const b = r.instance.toasts.show({ id: 'job', title: 'Saved' });
    r.flush();
    expect(a).toBe(b);
    expect(r.instance.toasts.count()).toBe(1);
    expect(r.el.querySelector('[forToastTitle]')?.textContent).toContain('Saved');
  });

  it('two synchronous show({id}) calls before any flush yield exactly one entry and one ref', () => {
    const r = renderHost(ProgrammaticHost);
    // Back-to-back inside the same synchronous tick — no `flush` between
    // calls. The id-keyed lookup must catch the duplicate before the second
    // call pushes a parallel entry.
    const a = r.instance.toasts.show({ id: 'save', title: 'Saving…' });
    const b = r.instance.toasts.show({ id: 'save', title: 'Saving…' });
    r.flush();
    expect(a).toBe(b);
    expect(r.instance.toasts.count()).toBe(1);
    // Single dismiss by that id must remove the entry entirely (regression
    // guard against the map drifting out of sync with the entries array).
    r.instance.toasts.dismiss('save');
    r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('auto-generated ids stay unique across rapid show() calls', () => {
    const r = renderHost(ProgrammaticHost);
    const refs = [
      r.instance.toasts.show({ title: 'A' }),
      r.instance.toasts.show({ title: 'B' }),
      r.instance.toasts.show({ title: 'C' }),
    ];
    r.flush();
    expect(r.instance.toasts.count()).toBe(3);
    // Each ref is distinct — no aliasing through the id-keyed lookup.
    expect(new Set(refs).size).toBe(3);
  });

  it('dismissAll() closes every live toast', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    r.instance.toasts.show({ title: 'C' });
    r.flush();
    expect(r.instance.toasts.count()).toBe(3);
    r.instance.toasts.dismissAll();
    r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('ref.closed promise resolves with reason and result', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show<string>({ title: 'A' });
    r.flush();
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
    r.flush();
    const closed = ref.closed;
    vi.advanceTimersByTime(1_000);
    r.flush();
    expect(r.instance.toasts.count()).toBe(0);
    await expect(closed).resolves.toEqual({ reason: 'auto', result: undefined });
  });

  it('ref.closed resolves with reason "escape" through the viewport path', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'A' });
    r.flush();
    const closed = ref.closed;
    const t = r.el.querySelector<HTMLElement>('[forToast]')!;
    t.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    r.flush();
    expect(r.instance.toasts.count()).toBe(0);
    await expect(closed).resolves.toEqual({ reason: 'escape', result: undefined });
  });

  it('error variant gets role=alert', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'Boom', variant: 'error' });
    r.flush();
    const t = r.el.querySelector('[forToast]')!;
    expect(t.getAttribute('role')).toBe('alert');
  });

  it('respects custom template via show({ template, data })', () => {
    const r = renderHost(ProgrammaticHost);
    const tpl = r.instance.tpl();
    r.instance.toasts.show({ template: tpl, data: { label: 'Custom!' } });
    r.flush();
    const titles = r.el.querySelectorAll<HTMLElement>('[data-test-id="custom-title"]');
    expect(titles.length).toBe(1);
    expect(titles[0]!.textContent).toContain('Custom!');
  });

  it('custom template can dismiss via the $implicit toast handle', () => {
    const r = renderHost(ProgrammaticHost);
    const tpl = r.instance.tpl();
    r.instance.toasts.show({ template: tpl, data: { label: 'X' } });
    r.flush();
    expect(r.instance.toasts.count()).toBe(1);
    r.el.querySelector<HTMLElement>('[data-test-id="custom-dismiss"]')!.click();
    r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  describe('consumer class (show({ class }) / classList)', () => {
    it('applies a single class to the rendered toast root', () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({ title: 'Saved', class: 'ds-toast' });
      r.flush();
      const t = r.el.querySelector<HTMLElement>('[forToast]')!;
      expect(t.classList.contains('ds-toast')).toBe(true);
    });

    it('applies a space-separated class string', () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({ title: 'Saved', class: 'ds-toast ds-toast--compact' });
      r.flush();
      const t = r.el.querySelector<HTMLElement>('[forToast]')!;
      expect(t.classList.contains('ds-toast')).toBe(true);
      expect(t.classList.contains('ds-toast--compact')).toBe(true);
    });

    it('applies an array via classList', () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({ title: 'Saved', classList: ['ds-toast', 'ds-toast--error'] });
      r.flush();
      const t = r.el.querySelector<HTMLElement>('[forToast]')!;
      expect(t.classList.contains('ds-toast')).toBe(true);
      expect(t.classList.contains('ds-toast--error')).toBe(true);
    });

    it('does not clobber the directive-owned host attributes', () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({ title: 'Saved', variant: 'success', class: 'ds-toast' });
      r.flush();
      const t = r.el.querySelector<HTMLElement>('[forToast]')!;
      // Consumer class lands alongside the directive's own reflected state.
      expect(t.classList.contains('ds-toast')).toBe(true);
      expect(t.getAttribute('data-state')).toBe('open');
      expect(t.getAttribute('data-variant')).toBe('success');
      expect(t.getAttribute('role')).toBe('status');
    });
  });

  describe('helper directives inside a custom template', () => {
    it('wires aria-labelledby / aria-describedby from [forToastTitle] / [forToastDescription]', () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({
        template: r.instance.wiredTpl(),
        data: { label: 'Archived', desc: 'Moved to trash', altText: 'Undo (Cmd+Z)' },
      });
      r.flush();
      const t = r.el.querySelector<HTMLElement>('[forToast]')!;
      const titleId = $(t, 'wired-title')!.id;
      const descId = $(t, 'wired-desc')!.id;
      expect(titleId).not.toBe('');
      expect(descId).not.toBe('');
      expect(t.getAttribute('aria-labelledby')).toBe(titleId);
      expect(t.getAttribute('aria-describedby')).toBe(descId);
    });

    it('[forToastClose] inside a custom template dismisses the toast', () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({
        template: r.instance.wiredTpl(),
        data: { label: 'Archived', desc: 'Moved to trash', altText: '' },
      });
      r.flush();
      expect(r.instance.toasts.count()).toBe(1);
      $(r.el, 'wired-close')!.click();
      r.flush();
      expect(r.instance.toasts.count()).toBe(0);
    });

    it('[forToastAction] inside a custom template dismisses the toast', () => {
      const r = renderHost(ProgrammaticHost);
      r.instance.toasts.show({
        template: r.instance.wiredTpl(),
        data: { label: 'Archived', desc: 'Moved to trash', altText: 'Undo (Cmd+Z)' },
      });
      r.flush();
      expect(r.instance.toasts.count()).toBe(1);
      $(r.el, 'wired-action')!.click();
      r.flush();
      expect(r.instance.toasts.count()).toBe(0);
    });

    it('zoneless: helper directives in a custom template still wire aria-labelledby', () => {
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

  it('default variant info → role=status', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'Hello' });
    r.flush();
    expect(r.el.querySelector('[forToast]')!.getAttribute('role')).toBe('status');
  });

  it('emits no toasts initially', () => {
    const r = renderHost(ProgrammaticHost);
    expect(r.instance.toasts.count()).toBe(0);
  });
});

describe('ForToastViewport', () => {
  afterEachOverlayCleanup();

  it('host has role=region with default aria-label "Notifications"', () => {
    const r = renderHost(ProgrammaticHost);
    const v = r.el.querySelector<HTMLElement>('for-toast-viewport, [forToastViewport]')!;
    expect(v.getAttribute('role')).toBe('region');
    expect(v.getAttribute('aria-label')).toBe('Notifications');
  });

  it('exposes data-toast-count reflecting visible toasts', () => {
    const r = renderHost(ProgrammaticHost);
    const v = r.el.querySelector<HTMLElement>('for-toast-viewport, [forToastViewport]')!;
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    r.flush();
    expect(v.getAttribute('data-toast-count')).toBe('2');
  });

  it('maxVisible caps the rendered window to the newest entries', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.maxVisible.set(2);
    r.flush();
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    r.instance.toasts.show({ title: 'C' });
    r.flush();
    const titles = Array.from(r.el.querySelectorAll<HTMLElement>('[forToastTitle]')).map((e) =>
      e.textContent?.trim(),
    );
    expect(titles).toEqual(['B', 'C']);
    expect(r.instance.toasts.count()).toBe(3);
  });

  it('F6 hotkey focuses the first rendered toast', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'A' });
    r.flush();
    const opener = $(r.el, 'opener')!;
    opener.focus();
    expect(document.activeElement).toBe(opener);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }),
    );
    r.flush();
    const first = r.el.querySelector<HTMLElement>('[forToast]')!;
    expect(document.activeElement).toBe(first);
  });

  it('per-viewport [hotkey] override takes precedence', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.hotkey.set('F8');
    r.flush();
    r.instance.toasts.show({ title: 'A' });
    r.flush();
    const opener = $(r.el, 'opener')!;
    opener.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }),
    );
    r.flush();
    expect(document.activeElement).toBe(opener);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F8', bubbles: true, cancelable: true }),
    );
    r.flush();
    expect(document.activeElement).toBe(r.el.querySelector('[forToast]'));
  });
});

describe('ForToastViewport regions (multi-viewport)', () => {
  afterEachOverlayCleanup();

  it('reflects the resolved region on data-region (default when unset)', () => {
    const r = renderHost(MultiViewportHost);
    r.instance.regionA.set('alerts');
    r.flush();
    expect($(r.el, 'vp-a')!.getAttribute('data-region')).toBe('alerts');
    // vp-b keeps the default region.
    expect($(r.el, 'vp-b')!.getAttribute('data-region')).toBe('default');
  });

  it('routes each toast to the viewport whose region matches', () => {
    const r = renderHost(MultiViewportHost);
    r.instance.regionA.set('alerts');
    r.instance.regionB.set('confirms');
    r.flush();

    r.instance.toasts.show({ region: 'alerts', title: 'Alert' });
    r.instance.toasts.show({ region: 'confirms', title: 'Confirm' });
    r.flush();

    const a = toastsIn(r.el, 'vp-a');
    const b = toastsIn(r.el, 'vp-b');
    expect(a.length).toBe(1);
    expect(b.length).toBe(1);
    expect(a[0]!.querySelector('[forToastTitle]')?.textContent).toContain('Alert');
    expect(b[0]!.querySelector('[forToastTitle]')?.textContent).toContain('Confirm');
    // A single show() per region yields exactly one node across all viewports.
    expect(r.el.querySelectorAll('[forToast]').length).toBe(2);
  });

  it('a region-less show() lands in the default-region viewport only', () => {
    const r = renderHost(MultiViewportHost);
    r.instance.regionB.set('confirms');
    r.flush();

    r.instance.toasts.show({ title: 'Default' });
    r.flush();

    expect(toastsIn(r.el, 'vp-a').length).toBe(1);
    expect(toastsIn(r.el, 'vp-b').length).toBe(0);
  });

  it('two viewports sharing a region render the toast once (first one wins)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = renderHost(MultiViewportHost);
    // Both keep the default region.
    r.instance.toasts.show({ title: 'Once' });
    r.flush();

    // Exactly one node total — the second viewport stays dormant.
    expect(r.el.querySelectorAll('[forToast]').length).toBe(1);
    expect(toastsIn(r.el, 'vp-a').length).toBe(1);
    expect(toastsIn(r.el, 'vp-b').length).toBe(0);
    // The dormant viewport warns in dev so the footgun is loud, not silent.
    expect(warn).toHaveBeenCalled();
  });

  it('promotes the dormant viewport when the active one unmounts', () => {
    const r = renderHost(MultiViewportHost);
    r.instance.toasts.show({ title: 'Survivor' });
    r.flush();
    expect(toastsIn(r.el, 'vp-a').length).toBe(1);
    expect(toastsIn(r.el, 'vp-b').length).toBe(0);

    // The active viewport leaves; the surviving one takes over its region.
    r.instance.showA.set(false);
    r.flush();

    expect($(r.el, 'vp-a')).toBeNull();
    expect(toastsIn(r.el, 'vp-b').length).toBe(1);
    expect(r.el.querySelectorAll('[forToast]').length).toBe(1);
  });

  it('F6 does not double-fire across viewports — the first viewport wins', () => {
    const r = renderHost(MultiViewportHost);
    r.instance.regionA.set('alerts');
    r.instance.regionB.set('confirms');
    r.flush();

    r.instance.toasts.show({ region: 'alerts', title: 'A' });
    r.instance.toasts.show({ region: 'confirms', title: 'B' });
    r.flush();

    const opener = $(r.el, 'opener')!;
    opener.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }),
    );
    r.flush();

    // A single centralized handler focuses the first viewport's toast and
    // stops. With per-viewport listeners the later one would steal focus.
    expect(document.activeElement).toBe(toastsIn(r.el, 'vp-a')[0]);
  });

  it('zoneless: region routing works without Zone.js', () => {
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
});

describe('zoneless', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    vi.useRealTimers();
  });

  it('show() + auto-dismiss work without Zone.js', () => {
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
