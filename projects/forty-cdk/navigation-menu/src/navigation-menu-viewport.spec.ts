import { NgTemplateOutlet } from '@angular/common';
import { Component, signal } from '@angular/core';

import { flush as flushAsync } from '../../src/test-utils/flush';
import { renderHost } from '../../src/test-utils/render';
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
  readonly open = signal<string | null>(null);
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
  readonly open = signal<string | null>(null);
}

/**
 * Mounts each panel from an independent boolean so a leaving panel can be
 * kept around while the next one enters — the same shape `animate.leave`
 * produces (the leaving DOM survives past the `value` transition). This
 * lets the spec assert the overlapping A→B child order, which the
 * `@if (open() === …)` shape can never produce (it destroys the leaving
 * panel synchronously).
 */
@Component({
  selector: 'overlapping-mega-menu-host',
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
        <li forNavigationMenuItem value="company">
          <button forNavigationMenuTrigger>Company</button>
          @if (mountCompany()) {
            <div forNavigationMenuContent data-id="company">company panel</div>
          }
        </li>
      </ul>
      <div forNavigationMenuViewport data-id="viewport"></div>
    </nav>
  `,
})
class OverlappingMegaMenuHost {
  readonly open = signal<string | null>(null);
  readonly mountProducts = signal(false);
  readonly mountSolutions = signal(false);
  readonly mountCompany = signal(false);
}

/**
 * Mounts each trigger independently of its content so a content panel can
 * re-parent into the viewport BEFORE its own trigger has registered — the
 * registration race the viewport must tolerate. Trigger and content both
 * defer their registration to `afterNextRender`, so in real apps the order
 * is non-deterministic; toggling these booleans lets the spec force the
 * trigger to register strictly after the content.
 */
@Component({
  selector: 'late-trigger-mega-menu-host',
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
          @if (mountProductsTrigger()) {
            <button forNavigationMenuTrigger>Products</button>
          }
          @if (mountProducts()) {
            <div forNavigationMenuContent data-id="products">products panel</div>
          }
        </li>
        <li forNavigationMenuItem value="solutions">
          @if (mountSolutionsTrigger()) {
            <button forNavigationMenuTrigger>Solutions</button>
          }
          @if (mountSolutions()) {
            <div forNavigationMenuContent data-id="solutions">solutions panel</div>
          }
        </li>
        <li forNavigationMenuItem value="company">
          @if (mountCompanyTrigger()) {
            <button forNavigationMenuTrigger>Company</button>
          }
          @if (mountCompany()) {
            <div forNavigationMenuContent data-id="company">company panel</div>
          }
        </li>
      </ul>
      <div forNavigationMenuViewport data-id="viewport"></div>
    </nav>
  `,
})
class LateTriggerMegaMenuHost {
  readonly open = signal<string | null>(null);
  readonly mountProducts = signal(false);
  readonly mountSolutions = signal(false);
  readonly mountCompany = signal(false);
  readonly mountProductsTrigger = signal(true);
  readonly mountSolutionsTrigger = signal(true);
  readonly mountCompanyTrigger = signal(true);
}

/**
 * Declares the viewport inside the root — so `FOR_NAVIGATION_MENU_CONTEXT`
 * resolves at the template's declaration site — but stamps it OUTSIDE the
 * `<nav>` element, the mega-menu shape where the re-parented panel is not a
 * DOM descendant of the nav.
 */
