import { NgTemplateOutlet } from '@angular/common';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  flush,
  flushPositioning,
  installObserverPolyfills,
  pressKey,
  renderHost,
  withReducedMotion,
} from '../../src/test-utils';
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

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <div
      forTooltip
      [(open)]="isOpen"
      [openDelay]="0"
      [closeDelay]="0"
      [hoverableContent]="hoverable()"
    >
      <button type="button" forTooltipTrigger>Hover me</button>
      <div forTooltipContent>Helpful hint</div>
    </div>
  `,
})
class HoverableTooltipHost {
  readonly isOpen = signal(false);
  readonly hoverable = signal(true);
}

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
      // Closed initially → no aria-describedby.
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);

      r.instance.isOpen.set(true);
      await flush(r.fixture);

      expect(trigger.getAttribute('aria-describedby')).toBe(content.id);

      r.instance.isOpen.set(false);
      await flush(r.fixture);

      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    });

    it('assigns the generated trigger id when the host has none', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('button')!;
      expect(trigger.id).toMatch(/^for-tooltip-trigger-/);
    });

    it('preserves a consumer-set id on the trigger', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        template: `
          <div forTooltip [(open)]="isOpen">
            <button type="button" id="save-action" forTooltipTrigger>Save</button>
            <div forTooltipContent>Save changes</div>
          </div>
        `,
      })
      class ConsumerIdHost {
        readonly isOpen = signal(false);
      }

      const r = renderHost(ConsumerIdHost);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('button')!;
      expect(trigger.id).toBe('save-action');

      r.instance.isOpen.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(trigger.id).toBe('save-action');
      expect(trigger.getAttribute('aria-describedby')).toBe(content.id);

      r.instance.isOpen.set(false);
      await flush(r.fixture);

      expect(trigger.id).toBe('save-action');
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

  describe('touch interaction', () => {
    it('does not open on a touch-induced focus (a tap focuses the trigger)', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush(r.fixture);

      expect(r.instance.isOpen()).toBe(false);
    });

    it('ignores a touch pointerenter so a tap never opens via the hover path', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
      await flush(r.fixture);

      expect(r.instance.isOpen()).toBe(false);
    });

    it('reopens on a later keyboard focus after a suppressed touch tap', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(false);

      trigger.dispatchEvent(new FocusEvent('blur'));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);
    });
  });

  describe('trigger activation (press) dismisses', () => {
    it('a click dismisses an open tooltip and the focus it induces does not reopen it', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);

      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse' }));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(false);
    });

    it('dismisses immediately on pointerdown, bypassing closeDelay', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      r.instance.closeDelay.set(5_000);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse' }));
      await flush(r.fixture);

      expect(r.instance.isOpen()).toBe(false);
    });

    it('cancels a pending hover-open when the trigger is pressed within openDelay', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
      vi.advanceTimersByTime(300);
      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse' }));

      vi.advanceTimersByTime(5_000);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });

    it('reflects the press dismiss through data-state without Zone.js', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(trigger.getAttribute('data-state')).toBe('open');

      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse' }));
      await flush(r.fixture);

      expect(trigger.getAttribute('data-state')).toBe('closed');
      expect(content.getAttribute('data-state')).toBe('closed');
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('pointer-induced focus does not open (only keyboard focus does)', () => {
    it('does not open on a mouse-induced focus (a click that focuses the trigger)', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse' }));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush(r.fixture);

      expect(r.instance.isOpen()).toBe(false);
    });

    it('does not open on a pen-induced focus', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'pen' }));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush(r.fixture);

      expect(r.instance.isOpen()).toBe(false);
    });

    it('opens on a keyboard focus not preceded by any pointer interaction', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush(r.fixture);

      expect(r.instance.isOpen()).toBe(true);
    });
  });

  describe('hover / focus interplay', () => {
    it('does not close on pointerleave while the trigger is still focused', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new FocusEvent('focus'));
      trigger.dispatchEvent(new PointerEvent('pointerenter'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);

      // Pointer leaves but focus stays — APG keeps the tooltip open.
      trigger.dispatchEvent(new PointerEvent('pointerleave'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);

      // Removing focus too (now neither hovered nor focused) closes it.
      trigger.dispatchEvent(new FocusEvent('blur'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(false);
    });

    it('does not close on blur while the pointer is still over the trigger', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new PointerEvent('pointerenter'));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);

      trigger.dispatchEvent(new FocusEvent('blur'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);

      trigger.dispatchEvent(new PointerEvent('pointerleave'));
      await flush(r.fixture);
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

  describe('hoverableContent', () => {
    it('keeps the tooltip open when the pointer moves into the content', async () => {
      const r = renderHost(HoverableTooltipHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;

      trigger.dispatchEvent(new PointerEvent('pointerenter'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);

      // Leaving the trigger arms the grace bridge rather than closing.
      trigger.dispatchEvent(new PointerEvent('pointerleave', { clientX: 0, clientY: 0 }));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);

      // The pointer reaches the content → it holds the tooltip open.
      content.dispatchEvent(new PointerEvent('pointerenter'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);

      // Leaving the content (closeDelay = 0) finally closes it.
      content.dispatchEvent(new PointerEvent('pointerleave'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(false);
    });

    it('keeps the tooltip open via content hover while the trigger is still focused', async () => {
      const r = renderHost(HoverableTooltipHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;

      trigger.dispatchEvent(new FocusEvent('focus'));
      content.dispatchEvent(new PointerEvent('pointerenter'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);

      // Blur while the pointer is over the content keeps it open…
      trigger.dispatchEvent(new FocusEvent('blur'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);

      // …and leaving the content (now neither focused nor hovered) closes it.
      content.dispatchEvent(new PointerEvent('pointerleave'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(false);
    });

    it('content hover is inert when hoverableContent is off', async () => {
      const r = renderHost(HoverableTooltipHost);
      r.instance.hoverable.set(false);
      r.instance.isOpen.set(true);
      await flush(r.fixture);
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;

      // With hoverableContent off, content enter / leave early-return — they
      // neither hold the tooltip open nor schedule a close. The tooltip stays
      // in whatever state the (trigger-driven) lifecycle left it.
      content.dispatchEvent(new PointerEvent('pointerenter'));
      content.dispatchEvent(new PointerEvent('pointerleave'));
      await flush(r.fixture);
      expect(r.instance.isOpen()).toBe(true);
    });

    it('reflects pointer-events on the content only while hoverableContent is set', async () => {
      const r = renderHost(HoverableTooltipHost);
      r.instance.hoverable.set(false);
      await flush(r.fixture);
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(content.style.pointerEvents).toBe('none');

      r.instance.hoverable.set(true);
      await flush(r.fixture);
      expect(content.style.pointerEvents).toBe('');
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

    it('force-closes an already-open tooltip when disabled flips to true', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('button')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(trigger.getAttribute('data-state')).toBe('open');
      expect(content.getAttribute('data-state')).toBe('open');
      expect(trigger.getAttribute('aria-describedby')).toBe(content.id);

      r.instance.isDisabled.set(true);
      await flush(r.fixture);

      expect(trigger.getAttribute('data-state')).toBe('closed');
      expect(content.getAttribute('data-state')).toBe('closed');
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('show() / hide() imperative API', () => {
    it('show() opens the tooltip after openDelay', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);
      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      tooltip.show();

      vi.advanceTimersByTime(699);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
      expect(trigger.getAttribute('data-state')).toBe('closed');

      vi.advanceTimersByTime(1);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);
      expect(trigger.getAttribute('data-state')).toBe('open');
    });

    it('hide() closes the tooltip after closeDelay, not before', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      await flush(r.fixture);
      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);

      vi.useFakeTimers();
      tooltip.hide();

      vi.advanceTimersByTime(299);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);

      vi.advanceTimersByTime(1);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });

    it('show() is a no-op while disabled', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isDisabled.set(true);
      await flush(r.fixture);
      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);

      vi.useFakeTimers();
      tooltip.show();
      vi.advanceTimersByTime(2_000);
      r.fixture.detectChanges();

      expect(r.instance.isOpen()).toBe(false);
    });

    it('show() is a no-op under showOnOverflow when the trigger reports no overflow', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        template: `
          <div forTooltip [(open)]="open" [openDelay]="0" [closeDelay]="0" showOnOverflow>
            <button type="button" forTooltipTrigger>Fits</button>
            <div forTooltipContent>Fits</div>
          </div>
        `,
      })
      class OverflowHost {
        readonly open = signal(false);
      }

      const r = renderHost(OverflowHost);
      await flush(r.fixture);
      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);

      tooltip.show();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('reflects show() / hide() through data-state without Zone.js', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        template: `
          <div forTooltip [openDelay]="0" [closeDelay]="0">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {}

      const r = renderHost(Host);
      await flush(r.fixture);
      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);
      const trigger = r.query<HTMLButtonElement>('button')!;
      expect(trigger.getAttribute('data-state')).toBe('closed');

      tooltip.show();
      await flush(r.fixture);
      expect(trigger.getAttribute('data-state')).toBe('open');

      tooltip.hide();
      await flush(r.fixture);
      expect(trigger.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('floating-ui positioning', () => {
    it('writes a position and data-placement on the content once open', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      // Position lives on the `translate` property (NOT `transform`, which
      // stays free for the consumer's enter animation).
      expect(content.style.translate).toMatch(/^-?\d+px -?\d+px$/);
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
    it('throws a prefixed error from ForTooltipTrigger on first change detection', () => {
      @Component({
        imports: [ForTooltipTrigger],
        template: `<button type="button" forTooltipTrigger></button>`,
      })
      class OrphanTrigger {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      const fixture = TestBed.createComponent(OrphanTrigger);
      let error: unknown;
      try {
        fixture.detectChanges();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toMatch(/\[forty-cdk\/tooltip\] ForTooltipTrigger could not resolve/);
      expect(message).toMatch(/declaration site/);
      expect(message).toMatch(/\[forTooltipTrigger\]="root"/);
      expect(message).toMatch(/#root="forTooltip"/);
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
          <div
            forTooltip
            [(open)]="isOpen"
            [openDelay]="0"
            [closeDelay]="0"
            (openChange)="emitted.push($event)"
          >
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {
        readonly isOpen = signal(false);
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

    it('emits both true AND false in the uncontrolled (observe-only) case', async () => {
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

      // Without any [(open)] binding the closing transition must still emit —
      // the bug was that the hand-rolled bridge dropped the false emit here.
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

    it('uses openDelay as the open fallback when the input is unset', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ openDelay: 0 })],
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

      // openDelay=0 → opens synchronously without any per-tooltip override.
      expect(r.instance.open()).toBe(true);
    });

    it('uses closeDelay as the close fallback when the input is unset', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ closeDelay: 0 })],
        template: `
          <div forTooltip [(open)]="open">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class FallbackHost {
        readonly open = signal(true);
      }

      const r = renderHost(FallbackHost);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await flush(r.fixture);

      // closeDelay=0 from the scope (no per-tooltip [closeDelay]) → an open
      // tooltip closes synchronously on hover-leave. Pre-change, closeDelay was
      // a hardcoded 300ms input that ignored the scope, so this stayed open.
      expect(r.instance.open()).toBe(false);
    });

    it('is callable with no arguments to establish a fresh coordinator scope', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults()],
        template: `
          <div forTooltip [(open)]="open" [openDelay]="0">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class NoArgsHost {
        readonly open = signal(false);
      }

      const r = renderHost(NoArgsHost);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });
  });

  describe('positioning defaults from provideForTooltipDefaults', () => {
    it('positions on the scope side when the instance sets no side', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ side: 'bottom' })],
        template: `
          <div forTooltip [(open)]="open">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(content.dataset['side']).toBe('bottom');
      expect(content.dataset['placement']).toBe('bottom');
    });

    it('lets an instance-level side win over the scope default', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ side: 'bottom' })],
        template: `
          <div forTooltip [(open)]="open" side="left">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(content.dataset['side']).toBe('left');
    });

    it('aligns on the scope align when the instance sets no align', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ align: 'start' })],
        template: `
          <div forTooltip [(open)]="open">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(content.dataset['align']).toBe('start');
      expect(content.dataset['placement']).toBe('top-start');
    });

    it('lets an instance-level align win over the scope default', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ align: 'start' })],
        template: `
          <div forTooltip [(open)]="open" align="end">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(content.dataset['align']).toBe('end');
    });

    it('resolves sideOffset and collisionPadding from the scope when the inputs are unset', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ sideOffset: 12, collisionPadding: 16 })],
        template: `
          <div forTooltip>
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {}

      const r = renderHost(Host);
      await flush(r.fixture);

      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);
      expect(tooltip.sideOffset()).toBe(12);
      expect(tooltip.collisionPadding()).toBe(16);
    });

    it('lets instance-level sideOffset / collisionPadding win over the scope defaults', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ sideOffset: 12, collisionPadding: 16 })],
        template: `
          <div forTooltip [sideOffset]="20" [collisionPadding]="24">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {}

      const r = renderHost(Host);
      await flush(r.fixture);

      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);
      expect(tooltip.sideOffset()).toBe(20);
      expect(tooltip.collisionPadding()).toBe(24);
    });

    it('keeps the library fallbacks (top / center / 8 / 8) when nothing is configured', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        template: `
          <div forTooltip [(open)]="open">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);
      expect(tooltip.side()).toBe('top');
      expect(tooltip.align()).toBe('center');
      expect(tooltip.sideOffset()).toBe(8);
      expect(tooltip.collisionPadding()).toBe(8);

      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(content.dataset['side']).toBe('top');
      expect(content.dataset['align']).toBe('center');
      expect(content.dataset['placement']).toBe('top');
    });
  });

  describe('showOnOverflow / hoverableContent defaults', () => {
    it('resolves both from the scope when the inputs are unset', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ showOnOverflow: true, hoverableContent: true })],
        template: `
          <div forTooltip>
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {}

      const r = renderHost(Host);
      await flush(r.fixture);

      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);
      expect(tooltip.showOnOverflow()).toBe(true);
      expect(tooltip.hoverableContent()).toBe(true);
    });

    it('lets instance-level inputs win over the scope defaults', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
        providers: [provideForTooltipDefaults({ showOnOverflow: true, hoverableContent: true })],
        template: `
          <div forTooltip [showOnOverflow]="false" [hoverableContent]="false">
            <button type="button" forTooltipTrigger>T</button>
            <div forTooltipContent>C</div>
          </div>
        `,
      })
      class Host {}

      const r = renderHost(Host);
      await flush(r.fixture);

      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);
      expect(tooltip.showOnOverflow()).toBe(false);
      expect(tooltip.hoverableContent()).toBe(false);
    });

    it('keeps the library fallbacks (false / false) when nothing is configured', async () => {
      const r = renderHost(TooltipHost);
      await flush(r.fixture);

      const tooltip = r.fixture.debugElement
        .query(By.directive(ForTooltip))
        .injector.get(ForTooltip);
      expect(tooltip.showOnOverflow()).toBe(false);
      expect(tooltip.hoverableContent()).toBe(false);
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

    it('reflects data-reduced-motion on the root and content', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      await flush(r.fixture);

      const root = r.query<HTMLElement>('[forTooltip]')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(root.getAttribute('data-reduced-motion')).toBe('');
      expect(content.getAttribute('data-reduced-motion')).toBe('');
    });
  });

  describe('reduced-motion styling hook (default)', () => {
    it('omits data-reduced-motion when reduced motion is not requested', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      await flush(r.fixture);

      const root = r.query<HTMLElement>('[forTooltip]')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(root.hasAttribute('data-reduced-motion')).toBe(false);
      expect(content.hasAttribute('data-reduced-motion')).toBe(false);
    });
  });

  describe('scroll dismiss', () => {
    function getTooltip(r: ReturnType<typeof renderHost<TooltipHost>>): ForTooltip {
      return r.fixture.debugElement.query(By.directive(ForTooltip)).injector.get(ForTooltip);
    }

    it('closes an open tooltip when an ancestor scrolls', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;
      expect(trigger.getAttribute('data-state')).toBe('open');

      document.dispatchEvent(new Event('scroll'));
      await flush(r.fixture);

      expect(r.instance.isOpen()).toBe(false);
      expect(trigger.getAttribute('data-state')).toBe('closed');
    });

    it('suppresses a hover open while an ancestor is scrolling, even with openDelay 0', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      document.dispatchEvent(new Event('scroll'));
      trigger.dispatchEvent(new PointerEvent('pointerenter'));
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);

      vi.advanceTimersByTime(200);
      trigger.dispatchEvent(new PointerEvent('pointerenter'));
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);
    });

    it('suppresses the instant re-open during scroll within the skip-delay window', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      vi.useFakeTimers();
      trigger.dispatchEvent(new PointerEvent('pointerenter'));
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);
      trigger.dispatchEvent(new PointerEvent('pointerleave'));
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);

      document.dispatchEvent(new Event('scroll'));
      trigger.dispatchEvent(new PointerEvent('pointerenter'));
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });

    it('show() is a no-op while an ancestor is scrolling', async () => {
      const r = renderHost(TooltipHost);
      r.instance.openDelay.set(0);
      r.instance.closeDelay.set(0);
      await flush(r.fixture);
      const tooltip = getTooltip(r);

      vi.useFakeTimers();
      document.dispatchEvent(new Event('scroll'));
      tooltip.show();
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });

    it('reflects the scroll close through data-state without Zone.js', async () => {
      const r = renderHost(TooltipHost);
      r.instance.isOpen.set(true);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(content.getAttribute('data-state')).toBe('open');

      document.dispatchEvent(new Event('scroll'));
      await flush(r.fixture);

      expect(trigger.getAttribute('data-state')).toBe('closed');
      expect(content.getAttribute('data-state')).toBe('closed');
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
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

  describe('explicit root reference (stamped templates)', () => {
    @Component({
      imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent, NgTemplateOutlet],
      template: `
        <ng-template #trig let-root="root">
          <button type="button" [forTooltipTrigger]="root">Hover me</button>
        </ng-template>

        <div forTooltip [(open)]="open" [openDelay]="0" [closeDelay]="0" #root="forTooltip">
          <ng-container [ngTemplateOutlet]="trig" [ngTemplateOutletContext]="{ root }" />
          <div forTooltipContent>Hint</div>
        </div>
      `,
    })
    class StampedHost {
      readonly open = signal(false);
    }

    it('opens on pointerenter when the root is passed explicitly', async () => {
      const r = renderHost(StampedHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(trigger.getAttribute('data-state')).toBe('open');
      const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(trigger.getAttribute('aria-describedby')).toBe(content.id);
    });

    it('open state stays reactive without zone.js through the explicit reference', async () => {
      const r = renderHost(StampedHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;

      expect(trigger.getAttribute('data-state')).toBe('closed');

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(trigger.getAttribute('data-state')).toBe('open');

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(trigger.getAttribute('data-state')).toBe('closed');
    });
  });
});
