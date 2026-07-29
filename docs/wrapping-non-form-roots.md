# Wrapping non-form roots

Design systems built on forty-cdk rarely expose the raw primitives — they wrap each one in a styled
component carrying the system's selector and classes. For **form-value** controls that story lives in
[Wrapping form primitives](wrapping-form-primitives.md), which owns the Signal Forms contract, the
`FOR_*_HOST_DIRECTIVE_INPUTS` name tuples, and the `[formField]` discovery rules.

This guide covers everything else: the composed roots with no form value — Accordion, Dialog, Drawer,
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
  selector: '[mtxAccordion]',
  host: { class: 'mtx-accordion' },
})
export class MtxAccordion extends ForAccordion {}
```

`hostDirectives` — the other pattern the form guide documents — is available too, but it is a worse
fit for a composed root and there are no name tuples to help you: `FOR_*_HOST_DIRECTIVE_INPUTS` is a
form-control artefact (it exists because an unbound value / touched name fails _silently_ under
`[formField]`), and no non-form primitive ships one. Re-exposing an accordion's or a dialog's whole
surface through `hostDirectives` means hand-maintaining that list with nothing to check it against,
so prefer the subclass and reach for `hostDirectives` only when your wrapper must also extend a
different base class.

## Re-provide the context token — this is the one that breaks

A composed primitive coordinates its pieces through an `InjectionToken` its root provides:

```ts
@Directive({
  selector: '[forDisclosure]',
  providers: [{ provide: FOR_DISCLOSURE_CONTEXT, useExisting: ForDisclosure }],
})
export class ForDisclosure { … }
```

Angular inherits compiled metadata through the class hierarchy, but **each decorator declares its own
`providers`, replacing the parent's array wholesale.** A bare subclass therefore ships with no
context provider at all, and every projected piece — `[forAccordionTrigger]`, `[forDialogTitle]`,
`[forPopoverContent]`, `[forTabsTrigger]` — throws the primitive's orphan error the moment it tries
to resolve. The failure is loud, but the cause is not obvious from the message, which is why it
deserves its own section in both wrapping guides.

Point `useExisting` at the subclass:

```ts
import { Directive } from '@angular/core';
import { FOR_POPOVER_CONTEXT, ForPopover } from 'forty-cdk/popover';

@Directive({
  selector: '[mtxPopover]',
  exportAs: 'mtxPopover',
  host: { class: 'mtx-popover' },
  providers: [{ provide: FOR_POPOVER_CONTEXT, useExisting: MtxPopover }],
})
export class MtxPopover extends ForPopover {}
```

Every non-form root that needs a plain re-provide, and the token to name. The roots whose context is
**split** are not in this table — they need `provideFor<Primitive>()` instead, see the section below:

| Root                                                | Token to re-provide            |
| --------------------------------------------------- | ------------------------------ |
| `ForAvatar`                                         | `FOR_AVATAR_CONTEXT`           |
| `ForCalendar`                                       | `FOR_CALENDAR_CONTEXT`         |
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
| `ForPagination`                                     | `FOR_PAGINATION_CONTEXT`       |
| `ForPopover`                                        | `FOR_POPOVER_CONTEXT`          |
| `ForProgress`                                       | `FOR_PROGRESS_CONTEXT`         |
| `ForScrollArea`                                     | `FOR_SCROLL_AREA_CONTEXT`      |
| `ForStepper`                                        | `FOR_STEPPER_CONTEXT`          |
| `ForToolbar`                                        | `FOR_TOOLBAR_CONTEXT`          |
| `ForTooltip`                                        | `FOR_TOOLTIP_CONTEXT`          |
| `ForTree`                                           | `FOR_TREE_CONTEXT`             |
| `ForVirtualViewport`                                | `FOR_VIRTUAL_VIEWPORT_CONTEXT` |

**Intermediate pieces provide tokens too**, and subclassing one has the same requirement:
`ForAccordionItem` (`FOR_ACCORDION_ITEM_CONTEXT`), `ForStepperItem`
(`FOR_STEPPER_ITEM_CONTEXT`), `ForTableRow` (`FOR_TABLE_ROW_CONTEXT`), `ForTreeItem`
(`FOR_TREE_ITEM_CONTEXT`), `ForTreeGroup` (`FOR_TREE_CONTAINER_CONTEXT`), `ForMenuGroup`
(`FOR_MENU_GROUP_CONTEXT`), `ForMenuRadioGroup` (`FOR_MENU_RADIO_GROUP_CONTEXT`),
`ForTreeNodeDrag` (`FOR_TREE_NODE_DRAG_CONTEXT`).

### Split roots need their provider helper, not a hand-written provider

Some roots split their coordination surface in two: the public `FOR_<PRIMITIVE>_CONTEXT` an advanced
consumer injects, and a second token carrying the piece-registration protocol that is deliberately
**not** exported ([#1399](https://github.com/tutkli/forty-cdk/issues/1399),
[#1524](https://github.com/tutkli/forty-cdk/issues/1524)). A hand-written re-provide of the public
token is not enough, and the missing provider cannot be written by name from outside the library — so
every piece orphans with the primitive's "must be used inside a […]" error. Worse for `ForTable`,
whose own constructor injects the registry: the subclass fails to construct at all (`NG0201`).
Spread the helper instead:

```ts
import { Directive } from '@angular/core';
import { ForTable, provideForTable } from 'forty-cdk/table';

@Directive({
  selector: '[mtxTable]',
  exportAs: 'mtxTable',
  providers: provideForTable(MtxTable),
})
export class MtxTable<T> extends ForTable<T> {}
```

| Split non-form root | Helper to spread           |
| ------------------- | -------------------------- |
| `ForAccordion`      | `provideForAccordion`      |
| `ForCarousel`       | `provideForCarousel`       |
| `ForNavigationMenu` | `provideForNavigationMenu` |
| `ForTable`          | `provideForTable`          |
| `ForTabs`           | `provideForTabs`           |
| `ForToast`          | `provideForToast`          |

`ForRadioGroup`, `ForSelect` and `ForCombobox` are split too; all three are form controls, so
`provideForRadioGroup` / `provideForSelect` / `provideForCombobox` are documented in
[Wrapping form primitives](wrapping-form-primitives.md#roots-with-a-split-context-use-providefor).

## What a wrapper must not swallow

Wrapping the root is safe. Wrapping the _pieces_ into a single opaque component is where design
systems lose behaviour the primitives were built to give them:

- **Keep mount == open in the consumer's hands.** Overlay content is presence-controlled by the
  consumer's `@if` — the library never applies `[hidden]`, precisely so `animate.enter` /
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

| Situation                                                        | Pattern                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| Styled wrapper around one root                                   | subclass + re-provide the context token                 |
| Root with a split context (`ForTable`, `ForTabs`, …)             | subclass + spread `provideFor<Primitive>(MyRoot)`       |
| Wrapper that must extend a different base class                  | `hostDirectives`, re-exposing the surface by hand       |
| Form-value control (`Switch`, `Select`, `Slider`, `Combobox`, …) | [Wrapping form primitives](wrapping-form-primitives.md) |
