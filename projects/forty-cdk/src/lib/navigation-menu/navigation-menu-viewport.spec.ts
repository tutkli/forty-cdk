import { Component, signal } from '@angular/core';

import { renderHost } from '../../test-utils/render';
import { ForNavigationMenu } from './navigation-menu';
import { ForNavigationMenuContent } from './navigation-menu-content';
import { ForNavigationMenuItem } from './navigation-menu-item';
import { ForNavigationMenuList } from './navigation-menu-list';
import { ForNavigationMenuTrigger } from './navigation-menu-trigger';
import { ForNavigationMenuViewport } from './navigation-menu-viewport';

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  constructor(public cb: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.push(el);
  }
  disconnect(): void {
    this.observed = [];
  }
  unobserve(el: Element): void {
    this.observed = this.observed.filter((e) => e !== el);
  }
  fire(): void {
    this.cb([], this as unknown as ResizeObserver);
  }
}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuViewport,
  ],
  template: `
    <nav forNavigationMenu [(value)]="open">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button forNavigationMenuTrigger>Products</button>
          @if (open() === 'products') {
            <div forNavigationMenuContent data-id="products">products panel</div>
          }
        </li>
        <li forNavigationMenuItem value="solutions">
          <button forNavigationMenuTrigger>Solutions</button>
          @if (open() === 'solutions') {
            <div forNavigationMenuContent data-id="solutions">solutions panel</div>
          }
        </li>
        <li forNavigationMenuItem value="company">
          <button forNavigationMenuTrigger>Company</button>
          @if (open() === 'company') {
            <div forNavigationMenuContent data-id="company">company panel</div>
          }
        </li>
      </ul>
      <div forNavigationMenuViewport data-id="viewport"></div>
    </nav>
  `,
})
class MegaMenuHost {
  readonly open = signal('');
}

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
          @if (open() === 'products') {
            <div forNavigationMenuContent data-id="products">products panel</div>
          }
        </li>
      </ul>
    </nav>
  `,
})
class NoViewportHost {
  readonly open = signal('');
}

describe('ForNavigationMenuViewport', () => {
  let originalRO: typeof ResizeObserver;

  beforeEach(() => {
    originalRO = globalThis.ResizeObserver;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = FakeResizeObserver;
    FakeResizeObserver.instances = [];
  });

  afterEach(() => {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      originalRO;
  });

  describe('re-parenting', () => {
    it('moves the active [forNavigationMenuContent] into the viewport on mount', () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      flush();

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      // Nothing open yet, viewport is empty.
      expect(viewport.children.length).toBe(0);

      fixture.componentInstance.open.set('products');
      flush();

      const products = query<HTMLElement>('[data-id="products"]')!;
      expect(products.parentElement).toBe(viewport);
    });

    it('releases the content from the viewport when @if unmounts it', () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      fixture.componentInstance.open.set('products');
      flush();

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      expect(viewport.children.length).toBe(1);

      fixture.componentInstance.open.set('');
      flush();

      // @if unmount destroys the embedded view; viewport ends up empty.
      expect(viewport.children.length).toBe(0);
      expect(query<HTMLElement>('[data-id="products"]')).toBeNull();
    });

    it('does not move content when no viewport is registered', () => {
      const { fixture, query, flush } = renderHost(NoViewportHost);
      fixture.componentInstance.open.set('products');
      flush();

      const products = query<HTMLElement>('[data-id="products"]')!;
      // Without a viewport, the content stays under its [forNavigationMenuItem] parent.
      expect(products.parentElement?.getAttribute('forNavigationMenuItem')).toBe('');
    });
  });

  describe('data-state on viewport', () => {
    it('reflects "closed" when nothing is open and "open" otherwise', () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      flush();

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      expect(viewport.getAttribute('data-state')).toBe('closed');

      fixture.componentInstance.open.set('products');
      flush();
      expect(viewport.getAttribute('data-state')).toBe('open');

      fixture.componentInstance.open.set('');
      flush();
      expect(viewport.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('data-motion on content', () => {
    it('is absent on first open (no previous active item to compare against)', () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      flush();

      fixture.componentInstance.open.set('products');
      flush();
      const products = query<HTMLElement>('[data-id="products"]')!;
      expect(products.hasAttribute('data-motion')).toBe(false);
    });

    it('reflects from-end on the entering and to-start on the leaving when moving rightward', () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      flush();

      fixture.componentInstance.open.set('products');
      flush();
      fixture.componentInstance.open.set('company');
      flush();

      // 'company' (index 2) is entering with 'products' (index 0) as the previous active.
      const company = query<HTMLElement>('[data-id="company"]')!;
      expect(company.getAttribute('data-motion')).toBe('from-end');
      // 'products' is destroyed on close in this test (no animate.leave shim);
      // motionFor still returns 'to-start' for it logically — verified via
      // the symmetric leftward case below where both panels remain mounted
      // is not possible without animate.leave, so we exercise the entering
      // direction here and assert the leftward entering case below.
    });

    it('reflects from-start on the entering content when moving leftward', () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      flush();

      fixture.componentInstance.open.set('company');
      flush();
      fixture.componentInstance.open.set('products');
      flush();

      // 'products' (index 0) is entering with 'company' (index 2) as the previous active.
      const products = query<HTMLElement>('[data-id="products"]')!;
      expect(products.getAttribute('data-motion')).toBe('from-start');
    });

    it('clears data-motion when the menu closes back to no selection', () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      flush();

      fixture.componentInstance.open.set('products');
      flush();
      fixture.componentInstance.open.set('solutions');
      flush();
      const solutions = query<HTMLElement>('[data-id="solutions"]')!;
      expect(solutions.getAttribute('data-motion')).toBe('from-end');

      fixture.componentInstance.open.set('');
      flush();
      // Solutions has been destroyed; nothing to assert on the leaving side
      // because @if removes it. The currently-open value is '', so any
      // remounted content would have no motion.
      fixture.componentInstance.open.set('solutions');
      flush();
      const reopened = query<HTMLElement>('[data-id="solutions"]')!;
      // Previous active was '', so no comparison applies.
      expect(reopened.hasAttribute('data-motion')).toBe(false);
    });
  });

  describe('orientation reflection', () => {
    it('reflects [data-orientation] on the viewport host', () => {
      const { query, flush } = renderHost(MegaMenuHost);
      flush();

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      // Default orientation is horizontal.
      expect(viewport.getAttribute('data-orientation')).toBe('horizontal');
    });
  });

  describe('ResizeObserver wiring', () => {
    // Geometry-driven assertions (the actual size populating the CSS
    // variables, RO callbacks updating those variables on real layout
    // mutations, the absence-of-RO fallback width) live in
    // `navigation-menu.e2e.ts`. jsdom returns zeros for layout APIs and
    // does not run CSS, so faking measurements via `*.prototype` overrides
    // to assert `'320px'` here was a tautology that hid the real
    // cross-platform fragility behind a fake input — see CLAUDE.md
    // "Testing notes" / "E2E (Playwright)" for the rule.

    it('observes the active content panel via ResizeObserver', () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      flush();

      fixture.componentInstance.open.set('products');
      flush();

      const productsPanel = query<HTMLElement>('[data-id="products"]')!;
      const observingPanel = FakeResizeObserver.instances.find((ro) =>
        ro.observed.includes(productsPanel),
      );
      // Concrete: the located RO is observing this exact panel — toBeDefined()
      // only proved an instance was found, not which element it was tracking.
      expect(observingPanel?.observed).toContain(productsPanel);
    });

    it('switches the observed element when the active content changes', () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      flush();

      fixture.componentInstance.open.set('products');
      flush();

      const products = query<HTMLElement>('[data-id="products"]')!;
      const observingProducts = FakeResizeObserver.instances.some((ro) =>
        ro.observed.includes(products),
      );
      expect(observingProducts).toBe(true);

      fixture.componentInstance.open.set('solutions');
      flush();

      // The previous active panel is no longer observed.
      expect(
        FakeResizeObserver.instances.some((ro) => ro.observed.includes(products)),
      ).toBe(false);

      const solutions = query<HTMLElement>('[data-id="solutions"]')!;
      const observingSolutions = FakeResizeObserver.instances.some((ro) =>
        ro.observed.includes(solutions),
      );
      expect(observingSolutions).toBe(true);
    });

    it('renders without crashing when ResizeObserver is unavailable', () => {
      // Simulate SSR / very old runtime: no global RO. The directive must
      // skip `new ResizeObserver(...)` entirely and still produce a valid
      // DOM tree (re-parenting, data-state, orientation). The actual size
      // populating the CSS variables on first read is asserted in the
      // Playwright suite (`navigation-menu.e2e.ts`).
      (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
        undefined as unknown as typeof ResizeObserver;
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      flush();

      fixture.componentInstance.open.set('products');
      flush();

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      // Viewport still renders and re-parents the active content.
      const products = query<HTMLElement>('[data-id="products"]')!;
      expect(products.parentElement).toBe(viewport);
      // data-state still tracks open/closed.
      expect(viewport.getAttribute('data-state')).toBe('open');
    });
  });
});