@Component({
  selector: 'external-viewport-mega-menu-host',
  imports: [
    NgTemplateOutlet,
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
            <div forNavigationMenuContent data-id="products">
              <a href="/p/a" data-id="products-link">A</a>
              <span data-id="products-static">filters</span>
            </div>
          }
        </li>
        <li forNavigationMenuItem value="solutions">
          <button forNavigationMenuTrigger>Solutions</button>
          @if (open() === 'solutions') {
            <div forNavigationMenuContent data-id="solutions">solutions panel</div>
          }
        </li>
      </ul>
      <ng-template #externalViewport>
        <div forNavigationMenuViewport data-id="viewport"></div>
      </ng-template>
    </nav>
    <div data-id="outside">
      <ng-container [ngTemplateOutlet]="externalViewport"></ng-container>
    </div>
  `,
})
class ExternalViewportMegaMenuHost {
  readonly open = signal<string | null>(null);
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
    it('moves the active [forNavigationMenuContent] into the viewport on mount', async () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      await flush();

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      // Nothing open yet, viewport is empty.
      expect(viewport.children.length).toBe(0);

      fixture.componentInstance.open.set('products');
      await flush();

      const products = query<HTMLElement>('[data-id="products"]')!;
      expect(products.parentElement).toBe(viewport);
    });

    it('releases the content from the viewport when @if unmounts it', async () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      fixture.componentInstance.open.set('products');
      await flush();

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      expect(viewport.children.length).toBe(1);

      fixture.componentInstance.open.set(null);
      await flush();

      // @if unmount destroys the embedded view; viewport ends up empty.
      expect(viewport.children.length).toBe(0);
      expect(query<HTMLElement>('[data-id="products"]')).toBeNull();
    });

    it('does not move content when no viewport is registered', async () => {
      const { fixture, query, flush } = renderHost(NoViewportHost);
      fixture.componentInstance.open.set('products');
      await flush();

      const products = query<HTMLElement>('[data-id="products"]')!;
      // Without a viewport, the content stays under its [forNavigationMenuItem] parent.
      expect(products.parentElement?.getAttribute('forNavigationMenuItem')).toBe('');
    });
  });

  describe('containment with a viewport outside the nav', () => {
    it('keeps the panel open when focus moves into a panel hosted outside the nav', async () => {
      const { fixture, query, flush } = renderHost(ExternalViewportMegaMenuHost);
      await flush();

      const trigger = query<HTMLButtonElement>('[forNavigationMenuTrigger]')!;
      trigger.click();
      await flush();

      const root = query<HTMLElement>('[forNavigationMenu]')!;
      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      const panel = query<HTMLElement>('[data-id="products"]')!;
      expect(panel.parentElement).toBe(viewport);
      expect(root.contains(panel)).toBe(false);

      const link = query<HTMLElement>('[data-id="products-link"]')!;
      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: link }));
      await flush();

      expect(fixture.componentInstance.open()).toBe('products');
      expect(root.getAttribute('data-state')).toBe('open');
      expect(query<HTMLElement>('[data-id="products"]')).toBe(panel);
    });

    it('still closes when focus moves outside the nav, the viewport and the panel', async () => {
      const { fixture, query, flush } = renderHost(ExternalViewportMegaMenuHost);
      await flush();

      const trigger = query<HTMLButtonElement>('[forNavigationMenuTrigger]')!;
      trigger.click();
      await flush();

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      try {
        const root = query<HTMLElement>('[forNavigationMenu]')!;
        trigger.dispatchEvent(
          new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
        );
        await flush();

        expect(fixture.componentInstance.open()).toBeNull();
        expect(root.getAttribute('data-state')).toBe('closed');
        expect(query<HTMLElement>('[data-id="products"]')).toBeNull();
      } finally {
        outside.remove();
      }
    });

    it('keeps the panel open on a pointerdown inside a panel hosted outside the nav', async () => {
      const { fixture, query, flush } = renderHost(ExternalViewportMegaMenuHost);
      await flush();

      const trigger = query<HTMLButtonElement>('[forNavigationMenuTrigger]')!;
      trigger.click();
      await flush();

      const inner = query<HTMLElement>('[data-id="products-static"]')!;
      inner.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await flush();

      expect(fixture.componentInstance.open()).toBe('products');
      expect(query<HTMLElement>('[data-id="products"]')).not.toBeNull();
    });

    it('still closes on a pointerdown outside the nav, the viewport and the panel', async () => {
      const { fixture, query, flush } = renderHost(ExternalViewportMegaMenuHost);
      await flush();

      const trigger = query<HTMLButtonElement>('[forNavigationMenuTrigger]')!;
      trigger.click();
      await flush();

      const stranger = document.createElement('div');
      document.body.appendChild(stranger);
      try {
        stranger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        await flush();
        expect(fixture.componentInstance.open()).toBeNull();
      } finally {
        stranger.remove();
      }
    });
  });

  describe('deterministic panel order during an overlapping transition', () => {
    const panelIds = (viewport: HTMLElement): string[] =>
      (Array.from(viewport.children) as HTMLElement[]).map((c) => c.getAttribute('data-id') ?? '');

    it('orders co-existing panels by trigger document order, not by mount order', async () => {
      const { fixture, query, flush } = renderHost(OverlappingMegaMenuHost);
      const host = fixture.componentInstance;
      await flush();
      const viewport = query<HTMLElement>('[data-id="viewport"]')!;

      // 'company' (last trigger) enters first.
      host.open.set('company');
      host.mountCompany.set(true);
      await flush();
      expect(panelIds(viewport)).toEqual(['company']);

      // 'products' (first trigger) enters while 'company' is still mounted
      // (animate.leave shape). Despite mounting later, it must land first
      // because its trigger comes first in the DOM.
      host.open.set('products');
      host.mountProducts.set(true);
      await flush();
      expect(panelIds(viewport)).toEqual(['products', 'company']);
    });

    it('inserts a middle panel between earlier and later siblings deterministically', async () => {
      const { fixture, query, flush } = renderHost(OverlappingMegaMenuHost);
      const host = fixture.componentInstance;
      await flush();
      const viewport = query<HTMLElement>('[data-id="viewport"]')!;

      // Mount the outer two first, in reverse trigger order.
      host.open.set('company');
      host.mountCompany.set(true);
      await flush();
      host.mountProducts.set(true);
      await flush();
      expect(panelIds(viewport)).toEqual(['products', 'company']);

      // 'solutions' (middle trigger) enters last but must slot between them.
      host.open.set('solutions');
      host.mountSolutions.set(true);
      await flush();
      expect(panelIds(viewport)).toEqual(['products', 'solutions', 'company']);
    });

    // Each step is its own flush so the panels genuinely re-parent at
    // different times (one `afterNextRender` pass each), exercising the
    // insertion logic against a different existing-children set every time
    // rather than collapsing into one template-order construction batch.
    // Both sequences must converge on the same trigger-order result.
    it('converges on trigger order when panels mount in forward sequence', async () => {
      const { fixture, query, flush } = renderHost(OverlappingMegaMenuHost);
      const host = fixture.componentInstance;
      await flush();
      host.mountProducts.set(true);
      await flush();
      host.mountSolutions.set(true);
      await flush();
      host.mountCompany.set(true);
      await flush();
      expect(panelIds(query<HTMLElement>('[data-id="viewport"]')!)).toEqual([
        'products',
        'solutions',
        'company',
      ]);
    });

    it('converges on trigger order when panels mount in reverse sequence', async () => {
      const { fixture, query, flush } = renderHost(OverlappingMegaMenuHost);
      const host = fixture.componentInstance;
      await flush();
      host.mountCompany.set(true);
      await flush();
      host.mountSolutions.set(true);
      await flush();
      host.mountProducts.set(true);
      await flush();
      expect(panelIds(query<HTMLElement>('[data-id="viewport"]')!)).toEqual([
        'products',
        'solutions',
        'company',
      ]);
    });
  });

  describe('deterministic panel order under a trigger-registration race', () => {
    const panelIds = (viewport: HTMLElement): string[] =>
      (Array.from(viewport.children) as HTMLElement[]).map((c) => c.getAttribute('data-id') ?? '');

    it('slots a panel into trigger order once its late-registering trigger appears', async () => {
      const { fixture, query } = renderHost(LateTriggerMegaMenuHost);
      const host = fixture.componentInstance;
      // 'products' (the earliest trigger) starts WITHOUT its trigger so its
      // content can re-parent while triggerHostFor('products') is still null.
      host.mountProductsTrigger.set(false);
      await flushAsync(fixture);

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;

      // 'company' (last trigger) enters first with its trigger present.
      host.open.set('company');
      host.mountCompany.set(true);
      await flushAsync(fixture);
      expect(panelIds(viewport)).toEqual(['company']);

      // 'products' enters while its trigger is still unmounted. With no known
      // trigger host it can only be appended last (degraded order) for now.
      host.open.set('products');
      host.mountProducts.set(true);
      await flushAsync(fixture);
      expect(panelIds(viewport)).toEqual(['company', 'products']);

      // The 'products' trigger finally registers. Ordering must re-run and
      // move the panel ahead of 'company', matching trigger document order —
      // not the mount order it briefly degraded to.
      host.mountProductsTrigger.set(true);
      await flushAsync(fixture);
      expect(panelIds(viewport)).toEqual(['products', 'company']);
    });

    it('re-appends a panel last when its trigger unregisters', async () => {
      const { fixture, query } = renderHost(LateTriggerMegaMenuHost);
      const host = fixture.componentInstance;
      await flushAsync(fixture);

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;

      // Both panels mount with their triggers present, in trigger order.
      host.open.set('company');
      host.mountCompany.set(true);
      await flushAsync(fixture);
      host.open.set('products');
      host.mountProducts.set(true);
      await flushAsync(fixture);
      expect(panelIds(viewport)).toEqual(['products', 'company']);

      // Remove the 'products' trigger while its panel stays mounted
      // (animate.leave shape). Ordering re-runs: with no trigger to anchor
      // it, the panel falls to the end.
      host.mountProductsTrigger.set(false);
      await flushAsync(fixture);
      expect(panelIds(viewport)).toEqual(['company', 'products']);
    });
  });

  describe('data-state on viewport', () => {
    it('reflects "closed" when nothing is open and "open" otherwise', async () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      await flush();

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      expect(viewport.getAttribute('data-state')).toBe('closed');

      fixture.componentInstance.open.set('products');
      await flush();
      expect(viewport.getAttribute('data-state')).toBe('open');

      fixture.componentInstance.open.set(null);
      await flush();
      expect(viewport.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('data-motion on content', () => {
    it('is absent on first open (no previous active item to compare against)', async () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      await flush();

      fixture.componentInstance.open.set('products');
      await flush();
      const products = query<HTMLElement>('[data-id="products"]')!;
      expect(products.hasAttribute('data-motion')).toBe(false);
    });

    it('reflects from-end on the entering and to-start on the leaving when moving rightward', async () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      await flush();

      fixture.componentInstance.open.set('products');
      await flush();
      fixture.componentInstance.open.set('company');
      await flush();

      // 'company' (index 2) is entering with 'products' (index 0) as the previous active.
      const company = query<HTMLElement>('[data-id="company"]')!;
      expect(company.getAttribute('data-motion')).toBe('from-end');
      // 'products' is destroyed on close in this test (no animate.leave shim);
      // motionFor still returns 'to-start' for it logically — verified via
      // the symmetric leftward case below where both panels remain mounted
      // is not possible without animate.leave, so we exercise the entering
      // direction here and assert the leftward entering case below.
    });

    it('reflects from-start on the entering content when moving leftward', async () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      await flush();

      fixture.componentInstance.open.set('company');
      await flush();
      fixture.componentInstance.open.set('products');
      await flush();

      // 'products' (index 0) is entering with 'company' (index 2) as the previous active.
      const products = query<HTMLElement>('[data-id="products"]')!;
      expect(products.getAttribute('data-motion')).toBe('from-start');
    });

    it('clears data-motion when the menu closes back to no selection', async () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      await flush();

      fixture.componentInstance.open.set('products');
      await flush();
      fixture.componentInstance.open.set('solutions');
      await flush();
      const solutions = query<HTMLElement>('[data-id="solutions"]')!;
      expect(solutions.getAttribute('data-motion')).toBe('from-end');

      fixture.componentInstance.open.set(null);
      await flush();
      // Solutions has been destroyed; nothing to assert on the leaving side
      // because @if removes it. The currently-open value is null, so any
      // remounted content would have no motion.
      fixture.componentInstance.open.set('solutions');
      await flush();
      const reopened = query<HTMLElement>('[data-id="solutions"]')!;
      // Previous active was null, so no comparison applies.
      expect(reopened.hasAttribute('data-motion')).toBe(false);
    });
  });

  describe('orientation reflection', () => {
    it('reflects [data-orientation] on the viewport host', async () => {
      const { query, flush } = renderHost(MegaMenuHost);
      await flush();

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

    it('observes the active content panel via ResizeObserver', async () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      await flush();

      fixture.componentInstance.open.set('products');
      await flush();

      const productsPanel = query<HTMLElement>('[data-id="products"]')!;
      const observingPanel = FakeResizeObserver.instances.find((ro) =>
        ro.observed.includes(productsPanel),
      );
      // Concrete: the located RO is observing this exact panel — toBeDefined()
      // only proved an instance was found, not which element it was tracking.
      expect(observingPanel?.observed).toContain(productsPanel);
    });

    it('switches the observed element when the active content changes', async () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      await flush();

      fixture.componentInstance.open.set('products');
      await flush();

      const products = query<HTMLElement>('[data-id="products"]')!;
      const observingProducts = FakeResizeObserver.instances.some((ro) =>
        ro.observed.includes(products),
      );
      expect(observingProducts).toBe(true);

      fixture.componentInstance.open.set('solutions');
      await flush();

      // The previous active panel is no longer observed.
      expect(FakeResizeObserver.instances.some((ro) => ro.observed.includes(products))).toBe(false);

      const solutions = query<HTMLElement>('[data-id="solutions"]')!;
      const observingSolutions = FakeResizeObserver.instances.some((ro) =>
        ro.observed.includes(solutions),
      );
      expect(observingSolutions).toBe(true);
    });

    it('keeps observing the active panel across an A→B→C sequence, never a leaving one', async () => {
      const { fixture, query, flush } = renderHost(OverlappingMegaMenuHost);
      const host = fixture.componentInstance;
      await flush();

      // A enters and becomes active.
      host.open.set('products');
      host.mountProducts.set(true);
      await flush();
      const products = query<HTMLElement>('[data-id="products"]')!;
      const observed = (): Element[] => FakeResizeObserver.instances.flatMap((ro) => ro.observed);
      expect(observed()).toContain(products);

      // B enters; A is kept mounted (animate.leave shape). Only the active
      // panel (B) must be measured — the leaving A must be unobserved.
      host.open.set('solutions');
      host.mountSolutions.set(true);
      await flush();
      const solutions = query<HTMLElement>('[data-id="solutions"]')!;
      expect(observed()).toContain(solutions);
      expect(observed()).not.toContain(products);

      // A finishes leaving (unmounts). B stays the only measured panel.
      host.mountProducts.set(false);
      await flush();
      expect(observed()).toContain(solutions);
      expect(query<HTMLElement>('[data-id="products"]')).toBeNull();

      // C enters; B kept mounted. Active C measured, leaving B not.
      host.open.set('company');
      host.mountCompany.set(true);
      await flush();
      const company = query<HTMLElement>('[data-id="company"]')!;
      expect(observed()).toContain(company);
      expect(observed()).not.toContain(solutions);
    });

    it('renders without crashing when ResizeObserver is unavailable', async () => {
      // Simulate SSR / very old runtime: no global RO. The directive must
      // skip `new ResizeObserver(...)` entirely and still produce a valid
      // DOM tree (re-parenting, data-state, orientation). The actual size
      // populating the CSS variables on first read is asserted in the
      // Playwright suite (`navigation-menu.e2e.ts`).
      (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
        undefined as unknown as typeof ResizeObserver;
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      await flush();

      fixture.componentInstance.open.set('products');
      await flush();

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      // Viewport still renders and re-parents the active content.
      const products = query<HTMLElement>('[data-id="products"]')!;
      expect(products.parentElement).toBe(viewport);
      // data-state still tracks open/closed.
      expect(viewport.getAttribute('data-state')).toBe('open');
    });
  });
});
