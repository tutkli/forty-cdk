# Your first overlay

This guide walks one overlay from an empty template to a styled, animated popover. It covers the two essential concepts every overlay in forty-cdk shares — the `@if` / open-state model and the portal → global CSS requirement — and points to the per-primitive references when you're ready to go deeper.

The worked example is a **Popover**: the simplest trigger-anchored overlay and the clearest illustration of both concepts. After the walkthrough there is a brief note on the other structural shape the library uses (Dialog), so you know what to reach for next.

---

## Prerequisites

```bash
npm install forty-cdk @floating-ui/dom
```

Import the pieces you use. Standalone directives, no `NgModule`:

```ts
import {
  ForPopover,
  ForPopoverContent,
  ForPopoverTrigger,
  ForPopoverTitle,
  ForPopoverDescription,
  ForPopoverClose,
} from 'forty-cdk';
```

---

## Step 1 — empty markup

A Popover wraps both the trigger button and the floating content in a single root `[forPopover]` element. Place both inside it — the directive wires `aria-controls`, `aria-expanded`, and positioning automatically.

```html
<div forPopover>
  <button forPopoverTrigger>Settings</button>

  <div forPopoverContent>
    <h2 forPopoverTitle>Display settings</h2>
    <p forPopoverDescription>Adjust the theme and density.</p>
    <button forPopoverClose>Close</button>
  </div>
</div>
```

At this point the popover has no open/close wiring. The content is always mounted and the button does nothing. The next step fixes that.

---

## Step 2 — wiring the open state

### The `exportAs` shortcut (no separate signal needed)

`[forPopover]` is exported as `'forPopover'`, so you can expose the directive instance directly in the template with a reference variable and read its `open()` signal from there. The trigger already toggles `open` on click; you just need to gate the content with `@if`:

```html
<div forPopover #popover="forPopover">
  <button forPopoverTrigger>Settings</button>

  @if (popover.open()) {
    <div forPopoverContent>
      <h2 forPopoverTitle>Display settings</h2>
      <p forPopoverDescription>Adjust the theme and density.</p>
      <button forPopoverClose>Close</button>
    </div>
  }
</div>
```

That is the complete working overlay. Click the button to open, click it again (or press Escape, or click outside) to close. No component class changes needed.

**Why `@if` and not `[hidden]`?** forty-cdk never toggles `[hidden]` on content pieces. Presence in the DOM is the consumer's job — `@if` is both the lifecycle gate and what makes Angular's `animate.enter` / `animate.leave` transitions fire. The directive's job is reactive state, ARIA, focus management, and keyboard behavior.

### The `[(open)]` alternative

When the component class needs to read or drive open state — open programmatically, persist it, or react to it from a method — bind a signal explicitly:

```ts
readonly open = signal(false);
```

```html
<div forPopover [(open)]="open">
  <button forPopoverTrigger>Settings</button>

  @if (open()) {
    <div forPopoverContent>…</div>
  }
</div>
```

The `[(open)]` binding uses Angular's two-way model syntax. The directive fires `(openChange)` only on its own internal transitions (trigger click, Escape, outside-pointer) — not when you set the signal from component code, so you won't get loops.

---

## Step 3 — the portal → global CSS gotcha

When the popover opens, `[forPopoverContent]` is **moved to `document.body`** by the library. This is how positioned overlays stay above all other content without z-index fights.

The consequence: any CSS scoped to your component — including Angular's default view encapsulation — **does not reach the content element once it has been portaled**. A rule like `.my-panel { background: #fff }` inside a component stylesheet will have no effect on the portaled content.

**The fix is straightforward: use global styles or CSS classes.**

The simplest approach is to put overlay styles in your application's global stylesheet (`styles.css` or equivalent):

```css
/* styles.css — global, not a component stylesheet */

.my-popover {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  min-width: 240px;
}
```

Then add the class to the content element:

```html
@if (popover.open()) {
  <div forPopoverContent class="my-popover">
    <h2 forPopoverTitle>Display settings</h2>
    <p forPopoverDescription>Adjust the theme and density.</p>
    <button forPopoverClose>Close</button>
  </div>
}
```

> Do **not** set `position`, `top`, `left`, or `z-index` on the content element — floating-ui owns those completely. Add all other layout properties freely (`width`, `max-width`, `padding`, `background`, etc.).

---

## Step 4 — adding an enter animation

Because positioned content portals to `document.body`, there is one extra animation rule: use **`animate.enter` only**, not `animate.leave`. The full explanation and the arrow recipe live in [Styling floating content](./styling-floating-content.md) — this step gives you a minimal working animation.

Animated with standalone `scale` and `opacity` (not `transform`, which floating-ui already owns for positioning):

