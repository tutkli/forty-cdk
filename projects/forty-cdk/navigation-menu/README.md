---
title: Navigation Menu
group: primitives
archetype: [overlay]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
---

# NavigationMenu

A site-navigation header built on the disclosure pattern: buttons that expand panels of links into a shared viewport.

A `<nav>` of disclosures, **not** an ARIA `menu`. Triggers are buttons with `aria-expanded` / `aria-controls`, content panels are landmarks with links, Tab moves through links, Escape closes and returns focus.

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

```ts
import { Component, signal } from '@angular/core';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuIndicator,
  ForNavigationMenuItem,
  ForNavigationMenuLink,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
} from 'forty-cdk/navigation-menu';

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
  readonly open = signal<string | null>(null);
}
```

## Mega-menu

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

### Rendering the Viewport outside the `<nav>`

The Viewport must be **declared** inside `[forNavigationMenu]` (DI resolves at the template's declaration site), but it may be **stamped** elsewhere — declare it in an `<ng-template>` inside the root and render that template into a page-level container via `ngTemplateOutlet` when the panel needs to escape the header's stacking or overflow context. Dismiss containment follows the panel rather than the nav subtree: focus or a pointerdown landing inside the Viewport or the active panel counts as inside the navigation, so Tab into an externally-hosted panel does not close it.

Dismissal is symmetric in both placements. Escape, outside pointerdown **and** the APG close-on-leave rule all work identically whether the Viewport sits inside or outside the `<nav>`: every leave is resolved against the same containment set — the nav host, the Viewport and the active panel — rather than against the nav subtree, so tabbing **out** of an externally-hosted panel closes the menu just as it does an internally-hosted one.

## Limitations

- Submenús anidados — not implemented; tracked separately.

## API

### `ForNavigationMenu`

| Property            | Type                                | Description                                                                                                                                                      |
| ------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`             | `model<string \| null>`             | Two-way bindable. Open item id, or `null` when nothing is open.<br>**Default:** `null`                                                                           |
| `orientation`       | `input<'horizontal' \| 'vertical'>` | **Default:** `'horizontal'`                                                                                                                                      |
| `dir`               | `input<WritingDirection>`           | RTL inverts ArrowLeft / ArrowRight.<br>**Default:** —                                                                                                            |
| `loop`              | `input<boolean>`                    | Whether arrow nav wraps.<br>**Default:** `true`                                                                                                                  |
| `disabled`          | `input<boolean>`                    | Disables the whole menu.<br>**Default:** —                                                                                                                       |
| `ariaLabel`         | `input<string \| null>`             | Reactive `aria-label` for the `<nav>`.<br>**Default:** `null` (and empty string) emits no attribute; prefer native `aria-labelledby` when a visible label exists |
| `openDelay`         | `input<number>`                     | ms before hover/focus opens.<br>**Default:** `200`                                                                                                               |
| `closeDelay`        | `input<number>`                     | ms before pointer-leave closes.<br>**Default:** `150`                                                                                                            |
| `skipDelayDuration` | `input<number>`                     | ms after a peer closes during which the next open is instant.<br>**Default:** `300`                                                                              |

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

## Accessibility

Implements the [WAI-ARIA Disclosure Navigation Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/).

- **Not an ARIA menu.** This implements the _disclosure_ pattern: `<nav>` + buttons + landmark panels. ARIA `role="menu"` is for application menus where Tab leaves but arrows do everything. Site navigation expects Tab to move through links, which is what this primitive supports.
- **Focus alone does not open.** A trigger opens on mouse hover, click, Enter / Space, or the cross-axis arrow (ArrowDown horizontal / ArrowRight vertical) — never on plain focus. This matches the APG disclosure-navigation pattern: Tabbing across the trigger row does not auto-expand panels, and the return-focus after Escape cannot synchronously re-open the panel that just closed.
- **Hover is a mouse affordance.** The `pointerenter` / `pointerleave` open-and-close path on both the trigger and the panel is gated to `pointerType === 'mouse'`. Touch and pen fire those events around every tap, so honouring them would open a panel mid-press and let the follow-up tap toggle it straight back shut; on those devices a tap drives the panel through the native `click` instead.
- **Trigger labels are mandatory.** Each `[forNavigationMenuTrigger]` needs visible text or an `aria-label`. The directive does not invent one.
- **Disabled triggers stay focusable.** A trigger is disabled by its own item's `[disabled]` or by the root's — the two are OR'd — and the state is reflected on the trigger as `aria-disabled="true"` + `data-disabled`, never as the native `disabled` attribute. The trigger therefore keeps its place in the tab order and screen readers still announce it as unavailable, while clicks, hover-opens and keyboard activation are no-ops and arrow navigation skips it. Key disabled styling off `[data-disabled]`, not `:disabled`. The `[forNavigationMenuItem]` host's own `data-disabled` reflects its per-item `[disabled]` only; the merged state lives on the trigger.
- **Content panels are mounted via `@if`.** The directive does not apply `[hidden]`; visibility is the consumer's call. Use `animate.enter` / `animate.leave` for transitions.
- **`aria-controls` is emitted only while the panel is there to point at.** The trigger drops the attribute entirely — rather than emitting it empty — whenever the open item's `[forNavigationMenuContent]` is not mounted, so the reference never dangles. The pairing is resolved synchronously in the first render pass, which is what makes it present in server-rendered markup too: a screen reader reading the pre-hydration document gets the same `aria-controls` / `aria-labelledby` linkage a hydrated one does.
- **Indicator follows the active trigger.** A `ResizeObserver` (browser-only) watches the active trigger and the surrounding list and re-measures only when the active trigger switches or one of those boxes resizes — reactive, not per-render polling. Consumers drive the visual via the `--for-navigation-menu-indicator-x|y|width|height` custom properties.
- **`data-state` on the root.** The `[forNavigationMenu]` host reflects `data-state="open"` whenever any item is open and `"closed"` otherwise — same vocabulary as the trigger / content / item / indicator pieces, useful for top-level CSS hooks (e.g. dimming the rest of the page while the menu is open).
- **Tab-out closes.** Per APG, moving focus out of the navigation closes any open panel. There is one containment rule behind it: focus counts as inside while it is on the nav host, the Viewport, the active panel — or inside any overlay stacked on top of them, so a popover or hovercard opened from a panel never dismisses the panel it is anchored to. Moving between those never dismisses. It holds wherever the Viewport is stamped — a panel re-parented outside the `<nav>` is still part of the surface — and it holds for a leave that reports no destination at all (`focusout` with a `null` `relatedTarget`: focus leaving the document, or landing on a non-focusable area), which is resolved against `document.activeElement` once the focus move has settled. Pressing a non-focusable region _inside_ the panel drops focus to `<body>` without leaving the widget, so it does not dismiss. When a dismissible overlay of your own is open on top of the navigation (a dialog opened from a mega-menu link), that overlay owns the focus leave and the navigation stays open behind it until its own turn comes.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed under [Data attributes](#data-attributes).

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

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_NAVIGATION_MENU_CONTEXT` with `useExisting` pointing at itself, because Angular does not inherit a directive's `providers` and every projected piece resolves its context through that token. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
