# Selected-indicator alignment pattern

Option and menu rows line their labels up only when every row reserves the indicator's width, selected or not. The four selection indicators (`[forMenuItemIndicator]`, `[forSelectIndicator]`, `[forComboboxIndicator]` and `[forListboxOptionIndicator]`) all hide themselves while their item is unselected, so the width comes from a fixed-width element of your own around the indicator.

---

## The problem

An indicator whose item is unselected gets the `hidden` attribute plus an inline `display: none`, which collapses its layout box to nothing. Selected rows reserve width for the checkmark while unselected rows do not, so the labels misalign row to row. The inline style beats any `display` rule a class applies, so styling the indicator itself cannot keep its box.

---

## The pattern: a fixed-width slot

Wrap the indicator in an element that always keeps its width. The slot is laid out in every row, and the indicator inside it appears and disappears:

```html
<!-- Inside [forMenuCheckboxItem] -->
<button forMenuCheckboxItem [(checked)]="bold" class="menu-item">
  <span class="indicator-slot">
    <span forMenuItemIndicator>✓</span>
  </span>
  Bold
</button>
```

```css
.indicator-slot {
  display: inline-flex;
  flex: none;
  justify-content: center;
  width: 1.1em;
}
```

The same markup works in all four primitives; only the indicator directive changes:

```html
<button forSelectOption value="apple">
  <span class="indicator-slot">
    <span forSelectIndicator>✓</span>
  </span>
  Apple
</button>
```

The indicator emits `aria-hidden="true"` in every state, and the slot holds nothing else, so the slot adds nothing to the item's accessible name. To style the slot from the item's state, key on the `data-state` the item reflects (`"checked" | "unchecked"`), for example `.menu-item[data-state='checked'] .indicator-slot`.

---

## Exit animation

The indicator is never removed from the DOM: it toggles `display`, so an `animate.leave` on it never runs. To animate the glyph, render your own element inside the slot with `@if` on the item's state, and mark the slot `aria-hidden="true"` yourself, since no library indicator does it for you there:

```html
<button forMenuCheckboxItem [(checked)]="bold" class="menu-item">
  <span class="indicator-slot" aria-hidden="true">
    @if (bold()) {
    <span animate.enter="check-in" animate.leave="check-out">✓</span>
    }
  </span>
  Bold
</button>
```

---

## Full snippet: Menu checkbox item

```html
<button forMenuCheckboxItem [(checked)]="bold" class="menu-item">
  <span class="indicator-slot">
    <span forMenuItemIndicator>✓</span>
  </span>
  Bold
</button>
```

```css
.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.indicator-slot {
  display: inline-flex;
  flex: none;
  justify-content: center;
  width: 1.1em;
}
```
