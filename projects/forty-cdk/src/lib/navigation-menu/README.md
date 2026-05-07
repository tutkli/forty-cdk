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

| API                 | Type                                | Description                                                                  |
| ------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| `value`             | `model<string>`                     | Two-way bindable. Open item id, or `''`.                                     |
| `orientation`       | `input<'horizontal' \| 'vertical'>` | Default `'horizontal'`.                                                      |
| `dir`               | `input<WritingDirection>`           | RTL inverts ArrowLeft / ArrowRight.                                          |
| `loop`              | `input<boolean>`                    | Whether arrow nav wraps. Default `true`.                                     |
| `disabled`          | `input<boolean>`                    | Disables the whole menu.                                                     |
| `ariaLabel`         | `input<string>`                     | Optional `aria-label` for the `<nav>`.                                       |
| `delayDuration`     | `input<number>`                     | ms before hover/focus opens. Default `200`.                                  |
| `closeDelay`        | `input<number>`                     | ms before pointer-leave closes. Default `150`.                               |
| `skipDelayDuration` | `input<number>`                     | ms after a peer closes during which the next open is instant. Default `300`. |

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
          <button forNavigationMenuTrigger>Products</button>
          @if (open() === 'products') {
            <div forNavigationMenuContent animate.enter="fade-in" animate.leave="fade-out">
              <a href="/p/web" forNavigationMenuLink>Web</a>
              <a href="/p/mobile" forNavigationMenuLink active>Mobile</a>
            </div>
          }
        </li>
        <li forNavigationMenuItem value="company">
          <button forNavigationMenuTrigger>Company</button>
          @if (open() === 'company') {
            <div forNavigationMenuContent>
              <a href="/about" forNavigationMenuLink>About</a>
              <a href="/jobs" forNavigationMenuLink>Careers</a>
            </div>
          }
        </li>
        <span forNavigationMenuIndicator></span>
      </ul>
    </nav>
  `,
})
export class DemoNav {
  readonly open = signal('');
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
- **Trigger labels are mandatory.** Each `[forNavigationMenuTrigger]` needs visible text or an `aria-label`. The directive does not invent one.
- **Content panels are mounted via `@if`.** The directive does not apply `[hidden]`; visibility is the consumer's call. Use `animate.enter` / `animate.leave` for transitions.
- **Indicator follows the active trigger.** Subscribed to `afterEveryRender`, so it tracks layout changes without polling. Consumers drive the visual via the `--for-navigation-menu-indicator-x|y|width|height` custom properties.
- **`data-state` on the root.** The `[forNavigationMenu]` host reflects `data-state="open"` whenever any item is open and `"closed"` otherwise — same vocabulary as the trigger / content / item / indicator pieces, useful for top-level CSS hooks (e.g. dimming the rest of the page while the menu is open).
- **Tab-out closes.** Per APG, moving focus past the last / before the first focusable inside the nav closes any open panel. The root listens for `focusout` and closes when `relatedTarget` falls outside the `<nav>`. Escape and outside pointerdown are already handled by the dismissable layer; this covers the keyboard-Tab case it can't see.

## Mega-menu (shared `Viewport`)

For Stripe / Vercel / Linear-style mega menus that share a single panel between trigger groups, drop a `[forNavigationMenuViewport]` inside the menu and let it host the active content. The Viewport is fully opt-in: with no Viewport in the markup the menu behaves exactly as the disclosure recipe above.

When present, each `[forNavigationMenuContent]` re-parents its host into the Viewport on mount. The Viewport exposes the active panel's natural size as CSS custom properties so consumers can transition `width` / `height` between groups, and each Content reflects `data-motion` so consumers can author directional slide / fade animations:

| Attribute / variable                     | Where            | Meaning                                                   |
| ---------------------------------------- | ---------------- | --------------------------------------------------------- |
| `data-state="visible" \| "hidden"`       | Viewport host    | Whether any content is currently mounted in the Viewport. |
| `--for-navigation-menu-viewport-width`   | Viewport host    | Active content's natural width (px).                      |
| `--for-navigation-menu-viewport-height`  | Viewport host    | Active content's natural height (px).                     |
| `data-motion="from-start" \| "from-end"` | Entering Content | Side the previous trigger sat on, relative to this one.   |
| `data-motion="to-start" \| "to-end"`     | Leaving Content  | Side the new trigger sits on, relative to this one.       |

`from-start` / `to-start` map to the logical inline-start (left in LTR, right in RTL); writing the keyframes with logical CSS properties (e.g. `inset-inline-start`) makes the animation work in both directions automatically. `data-motion` is absent on first open and last close, where there is no peer trigger to compare against.

```html
<nav forNavigationMenu [(value)]="open" aria-label="Main">
  <ul forNavigationMenuList>
    <li forNavigationMenuItem value="products">
      <button forNavigationMenuTrigger>Products</button>
      @if (open() === 'products') {
      <div forNavigationMenuContent>…</div>
      }
    </li>
    <li forNavigationMenuItem value="solutions">
      <button forNavigationMenuTrigger>Solutions</button>
      @if (open() === 'solutions') {
      <div forNavigationMenuContent>…</div>
      }
    </li>
  </ul>

  <!-- Single shared surface. Content panels re-parent into here on open. -->
  <div forNavigationMenuViewport></div>
</nav>
```

```css
[forNavigationMenuViewport] {
  position: relative;
  width: var(--for-navigation-menu-viewport-width);
  height: var(--for-navigation-menu-viewport-height);
  transition:
    width 200ms,
    height 200ms;
}

[forNavigationMenuContent] {
  position: absolute;
  inset-inline-start: 0;
  top: 0;
}
[forNavigationMenuContent][data-motion='from-start'] {
  animation: slide-in-from-start 200ms;
}
[forNavigationMenuContent][data-motion='from-end'] {
  animation: slide-in-from-end 200ms;
}
[forNavigationMenuContent][data-motion='to-start'] {
  animation: slide-out-to-start 200ms;
}
[forNavigationMenuContent][data-motion='to-end'] {
  animation: slide-out-to-end 200ms;
}
```

The leaving content stays mounted as long as the consumer's `@if` keeps it (typically via `animate.leave`), so two panels can briefly overlap inside the Viewport and cross-fade or slide past each other.

## Limitations (v1)

- Submenús anidados (Radix `Sub`) — not implemented; tracked separately.
