# NavigationMenu

Headless implementation of the [WAI-ARIA Disclosure Navigation Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) — a `<nav>` of disclosures, **not** an ARIA `menu`.

Triggers are buttons with `aria-expanded` / `aria-controls`, content panels are landmarks with links, Tab moves through links, Escape closes and returns focus.

## Pieces

| Class                        | Selector                       | Role                                                                  |
| ---------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `ForNavigationMenu`          | `[forNavigationMenu]`          | Root. Owns open state, delays, dismiss layer.                         |
| `ForNavigationMenuList`      | `[forNavigationMenuList]`      | Optional layout wrapper.                                              |
| `ForNavigationMenuItem`      | `[forNavigationMenuItem]`      | Pairs one trigger with one content panel.                             |
| `ForNavigationMenuTrigger`   | `[forNavigationMenuTrigger]`   | Button that toggles its panel.                                        |
| `ForNavigationMenuContent`   | `[forNavigationMenuContent]`   | Panel mounted via `@if`. Carries `aria-labelledby`.                   |
| `ForNavigationMenuLink`      | `[forNavigationMenuLink]`      | Decorative wrapper that reflects `aria-current` on active links.      |
| `ForNavigationMenuIndicator` | `[forNavigationMenuIndicator]` | Optional follower (underline / pill) positioned via CSS custom props. |
| `ForNavigationMenuViewport`  | `[forNavigationMenuViewport]`  | Optional shared surface for mega-menu animations (Radix Viewport).    |

## Inputs (root)

| API                 | Type                                | Description                                                                                                                                               |
| ------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`             | `model<string>`                     | Two-way bindable. Open item id, or `''`.                                                                                                                  |
| `orientation`       | `input<'horizontal' \| 'vertical'>` | Default `'horizontal'`.                                                                                                                                   |
| `dir`               | `input<WritingDirection>`           | RTL inverts ArrowLeft / ArrowRight.                                                                                                                       |
| `loop`              | `input<boolean>`                    | Whether arrow nav wraps. Default `true`.                                                                                                                  |
| `disabled`          | `input<boolean>`                    | Disables the whole menu.                                                                                                                                  |
| `ariaLabel`         | `input<string \| null>`             | Reactive `aria-label` for the `<nav>`. Default `null` (and empty string) emits no attribute; prefer native `aria-labelledby` when a visible label exists. |
| `delayDuration`     | `input<number>`                     | ms before hover/focus opens. Default `200`.                                                                                                               |
| `closeDelay`        | `input<number>`                     | ms before pointer-leave closes. Default `150`.                                                                                                            |
| `skipDelayDuration` | `input<number>`                     | ms after a peer closes during which the next open is instant. Default `300`.                                                                              |

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  ForNavigationMenu,
  ForNavigationMenuList,
  ForNavigationMenuItem,
  ForNavigationMenuTrigger,
  ForNavigationMenuContent,
  ForNavigationMenuLink,
  ForNavigationMenuIndicator,
} from 'forty-cdk';

@Component({
  selector: 'demo-nav',
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
    ForNavigationMenuIndicator,
  ],
  template: `
    <nav forNavigationMenu aria-label="Main" [(value)]="open">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button forNavigationMenuTrigger class="navigation-menu-trigger">Products</button>
          @if (open() === 'products') {
            <div
              forNavigationMenuContent
              class="navigation-menu-content"
              animate.enter="fade-in"
              animate.leave="fade-out"
            >
              <a href="/p/web" forNavigationMenuLink>Web</a>
              <a href="/p/mobile" forNavigationMenuLink active>Mobile</a>
            </div>
          }
        </li>
        <li forNavigationMenuItem value="company">
          <button forNavigationMenuTrigger class="navigation-menu-trigger">Company</button>
          @if (open() === 'company') {
            <div forNavigationMenuContent class="navigation-menu-content">
              <a href="/about" forNavigationMenuLink>About</a>
              <a href="/jobs" forNavigationMenuLink>Careers</a>
            </div>
          }
        </li>
        <span forNavigationMenuIndicator class="navigation-menu-indicator"></span>
      </ul>
    </nav>
  `,
})
export class DemoNav {
  readonly open = signal('');
}
```

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

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

`data-motion` is absent on first open and last close, where there is no peer trigger to compare against.

### CSS custom properties

`[forNavigationMenuIndicator]` exposes the active trigger's geometry (relative to `[forNavigationMenuList]`) so the indicator visual can be driven entirely from CSS. The optional shared `[forNavigationMenuViewport]` exposes the active panel's natural size so consumers can transition `width` / `height` between trigger groups.

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

