# Wrapping non-form roots

Design systems built on forty-cdk rarely expose the raw primitives. They wrap each one in a styled
component carrying the system's selector and classes. For **form-value** controls that story lives in
[Wrapping form primitives](wrapping-form-primitives.md), which owns the Signal Forms contract, the
`FOR_*_HOST_DIRECTIVE_INPUTS` name tuples, and the `[formField]` discovery rules.

This guide covers everything else: the composed roots with no form value, namely Accordion, Dialog, Drawer,
Popover, Tooltip, HoverCard, the menu family, Tabs, Stepper, Tree, Table, Carousel, ScrollArea,
Toolbar, Pagination, Progress, Meter, Avatar, Fieldset, FileUpload, and the drag-drop /
virtualization layers. The mechanics are simpler than the form side (there is no value contract to
preserve) but they have one sharp edge that bites every wrapper on its first day, and it is the same
edge: **Angular does not inherit a directive's `providers`.**

## Subclassing is the default pattern here

A subclass with its own decorator inherits the primitive's inputs, outputs, host bindings, and
listeners. Nothing needs re-declaring:

```ts
import { Directive } from '@angular/core';
import { ForAccordion } from 'forty-cdk/accordion';

@Directive({
  selector: '[myAccordion]',
  host: { class: 'my-accordion' },
})
export class MyAccordion extends ForAccordion {}
```

`hostDirectives`, the other pattern the form guide documents, is available too, but it is a worse
fit for a composed root and there are no name tuples to help you: `FOR_*_HOST_DIRECTIVE_INPUTS` is a
form-control artefact (it exists because an unbound value / touched name fails _silently_ under
`[formField]`), and no non-form primitive ships one. Re-exposing an accordion's or a dialog's whole
surface through `hostDirectives` means hand-maintaining that list with nothing to check it against,
so prefer the subclass and reach for `hostDirectives` only when your wrapper must also extend a
different base class.

## Re-provide the context token — this is the one that breaks

A composed primitive coordinates its pieces through an `InjectionToken` its root provides:

<!-- snippet: fragment -->

```ts
@Directive({
  selector: '[forDisclosure]',
  providers: [{ provide: FOR_DISCLOSURE_CONTEXT, useExisting: ForDisclosure }],
})
export class ForDisclosure { … }
```

Angular inherits compiled metadata through the class hierarchy, but **each decorator declares its own
`providers`, replacing the parent's array wholesale.** A bare subclass therefore ships with no
context provider at all, and every projected piece (`[forAccordionTrigger]`, `[forDialogTitle]`,
`[forPopoverContent]`, `[forTabsTrigger]`) throws the primitive's orphan error the moment it tries
to resolve. The failure is loud, but the cause is not obvious from the message, which is why it
deserves its own section in both wrapping guides.

Point `useExisting` at the subclass:

```ts
import { Directive } from '@angular/core';
import { FOR_POPOVER_CONTEXT, ForPopover } from 'forty-cdk/popover';

@Directive({
  selector: '[myPopover]',
  exportAs: 'myPopover',
  host: { class: 'my-popover' },
  providers: [{ provide: FOR_POPOVER_CONTEXT, useExisting: MyPopover }],
})
export class MyPopover extends ForPopover {}
```

Every non-form root that needs a plain re-provide, and the token to name. `ForTable` and
`ForToolbar` are not in this table, because each needs its provider helper instead (see the sections
below).