```css
/* styles.css */

@keyframes popover-in {
  from {
    opacity: 0;
    scale: 0.95;
  }
}

.my-popover {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  min-width: 240px;

  transform-origin: var(--for-content-transform-origin, center);
  animation: popover-in 0.15s ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .my-popover {
    animation-duration: 0.01ms;
  }
}
```

Apply the animation in the template with `animate.enter`:

```html
@if (popover.open()) {
  <div forPopoverContent class="my-popover" animate.enter="popover-in">
    <h2 forPopoverTitle>Display settings</h2>
    <p forPopoverDescription>Adjust the theme and density.</p>
    <button forPopoverClose>Close</button>
  </div>
}
```

`--for-content-transform-origin` is a custom property the library sets on the content element while open. It resolves to the corner or edge closest to the trigger so the content appears to grow out of the anchor point rather than from its own center.

The complete template at this point:

```ts
import { Component } from '@angular/core';
import {
  ForPopover,
  ForPopoverContent,
  ForPopoverTrigger,
  ForPopoverTitle,
  ForPopoverDescription,
  ForPopoverClose,
} from 'forty-cdk';

@Component({
  selector: 'app-settings',
  imports: [
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
    ForPopoverClose,
  ],
  template: `
    <div forPopover #popover="forPopover" side="bottom" align="start">
      <button forPopoverTrigger>Settings</button>

      @if (popover.open()) {
        <div forPopoverContent class="my-popover" animate.enter="popover-in">
          <h2 forPopoverTitle>Display settings</h2>
          <p forPopoverDescription>Adjust the theme and density.</p>
          <button forPopoverClose>Close</button>
        </div>
      }
    </div>
  `,
})
export class AppSettings {}
```

---

## Two structural shapes

forty-cdk overlays come in two shapes. Knowing which shape a primitive uses tells you immediately how to wire its open state.

### Wrapper-based (Popover, DropdownMenu, ContextMenu, Tooltip, HoverCard, Select, Combobox)

The root directive wraps both the trigger and the content and owns its open state internally, so the `exportAs` shortcut above works out of the box. Most also accept an explicit `[(open)]` two-way binding (HoverCard opens on hover and exposes its open state a little differently — see its README). The content pieces know they live inside the root and receive context via Angular's DI tree — no manual id wiring needed.

```html
<!-- The root "forPopover" is the lifecycle owner -->
<div forPopover #p="forPopover">
  <button forPopoverTrigger>Open</button>
  @if (p.open()) {
    <div forPopoverContent>…</div>
  }
</div>
```

### Flat (Dialog)

Dialog is structurally different: the trigger and the dialog surface can live anywhere in the template and are wired together by a shared id. There is no wrapper directive. The consumer's signal drives the `@if` gate, and the dialog emits a `(close)` event when it wants to be unmounted (Escape, backdrop, close button).

```html
<!-- trigger anywhere in the template -->
<button forDialogTrigger [(open)]="open" controls="my-dialog">Open dialog</button>

<!-- surface anywhere in the template — id must match controls above -->
@if (open()) {
  <div forDialog id="my-dialog" (close)="open.set(false)">
    <h2 forDialogTitle>Are you sure?</h2>
    <button forDialogClose>Cancel</button>
    <button (click)="confirm()">Confirm</button>
  </div>
}
```

The flat shape is what enables Dialog to be used both declaratively and programmatically (`ForDialogManager.open()`). See the [Dialog README](../projects/forty-cdk/src/lib/dialog/README.md) for both patterns.

---

## Where to go next

- **Popover full reference** — [projects/forty-cdk/src/lib/popover/README.md](../projects/forty-cdk/src/lib/popover/README.md): all inputs, outputs, the `[forPopoverAnchor]` anchor-override, and the arrow recipe.
- **Dialog full reference** — [projects/forty-cdk/src/lib/dialog/README.md](../projects/forty-cdk/src/lib/dialog/README.md): the flat shape in detail, the programmatic API, and focus-callback shapes.
- **Styling floating content** — [docs/styling-floating-content.md](./styling-floating-content.md): the three animation rules, all CSS custom properties, the full arrow recipe, and copy-paste snippets for Tooltip, HoverCard, and Menu as well as Popover.
- **Selected-indicator alignment** — [docs/selected-indicator-pattern.md](./selected-indicator-pattern.md): the `[forceMount]` + `opacity` pattern for keeping checkmarks visually aligned in Menu items.
- **Other overlay primitives** — DropdownMenu, ContextMenu, Tooltip, HoverCard, Select, Combobox all follow the wrapper-based shape and share the same portal → global CSS rule. Their READMEs are in `projects/forty-cdk/src/lib/<primitive>/README.md`.
