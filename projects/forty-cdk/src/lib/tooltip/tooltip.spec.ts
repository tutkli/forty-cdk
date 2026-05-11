import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  flush,
  flushPositioning,
  installObserverPolyfills,
  pressKey,
  renderHost,
  withReducedMotion,
} from '../../test-utils';
import { ForTooltip } from './tooltip';
import { ForTooltipArrow } from './tooltip-arrow';
import { ForTooltipContent } from './tooltip-content';
import { provideForTooltipDefaults } from './tooltip-defaults';
import { ForTooltipTrigger } from './tooltip-trigger';

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <div
      forTooltip
      [(open)]="isOpen"
      [disabled]="isDisabled()"
      [openDelay]="openDelay()"
      [closeDelay]="closeDelay()"
    >
      <button type="button" forTooltipTrigger>Hover me</button>
      <div forTooltipContent>Helpful hint</div>
    </div>
  `,
})
class TooltipHost {
  readonly isOpen = signal(false);
  readonly isDisabled = signal(false);
  readonly openDelay = signal(700);
  readonly closeDelay = signal(300);
}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent, ForTooltipArrow],
  template: `
    <div forTooltip [(open)]="isOpen" [openDelay]="0" [closeDelay]="0">
      <button type="button" forTooltipTrigger>Trigger</button>
      <div forTooltipContent>
        Content
        <span forTooltipArrow></span>
      </div>
    </div>
  `,
})
class TooltipWithArrowHost {
  readonly isOpen = signal(false);
}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <div forTooltip>
      <button type="button" forTooltipTrigger>A</button>
      <div forTooltipContent>A</div>
    </div>
    <div forTooltip>
      <button type="button" forTooltipTrigger>B</button>
      <div forTooltipContent>B</div>
    </div>
  `,
})
class TwoTooltipHost {}