| Root                                                | Token to re-provide            |
| --------------------------------------------------- | ------------------------------ |
| `ForAccordion`                                      | `FOR_ACCORDION_CONTEXT`        |
| `ForAvatar`                                         | `FOR_AVATAR_CONTEXT`           |
| `ForCalendar`                                       | `FOR_CALENDAR_CONTEXT`         |
| `ForCarousel`                                       | `FOR_CAROUSEL_CONTEXT`         |
| `ForContextMenu` / `ForDropdownMenu` / `ForMenuSub` | `FOR_MENU_CONTEXT`             |
| `ForDialog`                                         | `FOR_DIALOG_CONTEXT`           |
| `ForDisclosure`                                     | `FOR_DISCLOSURE_CONTEXT`       |
| `ForDraggable` / `ForFreeDrag`                      | `FOR_DRAGGABLE_CONTEXT`        |
| `ForDrawer`                                         | `FOR_DRAWER_CONTEXT`           |
| `ForDropList`                                       | `FOR_DROP_LIST_CONTEXT`        |
| `ForField`                                          | `FOR_FIELD_CONTEXT`            |
| `ForFieldset`                                       | `FOR_FIELDSET_CONTEXT`         |
| `ForFileUpload`                                     | `FOR_FILE_UPLOAD_CONTEXT`      |
| `ForHoverCard`                                      | `FOR_HOVER_CARD_CONTEXT`       |
| `ForMenubar`                                        | `FOR_MENUBAR_CONTEXT`          |
| `ForMeter`                                          | `FOR_METER_CONTEXT`            |
| `ForNavigationMenu`                                 | `FOR_NAVIGATION_MENU_CONTEXT`  |
| `ForPagination`                                     | `FOR_PAGINATION_CONTEXT`       |
| `ForPopover`                                        | `FOR_POPOVER_CONTEXT`          |
| `ForProgress`                                       | `FOR_PROGRESS_CONTEXT`         |
| `ForScrollArea`                                     | `FOR_SCROLL_AREA_CONTEXT`      |
| `ForStepper`                                        | `FOR_STEPPER_CONTEXT`          |
| `ForTabs`                                           | `FOR_TABS_CONTEXT`             |
| `ForToast`                                          | `FOR_TOAST_CONTEXT`            |
| `ForTooltip`                                        | `FOR_TOOLTIP_CONTEXT`          |
| `ForTree`                                           | `FOR_TREE_CONTEXT`             |
| `ForVirtualViewport`                                | `FOR_VIRTUAL_VIEWPORT_CONTEXT` |

`ForTree` also provides `FOR_TREE_CONTAINER_CONTEXT`, the container every root-level `[forTreeItem]`
registers through, so a subclass re-provides both tokens with `useExisting`. With only the first
one, the first root-level item throws `FORCDK-TREE-002`.

`ForField` also provides `FOR_FIELD_ANCHOR_CONTEXT`, the slot `[forFieldAnchor]` fills, so a
subclass re-provides both tokens with `useExisting` or the overlay controls inside it stop seeing
the field anchor.

`ForDatePicker` and `ForDateRangePicker` find their projected calendar through the same token,
with `contentChild(FOR_CALENDAR_CONTEXT)`, so the `ForCalendar` row above is also what lets a
picker read a subclassed calendar's selections and focus its active cell. A wrapper that composes
`ForCalendar` through `hostDirectives` is found the same way, because the host directive provides
the token itself.

