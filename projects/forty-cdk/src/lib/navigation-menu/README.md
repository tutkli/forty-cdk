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

## Limitations (v1)

- Submenús anidados (Radix `Sub`) — not implemented.
- Shared `Viewport` (mega-menu shared content area) — not implemented; each item's content lives under its own trigger.

Both are tracked for a future iteration.
