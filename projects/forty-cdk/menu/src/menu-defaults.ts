import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant menus in the surrounding injector
 * scope. Configure with `provideForMenuDefaults` at the app root or in any
 * component's `providers`.
 *
 * They tune the pointer-driven submenu interaction — hovering a
 * `[forMenuSubTrigger]` opens its submenu after `subMenuOpenDelay`, and
 * leaving it (without travelling into the submenu through the pointer-grace
 * "safe triangle") closes it after `subMenuCloseDelay` — and the submenu's
 * floating-ui placement offsets (`sideOffset` / `collisionPadding`), so the
 * submenu reads them from a provider like `[forDropdownMenu]` /
 * `[forContextMenu]` do instead of hardcoding them. Click / Enter / Space /
 * ArrowRight semantics are unaffected by these values.
 */
export interface ForMenuDefaults {
  /**
   * Delay (ms) before a hovered `[forMenuSubTrigger]` opens its submenu.
   * A short intent delay avoids opening every submenu the pointer merely
   * passes over. Default `100`.
   */
  subMenuOpenDelay: number;
  /**
   * Delay (ms) before a submenu closes once the pointer has left both the
   * sub-trigger and the submenu content (and is not inside the pointer-grace
   * region). Default `100`.
   */
  subMenuCloseDelay: number;
  /**
   * Lifetime (ms) of the pointer-grace "safe triangle" armed when the pointer
   * leaves the sub-trigger toward the open submenu. While the pointer stays
   * inside the triangle the close is held off; the window caps how long that
   * hold lasts if the pointer lingers without reaching the content. Default
   * `300`.
   */
  subMenuPointerGraceDuration: number;
  /**
   * Distance (px) between the sub-trigger and the submenu content along the
   * resolved `side` axis. Default `0` — a
   * submenu sits flush against its parent item.
   */
  sideOffset: number;
  /**
   * Padding (px) added to the viewport edges for collision-aware positioning
   * of the submenu. Higher values keep the submenu further from the edge when
   * `flip` / `shift` runs. Default `8`.
   */
  collisionPadding: number;
}

/**
 * Library fallback for menu defaults, read at the root injector when no
 * consumer has called `provideForMenuDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_MENU_FALLBACK_DEFAULTS: ForMenuDefaults = {
  subMenuOpenDelay: 100,
  subMenuCloseDelay: 100,
  subMenuPointerGraceDuration: 300,
  sideOffset: 0,
  collisionPadding: 8,
};

const { token, provideDefaults } = createDefaults<ForMenuDefaults>(
  'FOR_MENU_DEFAULTS',
  FOR_MENU_FALLBACK_DEFAULTS,
);

/** Token holding the resolved menu defaults for the current scope. */
export const FOR_MENU_DEFAULTS = token;

/**
 * Configures forty-cdk menu defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForMenuDefaults(defaults: Partial<ForMenuDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
