import { Component, type Provider, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ForContextMenu, provideForContextMenuDefaults } from 'forty-cdk/context-menu';
import { ForDropdownMenu, provideForDropdownMenuDefaults } from 'forty-cdk/dropdown-menu';
import { ForMenu, ForMenuSub, provideForMenuDefaults } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger, provideForMenubarDefaults } from 'forty-cdk/menubar';

import { FOR_CONTEXT_MENU_FALLBACK_DEFAULTS } from '../../../context-menu/src/context-menu-defaults';
import { FOR_DROPDOWN_MENU_FALLBACK_DEFAULTS } from '../../../dropdown-menu/src/dropdown-menu-defaults';
import { FOR_MENU_FALLBACK_DEFAULTS } from '../../../menu/src/menu-defaults';
import { FOR_MENUBAR_FALLBACK_DEFAULTS } from '../../../menubar/src/menubar-defaults';
import {
  MenubarMenuContext,
  type MenubarMenuHost,
} from '../../../menubar/src/menubar-menu-context';
import { MENU_POSITIONING_DEFAULTS } from './menu-positioning-inputs';

@Component({
  imports: [ForDropdownMenu, ForContextMenu, ForMenu, ForMenuSub],
  template: `
    <div forDropdownMenu></div>
    <div forContextMenu></div>
    <div forMenu></div>
    <div forContextMenu>
      <div forMenuSub></div>
    </div>
  `,
})
class PositioningHost {}

@Component({
  imports: [ForContextMenu, ForMenu, ForMenuSub],
  template: `
    <div forMenu [fallbackAxisSideDirection]="'none'"></div>
    <div forMenu></div>
    <div forContextMenu>
      <div forMenuSub [fallbackAxisSideDirection]="'none'"></div>
    </div>
  `,
})
class PinnedFallbackAxisHost {}

@Component({
  imports: [ForMenubar, ForMenubarTrigger],
  template: `
    <div forMenubar>
      <button forMenubarTrigger value="file">File</button>
    </div>
  `,
})
class MenubarTriggerPositioningHost {}

/**
 * Guard for issue #575 (decision D10): Angular's NG8110 restriction stops the
 * menu roots from declaring their positioning inputs through a shared
 * factory, so each declares them inline. This asserts the inputs they share
 * keep identical default values — the place the audit found real copy-paste
 * drift (`[forMenuSub]`'s hardcoded `0` offsets that diverged from the
 * provider-backed roots). The shared `MENU_POSITIONING_DEFAULTS` source is the
 * single source for the non-seed defaults; the seeds (`sideOffset`,
 * `collisionPadding`, `fallbackAxisSideDirection`) come from each root's
 * defaults provider. The menubar's `[forMenubarTrigger]` and its multiplexed
 * context are covered by the two companion suites below.
 */
