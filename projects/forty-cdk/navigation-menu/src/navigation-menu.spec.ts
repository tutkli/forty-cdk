import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost } from '../../src/test-utils';
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
  readonly open = signal('');
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
  readonly open = signal('');
  readonly mountProducts = signal(false);
  readonly mountSolutions = signal(false);
  readonly mountAbout = signal(false);
}

function pointer(type: 'pointerenter' | 'pointerleave' | 'pointerdown'): PointerEvent {
  return new PointerEvent(type, { bubbles: true });
}

describe('ForNavigationMenu', () => {
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
      expect(fixture.componentInstance.open()).toBe('');
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
      expect(fixture.componentInstance.open()).toBe('');
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
      expect(fixture.componentInstance.open()).toBe('');
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
      expect(fixture.componentInstance.open()).toBe('');
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
      expect(fixture.componentInstance.open()).toBe('');
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
      expect(fixture.componentInstance.open()).toBe('');
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

    it('Escape closes and returns focus to the trigger', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.click();
      await flush();
      trigger.focus();
      pressKey(trigger, 'Escape');
      await flush();

      expect(fixture.componentInstance.open()).toBe('');
      expect(document.activeElement).toBe(trigger);
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
        expect(fixture.componentInstance.open()).toBe('');
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

      fixture.componentInstance.open.set('');
      await flush();
      expect(root.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('focusout (Tab out closes per APG)', () => {
    it('closes when focus moves to an element outside the nav', async () => {
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
        // focusout bubbles, so dispatching on a descendant link or trigger
        // works. We use a link inside the open content as the source.
        const link = root.querySelector<HTMLElement>('a[forNavigationMenuLink]')!;
        link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
        await flush();
        expect(fixture.componentInstance.open()).toBe('');
        expect(root.getAttribute('data-state')).toBe('closed');
      } finally {
        outside.remove();
      }
    });

    it('does not close when focus stays inside the nav (e.g. trigger → link)', async () => {
      const { fixture, queryAll, query, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      await flush();

      const link = query<HTMLAnchorElement>('a[forNavigationMenuLink]')!;
      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: link }));
      await flush();

      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('does not close when focus moves between two triggers in the nav', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');
      triggers[0]!.click();
      await flush();

      triggers[0]!.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: triggers[1]! }),
      );
      await flush();
      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('treats null relatedTarget (focus leaving the document) as outside and closes', async () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      await flush();

      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      await flush();
      expect(fixture.componentInstance.open()).toBe('');
    });

    it('is a no-op when nothing is open (avoids extra work for every Tab)', async () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      await flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      const root = query<HTMLElement>('[forNavigationMenu]')!;

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      try {
        trigger.dispatchEvent(
          new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
        );
        await flush();
        // Open stays at '' (nothing was open) and data-state stays "closed".
        expect(fixture.componentInstance.open()).toBe('');
        expect(root.getAttribute('data-state')).toBe('closed');
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

  describe('zoneless reactivity', () => {
    it('reflects state changes after detectChanges without Zone.js', async () => {
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

    it('records per-panel data-motion under overlapping transitions without Zone.js', async () => {
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
});
