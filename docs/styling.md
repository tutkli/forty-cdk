# Styling forty-cdk

forty-cdk ships **no styles**. Every primitive exposes state, ARIA, focus management,
and keyboard behavior; the visual design is entirely yours. This guide explains the three
hooks you style against, so the appearance is yours while the behavior stays the library's.

If you are styling an overlay (Popover, Dialog, Menu, …) start with
[Your first overlay](./your-first-overlay.md) — it walks one from empty markup to
styled-and-animated. This page is the conceptual umbrella underneath it.

---

## The three styling hooks

### 1. Your own class — not the directive selector

A primitive's selectors (`[forAccordion]`, `[forDialogTrigger]`, …) are its **behavior
API**: what you attach to get the wiring. They are **not** a styling contract. Add your
own class to each piece and style that:

```html
<div forAccordion class="accordion">
  <div forAccordionItem class="accordion__item">
    <h3>
      <button forAccordionTrigger class="accordion__trigger">Shipping</button>
    </h3>
    <section forAccordionContent class="accordion__panel">…</section>
  </div>
</div>
```

```css
.accordion__trigger {
  /* your styles */
}
```

You _can_ technically write `[forAccordion] { … }` — it is a valid attribute selector —
but don't:

- **Selectors can change.** forty-cdk is pre-1.0 and renames are in scope; a CSS file
  keyed on `[forAccordionTrigger]` breaks silently when the selector moves. Your own class
  survives.
- **Separation of concerns.** The attribute says "this has behavior X"; the class says
  "this looks like Y". Keeping them distinct keeps templates readable and your design
  decoupled from the library's internals.
- **Some pieces have no attribute to target.** Overlays opened through a programmatic
  manager (see below) or rendered inside the library's own view (Toast) don't expose the
  `[for…]` attribute in the DOM at all — a class is the only reliable hook there.

### 2. `data-*` attributes — for state

The library reflects logical state onto every piece you might want to style, as `data-*`
attributes. **This is how you style state** — not by reading signals, not by toggling
classes yourself.

```css
.accordion__trigger[data-state='open'] .chevron {
  transform: rotate(180deg);
}
.accordion__panel[data-state='closed'] {
  display: none;
}
```

**Canonical `data-state` vocabulary** (three families, used uniformly across pieces):

| Values                                      | Meaning                          | Examples                                                                    |
| ------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `open` \| `closed`                          | expand / collapse                | Accordion, Disclosure, Tooltip, Popover, Dialog, Menu, Drawer, Tree parents |
| `active` \| `inactive`                      | one-of-N selectable in a tablist | Tabs trigger / content                                                      |
| `checked` \| `unchecked` \| `indeterminate` | form-control state               | Switch, Checkbox, Radio, Listbox / Select / Combobox / Menu items           |

A few primitives use a different attribute because their spec doesn't fit the three
families — these are intentional, not inconsistencies:

| Attribute                                           | Values                                         | Primitive(s)                  |
| --------------------------------------------------- | ---------------------------------------------- | ----------------------------- |
| `data-state`                                        | `visible` \| `hidden`                          | Scroll Area scrollbar / thumb |
| `data-status`                                       | `idle` \| `loading` \| `loaded` \| `error`     | Avatar                        |
| `data-state`                                        | `indeterminate` \| `loading` \| `complete`     | Progress                      |
| `data-quality`                                      | `optimum` \| `sub-optimum` \| `even-less-good` | Meter                         |
| `data-selected`, `data-today`, `data-outside-month` | present / absent (boolean)                     | Calendar gridcell             |
| `data-selected`                                     | present / absent (boolean)                     | Tree treeitem                 |

**Boolean `data-*` attributes** (`data-disabled`, `data-readonly`, `data-highlighted`,
`data-selected`, …) are **present with an empty value when true, absent when false** —
never `data-disabled="false"`. So style the "off" state by selecting on absence:

```css
.option[data-highlighted] {
  background: #eef;
} /* keyboard-focused candidate */
.trigger:not([data-disabled]) {
  cursor: pointer;
}
```

`data-highlighted` is the roving-tabindex / `aria-activedescendant` "current candidate"
hook — for Combobox it is the _only_ way to style the active option, since focus stays on
the input.

