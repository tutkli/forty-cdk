---
title: Navigation Menu
group: primitives
archetype: [overlay]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
---

# NavigationMenu

A site-navigation header built on the disclosure pattern: buttons that expand panels of links into a shared viewport.

A `<nav>` of disclosures, **not** an ARIA `menu`. Triggers are buttons with `aria-expanded` / `aria-controls`, content panels are the plain regions of links those triggers disclose, Tab moves through links, Escape closes and returns focus.

## Anatomy

```html
<nav forNavigationMenu [(value)]="open" ariaLabel="Main">
  <ul forNavigationMenuList>
    <li forNavigationMenuItem value="products">
      <button forNavigationMenuTrigger>Products</button>
      <!-- @if (open() === 'products') { -->
      <div forNavigationMenuContent>
        <a href="/p/web" forNavigationMenuLink>Web</a>
        <a href="/p/mobile" forNavigationMenuLink active>Mobile</a>
      </div>
      <!-- } -->
    </li>

    <span forNavigationMenuIndicator></span>
  </ul>

  <!-- Optional shared surface for mega-menu animations -->
  <div forNavigationMenuViewport></div>
</nav>
```

## Examples

Open a section from the bar and move between them. The active trigger carries `data-state="open"`, and `data-motion` says which way the viewport slid to reach it.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuIndicator,
  ForNavigationMenuItem,
  ForNavigationMenuLink,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
  ForNavigationMenuViewport,
} from 'forty-cdk/navigation-menu';

