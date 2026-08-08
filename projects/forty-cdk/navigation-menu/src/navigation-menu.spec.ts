import { Component, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost, TestStackedLayer } from '../../src/test-utils';
import { assertDataStateContract } from '../../src/test-utils/contract';
import { ForNavigationMenu } from './navigation-menu';
import { ForNavigationMenuContent } from './navigation-menu-content';
import { ForNavigationMenuItem } from './navigation-menu-item';
import { ForNavigationMenuLink } from './navigation-menu-link';
import { ForNavigationMenuList } from './navigation-menu-list';
import { ForNavigationMenuTrigger } from './navigation-menu-trigger';

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
  ],
  template: `
    <nav forNavigationMenu [ariaLabel]="'Main'" [(value)]="open" [orientation]="orientation()">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button forNavigationMenuTrigger>Products</button>
          @if (open() === 'products') {
            <div forNavigationMenuContent>
              <a href="/p/a" forNavigationMenuLink>A</a>
              <a href="/p/b" forNavigationMenuLink active>B</a>
              <span data-id="products-static">filters</span>
            </div>
          }
        </li>
        <li forNavigationMenuItem value="solutions">
          <button forNavigationMenuTrigger>Solutions</button>
          @if (open() === 'solutions') {
            <div forNavigationMenuContent>
              <a href="/s/x" forNavigationMenuLink>X</a>
            </div>
          }
        </li>
        <li forNavigationMenuItem value="about">
          <button forNavigationMenuTrigger>About</button>
          @if (open() === 'about') {
            <div forNavigationMenuContent>
              <a href="/about" forNavigationMenuLink>About</a>
            </div>
          }
        </li>
      </ul>
    </nav>
  `,
})
class NavMenuHost {
  readonly open = signal<string | null>(null);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
}

/**
 * Mounts each panel from an independent boolean so a leaving panel can be
 * kept around while later transitions happen — the same shape `animate.leave`
 * produces (the leaving DOM survives past the `value` transition). The
 * `@if (open() === …)` host destroys a leaving panel synchronously and can
 * never reproduce overlapping exits, so the per-panel `data-motion` freeze
 * is asserted against this host instead.
 */
@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
  ],
  template: `
    <nav forNavigationMenu [(value)]="open">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button forNavigationMenuTrigger>Products</button>
          @if (mountProducts()) {
            <div forNavigationMenuContent data-id="products">products panel</div>
          }
        </li>
        <li forNavigationMenuItem value="solutions">
          <button forNavigationMenuTrigger>Solutions</button>
          @if (mountSolutions()) {
            <div forNavigationMenuContent data-id="solutions">solutions panel</div>
          }
        </li>
        <li forNavigationMenuItem value="about">
          <button forNavigationMenuTrigger>About</button>
          @if (mountAbout()) {
            <div forNavigationMenuContent data-id="about">about panel</div>
          }
        </li>
      </ul>
    </nav>
  `,
})
class OverlappingNavMenuHost {
  readonly open = signal<string | null>(null);
  readonly mountProducts = signal(false);
  readonly mountSolutions = signal(false);
  readonly mountAbout = signal(false);
}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
    TestStackedLayer,
  ],
  template: `
    <nav forNavigationMenu [(value)]="open">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button forNavigationMenuTrigger>Products</button>
          @if (open() === 'products') {
            <div forNavigationMenuContent>
              <a href="/p/a" forNavigationMenuLink>A</a>
            </div>
          }
        </li>
      </ul>
    </nav>
    <div testStackedLayer>
      <button data-id="stacked">stacked</button>
    </div>
  `,
})
class StackedLayerNavMenuHost {
  readonly open = signal<string | null>(null);
  readonly stacked = viewChild.required(TestStackedLayer);
}

function pointer(
  type: 'pointerenter' | 'pointerleave' | 'pointerdown',
  pointerType?: string,
): PointerEvent {
  const event = new PointerEvent(type, { bubbles: true });
  if (pointerType !== undefined) {
    Object.defineProperty(event, 'pointerType', { value: pointerType, configurable: true });
  }
  return event;
}

