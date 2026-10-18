import { Component, signal } from '@angular/core';

import { renderHost } from '../../src/test-utils/render';
import { ForNavigationMenu } from './navigation-menu';
import { ForNavigationMenuIndicator } from './navigation-menu-indicator';
import { ForNavigationMenuItem } from './navigation-menu-item';
import { ForNavigationMenuList } from './navigation-menu-list';
import { ForNavigationMenuTrigger } from './navigation-menu-trigger';

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  disconnected = false;
  constructor(public cb: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.push(el);
  }
  disconnect(): void {
    this.observed = [];
    this.disconnected = true;
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
    ForNavigationMenuIndicator,
  ],
  template: `
    <nav forNavigationMenu [(value)]="open" [orientation]="orientation()">
      <ul forNavigationMenuList data-id="list">
        <li forNavigationMenuItem value="products">
          <button forNavigationMenuTrigger data-id="trigger-products">Products</button>
        </li>
        <li forNavigationMenuItem value="solutions">
          <button forNavigationMenuTrigger data-id="trigger-solutions">Solutions</button>
        </li>
        <li forNavigationMenuItem value="company">
          <button forNavigationMenuTrigger data-id="trigger-company">Company</button>
        </li>
        <li forNavigationMenuIndicator data-id="indicator"></li>
      </ul>
    </nav>
  `,
})
class IndicatorHost {
  readonly open = signal<string | null>(null);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    x: left,
    y: top,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}

function indicatorVar(indicator: HTMLElement, name: 'x' | 'y' | 'width' | 'height'): string {
  return indicator.style.getPropertyValue(`--for-navigation-menu-indicator-${name}`);
}

function indicatorObserver(): FakeResizeObserver {
  expect(FakeResizeObserver.instances).toHaveLength(1);
  return FakeResizeObserver.instances[0]!;
}

