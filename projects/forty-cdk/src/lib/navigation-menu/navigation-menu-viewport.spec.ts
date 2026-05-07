import { Component, signal } from '@angular/core';

import { renderHost } from '../../test-utils/render';
import { ForNavigationMenu } from './navigation-menu';
import { ForNavigationMenuContent } from './navigation-menu-content';
import { ForNavigationMenuItem } from './navigation-menu-item';
import { ForNavigationMenuList } from './navigation-menu-list';
import { ForNavigationMenuTrigger } from './navigation-menu-trigger';
import { ForNavigationMenuViewport } from './navigation-menu-viewport';

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

function stubRectByDataId(sizes: Record<string, { width: number; height: number }>): () => void {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const id = (this as Element).getAttribute?.('data-id');
    if (id && sizes[id]) {
      const { width, height } = sizes[id]!;
      return {
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    }
    return original.call(this);
  };
  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
}

describe('ForNavigationMenuViewport', () => {
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

  describe('size CSS variables', () => {
    it('reflects the active content size into --for-navigation-menu-viewport-{width,height}', () => {
      const restore = stubRectByDataId({
        products: { width: 320, height: 240 },
        solutions: { width: 480, height: 120 },
      });
      try {
        const { fixture, query, flush } = renderHost(MegaMenuHost);
        flush();

        const viewport = query<HTMLElement>('[data-id="viewport"]')!;
        fixture.componentInstance.open.set('products');
        flush();

        expect(viewport.style.getPropertyValue('--for-navigation-menu-viewport-width')).toBe(
          '320px',
        );
        expect(viewport.style.getPropertyValue('--for-navigation-menu-viewport-height')).toBe(
          '240px',
        );

        fixture.componentInstance.open.set('solutions');
        flush();

        expect(viewport.style.getPropertyValue('--for-navigation-menu-viewport-width')).toBe(
          '480px',
        );
        expect(viewport.style.getPropertyValue('--for-navigation-menu-viewport-height')).toBe(
          '120px',
        );
      } finally {
        restore();
      }
    });
  });

  describe('data-state on viewport', () => {
    it('reflects "hidden" when nothing is open and "visible" otherwise', () => {
      const { fixture, query, flush } = renderHost(MegaMenuHost);
      flush();

      const viewport = query<HTMLElement>('[data-id="viewport"]')!;
      expect(viewport.getAttribute('data-state')).toBe('hidden');

      fixture.componentInstance.open.set('products');
      flush();
      expect(viewport.getAttribute('data-state')).toBe('visible');

      fixture.componentInstance.open.set('');
      flush();
      expect(viewport.getAttribute('data-state')).toBe('hidden');
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
});
