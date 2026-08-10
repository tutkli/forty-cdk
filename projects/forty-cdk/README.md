# forty-cdk

Headless / styleless UI primitives for Angular with WAI-ARIA accessibility built in.
Designed from the ground up for modern Angular — the API is built around signals, standalone
directives, and dependency-injection composition.

**Browsing?** The [documentation site](https://tutkli.github.io/forty-cdk/) renders every primitive with live examples.

**New here?** [Your first overlay](../../docs/your-first-overlay.md) walks one Popover from empty markup to styled-and-animated and explains the two concepts every overlay shares: the `@if` / open-state model and the portal → global CSS requirement.

**Styling these primitives?** [Styling forty-cdk](../../docs/styling.md) explains the three hooks you style against — your own class (not the directive selector), `data-*` state attributes, and `--for-*` custom properties — and links to each primitive's styling reference.

## Installation

```bash
npm install forty-cdk
```

### Peer dependencies

Required:

- `@angular/common` `^22.0.1`
- `@angular/core` `^22.0.1`

Optional — install only if you use the matching entry point / primitives:

| Peer                               | Needed by                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@angular/forms` `^22.0.1`         | Form-control primitives (`Switch`, `Checkbox`, `RadioGroup`, `Listbox`, `Select`, `Slider`, `Combobox`, …). They implement `FormValueControl` / `FormCheckboxControl` from `@angular/forms/signals` for `[formField]` auto-wiring. The contract is type-only, so the published bundle never references the package — consumers using only non-form primitives can skip it. |
| `@internationalized/date` `^3.0.0` | The `forty-cdk/internationalized-date` entry point (`InternationalizedDateAdapter`, `InternationalizedDateTimeAdapter`). The date/time primitives themselves depend only on the abstract `DateAdapter` contract from `forty-cdk/shared` — install this peer only when you import that entry point.                                                                         |

### Regular dependencies

Two packages are regular dependencies, installed automatically and never declared as peers, because nothing of either crosses the public API by value. Both tree-shake out of a bundle that imports no primitive using them.

| Dependency               | Used by                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `@floating-ui/dom`       | Positioning for the anchored overlays — `Tooltip`, `Popover`, `Menu`, `Combobox`, `Select`, `Date Picker`, `Time Picker`, `Hover Card`. |
| `@tanstack/virtual-core` | The windowing core behind `forty-cdk/virtualization`, and therefore `forty-cdk/table-virtualization` and `forty-cdk/virtual-reorder`.   |

## Entry points

**The package name itself exports nothing.** `import { … } from 'forty-cdk'` resolves to no symbol, and your editor will not auto-import anything under the bare package name — by design, so that every symbol has exactly one import path. There are three specifiers you do import from:

| Specifier                          | What it exports                                                                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forty-cdk/<primitive>`            | The primitive's directives, components, context tokens and defaults provider — `ForDialog` from `forty-cdk/dialog`, `ForAccordion` from `forty-cdk/accordion`, and so on for every entry in the tables below.                                           |
| [`forty-cdk/shared`](shared)       | The cross-primitive contract types a primitive's public API references — `WritingDirection`, `VetoableEvent`, `DateAdapter`, `FloatingSide`, … — declared once and published once. Eight ship from their own primitive instead; that README names them. |
| `forty-cdk/internationalized-date` | The `@internationalized/date` adapters, kept apart so that optional peer stays genuinely optional.                                                                                                                                                      |

`forty-cdk/core` and `forty-cdk/core-overlay` resolve too, but neither is **public**: together they hold the engines and DI singletons the library refactors freely, and they exist so every primitive resolves that shared implementation to one compiled module. They are two rather than one for a bundling reason you get for free: a published module is a bundler's chunk-splitting unit, so keeping the positioning engine (`@floating-ui/dom` and the overlay shells) in its own module means a lazy route that renders no overlay does not load it. Measured on a seven-lazy-route app, that is **41.7 kB raw / 12.1 kB transfer** a non-overlay route no longer pays. If a symbol you need is not exported by the three specifiers above, it is internal by design — [open an issue](https://github.com/tutkli/forty-cdk/issues) rather than importing from either.

## Errors

Every error and warning the library reports carries a stable code and, where they add something, the cause and the fix:

```text
[forty-cdk/dialog] FORCDK-DIALOG-001: ForDialogTitle must be used inside a [forDialog] element.

Cause: No FOR_DIALOG_CONTEXT provider is visible from ForDialogTitle. Angular resolves a
directive's dependencies at the template's declaration site rather than where it is stamped, so a
piece declared in an ng-template outside the root resolves nothing even when it renders inside it.

Fix: Move ForDialogTitle inside a [forDialog] element, declaring any ng-template it lives in there too.
```

The code is `FORCDK-<AREA>-<NUMBER>`, where the area is the entry point you imported from — so `FORCDK-DATE-PICKER-003` came from `forty-cdk/date-picker`, and `FORCDK-CORE-*` from machinery shared across primitives (those still print the prefix of the primitive you actually wrote). **A code is stable and always means the same failure**, so it is safe to search for, quote in an issue, or match on in your own error handling; a retired code is never reused for something else.

Warnings are dev-mode only. Errors are not: a piece that resolved no context would fail one line later anyway, so it throws in production too and says why.

## Primitives

Every primitive ships as its own secondary entry point, and each lives in its own folder under `projects/forty-cdk/` with its own `README.md` documenting its anatomy, API, keyboard interaction and styling hooks. Standalone directives plus `"sideEffects": false` mean your bundle only ever includes the primitives you import.

The tables below group the primitives by purpose. The link on each name opens that primitive's README — the canonical reference for which HTML element each directive belongs on, its inputs / outputs, `data-*` attributes and keyboard map.

### Overlays

| Primitive                | What it is                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [Dialog](dialog)         | Modal window with a focus trap, scroll lock and Escape / dismiss handling. Also openable imperatively via `ForDialogManager`. |
| [Drawer](drawer)         | Side or bottom sheet on the modal-dialog pattern, adding pointer-driven swipe-to-dismiss and snap points.                     |
| [Popover](popover)       | Non-modal floating panel anchored to its trigger by floating-ui, dismissed on Escape or outside interaction.                  |
| [Hover Card](hover-card) | Floating card that opens on hover to preview the content behind a link, with a pointer bridge.                                |
| [Tooltip](tooltip)       | Small floating label that describes its trigger on hover or focus, without ever taking focus itself.                          |
| [Toast](toast)           | Brief, auto-dismissing notifications stacked in a corner, opened programmatically via `ForToastManager`.                      |

### Menus

| Primitive                      | What it is                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| [Menu](menu)                   | The shared menu surface — items, checkbox / radio items, groups, separators and submenus — composed by every menu-family primitive. |
| [Dropdown Menu](dropdown-menu) | A button that opens a menu of actions, with full keyboard navigation, typeahead and submenus.                                       |
| [Context Menu](context-menu)   | A menu opened by right-click or long-press, anchored to the pointer position.                                                       |
| [Menubar](menubar)             | A horizontal bar of menus, as in a desktop application, with roving tabindex across the triggers.                                   |

### Navigation

| Primitive                          | What it is                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [Navigation Menu](navigation-menu) | A site-navigation header on the disclosure pattern: buttons expand panels of links into a shared viewport. |
| [Breadcrumbs](breadcrumbs)         | A labelled navigation landmark for a breadcrumb trail, with `aria-current="page"` on the current page.     |
| [Pagination](pagination)           | A navigation landmark that derives a page list with ellipsis gaps, plus previous / next buttons.           |
| [Tabs](tabs)                       | A tablist that switches between panels of content.                                                         |
| [Toolbar](toolbar)                 | A container that groups a set of controls under roving-tabindex navigation.                                |
| [Stepper](stepper)                 | A multi-step wizard on the Tabs pattern: step list, per-step panels, linear gating and progress.           |

### Forms & input

| Primitive                    | What it is                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [Button](button)             | Turns any element into an accessible button with keyboard activation; disabled stays focusable and state is reflected as `data-*`.        |
| [Field](field)               | Headless wiring that ties a label, description and error region to a control and reflects validation state as `data-*`.                   |
| [Fieldset](fieldset)         | Headless grouping that gives related fields a shared accessible name plus an optional shared disabled state.                              |
| [Input](input)               | Attribute directives for single- and multi-line text: a string `value()` that auto-wires with Signal Forms and reflects every form state. |
| [Search](search)             | A `role="searchbox"` input mirrored to a signal, paired with a self-hiding clear button; reuses Input's form-value wiring.                |
| [Number Input](number-input) | A numeric spinbutton with keyboard stepping, optional +/− buttons, min / max / step clamping and Intl formatting.                         |
| [OTP Input](otp-input)       | A one-time-code / PIN field: typed and pasted characters fill styled slots, with masking and a complete event.                            |
| [File Upload](file-upload)   | A headless drag-and-drop / dialog file-selection zone over a visually-hidden native `<input type="file">`.                                |
| [Switch](switch)             | A binary on / off control toggled by click, Enter or Space.                                                                               |
| [Checkbox](checkbox)         | A checkbox supporting the three states checked, unchecked and indeterminate.                                                              |
| [Toggle](toggle)             | A two-state button that stays pressed or unpressed.                                                                                       |
| [Radio Group](radio-group)   | A set of radio buttons where only one option can be selected, with arrow-key navigation.                                                  |
| [Slider](slider)             | A draggable thumb that picks a numeric value along a track.                                                                               |
| [Select](select)             | A trigger that opens a portaled listbox popup to pick one or many options, with groups and separators.                                    |
| [Combobox](combobox)         | An editable input paired with a filterable listbox popup, single or multi selection with chips.                                           |
| [Listbox](listbox)           | A scrollable list of selectable options with roving-tabindex navigation, single or multi selection.                                       |

### Date & time

| Primitive                  | What it is                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [Calendar](calendar)       | A single-date calendar grid (APG Grid) over a pluggable date adapter, with roving-tabindex navigation.                                    |
| [Date Field](date-field)   | A segmented date (and optional time) input — each part a spinbutton with locale-driven order and clamping. Ships `ForDateRangeField` too. |
| [Date Picker](date-picker) | A trigger that opens a floating calendar to pick a date, composing Calendar inside a dismissible popover. Ships `ForDateRangePicker` too. |
| [Time Field](time-field)   | A segmented time-of-day input with 12 / 24-hour cycles, optional seconds and min / max clamping. Ships `ForTimeRangeField` too.           |
| [Time Picker](time-picker) | A trigger that opens a floating listbox of generated time slots over a pluggable date adapter.                                            |

### Disclosure & content

| Primitive                | What it is                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [Accordion](accordion)   | A stack of collapsible sections, optionally allowing multiple panels open at once.                                   |
| [Disclosure](disclosure) | A single trigger that shows or hides a related region of content.                                                    |
| [Carousel](carousel)     | A slideshow of panels with previous / next controls, indicators, looping, multi-slide views and accessible autoplay. |

### Data & layout

| Primitive                          | What it is                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Table](table)                     | A headless data table over a native `<table>` or `<div>` grid: sticky headers, 2D keyboard navigation, row selection, sortable headers, column resizing and reordering. |
| [Tree](tree)                       | A nested tree view for hierarchical data: expandable nodes with roving-tabindex navigation, selection and typeahead.                                                    |
| [Scroll Area](scroll-area)         | A scrollable region with cross-browser, stylable synthetic scrollbars.                                                                                                  |
| [Pane Resizer](pane-resizer)       | A focusable divider that resizes the panes on either side — draggable and keyboard-operable.                                                                            |
| [Separator](separator)             | A static, optionally semantic divider between groups of content, horizontal or vertical.                                                                                |
| [Aspect Ratio](aspect-ratio)       | A container that keeps its content at a fixed width-to-height ratio.                                                                                                    |
| [Avatar](avatar)                   | A user image with a graceful fallback across its loading lifecycle.                                                                                                     |
| [Visually Hidden](visually-hidden) | Hides content visually while keeping it in the accessibility tree — screen-reader-only labels, plus the injectable `LiveAnnouncer`.                                     |