describe('ForNavigationMenuIndicator', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    FakeResizeObserver.instances = [];
  });

  describe('host attributes', () => {
    it('is hidden from assistive technology', async () => {
      const { query, flush } = renderHost(IndicatorHost);
      await flush();

      expect(query<HTMLElement>('[data-id="indicator"]')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('reflects the menu orientation on data-orientation', async () => {
      const { fixture, query, flush } = renderHost(IndicatorHost);
      await flush();
      const indicator = query<HTMLElement>('[data-id="indicator"]')!;
      expect(indicator.getAttribute('data-orientation')).toBe('horizontal');

      fixture.componentInstance.orientation.set('vertical');
      await flush();

      expect(indicator.getAttribute('data-orientation')).toBe('vertical');
    });

    it('reflects data-state="hidden" while no trigger is active and "visible" while one is', async () => {
      const { fixture, query, flush } = renderHost(IndicatorHost);
      await flush();
      const indicator = query<HTMLElement>('[data-id="indicator"]')!;
      expect(indicator.getAttribute('data-state')).toBe('hidden');

      fixture.componentInstance.open.set('solutions');
      await flush();
      expect(indicator.getAttribute('data-state')).toBe('visible');

      fixture.componentInstance.open.set('company');
      await flush();
      expect(indicator.getAttribute('data-state')).toBe('visible');

      fixture.componentInstance.open.set(null);
      await flush();
      expect(indicator.getAttribute('data-state')).toBe('hidden');
    });
  });

  describe('ResizeObserver wiring', () => {
    it('observes the list from mount and follows the active trigger', async () => {
      const { fixture, query, flush } = renderHost(IndicatorHost);
      await flush();
      const list = query<HTMLElement>('[data-id="list"]')!;
      const products = query<HTMLElement>('[data-id="trigger-products"]')!;
      const solutions = query<HTMLElement>('[data-id="trigger-solutions"]')!;
      const ro = indicatorObserver();
      expect(ro.observed).toEqual([list]);

      fixture.componentInstance.open.set('products');
      await flush();
      expect(ro.observed).toEqual([list, products]);

      fixture.componentInstance.open.set('solutions');
      await flush();
      expect(ro.observed).toEqual([list, solutions]);

      fixture.componentInstance.open.set(null);
      await flush();
      expect(ro.observed).toEqual([list]);
    });

    it('re-measures the active trigger each time the observer fires', async () => {
      const { fixture, query, flush } = renderHost(IndicatorHost);
      await flush();
      const solutions = query<HTMLElement>('[data-id="trigger-solutions"]')!;
      const read = vi.spyOn(solutions, 'getBoundingClientRect');

      fixture.componentInstance.open.set('solutions');
      await flush();
      const afterOpen = read.mock.calls.length;
      expect(afterOpen).toBeGreaterThan(0);

      await flush();
      expect(read).toHaveBeenCalledTimes(afterOpen);

      indicatorObserver().fire();
      await flush();
      expect(read).toHaveBeenCalledTimes(afterOpen + 1);
    });

    it('disconnects the observer when destroyed', async () => {
      const { fixture, flush } = renderHost(IndicatorHost);
      fixture.componentInstance.open.set('products');
      await flush();
      const ro = indicatorObserver();
      expect(ro.disconnected).toBe(false);

      fixture.destroy();

      expect(ro.disconnected).toBe(true);
      expect(ro.observed).toEqual([]);
    });

    it('renders without crashing when ResizeObserver is unavailable', async () => {
      vi.stubGlobal('ResizeObserver', undefined);
      const { fixture, query, flush } = renderHost(IndicatorHost);
      await flush();

      fixture.componentInstance.open.set('company');
      await flush();

      expect(query<HTMLElement>('[data-id="indicator"]')!.getAttribute('data-state')).toBe(
        'visible',
      );
    });
  });

  describe('geometry retention', () => {
    it('keeps the last measured geometry when the menu closes', async () => {
      const { fixture, query, flush } = renderHost(IndicatorHost);
      await flush();
      const indicator = query<HTMLElement>('[data-id="indicator"]')!;
      const list = query<HTMLElement>('[data-id="list"]')!;
      const company = query<HTMLElement>('[data-id="trigger-company"]')!;
      vi.spyOn(list, 'getBoundingClientRect').mockReturnValue(rect(10, 20, 400, 40));
      vi.spyOn(company, 'getBoundingClientRect').mockReturnValue(rect(250, 24, 90, 32));
      const closed = (['x', 'y', 'width', 'height'] as const).map((n) =>
        indicatorVar(indicator, n),
      );

      fixture.componentInstance.open.set('company');
      await flush();
      const open = (['x', 'y', 'width', 'height'] as const).map((n) => indicatorVar(indicator, n));
      open.forEach((value, i) => expect(value).not.toBe(closed[i]));

      fixture.componentInstance.open.set(null);
      await flush();

      expect(indicator.getAttribute('data-state')).toBe('hidden');
      expect(
        (['x', 'y', 'width', 'height'] as const).map((n) => indicatorVar(indicator, n)),
      ).toEqual(open);
    });

    it('keeps the retained geometry through a re-measure while closed', async () => {
      const { fixture, query, flush } = renderHost(IndicatorHost);
      await flush();
      const indicator = query<HTMLElement>('[data-id="indicator"]')!;
      const company = query<HTMLElement>('[data-id="trigger-company"]')!;
      vi.spyOn(company, 'getBoundingClientRect').mockReturnValue(rect(250, 24, 90, 32));

      fixture.componentInstance.open.set('company');
      await flush();
      const open = indicatorVar(indicator, 'width');

      fixture.componentInstance.open.set(null);
      await flush();
      indicatorObserver().fire();
      await flush();

      expect(indicatorVar(indicator, 'width')).toBe(open);
    });
  });

  describe('scrolled list', () => {
    it('leaves the offsets unchanged when the list scrolls under the active trigger', async () => {
      const { fixture, query, flush } = renderHost(IndicatorHost);
      await flush();
      const indicator = query<HTMLElement>('[data-id="indicator"]')!;
      const list = query<HTMLElement>('[data-id="list"]')!;
      const company = query<HTMLElement>('[data-id="trigger-company"]')!;
      vi.spyOn(list, 'getBoundingClientRect').mockReturnValue(rect(10, 20, 200, 200));
      const companyRect = vi
        .spyOn(company, 'getBoundingClientRect')
        .mockReturnValue(rect(250, 160, 90, 32));

      fixture.componentInstance.open.set('company');
      await flush();
      const before = { x: indicatorVar(indicator, 'x'), y: indicatorVar(indicator, 'y') };

      Object.defineProperty(list, 'scrollLeft', { configurable: true, value: 120 });
      Object.defineProperty(list, 'scrollTop', { configurable: true, value: 60 });
      companyRect.mockReturnValue(rect(130, 100, 90, 32));
      indicatorObserver().fire();
      await flush();

      expect({ x: indicatorVar(indicator, 'x'), y: indicatorVar(indicator, 'y') }).toEqual(before);
    });
  });
});