describe('ForNavigationMenu', () => {
  assertDataStateContract({
    vocabulary: ['closed', 'open'],
    mount: () => {
      const r = renderHost(NavMenuHost);
      return {
        pieces: () => ({
          root: r.query<HTMLElement>('[forNavigationMenu]'),
          trigger: r.queryAll<HTMLElement>('[forNavigationMenuTrigger]')[0] ?? null,
          content: r.query<HTMLElement>('[forNavigationMenuContent]'),
        }),
        setState: (state) => r.instance.open.set(state === 'open' ? 'products' : null),
        flush: r.flush,
      };
    },
  });

  describe('basic rendering', () => {
    it('reflects aria-label, data-orientation, and trigger ↔ content ids', async () => {
      const { query, queryAll, fixture, flush } = renderHost(NavMenuHost);
      await flush();

      const root = query<HTMLElement>('[forNavigationMenu]')!;
      expect(root.getAttribute('aria-label')).toBe('Main');
      expect(root.getAttribute('data-orientation')).toBe('horizontal');

      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');
      expect(triggers.length).toBe(3);
      for (const t of triggers) {
        expect(t.getAttribute('aria-expanded')).toBe('false');
      }

      // Open one item to assert id wiring on the trigger.
      fixture.componentInstance.open.set('products');
      await flush();
      const trigger = triggers[0]!;
      const content = query<HTMLElement>('[forNavigationMenuContent]')!;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    });

    it('emits no aria-label when ariaLabel is unset (default null)', async () => {
      @Component({
        imports: [
          ForNavigationMenu,
          ForNavigationMenuList,
          ForNavigationMenuItem,
          ForNavigationMenuTrigger,
        ],
        template: `
          <nav forNavigationMenu>
            <ul forNavigationMenuList>
              <li forNavigationMenuItem value="products">
                <button forNavigationMenuTrigger>Products</button>
              </li>
            </ul>
          </nav>
        `,
      })
      class NoLabelHost {}

      const { query, flush } = renderHost(NoLabelHost);
      await flush();
      const root = query<HTMLElement>('[forNavigationMenu]')!;
      expect(root.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('click toggle', () => {
    it('opens on click and closes on a second click', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();

      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');
      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
    });

    it('opens an item whose value is the empty string', async () => {
      // `null` is the closed sentinel, so `''` is an ordinary item value and
      // must open like any other (#1400 item 3).
      @Component({
        imports: [
          ForNavigationMenu,
          ForNavigationMenuList,
          ForNavigationMenuItem,
          ForNavigationMenuTrigger,
          ForNavigationMenuContent,
        ],
        template: `
          <nav forNavigationMenu [(value)]="open">
            <ul forNavigationMenuList>
              <li forNavigationMenuItem value="">
                <button forNavigationMenuTrigger>Empty</button>
                @if (open() === '') {
                  <div forNavigationMenuContent>content</div>
                }
              </li>
            </ul>
          </nav>
        `,
      })
      class Host {
        readonly open = signal<string | null>(null);
      }
      const { fixture, query, queryAll, flush } = renderHost(Host);
      await flush();

      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(query<HTMLElement>('[forNavigationMenu]')!.getAttribute('data-state')).toBe('open');
      expect(query<HTMLElement>('[forNavigationMenuContent]')).not.toBeNull();

      // Close, then reopen through the keyboard path (scheduleOpen) — it
      // carries its own sentinel guard.
      trigger.click();
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();

      pressKey(trigger, 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.open()).toBe('');
    });

    it('switching items closes the previous and opens the next', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();

      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');
      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      triggers[1]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('solutions');
    });
  });

  describe('hover open / close with delay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens after delayDuration on pointerenter', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.dispatchEvent(pointer('pointerenter'));
      await flush();
      vi.advanceTimersByTime(199);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
      vi.advanceTimersByTime(1);
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('closes after closeDelay on pointerleave', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      trigger.dispatchEvent(pointer('pointerleave'));
      await flush();
      vi.advanceTimersByTime(149);
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');
      vi.advanceTimersByTime(1);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
    });

    it('keeps the menu open when the pointer moves from trigger into content', async () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      trigger.dispatchEvent(pointer('pointerleave'));
      await flush();

      const content = query<HTMLElement>('[forNavigationMenuContent]')!;
      content.dispatchEvent(pointer('pointerenter'));
      await flush();

      vi.advanceTimersByTime(500);
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      content.dispatchEvent(pointer('pointerleave'));
      await flush();
      vi.advanceTimersByTime(149);
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');
      vi.advanceTimersByTime(1);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
    });
  });

  describe('hover-across-triggers (separate open/close timers)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('enter-B-then-leave-A: the pending open for B is not clobbered by leaving A', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      // A (products) is open.
      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      // Browser fires pointerenter on B before pointerleave on A.
      triggers[1]!.dispatchEvent(pointer('pointerenter'));
      await flush();
      triggers[0]!.dispatchEvent(pointer('pointerleave'));
      await flush();

      // The pending open for B must survive and switch the menu, not close it.
      vi.advanceTimersByTime(200);
      await flush();
      expect(fixture.componentInstance.open()).toBe('solutions');

      // No stray close fires afterwards.
      vi.advanceTimersByTime(1000);
      await flush();
      expect(fixture.componentInstance.open()).toBe('solutions');
    });

    it('leave-A-then-enter-B: entering B cancels A’s pending close and opens B', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      // A (products) is open.
      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      // Browser fires pointerleave on A before pointerenter on B.
      triggers[0]!.dispatchEvent(pointer('pointerleave'));
      await flush();
      triggers[1]!.dispatchEvent(pointer('pointerenter'));
      await flush();

      vi.advanceTimersByTime(200);
      await flush();
      expect(fixture.componentInstance.open()).toBe('solutions');

      vi.advanceTimersByTime(1000);
      await flush();
      expect(fixture.componentInstance.open()).toBe('solutions');
    });

    it('leaving the whole nav (no sibling enter) still closes the open item', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      triggers[0]!.dispatchEvent(pointer('pointerleave'));
      await flush();
      vi.advanceTimersByTime(150);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
    });

    it('cancels a pending hover-open when the pointer leaves the same closed trigger (#590 F5)', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      // Hover a closed trigger (schedules an open) then leave it before the
      // delay elapses, without entering a sibling.
      triggers[0]!.dispatchEvent(pointer('pointerenter'));
      await flush();
      vi.advanceTimersByTime(100);
      await flush();
      triggers[0]!.dispatchEvent(pointer('pointerleave'));
      await flush();

      // The pending open is cancelled — the menu must not open after the pointer left.
      vi.advanceTimersByTime(1000);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
    });
  });

  describe('skip-delay window', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('reopens instantly while the skip-delay window is open', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();

      triggers[1]!.dispatchEvent(pointer('pointerenter'));
      await flush();
      expect(fixture.componentInstance.open()).toBe('solutions');
    });

    it('requires the full delayDuration again once the skip-delay window expires', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.click();
      await flush();
      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();

      vi.advanceTimersByTime(300);
      await flush();

      triggers[1]!.dispatchEvent(pointer('pointerenter'));
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();

      vi.advanceTimersByTime(199);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();

      vi.advanceTimersByTime(1);
      await flush();
      expect(fixture.componentInstance.open()).toBe('solutions');
    });

    it('a debounced close that lands on an already-closed menu does not start the window', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      // Queue a hover close, then let the consumer clear the value through
      // [(value)] before the debounce fires. The queued close now lands with
      // nothing open and must short-circuit instead of arming the skip window.
      triggers[0]!.dispatchEvent(pointer('pointerleave'));
      await flush();
      fixture.componentInstance.open.set(null);
      await flush();

      vi.advanceTimersByTime(150);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();

      triggers[1]!.dispatchEvent(pointer('pointerenter'));
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();

      vi.advanceTimersByTime(199);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();

      vi.advanceTimersByTime(1);
      await flush();
      expect(fixture.componentInstance.open()).toBe('solutions');
    });
  });

  describe('touch pointer gate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('a touch press-and-hold never opens an item via the hover path', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.dispatchEvent(pointer('pointerenter', 'touch'));
      await flush();
      vi.advanceTimersByTime(1000);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
    });

    it('a touch press-and-hold then release opens the item exactly once', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.dispatchEvent(pointer('pointerenter', 'touch'));
      await flush();
      vi.advanceTimersByTime(400);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();

      trigger.dispatchEvent(pointer('pointerleave', 'touch'));
      trigger.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      vi.advanceTimersByTime(1000);
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('a tap inside the skip-delay window does not invert the toggle', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      const tap = async (): Promise<void> => {
        trigger.dispatchEvent(pointer('pointerenter', 'touch'));
        trigger.dispatchEvent(pointer('pointerleave', 'touch'));
        trigger.click();
        await flush();
      };

      await tap();
      expect(fixture.componentInstance.open()).toBe('products');

      await tap();
      expect(fixture.componentInstance.open()).toBeNull();

      vi.advanceTimersByTime(50);
      await tap();
      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('a touch pointerleave on the panel does not schedule a close', async () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      const content = query<HTMLElement>('[forNavigationMenuContent]')!;
      content.dispatchEvent(pointer('pointerleave', 'touch'));
      await flush();
      vi.advanceTimersByTime(1000);
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('a touch pointerenter on the panel does not cancel a pending mouse close', async () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.click();
      await flush();
      trigger.dispatchEvent(pointer('pointerleave'));
      await flush();

      const content = query<HTMLElement>('[forNavigationMenuContent]')!;
      content.dispatchEvent(pointer('pointerenter', 'touch'));
      await flush();

      vi.advanceTimersByTime(150);
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
    });
  });

  describe('keyboard', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('Enter / Space toggle the open state', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      pressKey(trigger, 'Enter');
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');
      pressKey(trigger, ' ');
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
    });

    it('ArrowDown opens the disclosure (horizontal orientation)', async () => {
      vi.useFakeTimers();
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[1]!;

      pressKey(trigger, 'ArrowDown');
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.open()).toBe('solutions');
    });

    it('ArrowRight / ArrowLeft navigate between triggers (horizontal)', async () => {
      const { queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggers[1]);

      pressKey(triggers[1]!, 'ArrowLeft');
      await flush();
      expect(document.activeElement).toBe(triggers[0]);
    });

    it('scrolls the newly focused trigger into view with block: "nearest"', async () => {
      const { queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');
      const scrollSpy = vi.fn();
      triggers[1]!.scrollIntoView = scrollSpy;

      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowRight');
      await flush();

      expect(document.activeElement).toBe(triggers[1]);
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
    });

    it('scrolls the trigger into view when Escape from inside the panel returns focus to it', async () => {
      const { fixture, queryAll, query, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      const scrollSpy = vi.fn();
      trigger.scrollIntoView = scrollSpy;

      trigger.click();
      await flush();
      const link = query<HTMLAnchorElement>('[forNavigationMenuLink]')!;
      link.focus();
      pressKey(link, 'Escape');
      await flush();

      expect(fixture.componentInstance.open()).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
    });

    it('Escape closes and returns focus to the trigger', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.click();
      await flush();
      trigger.focus();
      pressKey(trigger, 'Escape');
      await flush();

      expect(fixture.componentInstance.open()).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('ignores Escape pressed while focus is outside the nav (no close, no focus steal)', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      const outside = document.createElement('input');
      document.body.appendChild(outside);
      try {
        outside.focus();
        trigger.click();
        await flush();
        expect(fixture.componentInstance.open()).toBe('products');
        expect(document.activeElement).toBe(outside);

        pressKey(outside, 'Escape');
        await flush();

        expect(fixture.componentInstance.open()).toBe('products');
        expect(document.activeElement).toBe(outside);
      } finally {
        outside.remove();
      }
    });
  });

  describe('RTL', () => {
    @Component({
      imports: [
        ForNavigationMenu,
        ForNavigationMenuList,
        ForNavigationMenuItem,
        ForNavigationMenuTrigger,
      ],
      template: `
        <nav forNavigationMenu [orientation]="orientation()" dir="rtl">
          <ul forNavigationMenuList>
            <li forNavigationMenuItem value="products">
              <button forNavigationMenuTrigger>Products</button>
            </li>
            <li forNavigationMenuItem value="solutions">
              <button forNavigationMenuTrigger>Solutions</button>
            </li>
            <li forNavigationMenuItem value="about">
              <button forNavigationMenuTrigger>About</button>
            </li>
          </ul>
        </nav>
      `,
    })
    class RtlNavMenuHost {
      readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
    }

    it('horizontal: ArrowLeft becomes the forward direction across triggers under dir="rtl"', async () => {
      const { queryAll, flush } = renderHost(RtlNavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowLeft');
      await flush();
      expect(document.activeElement).toBe(triggers[1]);

      pressKey(triggers[1]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggers[0]);
    });

    it('vertical: ArrowDown / ArrowUp stay axis-positive under dir="rtl"', async () => {
      const { fixture, queryAll, flush } = renderHost(RtlNavMenuHost);
      fixture.componentInstance.orientation.set('vertical');
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(triggers[1]);

      pressKey(triggers[1]!, 'ArrowUp');
      await flush();
      expect(document.activeElement).toBe(triggers[0]);
    });
  });

  describe('outside dismiss', () => {
    it('closes when the user pointerdowns outside the menu', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();

      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      // Outside element: a sibling appended to body for the test.
      const stranger = document.createElement('div');
      document.body.appendChild(stranger);
      try {
        stranger.dispatchEvent(pointer('pointerdown'));
        await flush();
        expect(fixture.componentInstance.open()).toBeNull();
      } finally {
        stranger.remove();
      }
    });
  });

  describe('root data-state', () => {
    it('reflects "closed" initially and flips to "open" when an item opens', async () => {
      const { fixture, query, flush } = renderHost(NavMenuHost);
      await flush();

      const root = query<HTMLElement>('[forNavigationMenu]')!;
      expect(root.getAttribute('data-state')).toBe('closed');

      fixture.componentInstance.open.set('products');
      await flush();
      expect(root.getAttribute('data-state')).toBe('open');

      fixture.componentInstance.open.set(null);
      await flush();
      expect(root.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('focusout (Tab out closes per APG)', () => {
    it('leaves a destination-reporting leave to the layer, which closes on the focusin', async () => {
      const { fixture, queryAll, query, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      try {
        const root = query<HTMLElement>('[forNavigationMenu]')!;
        const link = root.querySelector<HTMLElement>('a[forNavigationMenuLink]')!;
        link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
        await flush();
        expect(fixture.componentInstance.open()).toBe('products');

        outside.focus();
        await flush();
        expect(fixture.componentInstance.open()).toBeNull();
        expect(root.getAttribute('data-state')).toBe('closed');
      } finally {
        outside.remove();
      }
    });

    it('treats null relatedTarget (focus leaving the document) as outside and closes', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      await flush();

      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
    });

    it('resolves a null relatedTarget against activeElement, not against the event', async () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      await flush();

      query<HTMLAnchorElement>('a[forNavigationMenuLink]')!.focus();
      await flush();
      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      await flush();

      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('keeps the panel open when the leave follows a press inside the widget', async () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      await flush();

      const inner = query<HTMLElement>('[data-id="products-static"]')!;
      inner.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      query<HTMLAnchorElement>('a[forNavigationMenuLink]')!.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
      );
      await flush();

      expect(fixture.componentInstance.open()).toBe('products');
      expect(query<HTMLElement>('[forNavigationMenuContent]')).not.toBeNull();
    });

    it('is a no-op when nothing is open (avoids extra work for every Tab)', async () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      const root = query<HTMLElement>('[forNavigationMenu]')!;

      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      await flush();
      // Open stays null (nothing was open) and data-state stays "closed".
      expect(fixture.componentInstance.open()).toBeNull();
      expect(root.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('focus channel on the dismissible layer', () => {
    it('closes when focus lands on an element outside the nav', async () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      try {
        const root = query<HTMLElement>('[forNavigationMenu]')!;
        outside.focus();
        await flush();
        expect(fixture.componentInstance.open()).toBeNull();
        expect(root.getAttribute('data-state')).toBe('closed');
      } finally {
        outside.remove();
      }
    });

    it('does not close when focus moves to another trigger inside the nav', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');
      triggers[0]!.click();
      await flush();

      triggers[1]!.focus();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('does not close when focus lands on a link inside the open panel', async () => {
      const { fixture, query, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = query<HTMLButtonElement>('[forNavigationMenuTrigger]')!;
      trigger.click();
      await flush();

      query<HTMLAnchorElement>('a[forNavigationMenuLink]')!.focus();
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');
    });
  });

  describe('a dismissible layer stacked above the open panel', () => {
    it('keeps the panel open when focus moves into an interactive Escape-only surface above it', async () => {
      const { fixture, query, flush } = renderHost(StackedLayerNavMenuHost);
      await flush();
      query<HTMLButtonElement>('[forNavigationMenuTrigger]')!.click();
      await flush();
      query<HTMLAnchorElement>('a[forNavigationMenuLink]')!.focus();
      await flush();

      const stacked = fixture.componentInstance.stacked();
      stacked.stack([]);
      try {
        query<HTMLButtonElement>('[data-id="stacked"]')!.focus();
        await flush();

        expect(fixture.componentInstance.open()).toBe('products');
        expect(query<HTMLElement>('[forNavigationMenuContent]')).not.toBeNull();
      } finally {
        stacked.unstack();
      }
    });

    it('leaves the panel open when a real layer above owns the leave', async () => {
      const { fixture, query, flush } = renderHost(StackedLayerNavMenuHost);
      await flush();
      query<HTMLButtonElement>('[forNavigationMenuTrigger]')!.click();
      await flush();
      query<HTMLAnchorElement>('a[forNavigationMenuLink]')!.focus();
      await flush();

      const stacked = fixture.componentInstance.stacked();
      stacked.stack(['pointer', 'focus']);
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      try {
        outside.focus();
        await flush();

        expect(stacked.focusOutside()).toBe(1);
        expect(fixture.componentInstance.open()).toBe('products');
        expect(query<HTMLElement>('[forNavigationMenuContent]')).not.toBeNull();
      } finally {
        outside.remove();
        stacked.unstack();
      }
    });

    it('closes the panel once the layer above is gone', async () => {
      const { fixture, query, flush } = renderHost(StackedLayerNavMenuHost);
      await flush();
      query<HTMLButtonElement>('[forNavigationMenuTrigger]')!.click();
      await flush();
      query<HTMLAnchorElement>('a[forNavigationMenuLink]')!.focus();
      await flush();

      const stacked = fixture.componentInstance.stacked();
      stacked.stack(['pointer', 'focus']);
      stacked.unstack();

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      try {
        outside.focus();
        await flush();

        expect(fixture.componentInstance.open()).toBeNull();
      } finally {
        outside.remove();
      }
    });
  });

  describe('link reflects active state', () => {
    it('sets aria-current="page" and data-active on active links', async () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      fixture.componentInstance.open.set('products');
      await flush();

      const links = queryAll<HTMLAnchorElement>('[forNavigationMenuLink]');
      // First link is not active, second link has [active].
      expect(links[0]!.hasAttribute('data-active')).toBe(false);
      expect(links[1]!.getAttribute('data-active')).toBe('');
      expect(links[1]!.getAttribute('aria-current')).toBe('page');
      // Just to silence unused 'query' warnings:
      void query;
    });
  });

  describe('data-motion (overlapping transitions)', () => {
    // Drive transitions through trigger clicks so the directive's imperative
    // open()/close() path records the per-panel motion. Panels are mounted
    // from independent booleans so a leaving panel survives later
    // transitions (the animate.leave shape) and its frozen data-motion can be
    // asserted — something the @if (open() === …) hosts can never reproduce.
    const panel = (queryFn: (s: string) => HTMLElement | null, id: string): HTMLElement => {
      const el = queryFn(`[data-id="${id}"]`);
      if (!el) throw new Error(`panel "${id}" not mounted`);
      return el;
    };

    it('keeps each leaving panel’s frozen direction through A→C→B rapid switching', async () => {
      const { fixture, query, queryAll, flush } = renderHost(OverlappingNavMenuHost);
      const host = fixture.componentInstance;
      await flush();
      const q = query as (s: string) => HTMLElement | null;
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');
      // 0 = products (A), 1 = solutions (B), 2 = about (C).

      // A opens. First open: no previous, no motion.
      triggers[0]!.click();
      host.mountProducts.set(true);
      await flush();
      expect(panel(q, 'products').hasAttribute('data-motion')).toBe(false);

      // A→C: C (index 2) enters from-end; A (index 0) leaves to-start. A stays
      // mounted (animate.leave shape).
      triggers[2]!.click();
      host.mountAbout.set(true);
      await flush();
      expect(panel(q, 'about').getAttribute('data-motion')).toBe('from-end');
      expect(panel(q, 'products').getAttribute('data-motion')).toBe('to-start');

      // C→B starts before A finishes leaving: B (index 1) enters from-start;
      // C (index 2) leaves to-end. A is mid-exit from the earlier transition
      // and matches neither current (B) nor previous (C) — its frozen
      // to-start must survive instead of dropping to null.
      triggers[1]!.click();
      host.mountSolutions.set(true);
      await flush();
      expect(panel(q, 'solutions').getAttribute('data-motion')).toBe('from-start');
      expect(panel(q, 'about').getAttribute('data-motion')).toBe('to-end');
      expect(panel(q, 'products').getAttribute('data-motion')).toBe('to-start');
    });

    it('clears a panel’s frozen motion when it unmounts', async () => {
      const { fixture, query, queryAll, flush } = renderHost(OverlappingNavMenuHost);
      const host = fixture.componentInstance;
      await flush();
      const q = query as (s: string) => HTMLElement | null;
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.click();
      host.mountProducts.set(true);
      await flush();
      triggers[2]!.click();
      host.mountAbout.set(true);
      await flush();
      expect(panel(q, 'products').getAttribute('data-motion')).toBe('to-start');

      // The leaving A finishes its exit and unmounts. Re-mounting it later
      // (without a transition) must not resurrect the stale to-start.
      host.mountProducts.set(false);
      await flush();
      host.mountProducts.set(true);
      await flush();
      expect(panel(q, 'products').hasAttribute('data-motion')).toBe(false);
    });

    it('clears a panel’s frozen motion when it re-enters as the current value', async () => {
      const { fixture, query, queryAll, flush } = renderHost(OverlappingNavMenuHost);
      const host = fixture.componentInstance;
      await flush();
      const q = query as (s: string) => HTMLElement | null;
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.click();
      host.mountProducts.set(true);
      await flush();
      triggers[2]!.click();
      host.mountAbout.set(true);
      await flush();
      expect(panel(q, 'products').getAttribute('data-motion')).toBe('to-start');

      // A re-enters from C while still mounted. As the current entering panel
      // it must reflect a from-* direction, never its stale leaving to-start.
      triggers[0]!.click();
      await flush();
      expect(panel(q, 'products').getAttribute('data-motion')).toBe('from-start');
      // C is now the leaving panel and freezes its own to-* direction.
      expect(panel(q, 'about').getAttribute('data-motion')).toBe('to-end');
    });
  });

  describe('disabled', () => {
    @Component({
      imports: [
        ForNavigationMenu,
        ForNavigationMenuList,
        ForNavigationMenuItem,
        ForNavigationMenuTrigger,
      ],
      template: `
        <nav forNavigationMenu [(value)]="open" [disabled]="menuDisabled()">
          <ul forNavigationMenuList>
            <li forNavigationMenuItem value="products" [disabled]="itemDisabled()">
              <button forNavigationMenuTrigger>Products</button>
            </li>
            <li forNavigationMenuItem value="solutions">
              <button forNavigationMenuTrigger>Solutions</button>
            </li>
          </ul>
        </nav>
      `,
    })
    class DisabledNavMenuHost {
      readonly open = signal<string | null>(null);
      readonly menuDisabled = signal(false);
      readonly itemDisabled = signal(false);
    }

    it('merges the menu-level disabled into every trigger', async () => {
      const { fixture, queryAll, flush } = renderHost(DisabledNavMenuHost);
      await flush();
      const items = queryAll<HTMLElement>('[forNavigationMenuItem]');
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      for (const item of items) {
        expect(item.hasAttribute('data-disabled')).toBe(false);
      }
      for (const trigger of triggers) {
        expect(trigger.hasAttribute('aria-disabled')).toBe(false);
        expect(trigger.hasAttribute('data-disabled')).toBe(false);
      }

      fixture.componentInstance.menuDisabled.set(true);
      await flush();

      for (const trigger of triggers) {
        expect(trigger.getAttribute('aria-disabled')).toBe('true');
        expect(trigger.getAttribute('data-disabled')).toBe('');
      }
    });

    it('reflects a menu-disabled trigger without the native disabled attribute', async () => {
      const { fixture, queryAll, flush } = renderHost(DisabledNavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      fixture.componentInstance.menuDisabled.set(true);
      await flush();

      for (const trigger of triggers) {
        expect(trigger.getAttribute('aria-disabled')).toBe('true');
        expect(trigger.hasAttribute('disabled')).toBe(false);
      }
    });

    it('reflects a per-item disabled trigger without the native disabled attribute', async () => {
      const { fixture, queryAll, flush } = renderHost(DisabledNavMenuHost);
      await flush();
      const items = queryAll<HTMLElement>('[forNavigationMenuItem]');
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      fixture.componentInstance.itemDisabled.set(true);
      await flush();

      expect(items[0]!.getAttribute('data-disabled')).toBe('');
      expect(triggers[0]!.getAttribute('aria-disabled')).toBe('true');
      expect(triggers[0]!.getAttribute('data-disabled')).toBe('');
      expect(triggers[0]!.hasAttribute('disabled')).toBe(false);
    });

    it('leaves sibling items enabled when only one item is disabled', async () => {
      const { fixture, queryAll, flush } = renderHost(DisabledNavMenuHost);
      await flush();
      const items = queryAll<HTMLElement>('[forNavigationMenuItem]');
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      fixture.componentInstance.itemDisabled.set(true);
      await flush();

      expect(items[1]!.hasAttribute('data-disabled')).toBe(false);
      expect(triggers[1]!.hasAttribute('aria-disabled')).toBe(false);
      expect(triggers[1]!.hasAttribute('data-disabled')).toBe(false);
    });

    it('ignores activation on a trigger disabled by the menu', async () => {
      const { fixture, queryAll, flush } = renderHost(DisabledNavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      fixture.componentInstance.menuDisabled.set(true);
      await flush();

      triggers[0]!.click();
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();

      pressKey(triggers[0]!, 'Enter');
      await flush();
      expect(fixture.componentInstance.open()).toBeNull();
    });

    it('preserves a consumer-set static disabled attribute on the trigger', async () => {
      @Component({
        imports: [
          ForNavigationMenu,
          ForNavigationMenuList,
          ForNavigationMenuItem,
          ForNavigationMenuTrigger,
        ],
        template: `
          <nav forNavigationMenu>
            <ul forNavigationMenuList>
              <li forNavigationMenuItem value="products">
                <button forNavigationMenuTrigger disabled>Products</button>
              </li>
            </ul>
          </nav>
        `,
      })
      class StaticDisabledNavMenuHost {}

      const { query, flush } = renderHost(StaticDisabledNavMenuHost);
      await flush();

      const trigger = query<HTMLButtonElement>('[forNavigationMenuTrigger]')!;
      expect(trigger.getAttribute('disabled')).toBe('');
      expect(trigger.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('reactive updates', () => {
    it('reflects an open write in the trigger aria-expanded', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(NavMenuHost);
      await flush(fixture);
      const host = fixture.nativeElement as HTMLElement;
      const triggers = host.querySelectorAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      expect(triggers[0]!.getAttribute('aria-expanded')).toBe('false');
      fixture.componentInstance.open.set('products');
      await flush(fixture);
      expect(triggers[0]!.getAttribute('aria-expanded')).toBe('true');
    });

    it('records per-panel data-motion under overlapping transitions', async () => {
      const { fixture, query, queryAll, flush } = renderHost(OverlappingNavMenuHost);
      const host = fixture.componentInstance;
      await flush();
      const q = query as (s: string) => HTMLElement | null;
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.click();
      host.mountProducts.set(true);
      await flush();
      triggers[2]!.click();
      host.mountAbout.set(true);
      await flush();
      triggers[1]!.click();
      host.mountSolutions.set(true);
      await flush();

      const products = q('[data-id="products"]')!;
      expect(products.getAttribute('data-motion')).toBe('to-start');
    });
  });

  describe('unresolvable aria-controls (#1636)', () => {
    it('emits no aria-controls while the open item has no panel mounted', async () => {
      const { fixture, queryAll, flush } = renderHost(OverlappingNavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      // Open without mounting the panel: the trigger is expanded but there is no
      // content id to point at, so the attribute must be absent rather than ''.
      fixture.componentInstance.open.set('products');
      await flush();

      expect(triggers[0]!.getAttribute('aria-expanded')).toBe('true');
      expect(triggers[0]!.hasAttribute('aria-controls')).toBe(false);

      fixture.componentInstance.mountProducts.set(true);
      await flush();

      const panel = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
        '[data-id="products"]',
      )!;
      expect(triggers[0]!.getAttribute('aria-controls')).toBe(panel.id);
    });
  });

  describe('unbound [forNavigationMenuItem] (#1636)', () => {
    @Component({
      imports: [
        ForNavigationMenu,
        ForNavigationMenuList,
        ForNavigationMenuItem,
        ForNavigationMenuTrigger,
      ],
      template: `
        <nav forNavigationMenu [(value)]="open">
          <ul forNavigationMenuList>
            <li forNavigationMenuItem value="products">
              <button forNavigationMenuTrigger>Products</button>
            </li>
            <li forNavigationMenuItem>
              <button forNavigationMenuTrigger data-id="pending">Pending</button>
            </li>
          </ul>
        </nav>
      `,
    })
    class UnboundItemHost {
      readonly open = signal<string | null>(null);
    }

    it('fails loudly when an item carries no value binding at all', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(UnboundItemHost);

      expect(() => fixture.detectChanges()).toThrowError(
        /\[forty-cdk\/navigation-menu\] FORCDK-CORE-010: \[forNavigationMenuItem\] has no \[value\] binding/,
      );
    });

    it('does not commit the sentinel when an unbound trigger is clicked in a production build', async () => {
      vi.stubGlobal('ngDevMode', false);
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(UnboundItemHost);
      fixture.detectChanges();
      await flush(fixture);
      const host = fixture.nativeElement as HTMLElement;

      host.querySelector<HTMLButtonElement>('[data-id="pending"]')!.click();
      await flush(fixture);

      expect(fixture.componentInstance.open()).toBeNull();
      // The bound sibling still opens, so the guard rejects the sentinel rather
      // than the whole activation path.
      host.querySelectorAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!.click();
      await flush(fixture);
      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('does not label a panel from a trigger that belongs to another unbound item', async () => {
      vi.stubGlobal('ngDevMode', false);
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

      @Component({
        imports: [
          ForNavigationMenu,
          ForNavigationMenuList,
          ForNavigationMenuItem,
          ForNavigationMenuTrigger,
          ForNavigationMenuContent,
        ],
        template: `
          <nav forNavigationMenu value="products">
            <ul forNavigationMenuList>
              <li forNavigationMenuItem>
                <button forNavigationMenuTrigger data-id="a">A</button>
              </li>
              <li forNavigationMenuItem>
                <div forNavigationMenuContent data-id="b-panel">B panel</div>
              </li>
            </ul>
          </nav>
        `,
      })
      class TwoUnboundItemsHost {}

      const fixture = TestBed.createComponent(TwoUnboundItemsHost);
      fixture.detectChanges();
      await flush(fixture);
      const host = fixture.nativeElement as HTMLElement;

      // Both handles read the same sentinel, so `triggerIdFor` on an identity
      // comparison alone would resolve the *other* item's trigger.
      expect(host.querySelector('[data-id="b-panel"]')!.hasAttribute('aria-labelledby')).toBe(
        false,
      );
    });
  });
});
