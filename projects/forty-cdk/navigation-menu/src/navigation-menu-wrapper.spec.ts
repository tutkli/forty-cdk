import { Component, Directive, signal } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { pressKey, renderHost } from '../../src/test-utils';

import { ForNavigationMenu, provideForNavigationMenu } from './navigation-menu';
import { ForNavigationMenuContent } from './navigation-menu-content';
import { ForNavigationMenuItem } from './navigation-menu-item';
import { ForNavigationMenuList } from './navigation-menu-list';
import { ForNavigationMenuTrigger } from './navigation-menu-trigger';

@Directive({
  selector: '[wrapperNavigationMenu]',
  exportAs: 'wrapperNavigationMenu',
  providers: provideForNavigationMenu(WrapperNavigationMenu),
  host: { class: 'wrapper-navigation-menu' },
})
class WrapperNavigationMenu extends ForNavigationMenu {}

@Directive({ selector: '[wrapperNavigationMenuList]', hostDirectives: [ForNavigationMenuList] })
class WrapperNavigationMenuList {}

@Directive({
  selector: '[wrapperNavigationMenuItem]',
  hostDirectives: [{ directive: ForNavigationMenuItem, inputs: ['value'] }],
})
class WrapperNavigationMenuItem {}

@Directive({
  selector: '[wrapperNavigationMenuTrigger]',
  hostDirectives: [ForNavigationMenuTrigger],
})
class WrapperNavigationMenuTrigger {}

@Directive({
  selector: '[wrapperNavigationMenuContent]',
  hostDirectives: [ForNavigationMenuContent],
})
class WrapperNavigationMenuContent {}

@Component({
  imports: [
    WrapperNavigationMenu,
    WrapperNavigationMenuList,
    WrapperNavigationMenuItem,
    WrapperNavigationMenuTrigger,
    WrapperNavigationMenuContent,
  ],
  template: `
    <nav wrapperNavigationMenu [(value)]="open">
      <ul wrapperNavigationMenuList>
        <li wrapperNavigationMenuItem value="products">
          <button wrapperNavigationMenuTrigger data-testid="products">Products</button>
          @if (open() === 'products') {
            <div wrapperNavigationMenuContent data-testid="products-panel">
              <a href="/p/a">A</a>
            </div>
          }
        </li>
        <li wrapperNavigationMenuItem value="company">
          <button wrapperNavigationMenuTrigger data-testid="company">Company</button>
        </li>
      </ul>
    </nav>
  `,
})
class WrapperHost {
  readonly open = signal<string | null>(null);
}

describe('ForNavigationMenu subclass wrapper (#1399)', () => {
  it('mounts a subclassed root whose own providers come from provideForNavigationMenu', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[wrapperNavigationMenu]')?.getAttribute('data-orientation')).toBe(
      'horizontal',
    );
  });

  it('wires the trigger to its content through the subclassed root', async () => {
    const { el, flush } = renderHost(WrapperHost);

    const trigger = el.querySelector<HTMLElement>('[data-testid="products"]')!;
    trigger.click();
    await flush();

    const panel = el.querySelector<HTMLElement>('[data-testid="products-panel"]');
    expect(panel?.id).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(panel?.id);
  });

  it('navigates between the triggers registered with the subclass', async () => {
    const { el, flush } = renderHost(WrapperHost);
    await flush();

    const first = el.querySelector<HTMLElement>('[data-testid="products"]')!;
    const second = el.querySelector<HTMLElement>('[data-testid="company"]')!;
    first.focus();

    pressKey(first, 'ArrowRight');
    await flush();

    expect(document.activeElement).toBe(second);
  });
});