**ARIA attributes follow a parallel rule.** Togglable widgets always emit
`aria-checked`/`aria-pressed`/`aria-expanded`/`aria-selected` as `"true"`/`"false"`, but
truthy-only attributes (`aria-disabled`, `aria-required`, …) are absent when false. Style
falsy state via `:not([aria-disabled])`, never `[aria-disabled='false']`.

**Axis & direction.** Primitives with directional keyboard nav reflect `data-orientation`
(`horizontal`/`vertical`) on the root so you can flip layout:

```css
.toolbar[data-orientation='vertical'] {
  flex-direction: column;
}
```

### 3. CSS custom properties — for measured values

When the library computes a value your CSS needs — a percentage, an anchor dimension, a
drag delta — it writes it as a `--for-*` custom property you consume:

```css
.progress__indicator {
  width: var(--for-progress-percentage);
}
.popover {
  max-width: var(--for-floating-available-width);
}
```

Each primitive's README lists the exact properties it sets, under **CSS custom
properties**. Floating overlays additionally expose anchor dimensions and a transform
origin — see [Styling floating content](./styling-floating-content.md).

---

## Overlays portal to `document.body` → use global CSS

Every overlay that floats (Popover, Tooltip, Menu, Select, …) and every modal (Dialog,
Drawer) **moves its content to `document.body`** when open. Component-scoped styles
(Angular view encapsulation) don't reach a portaled node. Put overlay styles in a
**global stylesheet** (or use `::ng-deep` sparingly) and target your class there.

The full set of rules for positioned content — `animate.enter` only, animate `scale`/
`opacity` not `transform`, never set `position`/`top`/`left`, the arrow recipe — lives in
[Styling floating content](./styling-floating-content.md).

## Programmatic overlays → `class` / `classList` on the config

Dialog, Drawer, and Toast can be opened imperatively through a manager
(`ForDialogManager.open()`, `ForDrawerManager.open()`, `ForToastManager.show()`). The
manager creates the overlay host for you, so there is no template element to add a class
to. Pass `class` (or `classList`) on the open/show config and the tokens land on the real
overlay root alongside `data-state` / `data-side`:

```ts
this.dialogs.open(ConfirmDialog, { data, class: 'dialog dialog--danger' });
```

---

## Motion & internationalization

- **`prefers-reduced-motion`.** The library never animates for you, so honoring reduced
  motion is your CSS's job. Guard transitions/animations:

  ```css
  @media (prefers-reduced-motion: reduce) {
    .accordion__panel {
      transition: none;
    }
  }
  ```

- **RTL.** A primitive's `dir` input resolves keyboard meaning _and_ reflects the resolved
  value back to the host's native `dir` attribute. For visual RTL set `dir` on an ancestor
  (the standard `<html dir="rtl">`) — every `dir`-aware primitive inherits it. Style
  direction-sensitive layout with `:dir(rtl)` or `[dir='rtl']`, and prefer logical
  properties (`margin-inline-start`, `inset-inline-end`) so layout flips for free.

---

## Per-primitive styling reference

Each primitive's README has a **Styling** section listing its pieces, the `data-*` it
reflects, and any CSS custom properties. Grouped by how you style them:

### Expand / collapse & tabs

State is `data-state` (`open`/`closed`, or `active`/`inactive` for Tabs); flip layout off
`data-orientation`. Content is never `[hidden]` — you gate it with `@if` or hide closed
panels in CSS.

- [Accordion](../projects/forty-cdk/accordion/README.md) ·
  [Disclosure](../projects/forty-cdk/disclosure/README.md) ·
  [Tabs](../projects/forty-cdk/tabs/README.md) ·
  [Tree](../projects/forty-cdk/tree/README.md)

### Form controls

State is `data-state` (`checked`/`unchecked`/`indeterminate`); also `data-disabled` /
`data-readonly`. The host is a real `<button>` so `:disabled` / `:focus-visible` work too.

- [Switch](../projects/forty-cdk/switch/README.md) ·
  [Checkbox](../projects/forty-cdk/checkbox/README.md) ·
  [Toggle](../projects/forty-cdk/toggle/README.md) ·
  [Radio Group](../projects/forty-cdk/radio-group/README.md)