### Feedback

| Primitive            | What it is                                                                   |
| -------------------- | ---------------------------------------------------------------------------- |
| [Progress](progress) | A bar that reflects the completion progress of a task.                       |
| [Meter](meter)       | A gauge that shows a scalar value within a known range, bucketed into bands. |

### Utilities

Headless — no DOM or ARIA of their own; an `inject*` / provider API that other primitives compose.

| Utility                                      | What it is                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Breakpoints](breakpoints)                   | A signal-first, zoneless, SSR-safe viewport breakpoint observer (`injectBreakpoints`), plus the `prefers-reduced-motion` detector.                     |
| [Drag & Drop](drag-drop)                     | Headless, accessible drag-and-drop for sortable lists and cross-list transfers, keyboard and pointer driven.                                           |
| [Virtualization](virtualization)             | A headless windowing core (`injectVirtualizer`) plus a `[forVirtualViewport]` layer that renders only the visible slice of huge lists.                 |
| [Table Virtualization](table-virtualization) | `[forTableVirtualized]`, the adapter that windows a `[forTable]` grid — its own entry point because it composes both the table and the windowing core. |
| [Virtual Reorder](virtual-reorder)           | `[forVirtualReorder]`, drag-reorder for a windowed `*forVirtualFor` list — its own entry point because it composes both the viewport and drag-drop.    |

## Building

```bash
pnpm build
```

Build artifacts land in `dist/forty-cdk` (consumed locally via the `forty-cdk` path alias in the root `tsconfig.json`).

## Testing

Tests run on Vitest via the Angular CLI builder `@angular/build:unit-test`:

```bash
pnpm test                                              # all specs, single pass
pnpm test:watch                                        # watch mode
pnpm exec ng test forty-cdk --include "../accordion/src/accordion.spec.ts"  # single file (path relative to projects/forty-cdk/src/)
pnpm exec ng test forty-cdk --filter "Enter and Space select"  # tests by name (regex)
```

The `-- <path>` / `-- -t "<name>"` passthrough forms do **not** work on this setup (pnpm mangles the quoted `--`, so `ng` rejects it) — use the builder's own `--include` (repeatable) and `--filter` (regex) flags instead.

The whole suite runs under `provideZonelessChangeDetection()`, so reactivity is verified without Zone.js on every spec rather than in a per-primitive case.