@Component({
  selector: 'app-navigation-menu-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
    ForNavigationMenuIndicator,
    ForNavigationMenuViewport,
  ],
  template: `
    <div class="nav-demo">
      <nav forNavigationMenu [(value)]="open" ariaLabel="Main" class="navmenu">
        <ul forNavigationMenuList class="navmenu-list">
          <li forNavigationMenuItem value="products" class="navmenu-item">
            <button forNavigationMenuTrigger class="navmenu-trigger">
              Products
              <svg class="navmenu-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            @if (open() === 'products') {
              <div forNavigationMenuContent data-id="products" class="navmenu-panel">
                <p class="navmenu-panel-title">Build</p>
                <div class="navmenu-grid">
                  <a
                    forNavigationMenuLink
                    [active]="true"
                    href="#analytics"
                    (click)="$event.preventDefault()"
                    class="navmenu-link"
                  >
                    <strong>Analytics</strong>
                    <span>Dashboards and funnels</span>
                  </a>
                  <a
                    forNavigationMenuLink
                    href="#automation"
                    (click)="$event.preventDefault()"
                    class="navmenu-link"
                  >
                    <strong>Automation</strong>
                    <span>Workflows and triggers</span>
                  </a>
                  <a
                    forNavigationMenuLink
                    href="#reports"
                    (click)="$event.preventDefault()"
                    class="navmenu-link"
                  >
                    <strong>Reports</strong>
                    <span>Scheduled exports</span>
                  </a>
                  <a
                    forNavigationMenuLink
                    href="#integrations"
                    (click)="$event.preventDefault()"
                    class="navmenu-link"
                  >
                    <strong>Integrations</strong>
                    <span>Connect your stack</span>
                  </a>
                </div>
              </div>
            }
          </li>

          <li forNavigationMenuItem value="solutions" class="navmenu-item">
            <button forNavigationMenuTrigger class="navmenu-trigger">
              Solutions
              <svg class="navmenu-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            @if (open() === 'solutions') {
              <div forNavigationMenuContent data-id="solutions" class="navmenu-panel">
                <p class="navmenu-panel-title">By team</p>
                <ul class="navmenu-links">
                  <li>
                    <a
                      forNavigationMenuLink
                      href="#startups"
                      (click)="$event.preventDefault()"
                      class="navmenu-link"
                    >
                      Startups
                    </a>
                  </li>
                  <li>
                    <a
                      forNavigationMenuLink
                      href="#enterprise"
                      (click)="$event.preventDefault()"
                      class="navmenu-link"
                    >
                      Enterprise
                    </a>
                  </li>
                  <li>
                    <a
                      forNavigationMenuLink
                      href="#agencies"
                      (click)="$event.preventDefault()"
                      class="navmenu-link"
                    >
                      Agencies
                    </a>
                  </li>
                </ul>
              </div>
            }
          </li>

          <li forNavigationMenuItem value="company" class="navmenu-item">
            <button forNavigationMenuTrigger class="navmenu-trigger">
              Company
              <svg class="navmenu-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            @if (open() === 'company') {
              <div forNavigationMenuContent data-id="company" class="navmenu-panel">
                <p class="navmenu-panel-title">About us</p>
                <ul class="navmenu-links">
                  <li>
                    <a
                      forNavigationMenuLink
                      href="#about"
                      (click)="$event.preventDefault()"
                      class="navmenu-link"
                    >
                      About
                    </a>
                  </li>
                  <li>
                    <a
                      forNavigationMenuLink
                      href="#careers"
                      (click)="$event.preventDefault()"
                      class="navmenu-link"
                    >
                      Careers
                    </a>
                  </li>
                  <li>
                    <a
                      forNavigationMenuLink
                      href="#blog"
                      (click)="$event.preventDefault()"
                      class="navmenu-link"
                    >
                      Blog
                    </a>
                  </li>
                </ul>
              </div>
            }
          </li>

          <li class="navmenu-item">
            <a
              href="#pricing"
              (click)="$event.preventDefault()"
              class="navmenu-trigger navmenu-trigger--link"
            >
              Pricing
            </a>
          </li>

          <div forNavigationMenuIndicator class="navmenu-indicator" aria-hidden="true"></div>
        </ul>

        <div class="navmenu-viewport-wrap">
          <div forNavigationMenuViewport class="navmenu-viewport"></div>
        </div>
      </nav>
    </div>
  `,
})
export class NavigationMenuDefaultExample {
  protected readonly open = signal<string | null>(null);
}
```

### Vertical orientation

`orientation='vertical'` stacks the triggers into a sidebar and swaps the keyboard axis: `ArrowUp` / `ArrowDown` move focus across triggers, and the inline-end arrow opens the focused panel: `ArrowRight`, or `ArrowLeft` under `dir="rtl"`. Each panel flies out beside its trigger and the indicator becomes a vertical bar tracking the active row.

## Mega-menu

For Stripe / Vercel / Linear-style mega menus that share a single panel between trigger groups, drop a `[forNavigationMenuViewport]` inside the menu and let it host the active content. The Viewport is fully opt-in: with no Viewport in the markup the menu behaves exactly as the disclosure recipe above.

When present, each `[forNavigationMenuContent]` re-parents its host into the Viewport on mount. The Viewport exposes the active panel's natural size as CSS custom properties so consumers can transition `width` / `height` between groups, and each Content reflects `data-motion` so consumers can author directional slide / fade animations:

| Attribute / variable                     | Where            | Meaning                                                                                                                       |
| ---------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `data-state="open" \| "closed"`          | Viewport host    | `open` while any item is open (`value` is not `null`), `closed` otherwise.                                                    |
| `--for-navigation-menu-viewport-width`   | Viewport host    | Active content's natural width (px).                                                                                          |
| `--for-navigation-menu-viewport-height`  | Viewport host    | Active content's natural height (px).                                                                                         |
| `data-motion="from-start" \| "from-end"` | Entering Content | Side the panel slides in from: opposite the previous trigger, so `from-end` when the previous trigger sits on the start side. |
| `data-motion="to-start" \| "to-end"`     | Leaving Content  | Side the panel slides out to: opposite the new trigger, so `to-start` when the new trigger sits on the end side.              |

The Viewport's `data-state` follows `value`, not what the Viewport holds. A panel kept mounted by `animate.leave` is still inside it after it reads `closed`, and an open item whose content is not mounted leaves it `open` with nothing inside, so do not collapse the box on `[data-state='closed']` while a leave animation is running.

`from-start` / `to-start` map to the logical inline-start (left in LTR, right in RTL); writing the keyframes with logical CSS properties (e.g. `inset-inline-start`) makes the animation work in both directions automatically. `data-motion` is absent when a panel opens from a closed menu and when a panel closes, where there is no peer trigger to compare against.

```html
<nav forNavigationMenu [(value)]="open" aria-label="Main">
  <ul forNavigationMenuList>
    <li forNavigationMenuItem value="products">
      <button forNavigationMenuTrigger class="navigation-menu-trigger">Products</button>
      @if (open() === 'products') {
      <div forNavigationMenuContent class="navigation-menu-content">…</div>
      }
    </li>
    <li forNavigationMenuItem value="solutions">
      <button forNavigationMenuTrigger class="navigation-menu-trigger">Solutions</button>
      @if (open() === 'solutions') {
      <div forNavigationMenuContent class="navigation-menu-content">…</div>
      }
    </li>
  </ul>

  <!-- Single shared surface. Content panels re-parent into here on open. -->
  <div forNavigationMenuViewport class="navigation-menu-viewport"></div>