Several of these roots (Accordion, Avatar, Carousel, Dialog, Drawer, NavigationMenu, Popover,
Stepper, Tabs, Toast, Tree) split their coordination
surface in two: the public `FOR_<PRIMITIVE>_CONTEXT` above, and an internal interface carrying the
piece-registration protocol that is deliberately **not** exported
([#1399](https://github.com/tutkli/forty-cdk/issues/1399),
[#1524](https://github.com/tutkli/forty-cdk/issues/1524)). That split is invisible to a wrapper
([#1593](https://github.com/tutkli/forty-cdk/issues/1593)): both surfaces are two typed views of the
**same token on the same object**, so the one-line re-provide above installs all of it.

What that costs is a precondition worth stating: on those roots the token must be aliased to the
root itself (`useExisting` pointing at the root's class or a subclass of it) because the pieces
read it at the internal interface's type. A `useValue` carrying your own object satisfies the token's
declared type and resolves, but has none of the registration protocol behind it; in dev mode the
first piece to resolve rejects it with a `[forty-cdk/<primitive>]`-prefixed error naming this shape
([#1669](https://github.com/tutkli/forty-cdk/issues/1669)).

**Intermediate pieces provide tokens too**, and subclassing one has the same requirement:
`ForAccordionItem` (`FOR_ACCORDION_ITEM_CONTEXT`), `ForStepperItem`
(`FOR_STEPPER_ITEM_CONTEXT`), `ForTreeItem` (`FOR_TREE_ITEM_CONTEXT`), `ForTreeGroup`
(`FOR_TREE_CONTAINER_CONTEXT`), `ForMenuGroup` (`FOR_MENU_GROUP_CONTEXT`), `ForMenuRadioGroup`
(`FOR_MENU_RADIO_GROUP_CONTEXT`), `ForTreeNodeDrag` (`FOR_TREE_NODE_DRAG_CONTEXT`).
`ForTableRow` is the one piece whose tokens cannot be imported, so it spreads a helper (see below).

### `ForTable` needs its provider helper, not a hand-written provider

`ForTable` is the one root a hand-written provider list cannot wrap. Its piece-registration protocol
is not a second view of the root at all: it is a **separate provider** (`TableRegistry`, reached
through a token that lives in `forty-cdk/core` so `forty-cdk/table-virtualization` can register
through it from a second entry point), and `[forTable]`'s own constructor injects it. A subclass
whose `providers` name only the public token therefore fails to construct at all (`NG0201`), and
neither the registry class nor its token can be written by name from outside the library. Spread the
helper instead:

```ts
import { Directive } from '@angular/core';
import { ForTable, provideForTable } from 'forty-cdk/table';

@Directive({
  selector: '[myTable]',
  exportAs: 'myTable',
  providers: provideForTable(MyTable),
})
export class MyTable<T> extends ForTable<T> {}
```

`<for-table-body>` has a public `provideForTableDefRegistry()` for the same reachability reason, but
it is not a subclassing helper. See [Table](../projects/forty-cdk/table/README.md) for the scaffold
wrapper shape it supports.

### `ForToolbar` and `ForTableRow` spread their helpers too

Two more classes provide a token a wrapper cannot import, and each exports a helper that installs
its whole set:

- **`ForToolbar`** also provides the internal roving channel a nested `[forToggleGroup]`'s items
  join the toolbar's single Tab stop through. A subclass re-providing only `FOR_TOOLBAR_CONTEXT`
  renders without an error, but its toggle items fall back to their own group: the toolbar has two
  Tab stops and its arrow keys never reach them.
- **`ForTableRow`** provides the row context and the cell-registration wiring, and neither token is
  public. A subclass without them makes every `[forTableCell]` inside it throw
  `FORCDK-TABLE-012`.

```ts
import { Directive } from '@angular/core';
import { ForTableRow, provideForTableRow } from 'forty-cdk/table';
import { ForToolbar, provideForToolbar } from 'forty-cdk/toolbar';

@Directive({
  selector: '[myToolbar]',
  exportAs: 'myToolbar',
  providers: provideForToolbar(MyToolbar),
})
export class MyToolbar extends ForToolbar {}

@Directive({
  selector: '[myTableRow]',
  exportAs: 'myTableRow',
  providers: provideForTableRow(MyTableRow),
})
export class MyTableRow extends ForTableRow {}
```

The library's own `[forToolbar]` and `[forTableRow]` declare their providers through the same
helpers, so a subclass cannot drift from the set the root really installs. Wrapping through
`hostDirectives` needs none of this.

## What a wrapper must not swallow

Wrapping the root is safe. Wrapping the _pieces_ into a single opaque component is where design
systems lose behaviour the primitives were built to give them:

- **Keep mount == open in the consumer's hands.** Overlay content is presence-controlled by the
  consumer's `@if`. The library never applies `[hidden]`, precisely so `animate.enter` /
  `animate.leave` work. A wrapper that renders the content unconditionally and toggles CSS
  `display` loses the focus trap / scroll-lock / dismissible-layer lifecycle, which all hang off the
  content directive's lifetime.
- **Re-expose `exportAs`, or the template API disappears.** Consumers reach imperative methods
  through `#ref="forPopover"`. A subclass declares its own `exportAs`; pick a name and document it.
- **Do not re-emit outputs by hand.** A subclass inherits `(dismiss)`, `(escapeKeyDown)`,
  `(openChange)` and friends already. Declaring a same-named `output()` in the subclass shadows the
  inherited one and silently drops the library's emissions.
- **Leave the `data-*` hooks alone.** `data-state`, `data-side`, `data-orientation`,
  `data-highlighted` and the boolean flags are the styling contract
  ([Styling](styling.md)); a wrapper adds classes _next to_ them rather than replacing them.
- **Forward `dir` rather than re-deriving it.** The root already resolves the ambient writing
  direction and reflects it to the host; a wrapper that adds its own `[attr.dir]` fights it.

## Choosing a pattern

| Situation                                                        | Pattern                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Styled wrapper around one root                                   | subclass + re-provide the context token                                                                 |
| `ForTable`, `ForToolbar`, `ForTableRow`                          | subclass + spread `provideForTable(MyRoot)` / `provideForToolbar(MyRoot)` / `provideForTableRow(MyRow)` |
| Wrapper that must extend a different base class                  | `hostDirectives`, re-exposing the surface by hand                                                       |
| Form-value control (`Switch`, `Select`, `Slider`, `Combobox`, …) | [Wrapping form primitives](wrapping-form-primitives.md)                                                 |