.navigation-menu-indicator {
  transform: translateX(var(--for-navigation-menu-indicator-x));
  width: var(--for-navigation-menu-indicator-width);
  transition:
    transform 200ms,
    width 200ms;
}
.navigation-menu-indicator[data-state='hidden'] {
  opacity: 0;
}
```

## Keyboard

| Key                                            | Behavior                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| Tab                                            | Moves into the trigger row. Inside an open panel, moves through its links. |
| Enter / Space                                  | Toggles the focused trigger.                                               |
| ArrowDown (horizontal) / ArrowRight (vertical) | Opens the focused trigger.                                                 |
| ArrowLeft / ArrowRight (horizontal)            | Moves focus across triggers.                                               |
| ArrowUp / ArrowDown (vertical)                 | Moves focus across triggers.                                               |
| Home / End                                     | Jump to first / last enabled trigger.                                      |
| Escape                                         | Closes and returns focus to the trigger.                                   |

## Accessibility notes

- **Not an ARIA menu.** This implements the _disclosure_ pattern: `<nav>` + buttons + landmark panels. ARIA `role="menu"` is for application menus where Tab leaves but arrows do everything. Site navigation expects Tab to move through links, which is what this primitive supports.
- **Focus alone does not open.** A trigger opens on hover, click, Enter / Space, or the cross-axis arrow (ArrowDown horizontal / ArrowRight vertical) — never on plain focus. This matches the APG disclosure-navigation pattern: Tabbing across the trigger row does not auto-expand panels, and the return-focus after Escape cannot synchronously re-open the panel that just closed.
- **Trigger labels are mandatory.** Each `[forNavigationMenuTrigger]` needs visible text or an `aria-label`. The directive does not invent one.
- **Content panels are mounted via `@if`.** The directive does not apply `[hidden]`; visibility is the consumer's call. Use `animate.enter` / `animate.leave` for transitions.
- **Indicator follows the active trigger.** A `ResizeObserver` (browser-only) watches the active trigger and the surrounding list and re-measures only when the active trigger switches or one of those boxes resizes — reactive, not per-render polling. Consumers drive the visual via the `--for-navigation-menu-indicator-x|y|width|height` custom properties.
- **`data-state` on the root.** The `[forNavigationMenu]` host reflects `data-state="open"` whenever any item is open and `"closed"` otherwise — same vocabulary as the trigger / content / item / indicator pieces, useful for top-level CSS hooks (e.g. dimming the rest of the page while the menu is open).
- **Tab-out closes.** Per APG, moving focus past the last / before the first focusable inside the nav closes any open panel. The root listens for `focusout` and closes when `relatedTarget` falls outside the `<nav>`. Escape and outside pointerdown are already handled by the dismissable layer; this covers the keyboard-Tab case it can't see.

## Mega-menu (shared `Viewport`)

For Stripe / Vercel / Linear-style mega menus that share a single panel between trigger groups, drop a `[forNavigationMenuViewport]` inside the menu and let it host the active content. The Viewport is fully opt-in: with no Viewport in the markup the menu behaves exactly as the disclosure recipe above.

When present, each `[forNavigationMenuContent]` re-parents its host into the Viewport on mount. The Viewport exposes the active panel's natural size as CSS custom properties so consumers can transition `width` / `height` between groups, and each Content reflects `data-motion` so consumers can author directional slide / fade animations:

| Attribute / variable                     | Where            | Meaning                                                   |
| ---------------------------------------- | ---------------- | --------------------------------------------------------- |
| `data-state="open" \| "closed"`          | Viewport host    | Whether any content is currently mounted in the Viewport. |
| `--for-navigation-menu-viewport-width`   | Viewport host    | Active content's natural width (px).                      |
| `--for-navigation-menu-viewport-height`  | Viewport host    | Active content's natural height (px).                     |
| `data-motion="from-start" \| "from-end"` | Entering Content | Side the previous trigger sat on, relative to this one.   |
| `data-motion="to-start" \| "to-end"`     | Leaving Content  | Side the new trigger sits on, relative to this one.       |

`from-start` / `to-start` map to the logical inline-start (left in LTR, right in RTL); writing the keyframes with logical CSS properties (e.g. `inset-inline-start`) makes the animation work in both directions automatically. `data-motion` is absent on first open and last close, where there is no peer trigger to compare against.

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

The Viewport owns panel ordering: each Content is inserted in its **trigger's document order**, never simply appended in mount order. During an overlapping A→B transition — where the leaving A is still mounted while B enters — the Viewport's child order always matches trigger order, so the panel whose trigger comes first in the DOM is always the first child, regardless of which panel mounted last. Author cross-fade / slide stacking against that order (paired with the `data-motion` hook) rather than against mount timing.

Measurement always tracks the **active** panel. The Viewport's `--for-navigation-menu-viewport-width` / `--for-navigation-menu-viewport-height` reflect the entering panel as soon as it becomes active; a non-active panel kept mounted by `animate.leave` is intentionally no longer measured, so a leaving panel's size never drives the Viewport box mid-transition.

## Limitations (v1)

- Submenús anidados (Radix `Sub`) — not implemented; tracked separately.
