# Styling floating content

Applies to every primitive that portals positioned content to `document.body`:
**Popover**, **Tooltip**, **HoverCard**, **DropdownMenu**, **ContextMenu**, and nested **Menu sub-menus**.

---

## Rule 1 — use `animate.enter` only, never `animate.leave`

The positioner (floating-ui) writes an inline `transform: translate(…)` directly on the content element to place it on screen. The moment `open` flips to `false` the library clears that inline transform so the DOM can be unmounted cleanly. An `animate.leave` animation therefore runs against an element whose `transform` has already been zeroed, which sends the content flying to the viewport corner (0, 0) before it fades out.

**Use `animate.enter` for enter animations only.** Let the `@if` control instant unmounting on close, with no `animate.leave` on the positioned content.

```html
@if (open()) {
<div forPopoverContent class="my-popover" animate.enter="pop-in">…</div>
}
```

If you want a visual exit transition, wrap the content in a non-positioned host element and apply `animate.leave` there, or handle the exit entirely in CSS via `data-state="closed"` combined with the `@starting-style` CSS rule (native CSS transitions entry) without relying on `animate.leave`.

---

## Rule 2 — animate with standalone `scale` / `opacity`, never `transform`

floating-ui owns the `transform` property on the content element — it writes `transform: translate(x, y)` (or sometimes `translate` + `rotate` when a `shift`/`flip` is active). If your keyframe uses `transform: scale(…)` it clobbers that placement entirely and the content snaps to `(0, 0)`.

Use the **standalone CSS properties** `scale` and `opacity` instead — they compose on top of floating-ui's `transform` and never interfere with positioning:

```css
@keyframes pop-in {
  from {
    opacity: 0;
    scale: 0.95;
  }
}

.my-popover {
  transform-origin: var(--for-content-transform-origin, center);
  animation: pop-in 0.15s ease-out both;
}
```

The `--for-content-transform-origin` custom property (see [CSS custom properties](#css-custom-properties)) is set by the library to the corner or edge closest to the trigger, so the content appears to grow out of the anchor rather than from its own center.

---

## Rule 3 — do not set `position`, `top`, `left`, or `z-index` on the content

The positioner owns those properties completely.

- `position: fixed` / `position: absolute` — set by the library; overriding them breaks placement.
- `top` / `left` (or `inset-*` equivalents) — written by floating-ui; overriding them repositions or hides the content.
- `z-index` — the library deliberately sets **no** default `z-index`. Set it yourself on the content element to control stacking order within your own project's z-axis, but do not use a value that interferes with the `transform`-based placement.

Add all layout properties (`width`, `max-width`, `padding`, `background`, `border-radius`, `box-shadow`, etc.) freely — only the three positioning props above are reserved.

---

## Rule 4 — `--for-arrow-offset` is inverted (library writes the opposite side)

`[forPopoverArrow]`, `[forTooltipArrow]`, and `[forHoverCardArrow]` are placed by floating-ui's `arrow` middleware. The library then applies `var(--for-arrow-offset, 0px)` to the **side opposite the popover** — the side that faces the trigger — so a negative value pushes the arrow tip out past the content edge.

The property name is "offset from the content edge toward the trigger", not "offset from the trigger toward the content". A negative value makes the arrow protrude; `0px` (the default) keeps it flush.

Typical usage: `-4px` to `-6px` so the arrow visually straddles the content border.

---

## CSS custom properties

All floating content directives set these properties on the **content host element** while `open` is `true`. They are cleared on close.

| Custom property                  | Direction | Meaning                                                                                           |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `--for-anchor-width`             | out       | Width (px) of the trigger / anchor element.                                                       |
| `--for-anchor-height`            | out       | Height (px) of the trigger / anchor element.                                                      |
| `--for-available-width`          | out       | Available horizontal space (px) — use with `max-width: var(--for-available-width)`.               |
| `--for-available-height`         | out       | Available vertical space (px) — use with `max-height: var(--for-available-height)`.               |
| `--for-content-transform-origin` | out       | `transform-origin` value matching the resolved side / align — pivot `scale` animations from here. |

Arrow elements additionally consume:

| Custom property      | Direction | Meaning                                                                                                                   |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--for-arrow-offset` | in        | Consumer-set. How far the arrow protrudes past the content edge. Negative values push out, `0px` is flush. Default `0px`. |

---

## Copy-paste snippets

### Enter animation

```css
@keyframes for-pop-in {
  from {
    opacity: 0;
    scale: 0.92;
  }
}

.my-floating-content {
  transform-origin: var(--for-content-transform-origin, center);
  animation: for-pop-in 0.15s ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .my-floating-content {
    animation-duration: 0.01ms;
  }
}
```

```html
@if (open()) {
<div forPopoverContent class="my-floating-content" animate.enter="for-pop-in">…</div>
}
```

### Arrow recipe

The arrow is a rotated square (CSS "diamond" trick). `data-side` on the arrow element reflects the resolved placement side so you can rotate accordingly.

```css
.my-arrow {
  width: 10px;
  height: 10px;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  border-left: 1px solid #e2e8f0;

  /* Push the tip 5 px past the content edge. */
  --for-arrow-offset: -5px;
}

/* Rotate to point at the trigger based on the resolved side. */
.my-arrow[data-side='bottom'] {
  transform: rotate(45deg);
}
.my-arrow[data-side='top'] {
  transform: rotate(225deg);
}
.my-arrow[data-side='left'] {
  transform: rotate(135deg);
}
.my-arrow[data-side='right'] {
  transform: rotate(-45deg);
}
```

```html
@if (open()) {
<div forPopoverContent class="my-popover">
  …
  <span forPopoverArrow class="my-arrow"></span>
</div>
}
```

Replace `forPopoverArrow` with `forTooltipArrow` or `forHoverCardArrow` as appropriate — the recipe is the same for all three.