describe('menu positioning inputs drift guard', () => {
  function setup(providers: Provider[] = []): {
    dropdown: ForDropdownMenu;
    context: ForContextMenu;
    menu: ForMenu;
    sub: ForMenuSub;
  } {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...providers],
    });
    const fixture = TestBed.createComponent(PositioningHost);
    fixture.detectChanges();
    const dropdown = fixture.debugElement
      .query(By.directive(ForDropdownMenu))
      .injector.get(ForDropdownMenu);
    const context = fixture.debugElement
      .query(By.directive(ForContextMenu))
      .injector.get(ForContextMenu);
    const menu = fixture.debugElement.query(By.directive(ForMenu)).injector.get(ForMenu);
    const sub = fixture.debugElement.query(By.directive(ForMenuSub)).injector.get(ForMenuSub);
    return { dropdown, context, menu, sub };
  }

  it('keeps the non-seed positioning defaults identical across the roots', () => {
    const { dropdown, context, menu, sub } = setup();

    for (const root of [dropdown, context, menu, sub]) {
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
    const { dropdown, context, menu, sub } = setup();

    expect(dropdown.side()).toBe(MENU_POSITIONING_DEFAULTS.side);
    expect(context.side()).toBe(MENU_POSITIONING_DEFAULTS.side);
    expect(menu.side()).toBe(MENU_POSITIONING_DEFAULTS.side);
    expect(sub.side()).toBe('right');
  });

  it('seeds the per-root offsets and collision fallback from the defaults providers (no silent drift)', () => {
    const { dropdown, context, menu, sub } = setup();

    expect(dropdown.sideOffset()).toBe(4);
    expect(dropdown.collisionPadding()).toBe(8);
    expect(dropdown.fallbackAxisSideDirection()).toBe(
      FOR_DROPDOWN_MENU_FALLBACK_DEFAULTS.fallbackAxisSideDirection,
    );

    expect(context.sideOffset()).toBe(0);
    expect(context.collisionPadding()).toBe(8);
    expect(context.fallbackAxisSideDirection()).toBe(
      FOR_CONTEXT_MENU_FALLBACK_DEFAULTS.fallbackAxisSideDirection,
    );

    expect(menu.sideOffset()).toBe(0);
    expect(menu.collisionPadding()).toBe(8);
    expect(menu.fallbackAxisSideDirection()).toBe(
      FOR_MENU_FALLBACK_DEFAULTS.fallbackAxisSideDirection,
    );

    expect(sub.sideOffset()).toBe(0);
    expect(sub.collisionPadding()).toBe(8);
    expect(sub.fallbackAxisSideDirection()).toBe(
      FOR_MENU_FALLBACK_DEFAULTS.fallbackAxisSideDirection,
    );
  });

  it('reaches the [forMenu] root and [forMenuSub] from provideForMenuDefaults', () => {
    const { dropdown, context, menu, sub } = setup(
      provideForMenuDefaults({ fallbackAxisSideDirection: 'end' }),
    );

    expect(menu.fallbackAxisSideDirection()).toBe('end');
    expect(sub.fallbackAxisSideDirection()).toBe('end');
    expect(dropdown.fallbackAxisSideDirection()).toBe('none');
    expect(context.fallbackAxisSideDirection()).toBe('none');
  });

  it('resolves the two top-level roots against their own defaults provider', () => {
    const { dropdown, context, menu, sub } = setup([
      ...provideForDropdownMenuDefaults({ fallbackAxisSideDirection: 'start' }),
      ...provideForContextMenuDefaults({ fallbackAxisSideDirection: 'end' }),
    ]);

    expect(dropdown.fallbackAxisSideDirection()).toBe('start');
    expect(context.fallbackAxisSideDirection()).toBe('end');
    expect(menu.fallbackAxisSideDirection()).toBe('none');
    expect(sub.fallbackAxisSideDirection()).toBe('none');
  });

  it('keeps a per-instance fallbackAxisSideDirection binding winning over the scope default', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ...provideForMenuDefaults({ fallbackAxisSideDirection: 'end' }),
      ],
    });
    const fixture = TestBed.createComponent(PinnedFallbackAxisHost);
    fixture.detectChanges();
    const [pinned, inherited] = fixture.debugElement
      .queryAll(By.directive(ForMenu))
      .map((node) => node.injector.get(ForMenu));
    const sub = fixture.debugElement.query(By.directive(ForMenuSub)).injector.get(ForMenuSub);

    expect(pinned!.fallbackAxisSideDirection()).toBe('none');
    expect(sub.fallbackAxisSideDirection()).toBe('none');
    expect(inherited!.fallbackAxisSideDirection()).toBe('end');
  });
});

/**
 * Companion guard for the menubar's multiplexed `ForMenuContext`. It derives
 * positioning from the active trigger, falling back to the shared
 * `MENU_POSITIONING_DEFAULTS` for the non-seed inputs — and to the
 * `provideForMenubarDefaults`-seeded `sideOffset` / `collisionPadding` /
 * `fallbackAxisSideDirection` — when no trigger is open. This pins those
 * fallbacks to the single sources so the bar can't drift away from the three
 * roots (the audit's original copy-paste failure mode).
 */