</nav>
```

```css
.navigation-menu-viewport {
  position: relative;
  width: var(--for-navigation-menu-viewport-width);
  height: var(--for-navigation-menu-viewport-height);
  transition:
    width 200ms,
    height 200ms;
}

.navigation-menu-content {
  position: absolute;
  inset-inline-start: 0;
  top: 0;
}
.navigation-menu-content[data-motion='from-start'] {
  animation: slide-in-from-start 200ms;
}
.navigation-menu-content[data-motion='from-end'] {
  animation: slide-in-from-end 200ms;
}
.navigation-menu-content[data-motion='to-start'] {
  animation: slide-out-to-start 200ms;
}
.navigation-menu-content[data-motion='to-end'] {
  animation: slide-out-to-end 200ms;
}
```

The leaving content stays mounted as long as the consumer's `@if` keeps it (typically via `animate.leave`), so two panels can briefly overlap inside the Viewport and cross-fade or slide past each other.

### Panel order is deterministic

The Viewport owns panel ordering: each Content is inserted in its **trigger's document order**, never simply appended in mount order. During an overlapping A→B transition, where the leaving A is still mounted while B enters, the Viewport's child order always matches trigger order, so the panel whose trigger comes first in the DOM is always the first child, regardless of which panel mounted last. Author cross-fade / slide stacking against that order (paired with the `data-motion` hook) rather than against mount timing.

Measurement always tracks the **active** panel. The Viewport's `--for-navigation-menu-viewport-width` / `--for-navigation-menu-viewport-height` reflect the entering panel as soon as it becomes active; a non-active panel kept mounted by `animate.leave` is intentionally no longer measured, so a leaving panel's size never drives the Viewport box mid-transition.

### The open panel keeps its trigger's place

Moving a panel into the Viewport changes where it sits in the document, and the Tab order and the screen-reader reading order both follow the document. While an item is open and the Viewport hosts its panel, the menu keeps both as if the panel still sat right after its trigger:

- Tab from the open trigger moves into the panel, and Tab from the panel's last link moves on to the next trigger. Shift+Tab walks the same path back. Tab from a later trigger skips the panel, since it belongs to an earlier one. Inside the panel, Tab reaches every link even in Safari, which skips links when tabbing by default.
- The `[forNavigationMenuItem]` reflects `aria-owns` pointing at the panel, so assistive technology reads the panel after the trigger rather than at the Viewport's place in the page.

The Tab order is resolved against the page's focusable elements in document order, so a positive `tabindex` elsewhere on the page is read at its document position rather than ahead of everything else.

### Rendering the Viewport outside the `<nav>`

The Viewport must be **declared** inside `[forNavigationMenu]` (DI resolves at the template's declaration site), but it may be **stamped** elsewhere: declare it in an `<ng-template>` inside the root and render that template into a page-level container via `ngTemplateOutlet` when the panel needs to escape the header's stacking or overflow context. Dismiss containment follows the panel rather than the nav subtree: focus or a pointerdown landing inside the Viewport or the active panel counts as inside the navigation, so Tab into an externally-hosted panel does not close it.

Dismissal is symmetric in both placements. Escape, outside pointerdown **and** the APG close-on-leave rule all work identically whether the Viewport sits inside or outside the `<nav>`: every leave is resolved against the same containment set (the nav host, the Viewport and the active panel) rather than against the nav subtree, so tabbing **out** of an externally-hosted panel closes the menu just as it does an internally-hosted one.

## Limitations

- Nested submenus are not implemented; they are tracked separately.

## Scoped defaults

`provideForNavigationMenuDefaults` configures navigation menu defaults for an injector subtree, either at the application root or in any component's `providers` array. Partial overrides inherit unspecified keys from the parent scope (or the library fallbacks at the root).

| Key                 | Library fallback | Meaning                                                                                                                               |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `openDelay`         | `200`            | Milliseconds before a hover opens an item, for menus that don't set `openDelay` themselves.                                           |
| `closeDelay`        | `150`            | Milliseconds before an item closes after the pointer leaves, for menus that don't set `closeDelay` themselves.                        |
| `skipDelayDuration` | `300`            | Milliseconds after a peer item closed during which the next open is instant, for menus that don't set `skipDelayDuration` themselves. |
| `loop`              | `true`           | Whether arrow navigation wraps past the first / last enabled trigger, for menus that don't set `loop` themselves.                     |

Per-instance inputs always win over the scope defaults.

```ts
import { type ApplicationConfig } from '@angular/core';
import { provideForNavigationMenuDefaults } from 'forty-cdk/defaults';

