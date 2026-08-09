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
import { ANCHORED_POSITIONING_DEFAULTS } from '../floating/anchored-positioning-inputs';

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
 * Guard for the one positioning input the menu family carries beyond the shared
 * anchored block: `fallbackAxisSideDirection`. It stays declared per root rather
 * than moving onto `AnchoredOverlayPositioningBase` because no other anchored
 * overlay exposes it — dropping to the perpendicular axis is a menu-specific
 * viewport-degradation lever, and its default lives on each menu primitive's own
 * `ForXDefaults` beside the four shared seeds.
 *
 * The ten shared inputs are guarded once for all thirteen roots in
 * [`floating/anchored-positioning-inputs.spec.ts`](../floating/anchored-positioning-inputs.spec.ts);
 * this suite deliberately does not restate them.
 */
describe('menu fallback-axis positioning input', () => {
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

  it('seeds the collision fallback from each root defaults provider (no silent drift)', () => {
    const { dropdown, context, menu, sub } = setup();

    expect(dropdown.fallbackAxisSideDirection()).toBe(
      FOR_DROPDOWN_MENU_FALLBACK_DEFAULTS.fallbackAxisSideDirection,
    );
    expect(context.fallbackAxisSideDirection()).toBe(
      FOR_CONTEXT_MENU_FALLBACK_DEFAULTS.fallbackAxisSideDirection,
    );
    expect(menu.fallbackAxisSideDirection()).toBe(
      FOR_MENU_FALLBACK_DEFAULTS.fallbackAxisSideDirection,
    );
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
 * `ANCHORED_POSITIONING_DEFAULTS` for the non-seed inputs — and to the
 * `provideForMenubarDefaults`-seeded `side` / `align` / `sideOffset` /
 * `collisionPadding` / `fallbackAxisSideDirection` — when no trigger is open.
 * This pins those fallbacks to the single sources so the bar can't drift away
 * from the roots (the audit's original copy-paste failure mode).
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

    expect(ctx.alignOffset()).toBe(ANCHORED_POSITIONING_DEFAULTS.alignOffset);
    expect(ctx.avoidCollisions()).toBe(ANCHORED_POSITIONING_DEFAULTS.avoidCollisions);
    expect(ctx.arrowPadding()).toBe(ANCHORED_POSITIONING_DEFAULTS.arrowPadding);
    expect(ctx.sticky()).toBe(ANCHORED_POSITIONING_DEFAULTS.sticky);
    expect(ctx.hideWhenDetached()).toBe(ANCHORED_POSITIONING_DEFAULTS.hideWhenDetached);
    expect(ctx.clipUntilPositioned()).toBe(ANCHORED_POSITIONING_DEFAULTS.clipUntilPositioned);
  });

  it('seeds the placement and collision fallback from the menubar defaults provider', () => {
    const ctx = createContext();

    expect(ctx.side()).toBe(FOR_MENUBAR_FALLBACK_DEFAULTS.side);
    expect(ctx.align()).toBe(FOR_MENUBAR_FALLBACK_DEFAULTS.align);
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
          side: 'top',
          fallbackAxisSideDirection: 'end',
        }),
    );

    expect(ctx.side()).toBe('top');
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
 * Its shared block now comes from `AnchoredOverlayPositioningBase` like every
 * other anchored root, so what stays here is the menubar-specific tuning
 * `provideForMenubarDefaults` owns.
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