### Text & value inputs

Style off `data-disabled` / `data-readonly` / `data-empty`, validation facets
(`data-invalid`, `data-touched`, …) on Field, and segment facets (`data-highlighted`,
`data-placeholder`) on the date/time fields and Calendar cells.

- [Input](../projects/forty-cdk/input/README.md) ·
  [Number Input](../projects/forty-cdk/number-input/README.md) ·
  [OTP Input](../projects/forty-cdk/otp-input/README.md) ·
  [Date Field](../projects/forty-cdk/date-field/README.md) ·
  [Time Field](../projects/forty-cdk/time-field/README.md) ·
  [Field](../projects/forty-cdk/field/README.md) ·
  [Fieldset](../projects/forty-cdk/fieldset/README.md) ·
  [Calendar](../projects/forty-cdk/calendar/README.md)

### Range & value display

Paint the bar/fill from a `--for-*-percentage` custom property; color by `data-state`
(Progress) or `data-quality` (Meter).

- [Slider](../projects/forty-cdk/slider/README.md) ·
  [Progress](../projects/forty-cdk/progress/README.md) ·
  [Meter](../projects/forty-cdk/meter/README.md)

### Trigger-anchored overlays (portal + floating-ui)

Global CSS, `animate.enter` only, anchor/origin custom properties, `data-state`
`open`/`closed`. See [Styling floating content](./styling-floating-content.md) and, for
menu checkmark alignment, [Selected-indicator alignment](./selected-indicator-pattern.md).

- [Popover](../projects/forty-cdk/popover/README.md) ·
  [Tooltip](../projects/forty-cdk/tooltip/README.md) ·
  [Hover Card](../projects/forty-cdk/hover-card/README.md) ·
  [Dropdown Menu](../projects/forty-cdk/dropdown-menu/README.md) ·
  [Context Menu](../projects/forty-cdk/context-menu/README.md) ·
  [Menu](../projects/forty-cdk/menu/README.md) ·
  [Menubar](../projects/forty-cdk/menubar/README.md) ·
  [Navigation Menu](../projects/forty-cdk/navigation-menu/README.md) ·
  [Select](../projects/forty-cdk/select/README.md) ·
  [Combobox](../projects/forty-cdk/combobox/README.md)

### Modal overlays

Global CSS; declaratively class the surface, programmatically pass `class` on the config.
Both expose `data-state`; Drawer adds `data-side` / drag state.

- [Dialog](../projects/forty-cdk/dialog/README.md) ·
  [Drawer](../projects/forty-cdk/drawer/README.md)

### Inline selection list & programmatic toast

- [Listbox](../projects/forty-cdk/listbox/README.md) — inline (not portaled);
  roving tabindex, `data-orientation`, options carry `data-state` + `data-highlighted`.
- [Toast](../projects/forty-cdk/toast/README.md) — rendered by the library's
  viewport, so style its pieces via global attribute selectors; `data-variant`,
  `data-swipe`, `data-paused`.

### Layout & display

- [Date Picker](../projects/forty-cdk/date-picker/README.md) — overlay composing a
  projected Calendar; floating rules apply.
- [Separator](../projects/forty-cdk/separator/README.md) ·
  [Aspect Ratio](../projects/forty-cdk/aspect-ratio/README.md) ·
  [Avatar](../projects/forty-cdk/avatar/README.md) ·
  [Scroll Area](../projects/forty-cdk/scroll-area/README.md) ·
  [Pane Resizer](../projects/forty-cdk/pane-resizer/README.md) ·
  [Toolbar](../projects/forty-cdk/toolbar/README.md)

---

## Related guides

- [Your first overlay](./your-first-overlay.md) — hands-on overlay walkthrough.
- [Styling floating content](./styling-floating-content.md) — the floating-overlay rules,
  CSS custom properties, and arrow recipe.
- [Selected-indicator alignment](./selected-indicator-pattern.md) — keeping menu checkmarks
  aligned with `[forceMount]` + `opacity`.

> **Contributors:** the `data-state` vocabulary, boolean-attribute rule, and `--for-*`
> namespacing are enforced conventions — see `.claude/rules/conventions.md` for the
> normative source.
