# Listbox

Headless implementation of the [WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) with single / multi select, roving tabindex, typeahead, and `FormValueControl<readonly T[]>` integration.

`[forListbox]` is generic over the option value type `T` (default `string`). Bind primitive ids for the simple case or full objects for richer models — the directive infers `T` from `[(value)]` and `[forListboxOption][value]`. See [Object values](#object-values) for the object-mode contract.

## Pieces

| Class                       | Selector                      | Role                                                                                                                                                                                   |
| --------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForListbox`                | `[forListbox]`                | Container. Owns selected values, mode, orientation. Provides the shared context.                                                                                                       |
| `ForListboxOption`          | `[forListboxOption]`          | One option. Apply on a `<button type="button">`.                                                                                                                                       |
| `ForListboxOptionIndicator` | `[forListboxOptionIndicator]` | Optional slot inside an option. Mirrors `data-state` and self-hides while the option is unselected (see [Self-hiding pieces](#self-hiding-pieces)).                                    |
| `ForListboxReorder`         | `[forListboxReorder]`         | Optional. Apply on the same element as `[forListbox]` to make the options pointer- and keyboard-sortable while keeping selection + typeahead (see [Reordering](#reordering-sortable)). |

## Inputs / models

### `ForListbox`

| API                                                          | Type                                             | Description                                                                                                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                                      | `model<readonly T[]>`                            | Two-way bindable. Selected values. Single mode keeps 0 or 1; multi any number. Required by `FormValueControl<readonly T[]>`.                                                                       |
| `selected`                                                   | `Signal<T \| null>`                              | Read-only single-select convenience view of `value`: the sole selected value, or `null` when none / many are selected. Lets single-select consumers skip `value()[0]`.                             |
| `isItemEqualToValue`                                         | `input<(a: T, b: T) => boolean>`                 | How two items compare. Defaults to `===`. Override for object values so selection / range actions locate entries by id (or any stable key).                                                        |
| `itemToFormValue`                                            | `input<(item: T) => string>`                     | Serialize an item for the hidden form input. Defaults to `String` for strings and `JSON.stringify` for objects. Override to emit a per-item id.                                                    |
| `multiple`                                                   | `input<boolean>`                                 | When true, multiple options can be selected. Default `false`.                                                                                                                                      |
| `ariaLabel`                                                  | `input<string \| null>`                          | Reactive accessible name for the listbox, reflected as `aria-label`. Default `null` (and an empty string) emits no attribute. Prefer native `aria-labelledby` when a visible label element exists. |
| `orientation`                                                | `input<'vertical' \| 'horizontal'>`              | Default `'vertical'`. Drives keyboard nav and `aria-orientation`.                                                                                                                                  |
| `loop`                                                       | `input<boolean>`                                 | When `true` (default), arrow nav wraps at the ends. Set `false` to stop at the boundaries. Range extension (Shift+Arrow) never wraps regardless, per the APG.                                      |
| `dir`                                                        | `input<'ltr' \| 'rtl'>`                          | Default `'ltr'`.                                                                                                                                                                                   |
| `selectionFollowsFocus`                                      | `input<boolean>`                                 | Single-mode only. When true, arrow nav also selects the focused option. APG flags this as case-by-case — leave off unless your UX specifically benefits. Default `false`.                          |
| `disabled` / `readonly` / `required` / `invalid` / `pending` | `input<boolean>`                                 | Reflected as `aria-*` / `data-*`.                                                                                                                                                                  |
| `name`                                                       | `input<string>`                                  | For form association.                                                                                                                                                                              |
| `errors`                                                     | `input<ValidationError.WithOptionalFieldTree[]>` | Wired by `[formField]`.                                                                                                                                                                            |
| `touched`                                                    | `model<boolean>`                                 | Set on focusout outside the listbox.                                                                                                                                                               |

### `ForListboxOption`

| API        | Type                | Description                                                                                            |
| ---------- | ------------------- | ------------------------------------------------------------------------------------------------------ |
| `value`    | `input.required<T>` | The option's value (defaults to `string`). Must be unique within the listbox per `isItemEqualToValue`. |
| `disabled` | `input<boolean>`    | Disables this option independently of the group.                                                       |

## Stand-alone usage (single select)

```ts
import { Component, signal } from '@angular/core';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';

@Component({
  selector: 'demo-fruit',
  imports: [ForListbox, ForListboxOption],
  template: `
    <ul forListbox [(value)]="picked" aria-label="Fruit">
      <li>
        <button type="button" forListboxOption class="listbox-option" value="apple">Apple</button>
      </li>
      <li>
        <button type="button" forListboxOption class="listbox-option" value="banana">Banana</button>
      </li>
      <li>
        <button type="button" forListboxOption class="listbox-option" value="cherry">Cherry</button>
      </li>
    </ul>
  `,
})
export class DemoFruit {
  readonly picked = signal<readonly string[]>([]);
}
```

## Multi select

```html
<ul forListbox multiple [(value)]="tags" aria-label="Tags">
  <li>
    <button type="button" forListboxOption class="listbox-option" value="urgent">Urgent</button>
  </li>
  <li><button type="button" forListboxOption class="listbox-option" value="bug">Bug</button></li>
  <li><button type="button" forListboxOption class="listbox-option" value="ui">UI</button></li>
</ul>
```

Click toggles individual options in multi mode; click selects in single mode.

## Reordering (sortable)

Add `[forListboxReorder]` on the same element as `[forListbox]` to make a listbox **sortable** — a selectable _and_ sortable list (e.g. a chip grid) in one composition, with no `@angular/cdk/drag-drop`.

`[forDraggable]` can't stack on a `[forListboxOption]`: both manage the option's roving tabindex and keyboard, so they collide on `tabindex`, on Space / Enter activation, and on `orientation`. `[forListboxReorder]` is a container-level coordinator (the same shape as `[forTreeNodeDrag]` / `[forTableRowReorder]`): it lives on the listbox, **never touches the option's roving tabindex**, intercepts keys in the capture phase with a dedicated lift chord, and owns its own 2D drop geometry — so selection, typeahead, and arrow navigation keep working unchanged.

It **never reorders the options itself** (BYO-data): `(optionReorder)` emits `{ from, to }` on each committed drop; apply `moveItemInArray(items, from, to)` to your own array.

```ts
import { Component, signal } from '@angular/core';
import { moveItemInArray } from 'forty-cdk/drag-drop';
import { ForListbox, ForListboxOption, ForListboxReorder } from 'forty-cdk/listbox';

@Component({
  selector: 'demo-sortable-tags',
  imports: [ForListbox, ForListboxOption, ForListboxReorder],
  template: `
    <ul
      forListbox
      forListboxReorder
      multiple
      [(value)]="selected"
      (optionReorder)="reorder($event)"
      aria-label="Tags"
      style="display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0"
    >
      @for (tag of tags(); track tag) {
        <li>
          <button type="button" forListboxOption [value]="tag" class="chip">{{ tag }}</button>
        </li>
      }
    </ul>
  `,
})
export class DemoSortableTags {
  readonly tags = signal<readonly string[]>(['urgent', 'bug', 'ui', 'docs']);
  readonly selected = signal<readonly string[]>([]);

  reorder({ from, to }: { from: number; to: number }): void {
    this.tags.update((tags) => moveItemInArray(tags, from, to));
  }
}
```

### Inputs / output

| API               | Type                   | Description                                                                                                               |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `reorderDisabled` | `input<boolean>`       | Disable reorder while keeping selection / typeahead. The listbox's own `disabled` also disables reorder. Default `false`. |
| `optionReorder`   | `output<{ from; to }>` | Fires once per committed reorder with the previous / new index (both 0-based, DOM order). Apply `moveItemInArray`.        |

### Keyboard

- **Ctrl+Space** (or **Cmd+Space**) lifts the focused option.
- While lifted: **arrow keys** step the target position (linearly in DOM order, so a wrapping grid sorts with either axis), **Home / End** jump to the ends, **Space / Enter** drop, **Escape / Tab** cancel.
- The lift chord is intercepted in the capture phase, so it never collides with the option's native Space / Enter selection or with arrow navigation while idle.

### Pointer

Drag an option past a small threshold to reorder; a short press without movement still selects (the post-drag click is suppressed). A floating preview follows the pointer and drop geometry is resolved in 2D, so vertical lists, horizontal lists, and wrapping chip grids all work without configuring `orientation`.

> **Scope:** `[forListboxReorder]` targets the standard roving-tabindex listbox. A virtualized listbox (`[totalCount]` set) is left untouched, since reordering a windowed subset is ill-defined.

### Data attributes

| Piece                 | Attribute       | Values            | Notes                                                               |
| --------------------- | --------------- | ----------------- | ------------------------------------------------------------------- |
| `[forListboxReorder]` | `data-dragging` | present \| absent | On the container while any drag (pointer or keyboard) is in flight. |
| `[forListboxOption]`  | `data-dragging` | present \| absent | On the lifted option for the duration of the drag.                  |

### Localizing reorder announcements

While a reorder is in flight, `[forListboxReorder]` announces lift / move / drop / cancel through an off-screen live region. The phrasing is English by default; override it per injector scope with `provideForListboxDefaults` so screen readers speak the consumer's language. `index` / `total` are 1-based.

```ts
import { provideForListboxDefaults } from 'forty-cdk/listbox';

provideForListboxDefaults({
  reorderAnnounceLift: (label, index, total) => `${label} levantado. ${index} de ${total}.`,
  reorderAnnounceMove: (label, index, total) =>
    `${label} movido a la posición ${index} de ${total}.`,
  reorderAnnounceDrop: (label, index, total) =>
    `${label} soltado en la posición ${index} de ${total}.`,
  reorderAnnounceCancel: (label) => `Movimiento de ${label} cancelado.`,
});
```

| Default                 | Type                                                      | Description                                     |
| ----------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| `reorderAnnounceLift`   | `(label: string, index: number, total: number) => string` | Announced when an option is lifted for reorder. |
| `reorderAnnounceMove`   | `(label: string, index: number, total: number) => string` | Announced when the drop position changes.       |
| `reorderAnnounceDrop`   | `(label: string, index: number, total: number) => string` | Announced on a committed drop.                  |
| `reorderAnnounceCancel` | `(label: string) => string`                               | Announced when the reorder is cancelled.        |

## Object values

Real apps usually have richer option models — `{ id, name, ... }` — where the comparison key differs from what you'd serialize for a form. `[forListbox]` is generic over `T` to support that without forcing the consumer to stringify and re-hydrate.

Two inputs configure the object behaviour. Defaults make string mode work unchanged:

| Input                  | Default                                                            | Purpose                                                                                                              |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `[isItemEqualToValue]` | `(a, b) => a === b`                                                | How two items compare. Override for object values so selection / range actions locate by id (or any stable key).     |
| `[itemToFormValue]`    | `(item) => typeof item === 'string' ? item : JSON.stringify(item)` | Serialize an item for the hidden form input. Override to emit a per-item id (or any wire format your backend wants). |

The visible option label is just the rendered `textContent`, so there's no separate label function. All of the multi-select range actions (Shift+Arrow, Shift+Space, Ctrl/Cmd+A, Ctrl+Shift+Home/End) dedupe by `isItemEqualToValue`, so object values never accumulate duplicates.

```ts
import { Component, signal } from '@angular/core';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';

interface City {
  id: string;
  name: string;
}

@Component({
  selector: 'demo-cities',
  imports: [ForListbox, ForListboxOption],
  template: `
    <ul forListbox multiple [(value)]="picked" [isItemEqualToValue]="byId" aria-label="Cities">
      @for (c of cities; track c.id) {
        <li>
          <button type="button" forListboxOption class="listbox-option" [value]="c">
            {{ c.name }}
          </button>
        </li>
      }
    </ul>
  `,
})
export class DemoCities {
  readonly picked = signal<readonly City[]>([]);
  readonly cities: readonly City[] = [
    { id: 'paris', name: 'Paris' },
    { id: 'berlin', name: 'Berlin' },
  ];
  readonly byId = (a: City, b: City) => a.id === b.id;
}
```

## Signal Forms usage

```ts
import { Component, signal } from '@angular/core';
import { form, required, requiredError, validate } from '@angular/forms/signals';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';

@Component({
  selector: 'demo-priorities',
  imports: [ForListbox, ForListboxOption /* , FormField from @angular/forms */],
  template: `
    <ul forListbox multiple [formField]="prefs.priorities" aria-label="Priorities">
      <li>
        <button type="button" forListboxOption class="listbox-option" value="speed">Speed</button>
      </li>
      <li>
        <button type="button" forListboxOption class="listbox-option" value="quality">
          Quality
        </button>
      </li>
      <li>
        <button type="button" forListboxOption class="listbox-option" value="cost">Cost</button>
      </li>
    </ul>
  `,
})
export class DemoPriorities {
  readonly model = signal({ priorities: [] as string[] });
  readonly prefs = form(this.model, (s) => {
    required(s.priorities);
    validate(s.priorities, ({ value }) =>
      value().length === 0 ? requiredError({ message: 'Pick at least one priority' }) : undefined,
    );
  });
}
```

> **Requiring a non-empty selection.** The value is a `readonly string[]`, and Angular's `required()`
> treats only `''`, `false`, `null`, and `NaN` as empty — an empty array `[]` counts as _present_, so
> `required(s.priorities)` reflects `aria-required="true"` but never makes the form invalid on its own.
> Enforce "at least one" with the explicit `validate(...)` length rule above, or with Angular's
> `minLength(s.priorities, 1)` (which emits a `minLengthError` instead of a `requiredError`).

> **Single-select fields.** When you model the field as `T | null` rather than `readonly T[]`,
> bridge it with `forSingleValueField` so the standard `[formField]` wiring still works:
> `[formField]="forSingleValueField(prefs.fruit)"`. See
> [Signal Forms helpers](../signal-forms/README.md).

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

### Data attributes

| Piece                         | Attribute          | Values                     | Notes                                                     |
| ----------------------------- | ------------------ | -------------------------- | --------------------------------------------------------- |
| `[forListbox]`                | `data-orientation` | `horizontal` \| `vertical` |                                                           |
| `[forListbox]`                | `data-disabled`    | present \| absent          |                                                           |
| `[forListboxOption]`          | `data-state`       | `checked` \| `unchecked`   |                                                           |
| `[forListboxOption]`          | `data-highlighted` | present \| absent          | Works in both roving-tabindex and activedescendant paths. |
| `[forListboxOption]`          | `data-disabled`    | present \| absent          |                                                           |
| `[forListboxOptionIndicator]` | `data-state`       | `checked` \| `unchecked`   |                                                           |

```css
.listbox-option[data-highlighted] {
  background: rgb(0 0 0 / 0.06);
}

.listbox-option[data-state='checked'] {
  font-weight: 600;
}
```

## Keyboard

### Single mode (and the basics for both)

> **Virtualized path (`[totalCount]` set):** the listbox container is always the single Tab stop. Arrow / Home / End / Enter / Space all fire on the container (not individual options). See the [Virtualization](#virtualization) section for the full contract.

- **Tab** moves focus into / out of the listbox; lands on the first selected option (or the first enabled one if nothing is selected, or the last user-focused option after first interaction). With several preselected options in multi mode, only the first selected one is the tab stop — the group exposes a single `tabindex="0"`. When no option can serve as that entry point (the listbox is empty, or every option is disabled), the listbox host itself becomes the single Tab stop (`tabindex="0"`) so the control stays reachable; a disabled listbox is never tabbable.
- **ArrowDown / ArrowUp** in vertical, **ArrowRight / ArrowLeft** in horizontal: move focus, wrap-around, skip disabled.
- **Home / End** jump to first / last enabled option.
- **PageUp / PageDown** jump to first / last enabled option.
- **Space / Enter** activate the focused option (toggles in multi, selects in single) via the underlying button.
- **Typeahead**: typing characters focuses the first option whose visible text starts with the typed prefix (case-insensitive, debounced).
- Disabled options are skipped on arrow nav. They keep `aria-disabled="true"` and `data-disabled=""` (no native `disabled` attribute, per APG): focusable for screen-reader announcement, but click and keyboard activation are no-ops.

### Multi mode (APG-recommended range selection)

The full WAI-ARIA APG "Recommended Selection" model is implemented and active automatically when `multiple` is set. All shortcuts skip disabled options.

| Shortcut                         | Behavior                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shift+ArrowDown / ArrowUp**    | Move focus to the next / previous enabled option AND toggle its selected state.                                                                                             |
| **Shift+Space**                  | Select every enabled option between the anchor (most recent unmodified click / Space) and the focused option, inclusive. Existing selection outside the range is preserved. |
| **Ctrl+A** (or **Cmd+A** on mac) | Select every enabled option. If every enabled option is already selected, clears the selection.                                                                             |
| **Ctrl+Shift+Home**              | Select from the focused option to the first enabled option, and move focus there.                                                                                           |
| **Ctrl+Shift+End**               | Select from the focused option to the last enabled option, and move focus there.                                                                                            |

The **anchor** for `Shift+Space` is set on every unmodified activation (click, plain Space, plain Enter) and is unaffected by `Shift+ArrowDown`/`ArrowUp` — that lets users click an option, navigate away with Shift+Arrow, and then Shift+Space to select the contiguous block back to where they started.

When `readonly` is set, the focus-moving shortcuts (Shift+Arrow, Ctrl+Shift+Home/End) still move focus but do not change the selection — same contract as plain arrow nav under `readonly`. Pure-selection shortcuts (Shift+Space, Ctrl+A) are no-ops.

## Virtualization

Setting `[totalCount]` on `[forListbox]` enables the **activedescendant focus model**: the listbox container becomes the single Tab stop (`tabindex="0"`) and focus never moves to individual options. Keyboard navigation and selection work exactly as in the roving-tabindex path, but the active option is tracked by `aria-activedescendant` instead of DOM focus, so the active row can be unmounted as it scrolls out of the window.

Without `[totalCount]` (the default), the roving-tabindex model is used unchanged.

### Inputs and output

| Input / Output                 | Type                                     | Description                                                                                                                  |
| ------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `[totalCount]`                 | `number \| undefined`                    | Total number of items in the source data. Setting this switches to the activedescendant model.                               |
| `[visibleRange]`               | `readonly [number, number] \| undefined` | Inclusive-exclusive `[start, end)` range of rendered options. Provided by `injectVirtualizer`.                               |
| `[forListboxOption][posInSet]` | `number \| null`                         | Zero-based absolute position of this option in the full data. Required in the virtualized path.                              |
| `(scrollToIndex)`              | `number`                                 | Emitted when navigation lands on an off-window option. Pass to `injectVirtualizer`'s `scrollToIndex` to recenter the window. |

### Focus-model switch

| Mode                                | Tab stop          | Active option tracking                       |
| ----------------------------------- | ----------------- | -------------------------------------------- |
| Roving-tabindex (default)           | Active option     | DOM focus + `data-highlighted`               |
| Activedescendant (`totalCount` set) | Listbox container | `aria-activedescendant` + `data-highlighted` |

Both paths reflect `data-highlighted=""` on the active option, so consumer CSS for hover/focus rings works the same way in either mode.

### Navigation flow

1. Consumer provides `[totalCount]`, `[visibleRange]`, and handles `(scrollToIndex)`.
2. On focus, the listbox seeds `aria-activedescendant` to the first selected enabled option, or the first enabled option ordered by `posInSet`.
3. Arrow / Home / End navigation computes the target index against the full `totalCount`. If the target is inside `[visibleRange]`, `aria-activedescendant` is set immediately. If outside, `(scrollToIndex)` is emitted with the target index.
4. When the consumer's virtualizer scrolls and the target option mounts, the listbox resolves the pending navigation and sets `aria-activedescendant`.

### Example

```ts
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { injectVirtualizer } from 'forty-cdk/virtualization';

interface Item {
  readonly id: string;
  readonly label: string;
}

@Component({
  selector: 'demo-virtualized-listbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForListbox, ForListboxOption],
  template: `
    <div
      forListbox
      #scroll
      aria-label="Virtualized items"
      [(value)]="picked"
      [totalCount]="items.length"
      [visibleRange]="v.range()"
      (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
      style="overflow: auto; max-height: 300px; position: relative"
    >
      <div [style.height.px]="v.totalSize()" style="position: relative">
        @for (vi of v.virtualItems(); track vi.key) {
          <button
            type="button"
            forListboxOption
            [value]="items[vi.index]!.id"
            [posInSet]="vi.index"
            [style.transform]="'translateY(' + vi.start + 'px)'"
            style="position: absolute; left: 0; right: 0;"
          >
            {{ items[vi.index]!.label }}
          </button>
        }
      </div>
    </div>
  `,
})
export class DemoVirtualizedListbox {
  protected readonly items: readonly Item[] = Array.from({ length: 10000 }, (_, i) => ({
    id: `item-${i}`,
    label: `Item ${i}`,
  }));
  protected readonly picked = signal<readonly string[]>([]);
  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
  protected readonly v = injectVirtualizer({
    count: computed(() => this.items.length),
    estimateSize: () => 36,
    scrollElement: this.scrollElement,
  });
}
```

### Intentional limitations

- **Multi-select range modifiers** (Shift+Arrow, Shift+Space, Ctrl+A, Ctrl+Shift+Home/End) are not available in the virtualized path. These require the full materialized option set to compute ranges, which contradicts windowing. Per-option toggling via Enter, Space, or click works normally in both single and multi mode.
- **Typeahead** matches only the currently rendered window. Options outside the visible range cannot be reached by typing.

## Self-hiding pieces

`[forListboxOptionIndicator]` hides itself while its option is unselected with an inline `display: none` in addition to the `hidden` attribute that removes it from the accessibility tree. Because the inline style beats any author selector rule, you can give the indicator a custom `display` (e.g. `display: inline-flex` for a check icon) without a `.x[hidden] { display: none }` workaround — the directive's `display: none` still wins while the option is unselected, and your `display` applies once it's selected.

## Accessibility notes

- **Label the listbox** via the reactive `[ariaLabel]` input or a native `aria-labelledby` pointing at a visible label element.
- **Use `<button>` for each option** so Space / Enter activate via native click. Other host elements break keyboard activation.
- **Visible text on each option** is what typeahead matches against — keep it descriptive and unique-prefixed.
- **`selectionFollowsFocus`** is an opt-in for single-select. Avoid combining it with side effects that depend on commit semantics — it changes the form value on every arrow key.
- **`data-highlighted=""`** is reflected on the option that is the current active item in both the roving-tabindex and activedescendant paths — same vocabulary as the menu / select / combobox primitives, useful when you want a uniform "keyboard focus ring" across surfaces without coupling to `:focus`.
- **Virtualized path**: the listbox publishes `aria-activedescendant` on the container and each rendered option carries `aria-setsize` / `aria-posinset` so screen readers announce the true list size even when only a window is mounted.

## Wrapping in a design system

Both supported wrapper patterns — `hostDirectives` with the exported `FOR_LISTBOX_HOST_DIRECTIVE_INPUTS` / `FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS` name tuples, and subclassing — are documented in [Wrapping form primitives](../../../../../docs/wrapping-form-primitives.md).