export const appConfig: ApplicationConfig = {
  providers: [provideForNavigationMenuDefaults({ openDelay: 100, closeDelay: 300 })],
};
```

## API

### `ForNavigationMenu`

| Property            | Type                                | Description                                                                                                                                                                                          |
| ------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`             | `model<string \| null>`             | Two-way bindable. Open item id, or `null` when nothing is open.<br>**Default:** `null`                                                                                                               |
| `orientation`       | `input<'horizontal' \| 'vertical'>` | **Default:** `'horizontal'`                                                                                                                                                                          |
| `dir`               | `input<'ltr' \| 'rtl' \| null>`     | RTL inverts ArrowLeft / ArrowRight: across the triggers when horizontal, and as the open key when vertical. `null` inherits the nearest `[dir]` / `<html dir>`, else `'ltr'`.<br>**Default:** `null` |
| `loop`              | `input<boolean>`                    | Whether arrow nav wraps.<br>**Default:** `true`                                                                                                                                                      |
| `disabled`          | `input<boolean>`                    | Disables the whole menu.<br>**Default:** `false`                                                                                                                                                     |
| `ariaLabel`         | `input<string \| null>`             | Reactive `aria-label` for the `<nav>`.<br>**Default:** `null` (and empty string) emits no attribute; prefer native `aria-labelledby` when a visible label exists                                     |
| `openDelay`         | `input<number>`                     | ms before a hover opens a panel. Focus never opens one.<br>**Default:** `200`                                                                                                                        |
| `closeDelay`        | `input<number>`                     | ms before pointer-leave closes.<br>**Default:** `150`                                                                                                                                                |
| `skipDelayDuration` | `input<number>`                     | ms after a peer closes during which the next open is instant.<br>**Default:** `300`                                                                                                                  |

### `ForNavigationMenuItem`

