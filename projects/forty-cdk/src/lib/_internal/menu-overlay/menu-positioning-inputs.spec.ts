import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ForContextMenu } from '../../context-menu/context-menu';
import { ForDropdownMenu } from '../../dropdown-menu/dropdown-menu';
import { ForMenuSub } from '../../menu/menu-sub';
import { MENU_POSITIONING_DEFAULTS } from './menu-positioning-inputs';

@Component({
  imports: [ForDropdownMenu, ForContextMenu, ForMenuSub],
  template: `
    <div forDropdownMenu></div>
    <div forContextMenu></div>
    <div forContextMenu>
      <div forMenuSub></div>
    </div>
  `,
})
class PositioningHost {}

/**
 * Guard for issue #575 (decision D10): Angular's NG8110 restriction stops the
 * three menu roots from declaring their positioning inputs through a shared
 * factory, so each declares them inline. This asserts the inputs they share
 * keep identical default values — the place the audit found real copy-paste
 * drift (`[forMenuSub]`'s hardcoded `0` offsets that diverged from the
 * provider-backed roots). The shared `MENU_POSITIONING_DEFAULTS` source is the
 * single source for the non-seed defaults; the seeds (`sideOffset`,
 * `collisionPadding`) come from each root's defaults provider.
 */
describe('menu positioning inputs drift guard', () => {
  function setup(): { dropdown: ForDropdownMenu; context: ForContextMenu; sub: ForMenuSub } {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(PositioningHost);
    fixture.detectChanges();
    const dropdown = fixture.debugElement
      .query(By.directive(ForDropdownMenu))
      .injector.get(ForDropdownMenu);
    const context = fixture.debugElement
      .query(By.directive(ForContextMenu))
      .injector.get(ForContextMenu);
    const sub = fixture.debugElement.query(By.directive(ForMenuSub)).injector.get(ForMenuSub);
    return { dropdown, context, sub };
  }

  it('keeps the non-seed positioning defaults identical across the three roots', () => {
    const { dropdown, context, sub } = setup();

    for (const root of [dropdown, context, sub]) {
      expect(root.align()).toBe(MENU_POSITIONING_DEFAULTS.align);
      expect(root.alignOffset()).toBe(MENU_POSITIONING_DEFAULTS.alignOffset);
      expect(root.avoidCollisions()).toBe(MENU_POSITIONING_DEFAULTS.avoidCollisions);
      expect(root.arrowPadding()).toBe(MENU_POSITIONING_DEFAULTS.arrowPadding);
      expect(root.sticky()).toBe(MENU_POSITIONING_DEFAULTS.sticky);
      expect(root.hideWhenDetached()).toBe(MENU_POSITIONING_DEFAULTS.hideWhenDetached);
      expect(root.clipUntilPositioned()).toBe(MENU_POSITIONING_DEFAULTS.clipUntilPositioned);
    }
  });

  it('shares the top-level `side` default, with the submenu resolving from dir', () => {
    const { dropdown, context, sub } = setup();

    expect(dropdown.side()).toBe(MENU_POSITIONING_DEFAULTS.side);
    expect(context.side()).toBe(MENU_POSITIONING_DEFAULTS.side);
    expect(sub.side()).toBe('right');
  });

  it('seeds the per-root offsets from the defaults providers (no silent drift)', () => {
    const { dropdown, context, sub } = setup();

    expect(dropdown.sideOffset()).toBe(4);
    expect(dropdown.collisionPadding()).toBe(8);

    expect(context.sideOffset()).toBe(0);
    expect(context.collisionPadding()).toBe(8);

    expect(sub.sideOffset()).toBe(0);
    expect(sub.collisionPadding()).toBe(8);
  });
});
