import { Component, signal } from '@angular/core';

import { renderHost } from '../../test-utils/render';
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

function key(name: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
}

function pointer(type: 'pointerenter' | 'pointerleave' | 'pointerdown'): PointerEvent {
  return new PointerEvent(type, { bubbles: true });
}

describe('ForNavigationMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

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

  describe('keyboard', () => {
    it('Enter / Space toggle the open state', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[0]!;

      trigger.dispatchEvent(key('Enter'));
      flush();
      expect(fixture.componentInstance.open()).toBe('products');
      trigger.dispatchEvent(key(' '));
      flush();
      expect(fixture.componentInstance.open()).toBe('');
    });

    it('ArrowDown opens the disclosure (horizontal orientation)', () => {
      const { fixture, queryAll, flush } = renderHost(NavMenuHost);
      flush();
      const trigger = queryAll<HTMLButtonElement>('[forNavigationMenuTrigger]')[1]!;

      trigger.dispatchEvent(key('ArrowDown'));
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
      triggers[0]!.dispatchEvent(key('ArrowRight'));
      flush();
      expect(document.activeElement).toBe(triggers[1]);

      triggers[1]!.dispatchEvent(key('ArrowLeft'));
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
      trigger.dispatchEvent(key('Escape'));
      flush();

      expect(fixture.componentInstance.open()).toBe('');
      expect(document.activeElement).toBe(trigger);
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
