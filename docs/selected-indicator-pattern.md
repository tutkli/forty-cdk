# Selected-indicator alignment pattern

Applies to **Menu** checkbox / radio items (`[forMenuItemIndicator]`), the one selection indicator that keeps a `[forceMount]` opt-in.

> Select (`[forSelectIndicator]`) and Combobox (`[forComboboxIndicator]`) no longer expose `[forceMount]`: their indicators always self-hide while unselected (inline `display:none` + `hidden`). For column alignment in those primitives, render a fixed-width spacer in the option layout (e.g. a CSS grid column or a sibling element) rather than keeping the indicator mounted.

---

## The problem

By default, an indicator that belongs to an unchecked item gets the `hidden` attribute plus an inline `display: none`, which collapses its layout box to nothing. Rows that are checked therefore reserve width for the checkmark while unchecked rows do not, causing item labels to misalign row-to-row.

---

## The pattern: `[forceMount]` + `opacity`

Set `[forceMount]="true"` on the indicator so it stays mounted and reserves its slot in every row regardless of state. Then hide the glyph **visually** — not structurally — with a CSS rule keyed on the `data-state` attribute the directive reflects:

```html
<!-- Inside [forMenuCheckboxItem] -->
<button forMenuCheckboxItem [(checked)]="bold" class="menu-item">
  <span forMenuItemIndicator [forceMount]="true" class="indicator">✓</span>
  Bold
</button>
```

```css
/* Hide the glyph when the item is not checked, but keep its layout slot. */
.indicator[data-state='unchecked'] {
  opacity: 0;
}
```

---

## Why `opacity` (not `visibility: hidden` or `display: none`)

| Approach                                        | Reserves layout slot | Screen-reader safe          |
| ----------------------------------------------- | -------------------- | --------------------------- |
| `display: none` (the default / no `forceMount`) | No — rows misalign   | Yes (already `aria-hidden`) |
| `visibility: hidden`                            | Yes                  | Yes (already `aria-hidden`) |
| `opacity: 0` (recommended)                      | Yes                  | Yes (already `aria-hidden`) |

`ForMenuItemIndicator` always emits `aria-hidden="true"`, so neither `visibility` nor `opacity` creates an accessibility problem — the glyph is decorative and invisible to screen readers regardless. Use `opacity` or `visibility` interchangeably; the demos use `opacity`.

---

## Exit animation

`[forceMount]="true"` is also the prerequisite for wrapping the glyph in an `animate.leave` exit animation — Angular requires the element to stay in the DOM for the duration of the animation:

```html
<span forMenuItemIndicator [forceMount]="true" class="indicator" animate.leave="fade-out">✓</span>
```

Without `[forceMount]`, the indicator is unmounted immediately when the item is unchecked and no exit animation runs.

---

## Full snippet — Menu checkbox item

```html
<button forMenuCheckboxItem [(checked)]="bold" class="menu-item">
  <span forMenuItemIndicator [forceMount]="true" class="indicator">✓</span>
  Bold
</button>
```

```css
.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.indicator[data-state='unchecked'] {
  opacity: 0;
}
```
