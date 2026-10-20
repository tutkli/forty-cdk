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

Every non-form root that needs a plain re-provide, and every token it provides. A subclass
re-provides all of a row's tokens, each with `useExisting` pointing at the subclass unless a
paragraph below the table gives it another shape. `ForTable` and `ForToolbar` are not in this
table, because each needs its provider helper instead, and neither is `ForVirtualViewport`, because
it is a component and is composed rather than subclassed (see the sections below).

| Root                                         | Tokens to re-provide                                                  |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `ForAccordion`                               | `FOR_ACCORDION_CONTEXT`                                               |
| `ForAvatar`                                  | `FOR_AVATAR_CONTEXT`                                                  |
| `ForCalendar`                                | `FOR_CALENDAR_CONTEXT`                                                |
| `ForCarousel`                                | `FOR_CAROUSEL_CONTEXT`                                                |
| `ForContextMenu`                             | `FOR_MENU_CONTEXT`, `FOR_CONTEXT_MENU_CONTEXT`                        |
| `ForDialog`                                  | `FOR_DIALOG_CONTEXT`, `FOR_FIELD_CONTEXT`, `FOR_FIELD_ANCHOR_CONTEXT` |
| `ForDisclosure`                              | `FOR_DISCLOSURE_CONTEXT`                                              |
| `ForDraggable` / `ForFreeDrag`               | `FOR_DRAGGABLE_CONTEXT`                                               |
| `ForDrawer`                                  | `FOR_DRAWER_CONTEXT`, `FOR_FIELD_CONTEXT`, `FOR_FIELD_ANCHOR_CONTEXT` |
| `ForDropdownMenu` / `ForMenu` / `ForMenuSub` | `FOR_MENU_CONTEXT`                                                    |
| `ForDropList`                                | `FOR_DROP_LIST_CONTEXT`                                               |
| `ForField`                                   | `FOR_FIELD_CONTEXT`, `FOR_FIELD_ANCHOR_CONTEXT`                       |
| `ForFieldset`                                | `FOR_FIELDSET_CONTEXT`                                                |
| `ForFileUpload`                              | `FOR_FILE_UPLOAD_CONTEXT`                                             |
| `ForHoverCard`                               | `FOR_HOVER_CARD_CONTEXT`                                              |
| `ForMenubar`                                 | `FOR_MENUBAR_CONTEXT`, `FOR_MENU_CONTEXT`                             |
| `ForMeter`                                   | `FOR_METER_CONTEXT`                                                   |
| `ForNavigationMenu`                          | `FOR_NAVIGATION_MENU_CONTEXT`                                         |
| `ForPagination`                              | `FOR_PAGINATION_CONTEXT`                                              |
| `ForPopover`                                 | `FOR_POPOVER_CONTEXT`                                                 |
| `ForProgress`                                | `FOR_PROGRESS_CONTEXT`                                                |
| `ForScrollArea`                              | `FOR_SCROLL_AREA_CONTEXT`                                             |
| `ForStepper`                                 | `FOR_STEPPER_CONTEXT`                                                 |
| `ForTabs`                                    | `FOR_TABS_CONTEXT`                                                    |
| `ForToast`                                   | `FOR_TOAST_CONTEXT`                                                   |
| `ForTooltip`                                 | `FOR_TOOLTIP_CONTEXT`                                                 |
| `ForTree`                                    | `FOR_TREE_CONTEXT`, `FOR_TREE_CONTAINER_CONTEXT`                      |

The second token is not optional on any row. `FOR_TREE_CONTAINER_CONTEXT` is the container every
root-level `[forTreeItem]` registers through, so without it the first root-level item throws
`FORCDK-TREE-002`. `FOR_FIELD_ANCHOR_CONTEXT` is the slot `[forFieldAnchor]` fills, so without it
the overlay controls inside a subclassed `ForField` stop seeing the field anchor.
`[forContextMenuTrigger]` resolves `FOR_CONTEXT_MENU_CONTEXT`, not the menu context, so a
`ForContextMenu` subclass without it throws `FORCDK-CONTEXT-MENU-001` from its trigger.

`ForMenubar` provides `FOR_MENU_CONTEXT` through a factory rather than as itself: the bar shares one
menu context across all of its triggers, and that context is the root's `menuCtx`. A subclass
writes the same factory against itself. Without it, every `[forMenuContent]` and `[forMenuItem]` in
the bar throws `FORCDK-MENU-001`.

```ts
import { Directive } from '@angular/core';
import { FOR_MENUBAR_CONTEXT, ForMenubar } from 'forty-cdk/menubar';
import { FOR_MENU_CONTEXT } from 'forty-cdk/shared';

@Directive({
  selector: '[myMenubar]',
  exportAs: 'myMenubar',
  providers: [
    { provide: FOR_MENUBAR_CONTEXT, useExisting: MyMenubar },
    { provide: FOR_MENU_CONTEXT, useFactory: (bar: MyMenubar) => bar.menuCtx, deps: [MyMenubar] },
  ],
})
export class MyMenubar extends ForMenubar {}
```

`ForDialog` and `ForDrawer` are field boundaries: they provide `FOR_FIELD_CONTEXT` and
`FOR_FIELD_ANCHOR_CONTEXT` as `null`, so a control inside the surface never registers with a
`[forField]` the surface is declared in. A subclass re-provides both with `useValue: null`, importing
them from `forty-cdk/field`. Without them the subclass still renders, but the first control inside
it takes over the outer field's label and description wiring.