describe('menubar menu context positioning fallback drift guard', () => {
  function host(): MenubarMenuHost {
    return {
      value: signal(''),
      disabled: signal(false),
      dismissible: signal(true),
      dir: signal('ltr'),
      loop: signal(true),
      activeTrigger: signal(null),
      triggers: signal([]),
      lastTrigger: signal(null),
      lastTriggerHost: signal(null),
      closeOpen: () => {},
      switchToSibling: () => false,
    } as unknown as MenubarMenuHost;
  }

  function createContext(): MenubarMenuContext {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.runInInjectionContext(
      () => new MenubarMenuContext(host(), FOR_MENUBAR_FALLBACK_DEFAULTS),
    );
  }

  it('falls back to the shared non-seed defaults with no active trigger', () => {
    const ctx = createContext();

    expect(ctx.alignOffset()).toBe(MENU_POSITIONING_DEFAULTS.alignOffset);
    expect(ctx.avoidCollisions()).toBe(MENU_POSITIONING_DEFAULTS.avoidCollisions);
    expect(ctx.arrowPadding()).toBe(MENU_POSITIONING_DEFAULTS.arrowPadding);
    expect(ctx.sticky()).toBe(MENU_POSITIONING_DEFAULTS.sticky);
    expect(ctx.hideWhenDetached()).toBe(MENU_POSITIONING_DEFAULTS.hideWhenDetached);
    expect(ctx.clipUntilPositioned()).toBe(MENU_POSITIONING_DEFAULTS.clipUntilPositioned);
  });

  it('seeds the per-root offsets and collision fallback from the menubar defaults provider', () => {
    const ctx = createContext();

    expect(ctx.sideOffset()).toBe(FOR_MENUBAR_FALLBACK_DEFAULTS.sideOffset);
    expect(ctx.collisionPadding()).toBe(FOR_MENUBAR_FALLBACK_DEFAULTS.collisionPadding);
    expect(ctx.fallbackAxisSideDirection()).toBe(
      FOR_MENUBAR_FALLBACK_DEFAULTS.fallbackAxisSideDirection,
    );
  });

  it('falls back to a menubar scope override with no active trigger', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const ctx = TestBed.runInInjectionContext(
      () =>
        new MenubarMenuContext(host(), {
          ...FOR_MENUBAR_FALLBACK_DEFAULTS,
          fallbackAxisSideDirection: 'end',
        }),
    );

    expect(ctx.fallbackAxisSideDirection()).toBe('end');
  });

  it('multiplexes the active trigger fallbackAxisSideDirection', () => {
    const activeHost = {
      ...host(),
      activeTrigger: signal({ fallbackAxisSideDirection: signal('end') }),
    };
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const ctx = TestBed.runInInjectionContext(
      () =>
        new MenubarMenuContext(
          activeHost as unknown as MenubarMenuHost,
          FOR_MENUBAR_FALLBACK_DEFAULTS,
        ),
    );

    expect(ctx.fallbackAxisSideDirection()).toBe('end');
  });
});

/**
 * Companion guard for `[forMenubarTrigger]`, the real producer of the menubar's
 * positioning values (the multiplexed `MenubarMenuContext` only forwards them).
 * Pins its non-seed defaults to the shared `MENU_POSITIONING_DEFAULTS` source
 * and its `sideOffset` / `collisionPadding` seeds to
 * `provideForMenubarDefaults`, so the bar can't drift away from the three roots.
 */
describe('menubar trigger positioning inputs drift guard', () => {
  function setup(providers: Provider[] = []): ForMenubarTrigger {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...providers],
    });
    const fixture = TestBed.createComponent(MenubarTriggerPositioningHost);
    fixture.detectChanges();
    return fixture.debugElement
      .query(By.directive(ForMenubarTrigger))
      .injector.get(ForMenubarTrigger);
  }

  it('keeps the non-seed positioning defaults identical to the shared source', () => {
    const trigger = setup();

    expect(trigger.side()).toBe(MENU_POSITIONING_DEFAULTS.side);
    expect(trigger.align()).toBe(MENU_POSITIONING_DEFAULTS.align);
    expect(trigger.alignOffset()).toBe(MENU_POSITIONING_DEFAULTS.alignOffset);
    expect(trigger.avoidCollisions()).toBe(MENU_POSITIONING_DEFAULTS.avoidCollisions);
    expect(trigger.arrowPadding()).toBe(MENU_POSITIONING_DEFAULTS.arrowPadding);
    expect(trigger.sticky()).toBe(MENU_POSITIONING_DEFAULTS.sticky);
    expect(trigger.hideWhenDetached()).toBe(MENU_POSITIONING_DEFAULTS.hideWhenDetached);
    expect(trigger.clipUntilPositioned()).toBe(MENU_POSITIONING_DEFAULTS.clipUntilPositioned);
  });

  it('seeds sideOffset / collisionPadding / fallbackAxisSideDirection from the menubar defaults provider', () => {
    const trigger = setup();

    expect(trigger.sideOffset()).toBe(FOR_MENUBAR_FALLBACK_DEFAULTS.sideOffset);
    expect(trigger.collisionPadding()).toBe(FOR_MENUBAR_FALLBACK_DEFAULTS.collisionPadding);
    expect(trigger.fallbackAxisSideDirection()).toBe(
      FOR_MENUBAR_FALLBACK_DEFAULTS.fallbackAxisSideDirection,
    );
  });

  it('honors provideForMenubarDefaults tuning of the offsets and collision fallback', () => {
    const trigger = setup(
      provideForMenubarDefaults({
        sideOffset: 12,
        collisionPadding: 24,
        fallbackAxisSideDirection: 'end',
      }),
    );

    expect(trigger.sideOffset()).toBe(12);
    expect(trigger.collisionPadding()).toBe(24);
    expect(trigger.fallbackAxisSideDirection()).toBe('end');
  });
});
