# Selected-indicator alignment pattern

Applies to every primitive that embeds a selection checkmark or dot inside an option or menu item:
**Select** (`[forSelectIndicator]`), **Combobox** (`[forComboboxIndicator]`), and **Menu** checkbox / radio items (`[forMenuItemIndicator]`).

---

## The problem

By default, an indicator that belongs to an unselected option gets the `hidden` attribute, which collapses its layout box to nothing (`display: none`). Rows that are checked therefore reserve width for the checkmark while unchecked rows do not, causing option labels to misalign column-to-column.

---

## The pattern: `[forceMount]` + `opacity`

Set `[forceMount]="true"` on the indicator so it stays mounted and reserves its slot in every row regardless of selection state. Then hide the glyph **visually** — not structurally — with a CSS rule keyed on the `data-state` attribute the directive reflects:

```html
<!-- Inside [forSelectOption] -->
<button forSelectOption type="button" value="apple">
  <span forSelectIndicator [forceMount]="true" class="indicator">✓</span>
  Apple
</button>
```

```css
/* Hide the glyph when the option is not selected, but keep its layout slot. */
.indicator[data-state='unchecked'] {
  opacity: 0;
}
```

The same shape applies to `[forComboboxIndicator]` and `[forMenuItemIndicator]` — only the selector name changes.

---

## Why `opacity` (not `visibility: hidden` or `display: none`)

| Approach                                  | Reserves layout slot | Screen-reader safe |
| ----------------------------------------- | -------------------- | ------------------ |
| `display: none` (the default / no `forceMount`) | No — rows misalign   | Yes (already `aria-hidden`) |
| `visibility: hidden`                      | Yes                  | Yes (already `aria-hidden`) |
| `opacity: 0` (recommended)                | Yes                  | Yes (already `aria-hidden`) |

All three indicator directives already emit `aria-hidden="true"` unconditionally, so neither `visibility` nor `opacity` creates an accessibility problem — the glyph is decorative and invisible to screen readers regardless. Use `opacity` or `visibility` interchangeably; the demos use `opacity`.

---

## Exit animation

`[forceMount]="true"` is also the prerequisite for wrapping the glyph in an `animate.leave` exit animation — Angular requires the element to stay in the DOM for the duration of the animation:

```html
<span forSelectIndicator [forceMount]="true" class="indicator" animate.leave="fade-out">✓</span>
```

Without `[forceMount]`, the indicator is unmounted immediately when the option is deselected and no exit animation runs.

---

## Full snippet — Select

```html
<div forSelect #select="forSelect" [(value)]="value" placeholder="Pick a fruit">
  <button forSelectTrigger>
    <span forSelectValue></span>
  </button>
  @if (select.open()) {
    <div forSelectContent>
      <button forSelectOption type="button" value="apple" class="option">
        <span forSelectIndicator [forceMount]="true" class="indicator">✓</span>
        Apple
      </button>
      <button forSelectOption type="button" value="banana" class="option">
        <span forSelectIndicator [forceMount]="true" class="indicator">✓</span>
        Banana
      </button>
    </div>
  }
</div>
```

```css
.option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.indicator {
  flex: none;
  width: 1em;
  height: 1em;
}

.indicator[data-state='unchecked'] {
  opacity: 0;
}
```

Replace `forSelectIndicator` with `forComboboxIndicator` or `forMenuItemIndicator` for the other primitives — the template and CSS are identical.

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