```ts
import { Directive } from '@angular/core';
import { FOR_DIALOG_CONTEXT, ForDialog } from 'forty-cdk/dialog';
import { FOR_FIELD_ANCHOR_CONTEXT, FOR_FIELD_CONTEXT } from 'forty-cdk/field';

@Directive({
  selector: '[myDialog]',
  exportAs: 'myDialog',
  providers: [
    { provide: FOR_DIALOG_CONTEXT, useExisting: MyDialog },
    { provide: FOR_FIELD_CONTEXT, useValue: null },
    { provide: FOR_FIELD_ANCHOR_CONTEXT, useValue: null },
  ],
})
export class MyDialog extends ForDialog {}
```

The overlay content pieces are field boundaries the same way, and a subclass of one re-provides
its tokens as `null` too: `ForComboboxContent`, `ForDatePickerContent`, `ForPopoverContent`,
`ForSelectContent` and `ForTimePickerContent` (`FOR_FIELD_CONTEXT`, `FOR_FIELD_ANCHOR_CONTEXT`),
and `ForFieldBoundary` (`FOR_FIELD_CONTEXT`).

`ForDatePicker` and `ForDateRangePicker` find their projected calendar through the same token,
with `contentChild(FOR_CALENDAR_CONTEXT)`, so the `ForCalendar` row above is also what lets a
picker read a subclassed calendar's selections and focus its active cell. A wrapper that composes
`ForCalendar` through `hostDirectives` is found the same way, because the host directive provides
the token itself.

Several of these roots (`ForAccordion`, `ForAvatar`, `ForCalendar`, `ForCarousel`,
`ForContextMenu`, `ForDialog`, `ForDraggable`, `ForFreeDrag`, `ForDrawer`, `ForHoverCard`,
`ForNavigationMenu`, `ForPopover`, `ForScrollArea`, `ForStepper`, `ForTabs`, `ForToast`,
`ForTooltip`, `ForTree`, plus the `ForTable` and `ForVirtualViewport` covered below) split their coordination
surface in two: the
public `FOR_<PRIMITIVE>_CONTEXT` above, and an internal interface carrying the piece-registration
protocol that is deliberately **not** exported
([#1399](https://github.com/tutkli/forty-cdk/issues/1399),
[#1524](https://github.com/tutkli/forty-cdk/issues/1524)). That split is invisible to a wrapper
([#1593](https://github.com/tutkli/forty-cdk/issues/1593)): both surfaces are two typed views of the
**same token on the same object**, so the re-provide above installs all of it.

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
(`FOR_MENU_RADIO_GROUP_CONTEXT`, `FOR_MENU_GROUP_CONTEXT`), `ForNavigationMenuItem`
(`FOR_NAVIGATION_MENU_ITEM_CONTEXT`), `ForTreeNodeDrag` (`FOR_TREE_NODE_DRAG_CONTEXT`),
`ForDropListGroup` (`FOR_DROP_LIST_GROUP`), `ForVirtualReorder` (`FOR_DROP_LIST_COORDINATOR`).
A `ForMenuRadioGroup` subclass without `FOR_MENU_GROUP_CONTEXT` leaves a `[forMenuGroupLabel]`
inside it throwing `FORCDK-MENU-002`, or labelling an enclosing `[forMenuGroup]` instead.
`ForTableRow` is the one piece whose tokens cannot be imported, so it spreads a helper (see below).
`ForTableColumnReorder` (`FOR_DROP_LIST_DEFAULT_ORIENTATION`, `FOR_DROP_LIST_ROVING_DELEGATE`,
`FOR_DRAGGABLE_LIFT_GUARD`) and `ForTableRowReorder` (`FOR_DROP_LIST_COORDINATOR`,
`FOR_DROP_LIST_ROVING_DELEGATE`) build their roving delegate inside the library, so wrap either one
through `hostDirectives`, which brings its providers along, rather than subclassing it.

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

### `ForVirtualViewport` is a component: compose it, do not subclass it

Every root above is a directive. `ForVirtualViewport` is a component, and its own template renders
the sizer its rows are positioned in. A subclass inherits neither that template nor anything else of
the base's view, so neither subclass works: a `@Directive` subclass throws
`NG0903: Directives cannot inherit Components`, and a `@Component` subclass renders its own
template in place of the sizer, so the rows have no total-size spacer and the list cannot scroll.

Compose the viewport inside your wrapper's template and render the rows there with
`*forVirtualFor`, stamping the consumer's row template into each one with `NgTemplateOutlet`. The
viewport in your template provides `FOR_VIRTUAL_VIEWPORT_CONTEXT` to the rows it renders, so the
wrapper re-provides nothing. [Virtualization](../projects/forty-cdk/virtualization/README.md#wrapping-in-a-design-system)
has the full wrapper.

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
| Styled wrapper around one root                                   | subclass + re-provide every token in its table row                                                      |
| `ForTable`, `ForToolbar`, `ForTableRow`                          | subclass + spread `provideForTable(MyRoot)` / `provideForToolbar(MyRoot)` / `provideForTableRow(MyRow)` |
| `ForVirtualViewport`                                             | compose it in the wrapper's template, rows stamped through `NgTemplateOutlet`                           |
| Wrapper that must extend a different base class                  | `hostDirectives`, re-exposing the surface by hand                                                       |
| Form-value control (`Switch`, `Select`, `Slider`, `Combobox`, …) | [Wrapping form primitives](wrapping-form-primitives.md)                                                 |
