import { Component, signal } from '@angular/core';

import { pressKey, renderHost } from '../../test-utils';
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

function pointer(type: 'pointerenter' | 'pointerleave' | 'pointerdown'): PointerEvent {
  return new PointerEvent(type, { bubbles: true });
}

describe('ForNavigationMenu', () => {
  describe('basic rendering', () => {
    it('reflects aria-label, data-orientation, and trigger ↔ content ids', () => {
      const { query, queryAll, fixture, flush } = renderHost(NavMenuHost);
      flush();

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
      flush();
      const trigger = triggers[0]!;
      const content = query<HTMLElement>('[forNavigationMenuContent]')!;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    });

    it('emits no aria-label when ariaLabel is unset (default null)', () => {
      @Component({
        imports: [ForNavigationMenu, ForNavigationMenuList, ForNavigationMenuItem, ForNavigationMenuTrigger],
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
      flush();
      const root = query<HTMLElement>('[forNavigationMenu]')!;
      expect(root.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('click toggle', () => {
    it('opens on click and closes on a second click', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();

      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');
      triggers[0]!.click();
      flush();
      expect(fixture.componentInstance.open()).toBe('products');

      triggers[0]!.click();
      flush();
      expect(fixture.componentInstance.open()).toBe('');
    });

    it('switching items closes the previous and opens the next', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();

      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');
      triggers[0]!.click();
      flush();
      expect(fixture.componentInstance.open()).toBe('products');

      triggers[1]!.click();
      flush();
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

    it('opens after delayDuration on pointerenter', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.dispatchEvent(pointer('pointerenter'));
      flush();
      vi.advanceTimersByTime(199);
      flush();
      expect(fixture.componentInstance.open()).toBe('');
      vi.advanceTimersByTime(1);
      flush();
      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('closes after closeDelay on pointerleave', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.click();
      flush();
      expect(fixture.componentInstance.open()).toBe('products');

      trigger.dispatchEvent(pointer('pointerleave'));
      flush();
      vi.advanceTimersByTime(149);
      flush();
      expect(fixture.componentInstance.open()).toBe('products');
      vi.advanceTimersByTime(1);
      flush();
      expect(fixture.componentInstance.open()).toBe('');
    });

    it('keeps the menu open when the pointer moves from trigger into content', () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.click();
      flush();
      expect(fixture.componentInstance.open()).toBe('products');

      trigger.dispatchEvent(pointer('pointerleave'));
      flush();

      const content = query<HTMLElement>('[forNavigationMenuContent]')!;
      content.dispatchEvent(pointer('pointerenter'));
      flush();

      vi.advanceTimersByTime(500);
      flush();
      expect(fixture.componentInstance.open()).toBe('products');

      content.dispatchEvent(pointer('pointerleave'));
      flush();
      vi.advanceTimersByTime(149);
      flush();
      expect(fixture.componentInstance.open()).toBe('products');
      vi.advanceTimersByTime(1);
      flush();
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

    it('enter-B-then-leave-A: the pending open for B is not clobbered by leaving A', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      // A (products) is open.
      triggers[0]!.click();
      flush();
      expect(fixture.componentInstance.open()).toBe('products');

      // Browser fires pointerenter on B before pointerleave on A.
      triggers[1]!.dispatchEvent(pointer('pointerenter'));
      flush();
      triggers[0]!.dispatchEvent(pointer('pointerleave'));
      flush();

      // The pending open for B must survive and switch the menu, not close it.
      vi.advanceTimersByTime(200);
      flush();
      expect(fixture.componentInstance.open()).toBe('solutions');

      // No stray close fires afterwards.
      vi.advanceTimersByTime(1000);
      flush();
      expect(fixture.componentInstance.open()).toBe('solutions');
    });

    it('leave-A-then-enter-B: entering B cancels A’s pending close and opens B', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      // A (products) is open.
      triggers[0]!.click();
      flush();
      expect(fixture.componentInstance.open()).toBe('products');

      // Browser fires pointerleave on A before pointerenter on B.
      triggers[0]!.dispatchEvent(pointer('pointerleave'));
      flush();
      triggers[1]!.dispatchEvent(pointer('pointerenter'));
      flush();

      vi.advanceTimersByTime(200);
      flush();
      expect(fixture.componentInstance.open()).toBe('solutions');

      vi.advanceTimersByTime(1000);
      flush();
      expect(fixture.componentInstance.open()).toBe('solutions');
    });

    it('leaving the whole nav (no sibling enter) still closes the open item', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.click();
      flush();
      expect(fixture.componentInstance.open()).toBe('products');

      triggers[0]!.dispatchEvent(pointer('pointerleave'));
      flush();
      vi.advanceTimersByTime(150);
      flush();
      expect(fixture.componentInstance.open()).toBe('');
    });
  });

  describe('keyboard', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('Enter / Space toggle the open state', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      pressKey(trigger, 'Enter');
      flush();
      expect(fixture.componentInstance.open()).toBe('products');
      pressKey(trigger, ' ');
      flush();
      expect(fixture.componentInstance.open()).toBe('');
    });

    it('ArrowDown opens the disclosure (horizontal orientation)', () => {
      vi.useFakeTimers();
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[1]!;

      pressKey(trigger, 'ArrowDown');
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.open()).toBe('solutions');
    });

    it('ArrowRight / ArrowLeft navigate between triggers (horizontal)', () => {
      const { queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggers[1]);

      pressKey(triggers[1]!, 'ArrowLeft');
      flush();
      expect(document.activeElement).toBe(triggers[0]);
    });

    it('Escape closes and returns focus to the trigger', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.click();
      flush();
      trigger.focus();
      pressKey(trigger, 'Escape');
      flush();

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

    it('horizontal: ArrowLeft becomes the forward direction across triggers under dir="rtl"', () => {
      const { queryAll, flush } = renderHost(RtlNavMenuHost);
      flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowLeft');
      flush();
      expect(document.activeElement).toBe(triggers[1]);

      pressKey(triggers[1]!, 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggers[0]);
    });

    it('vertical: ArrowDown / ArrowUp stay axis-positive under dir="rtl"', () => {
      const { fixture, queryAll, flush } = renderHost(RtlNavMenuHost);
      fixture.componentInstance.orientation.set('vertical');
      flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowDown');
      flush();
      expect(document.activeElement).toBe(triggers[1]);

      pressKey(triggers[1]!, 'ArrowUp');
      flush();
      expect(document.activeElement).toBe(triggers[0]);
    });
  });

  describe('outside dismiss', () => {
    it('closes when the user pointerdowns outside the menu', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();

      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      flush();
      expect(fixture.componentInstance.open()).toBe('products');

      // Outside element: a sibling appended to body for the test.
      const stranger = document.createElement('div');
      document.body.appendChild(stranger);
      try {
        stranger.dispatchEvent(pointer('pointerdown'));
        flush();
        expect(fixture.componentInstance.open()).toBe('');
      } finally {
        stranger.remove();
      }
    });
  });

  describe('root data-state', () => {
    it('reflects "closed" initially and flips to "open" when an item opens', () => {
      const { fixture, query, flush } = renderHost(NavMenuHost);
      flush();

      const root = query<HTMLElement>('[forNavigationMenu]')!;
      expect(root.getAttribute('data-state')).toBe('closed');

      fixture.componentInstance.open.set('products');
      flush();
      expect(root.getAttribute('data-state')).toBe('open');

      fixture.componentInstance.open.set('');
      flush();
      expect(root.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('focusout (Tab out closes per APG)', () => {
    it('closes when focus moves to an element outside the nav', () => {
      const { fixture, queryAll, query, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      flush();
      expect(fixture.componentInstance.open()).toBe('products');

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      try {
        const root = query<HTMLElement>('[forNavigationMenu]')!;
        // focusout bubbles, so dispatching on a descendant link or trigger
        // works. We use a link inside the open content as the source.
        const link = root.querySelector<HTMLElement>('a[forNavigationMenuLink]')!;
        link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
        flush();
        expect(fixture.componentInstance.open()).toBe('');
        expect(root.getAttribute('data-state')).toBe('closed');
      } finally {
        outside.remove();
      }
    });

    it('does not close when focus stays inside the nav (e.g. trigger → link)', () => {
      const { fixture, queryAll, query, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      flush();

      const link = query<HTMLAnchorElement>('a[forNavigationMenuLink]')!;
      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: link }));
      flush();

      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('does not close when focus moves between two triggers in the nav', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');
      triggers[0]!.click();
      flush();

      triggers[0]!.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: triggers[1]! }),
      );
      flush();
      expect(fixture.componentInstance.open()).toBe('products');
    });

    it('treats null relatedTarget (focus leaving the document) as outside and closes', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      trigger.click();
      flush();

      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      flush();
      expect(fixture.componentInstance.open()).toBe('');
    });

    it('is a no-op when nothing is open (avoids extra work for every Tab)', () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;
      const root = query<HTMLElement>('[forNavigationMenu]')!;

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      try {
        trigger.dispatchEvent(
          new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
        );
        flush();
        // Open stays at '' (nothing was open) and data-state stays "closed".
        expect(fixture.componentInstance.open()).toBe('');
        expect(root.getAttribute('data-state')).toBe('closed');
      } finally {
        outside.remove();
      }
    });
  });

  describe('link reflects active state', () => {
    it('sets aria-current="page" and data-active on active links', () => {
      const { fixture, query, queryAll, flush } = renderHost(NavMenuHost);
      fixture.componentInstance.open.set('products');
      flush();

      const links = queryAll<HTMLAnchorElement>('[forNavigationMenuLink]');
      // First link is not active, second link has [active].
      expect(links[0]!.hasAttribute('data-active')).toBe(false);
      expect(links[1]!.getAttribute('data-active')).toBe('');
      expect(links[1]!.getAttribute('aria-current')).toBe('page');
      // Just to silence unused 'query' warnings:
      void query;
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects state changes after detectChanges without Zone.js', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const triggers = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]');

      expect(triggers[0]!.getAttribute('aria-expanded')).toBe('false');
      fixture.componentInstance.open.set('products');
      flush();
      expect(triggers[0]!.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