| Property   | Type             | Description                                                                                                                                                                                                   |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`    | `input<string>`  | Identifier matched against the menu's `value`, shared by the item's trigger and content. Required in practice though not by the template compiler: an item left unbound throws in dev mode.<br>**Default:** — |
| `disabled` | `input<boolean>` | Disables this item's trigger. The root's `disabled` disables it too.<br>**Default:** `false`                                                                                                                  |

### `ForNavigationMenuLink`

| Property      | Type                                                                  | Description                                                                                                        |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `active`      | `input<boolean>`                                                      | Marks the link as pointing at the current page: reflects `data-active` and `aria-current`.<br>**Default:** `false` |
| `ariaCurrent` | `input<'page' \| 'step' \| 'location' \| 'date' \| 'time' \| 'true'>` | Value written to `aria-current` while `active` is true.<br>**Default:** `'page'`                                   |

### Data attributes

| Piece                          | Attribute          | Values                                               |
| ------------------------------ | ------------------ | ---------------------------------------------------- |
| `[forNavigationMenu]`          | `data-state`       | `open` \| `closed`                                   |
| `[forNavigationMenu]`          | `data-orientation` | `horizontal` \| `vertical`                           |
| `[forNavigationMenu]`          | `data-disabled`    | present \| absent                                    |
| `[forNavigationMenuList]`      | `data-orientation` | `horizontal` \| `vertical`                           |
| `[forNavigationMenuItem]`      | `data-state`       | `open` \| `closed`                                   |
| `[forNavigationMenuItem]`      | `data-disabled`    | present \| absent                                    |
| `[forNavigationMenuTrigger]`   | `data-state`       | `open` \| `closed`                                   |
| `[forNavigationMenuTrigger]`   | `data-disabled`    | present \| absent                                    |
| `[forNavigationMenuContent]`   | `data-state`       | `open` \| `closed`                                   |
| `[forNavigationMenuContent]`   | `data-motion`      | `from-start` \| `from-end` \| `to-start` \| `to-end` |
| `[forNavigationMenuLink]`      | `data-active`      | present \| absent                                    |
| `[forNavigationMenuIndicator]` | `data-state`       | `visible` \| `hidden`                                |
| `[forNavigationMenuIndicator]` | `data-orientation` | `horizontal` \| `vertical`                           |
| `[forNavigationMenuViewport]`  | `data-state`       | `open` \| `closed`                                   |
| `[forNavigationMenuViewport]`  | `data-orientation` | `horizontal` \| `vertical`                           |

`data-motion` is absent when a panel opens from a closed menu and when a panel closes, where there is no peer trigger to compare against.

## Keyboard

| Key                                                                             | Behavior                                                                                                                                                          |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab                                                                             | Moves into the trigger row. From an open trigger, moves into its panel and through its links, then on to the next trigger, wherever a Viewport renders the panel. |
| Shift+Tab                                                                       | The same path in reverse: from the next trigger into the open panel's last link, and from its first link back to the trigger.                                     |
| Enter / Space                                                                   | Toggles the focused trigger.                                                                                                                                      |
| ArrowDown (horizontal) / ArrowRight (vertical, LTR) / ArrowLeft (vertical, RTL) | Opens the focused trigger.                                                                                                                                        |
| ArrowLeft / ArrowRight (horizontal)                                             | Moves focus across triggers.                                                                                                                                      |
| ArrowUp / ArrowDown (vertical)                                                  | Moves focus across triggers.                                                                                                                                      |
| Home / End                                                                      | Jump to first / last enabled trigger.                                                                                                                             |
| Escape                                                                          | Closes and returns focus to the trigger.                                                                                                                          |

## Accessibility

Implements the [WAI-ARIA Disclosure Navigation Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/).

- **Not an ARIA menu.** This implements the _disclosure_ pattern: `<nav>` + buttons + the panels they disclose. ARIA `role="menu"` is for application menus where Tab leaves but arrows do everything. Site navigation expects Tab to move through links, which is what this primitive supports.
- **Focus alone does not open.** A trigger opens on mouse hover, click, Enter / Space, or the cross-axis arrow (ArrowDown horizontal, ArrowRight vertical, ArrowLeft vertical under RTL), but never on plain focus. This matches the APG disclosure-navigation pattern: Tabbing across the trigger row does not auto-expand panels, and the return-focus after Escape cannot synchronously re-open the panel that just closed.
- **Escape belongs to whatever holds focus.** Escape closes the open panel only while focus is inside the navigation: a trigger, the Viewport or the active panel. Pressed anywhere else, for instance in a popover that kept focus while a panel hover-opened above it, the key goes to that overlay instead, so the popover closes and the panel stays. An Escape that cancels an IME composition in a field inside a panel closes nothing.
- **Hover is a mouse affordance.** The `pointerenter` / `pointerleave` open-and-close path on both the trigger and the panel is gated to `pointerType === 'mouse'`. Touch and pen fire those events around every tap, so honouring them would open a panel mid-press and let the follow-up tap toggle it straight back shut; on those devices a tap drives the panel through the native `click` instead.
- **Trigger labels are mandatory.** Each `[forNavigationMenuTrigger]` needs visible text or an `aria-label`. The directive does not invent one.
- **Disabled triggers stay focusable.** A trigger is disabled by its own item's `[disabled]` or by the root's (the two are OR'd), and the state is reflected on the trigger as `aria-disabled="true"` + `data-disabled`, never as the native `disabled` attribute. The trigger therefore keeps its place in the tab order and screen readers still announce it as unavailable, while clicks, hover-opens and keyboard activation are no-ops and arrow navigation skips it. A focused disabled trigger still answers the arrow keys and Home / End, so a keyboard user can move along the row from it. Key disabled styling off `[data-disabled]`, not `:disabled`. The `[forNavigationMenuItem]` host's own `data-disabled` reflects its per-item `[disabled]` only; the merged state lives on the trigger.
- **Panels carry no role and no accessible name.** As in the APG example, a panel is the region its trigger's `aria-expanded` / `aria-controls` discloses, not a landmark, and `[forNavigationMenuContent]` emits neither a `role` nor `aria-labelledby`. A `<div>` maps to the `generic` role, on which ARIA prohibits a name. To give a panel a landmark, put the directive on an element that has one and name it yourself, for instance `<section forNavigationMenuContent aria-labelledby="products-heading">`; the directive leaves both attributes alone.
- **Content panels are mounted via `@if`.** The directive does not apply `[hidden]`; visibility is the consumer's call. Use `animate.enter` / `animate.leave` for transitions.
- **`aria-controls` is emitted only while the panel is there to point at.** The trigger drops the attribute entirely, rather than emitting it empty, whenever the open item's `[forNavigationMenuContent]` is not mounted, so the reference never dangles. The pairing is resolved synchronously in the first render pass, which is what makes it present in server-rendered markup too: a screen reader reading the pre-hydration document gets the same `aria-controls` linkage a hydrated one does.
- **Indicator follows the active trigger.** A `ResizeObserver` (browser-only) watches the active trigger and the surrounding list and re-measures only when the active trigger switches or one of those boxes resizes. Measurement is reactive, not per-render polling. Consumers drive the visual via the `--for-navigation-menu-indicator-x|y|width|height` custom properties. The offsets are in the list's scrolled content coordinates, so the indicator stays under its trigger while an overflowing trigger row scrolls. When the menu closes, the properties keep the last geometry and only `data-state` turns `hidden`, so a transition on them fades the indicator out in place instead of sweeping it back to the start of the list.
- **`data-state` on the root.** The `[forNavigationMenu]` host reflects `data-state="open"` whenever any item is open and `"closed"` otherwise. The attribute uses the same vocabulary as the trigger / content / item / indicator pieces and is useful for top-level CSS hooks (e.g. dimming the rest of the page while the menu is open).
- **Tab-out closes.** Per APG, moving focus out of the navigation closes any open panel. There is one containment rule behind it: focus counts as inside while it is on the nav host, the Viewport or the active panel, or while it is inside any overlay stacked on top of them, so a popover or hovercard opened from a panel never dismisses the panel it is anchored to. Moving between those never dismisses. It holds wherever the Viewport is stamped: a panel re-parented outside the `<nav>` is still part of the surface. It also holds for a leave that reports no destination at all (`focusout` with a `null` `relatedTarget`: focus leaving the document, or landing on a non-focusable area), which is resolved against `document.activeElement` once the focus move has settled. Pressing a non-focusable region _inside_ the panel drops focus to `<body>` without leaving the widget, so it does not dismiss. When a dismissible overlay of your own is open on top of the navigation (a dialog opened from a mega-menu link), that overlay owns the focus leave and the navigation stays open behind it until its own turn comes.

## Styling

forty-cdk ships no styles: put your own class on each piece and key your CSS off the `data-*` attributes listed under [Data attributes](#data-attributes), not off the `for*` selectors ([Styling forty-cdk](../../../docs/styling.md) explains why).

### CSS custom properties

`[forNavigationMenuIndicator]` exposes the active trigger's geometry (relative to the padding box of `[forNavigationMenuList]`, scroll included) so the indicator visual can be driven entirely from CSS. The optional shared `[forNavigationMenuViewport]` exposes the active panel's natural size so consumers can transition `width` / `height` between trigger groups.

| Property                                 | Meaning                                                |
| ---------------------------------------- | ------------------------------------------------------ |
| `--for-navigation-menu-indicator-x`      | Horizontal offset of the active trigger (px).          |
| `--for-navigation-menu-indicator-y`      | Vertical offset of the active trigger (px).            |
| `--for-navigation-menu-indicator-width`  | Active trigger width (px).                             |
| `--for-navigation-menu-indicator-height` | Active trigger height (px).                            |
| `--for-navigation-menu-viewport-width`   | Active content's natural width (px), on the Viewport.  |
| `--for-navigation-menu-viewport-height`  | Active content's natural height (px), on the Viewport. |

```css
.navigation-menu-trigger svg {
  transition: transform 150ms;
}
.navigation-menu-trigger[data-state='open'] svg {
  transform: rotate(180deg);
}

.navmenu-indicator {
  transform: translateX(var(--for-navigation-menu-indicator-x));
  width: var(--for-navigation-menu-indicator-width);
  transition:
    transform 200ms,
    width 200ms;
}
.navmenu-indicator[data-state='hidden'] {
  opacity: 0;
}
```

## Wrapping in a design system

Subclass the root and re-provide `FOR_NAVIGATION_MENU_CONTEXT` with `useExisting` pointing at the subclass, since Angular does not inherit a directive's `providers`; [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md) walks the pattern.
