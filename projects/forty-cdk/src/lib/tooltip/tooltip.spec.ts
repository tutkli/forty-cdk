import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForTooltip } from './tooltip';
import { ForTooltipArrow } from './tooltip-arrow';
import { ForTooltipContent } from './tooltip-content';
import { ForTooltipProvider } from './tooltip-provider';
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

async function nextTick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function flushAsync<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function flushPositioning<T>(fixture: ComponentFixture<T>): Promise<void> {
  // Drain: signal write → effect → autoUpdate → computePosition.then.
  // computePosition's promise resolves across several microtask hops; mix in
  // macrotask waits so anything queued via setTimeout/Promise.then settles.
  await flushAsync(fixture);
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

describe('ForTooltip', () => {
  beforeAll(() => {
    // floating-ui's autoUpdate uses these — jsdom 28 still doesn't ship them.
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      } as unknown as typeof ResizeObserver;
    }
    if (typeof globalThis.IntersectionObserver === 'undefined') {
      globalThis.IntersectionObserver = class {
        readonly root = null;
        readonly rootMargin = '';
        readonly thresholds: readonly number[] = [];
        constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
      } as unknown as typeof IntersectionObserver;
    }
  });

  afterEach(() => {
    // Clean up any portaled tooltip content left in document.body.
    document.querySelectorAll('[role="tooltip"]').forEach((n) => n.remove());
  });

  describe('a11y baseline', () => {
    it('wires the trigger to content via id and aria-describedby (only while open)', async () => {
      const r = renderHost(TooltipHost);
      await flushAsync(r.fixture);

      const trigger = r.query<HTMLButtonElement>('button')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;

      expect(content).toBeTruthy();
      expect(content.getAttribute('role')).toBe('tooltip');
      expect(trigger.id).toBeTruthy();
      expect(content.id).toBeTruthy();
      // Closed initially → no aria-describedby.
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);

      r.instance.isOpen.set(true);
      await flushAsync(r.fixture);

      expect(trigger.getAttribute('aria-describedby')).toBe(content.id);

      r.instance.isOpen.set(false);
      await flushAsync(r.fixture);

      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    });

    it('produces unique ids across instances', async () => {
      const r = renderHost(TwoTooltipHost);
      await flushAsync(r.fixture);

      const triggers = r.queryAll<HTMLButtonElement>('button');
      const contents = Array.from(
        document.querySelectorAll<HTMLElement>('[role="tooltip"]'),
      );

      expect(triggers).toHaveLength(2);
      expect(contents).toHaveLength(2);
      expect(triggers[0]!.id).not.toBe(triggers[1]!.id);
      expect(contents[0]!.id).not.toBe(contents[1]!.id);
    });
  });

  describe('portal', () => {
    it('moves content out of its declared parent into document.body', async () => {
      const r = renderHost(TooltipHost);
      await flushAsync(r.fixture);

      const wrapper = r.query<HTMLElement>('[forTooltip]')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;

      expect(content.parentNode).toBe(document.body);
      expect(wrapper.contains(content)).toBe(false);
    });

    it('removes the portaled content on destroy', async () => {
      const r = renderHost(TooltipHost);
      await flushAsync(r.fixture);

      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);

      r.fixture.destroy();
      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(0);
    });
  });

  describe('hover open/close with delays', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens after openDelay on pointerenter', async () => {
      const r = renderHost(TooltipHost);
      await flushAsync(r.fixture);
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
      await flushAsync(r.fixture);
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
      await flushAsync(r.fixture);
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
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens on focus respecting openDelay', async () => {
      const r = renderHost(TooltipHost);
      await flushAsync(r.fixture);
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
      await flushAsync(r.fixture);
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
      await flushAsync(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      r.fixture.detectChanges();

      expect(r.instance.isOpen()).toBe(false);
    });

    it('is a no-op when already closed', async () => {
      const r = renderHost(TooltipHost);
      await flushAsync(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      r.fixture.detectChanges();

      expect(r.instance.isOpen()).toBe(false);
    });
  });

  describe('disabled', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('ignores hover and focus while disabled', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isDisabled.set(true);
      await flushAsync(r.fixture);
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
      await flushAsync(r.fixture);

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
      expect(content.dataset['placement']).toBeTruthy();
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
      expect(arrow.dataset['placement']).toBeTruthy();
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
      await flushAsync(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.dispatchEvent(new PointerEvent('pointerenter'));
      await flushAsync(r.fixture);
      trigger.dispatchEvent(new PointerEvent('pointerleave'));
      await flushAsync(r.fixture);

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
      await flushAsync(r.fixture);
      r.instance.isOpen.set(true);
      await flushAsync(r.fixture);
      r.instance.isOpen.set(false);
      await flushAsync(r.fixture);

      expect(r.instance.emitted).toEqual([]);
    });
  });

  describe('ForTooltipProvider', () => {
    @Component({
      imports: [ForTooltipProvider, ForTooltip, ForTooltipTrigger, ForTooltipContent],
      template: `
        <div forTooltipProvider [skipDelayDuration]="skip()">
          <div forTooltip [(open)]="aOpen" [openDelay]="500" [closeDelay]="0">
            <button type="button" forTooltipTrigger>A</button>
            <div forTooltipContent>A</div>
          </div>
          <div forTooltip [(open)]="bOpen" [openDelay]="500" [closeDelay]="0">
            <button type="button" forTooltipTrigger>B</button>
            <div forTooltipContent>B</div>
          </div>
        </div>
      `,
    })
    class ProviderHost {
      readonly aOpen = signal(false);
      readonly bOpen = signal(false);
      readonly skip = signal(300);
    }

    it('opens the second tooltip instantly while a peer just closed (skip-delay window)', async () => {
      const r = renderHost(ProviderHost);
      r.instance.skip.set(1000);
      await flushAsync(r.fixture);

      const triggers = r.queryAll<HTMLButtonElement>('button');
      const triggerA = triggers[0]!;
      const triggerB = triggers[1]!;

      // Open A via its own logic (with delay 500), then close it via
      // pointer-leave so the tooltip's internal close path runs and
      // notifies the provider to start the skip-delay window.
      r.instance.aOpen.set(true);
      await flushAsync(r.fixture);
      triggerA.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await flushAsync(r.fixture);
      expect(r.instance.aOpen()).toBe(false);

      triggerB.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flushAsync(r.fixture);

      expect(r.instance.bOpen()).toBe(true);
    });

    it('does not skip the delay when no peer has recently closed', async () => {
      const r = renderHost(ProviderHost);
      await flushAsync(r.fixture);

      const triggers = r.queryAll<HTMLButtonElement>('button');
      const triggerA = triggers[0]!;
      triggerA.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flushAsync(r.fixture);

      // Without a prior close, the provider's skip flag is false → the
      // tooltip waits for its full openDelay (500ms) before opening.
      expect(r.instance.aOpen()).toBe(false);
    });
  });

  describe('forceMount', () => {
    it('keeps the content mounted (no [hidden]) when open=false', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        template: `
          <div forTooltip [(open)]="isOpen" [forceMount]="true">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {
        readonly isOpen = signal(false);
      }

      const r = renderHost(Host);
      await flushAsync(r.fixture);

      const content = document.querySelector<HTMLElement>('[forTooltipContent]')!;
      expect(content.hasAttribute('hidden')).toBe(false);
      expect(content.getAttribute('data-state')).toBe('closed');

      r.instance.isOpen.set(true);
      await flushAsync(r.fixture);

      expect(content.hasAttribute('hidden')).toBe(false);
      expect(content.getAttribute('data-state')).toBe('open');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects open writes after detectChanges without Zone.js', async () => {
      const r = renderHost(TooltipHost);
      await flushAsync(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);

      r.instance.isOpen.set(true);
      await flushAsync(r.fixture);
      expect(trigger.hasAttribute('aria-describedby')).toBe(true);

      r.instance.isOpen.set(false);
      await flushAsync(r.fixture);
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    });
  });
});