describe('ForTooltip', () => {
  // floating-ui's autoUpdate uses ResizeObserver / IntersectionObserver — jsdom 28
  // still doesn't ship them. Install no-op polyfills for this spec only; the
  // helper restores `globalThis` in `afterAll` so the stubs can't leak across
  // files when Vitest shares a worker (CI `pool: 'forks'` or `isolate: false`).
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  // Every `vi.useFakeTimers()` in this file is scoped to an individual `it`;
  // resetting once at the top-level guarantees real timers between specs
  // without scattering the cleanup across every delay-driven describe.
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('a11y baseline', () => {
    it('wires the trigger to content via id and aria-describedby (only while open)', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('button')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;

      expect(content).toBeTruthy();
      expect(content.getAttribute('role')).toBe('tooltip');
      expect(trigger.id).toBeTruthy();
      expect(content.id).toBeTruthy();
      // Closed initially → no aria-describedby.
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);

      r.instance.isOpen.set(true);
      await flush(r.fixture);

      expect(trigger.getAttribute('aria-describedby')).toBe(content.id);

      r.instance.isOpen.set(false);
      await flush(r.fixture);

      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    });

    it('produces unique ids across instances', async () => {
      const r = renderHost(TwoTooltipHost);
      await flush(r.fixture);

      const triggers = r.queryAll<HTMLButtonElement>('button');
      const contents = Array.from(document.querySelectorAll<HTMLElement>('[role="tooltip"]'));

      expect(triggers).toHaveLength(2);
      expect(contents).toHaveLength(2);
      expect(triggers[0]!.id).not.toBe(triggers[1]!.id);
      expect(contents[0]!.id).not.toBe(contents[1]!.id);
    });
  });

  describe('portal', () => {
    it('moves content out of its declared parent into document.body', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);

      const wrapper = r.query<HTMLElement>('[forTooltip]')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;

      expect(content.parentNode).toBe(document.body);
      expect(wrapper.contains(content)).toBe(false);
    });

    it('removes the portaled content on destroy', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);

      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);

      r.fixture.destroy();
      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(0);
    });
  });

  describe('hover open/close with delays', () => {
    it('opens after openDelay on pointerenter', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      trigger.dispatchEvent(new Event('pointerenter'));

      vi.advanceTimersByTime(699);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);

      vi.advanceTimersByTime(1);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);
    });

    it('closes after closeDelay on pointerleave', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      trigger.dispatchEvent(new Event('pointerleave'));

      vi.advanceTimersByTime(299);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);

      vi.advanceTimersByTime(1);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });

    it('cancels a pending open if pointerleave fires within the delay', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      trigger.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(300);
      trigger.dispatchEvent(new Event('pointerleave'));

      // Far past openDelay — should never open because leave cancelled the timer.
      vi.advanceTimersByTime(5_000);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });
  });

  describe('focus interaction', () => {
    it('opens on focus respecting openDelay', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      trigger.dispatchEvent(new FocusEvent('focus'));

      vi.advanceTimersByTime(699);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);

      vi.advanceTimersByTime(1);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);
    });

    it('schedules close on blur', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      trigger.dispatchEvent(new FocusEvent('blur'));
      vi.advanceTimersByTime(300);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });
  });

  describe('escape key', () => {
    it('closes immediately, bypassing closeDelay', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      r.instance.closeDelay.set(5_000);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      pressKey(trigger, 'Escape');
      r.fixture.detectChanges();

      expect(r.instance.isOpen()).toBe(false);
    });

    it('is a no-op when already closed', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      pressKey(trigger, 'Escape');
      r.fixture.detectChanges();

      expect(r.instance.isOpen()).toBe(false);
    });
  });

  describe('disabled', () => {
    it('ignores hover and focus while disabled', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isDisabled.set(true);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      trigger.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(2_000);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);

      trigger.dispatchEvent(new FocusEvent('focus'));
      vi.advanceTimersByTime(2_000);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });

    it('reflects disabled on the wrapper as data-disabled', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isDisabled.set(true);
      await flush(r.fixture);

      const wrapper = r.query<HTMLElement>('[forTooltip]')!;
      expect(wrapper.getAttribute('data-disabled')).toBe('');
    });
  });

  describe('floating-ui positioning', () => {
    it('writes a transform and data-placement on the content once open', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(content.style.transform).toMatch(/translate\(-?\d+px, -?\d+px\)/);
      // ForTooltip defaults to side='top' + align='center' → resolved
      // placement collapses to the bare side.
      expect(content.dataset['placement']).toBe('top');
    });
  });

  describe('arrow', () => {
    it('registers and gets positioned absolutely while open', async () => {
      const r = renderHost(TooltipWithArrowHost);
      r.instance.isOpen.set(true);
      await flushPositioning(r.fixture);

      const arrow = document.querySelector<HTMLElement>('[data-tooltip-arrow]')!;
      expect(arrow).toBeTruthy();
      expect(arrow.getAttribute('aria-hidden')).toBe('true');
      expect(arrow.style.position).toBe('absolute');
      // Arrow's data-placement mirrors the resolved side (default 'top').
      expect(arrow.dataset['placement']).toBe('top');
    });
  });

  describe('used outside [forTooltip]', () => {
    it('throws a prefixed error from ForTooltipTrigger', () => {
      @Component({
        imports: [ForTooltipTrigger],
        template: `<button type="button" forTooltipTrigger></button>`,
      })
      class OrphanTrigger {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(OrphanTrigger)).toThrow(
        /\[forty-cdk\/tooltip\] ForTooltipTrigger must be used inside a \[forTooltip\] element\./,
      );
    });

    it('throws a prefixed error from ForTooltipContent', () => {
      @Component({
        imports: [ForTooltipContent],
        template: `<div forTooltipContent></div>`,
      })
      class OrphanContent {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(OrphanContent)).toThrow(
        /\[forty-cdk\/tooltip\] ForTooltipContent must be used inside a \[forTooltip\] element\./,
      );
    });

    it('throws a prefixed error from ForTooltipArrow', () => {
      @Component({
        imports: [ForTooltipArrow],
        template: `<span forTooltipArrow></span>`,
      })
      class OrphanArrow {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(OrphanArrow)).toThrow(
        /\[forty-cdk\/tooltip\] ForTooltipArrow must be used inside a \[forTooltip\] element\./,
      );
    });
  });

  describe('(openChange) output', () => {
    it('emits when hover/focus delays toggle open', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        template: `
          <div forTooltip [openDelay]="0" [closeDelay]="0" (openChange)="emitted.push($event)">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {
        readonly emitted: boolean[] = [];
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.dispatchEvent(new PointerEvent('pointerenter'));
      await flush(r.fixture);
      trigger.dispatchEvent(new PointerEvent('pointerleave'));
      await flush(r.fixture);

      expect(r.instance.emitted).toEqual([true, false]);
    });

    it('does not emit when the consumer drives `open` externally via [(open)]', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        template: `
          <div forTooltip [(open)]="isOpen" (openChange)="emitted.push($event)">
            <button type="button" forTooltipTrigger></button>
            <div forTooltipContent></div>
          </div>
        `,
      })
      class Host {
        readonly isOpen = signal(false);
        readonly emitted: boolean[] = [];
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      r.instance.isOpen.set(true);
      await flush(r.fixture);
      r.instance.isOpen.set(false);
      await flush(r.fixture);

      expect(r.instance.emitted).toEqual([]);
    });
  });

  describe('provideForTooltipDefaults', () => {
    @Component({
      imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
      providers: [provideForTooltipDefaults({ skipDelayDuration: 1000 })],
      template: `
        <div forTooltip [(open)]="aOpen" [openDelay]="500" [closeDelay]="0">
          <button type="button" forTooltipTrigger>A</button>
          <div forTooltipContent>A</div>
        </div>
        <div forTooltip [(open)]="bOpen" [openDelay]="500" [closeDelay]="0">
          <button type="button" forTooltipTrigger>B</button>
          <div forTooltipContent>B</div>
        </div>
      `,
    })
    class DefaultsHost {
      readonly aOpen = signal(false);
      readonly bOpen = signal(false);
    }

    it('opens the second tooltip instantly while a peer just closed (skip-delay window)', async () => {
      const r = renderHost(DefaultsHost);
      await flush(r.fixture);

      const triggers = r.queryAll<HTMLButtonElement>('button');
      const triggerA = triggers[0]!;
      const triggerB = triggers[1]!;

      // Open A externally, then close it via pointer-leave so the
      // tooltip's internal close path runs and asks the coordinator to
      // start the skip-delay window.
      r.instance.aOpen.set(true);
      await flush(r.fixture);
      triggerA.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.aOpen()).toBe(false);

      triggerB.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.bOpen()).toBe(true);
    });

    it('does not skip the delay when no peer has recently closed', async () => {
      const r = renderHost(DefaultsHost);
      await flush(r.fixture);

      const triggers = r.queryAll<HTMLButtonElement>('button');
      const triggerA = triggers[0]!;
      triggerA.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);

      // Without a prior close, the coordinator's skip flag is false →
      // the tooltip waits for its full openDelay (500ms) before opening.
      expect(r.instance.aOpen()).toBe(false);
    });

    it('uses delayDuration as the openDelay fallback when the input is unset', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ delayDuration: 0 })],
        template: `
          <div forTooltip [(open)]="open">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class FallbackHost {
        readonly open = signal(false);
      }

      const r = renderHost(FallbackHost);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);

      // delayDuration=0 → opens synchronously without any per-tooltip override.
      expect(r.instance.open()).toBe(true);
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

    it('still respects openDelay / closeDelay cadence under reduced-motion', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      trigger.dispatchEvent(new Event('pointerenter'));

      vi.advanceTimersByTime(699);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);

      vi.advanceTimersByTime(1);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);

      trigger.dispatchEvent(new Event('pointerleave'));
      vi.advanceTimersByTime(299);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);

      vi.advanceTimersByTime(1);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects open writes after detectChanges without Zone.js', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);

      r.instance.isOpen.set(true);
      await flush(r.fixture);
      expect(trigger.hasAttribute('aria-describedby')).toBe(true);

      r.instance.isOpen.set(false);
      await flush(r.fixture);
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    });
  });
});
