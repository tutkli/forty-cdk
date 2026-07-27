# forty-cdk

Headless / styleless UI primitives for Angular with WAI-ARIA accessibility built in.
Designed from the ground up for modern Angular — the API is built around signals, standalone
directives, and dependency-injection composition.

**New here?** [Your first overlay](../../docs/your-first-overlay.md) walks one Popover from empty markup to styled-and-animated and explains the two concepts every overlay shares: the `@if` / open-state model and the portal → global CSS requirement.

**Styling these primitives?** [Styling forty-cdk](../../docs/styling.md) explains the three hooks you style against — your own class (not the directive selector), `data-*` state attributes, and `--for-*` custom properties — and links to each primitive's styling reference.

## Installation

```bash
npm install forty-cdk
```

### Peer dependencies

Required:

- `@angular/common` `^22.0.0`
- `@angular/core` `^22.0.0`

Optional — install only if you use the matching entry point / primitives:

| Peer                               | Needed by                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@angular/forms` `^22.0.0`         | Form-control primitives (`Switch`, `Checkbox`, `RadioGroup`, `Listbox`, `Select`, `Slider`, `Combobox`, …). They implement `FormValueControl` / `FormCheckboxControl` from `@angular/forms/signals` for `[formField]` auto-wiring. The contract is type-only, so the published bundle never references the package — consumers using only non-form primitives can skip it. |
| `@internationalized/date` `^3.0.0` | The `forty-cdk/internationalized-date` entry point (`InternationalizedDateAdapter`, `InternationalizedDateTimeAdapter`). The date/time primitives themselves only depend on the abstract `DateAdapter` contract from the main entry point — install this peer only when you import that entry point.                                                                       |

`@angular/forms/signals` is stable as of Angular 22, so the peer follows the standard major range (`^22.0.0`).

### Regular dependencies

`@floating-ui/dom` is a regular dependency, installed automatically with the package. Positioned overlays (`Tooltip`, `Popover`, `Menu`, `Combobox`, `Select`, etc.) import it statically from the main entry point, so every consumer's build must be able to resolve it — but it is internal-only (no floating-ui value crosses the public API) and tree-shakes out of your bundle when you don't use any positioned primitive.

## Primitives

Every primitive ships as its own **secondary entry point** — import `ForDialog` from `forty-cdk/dialog`, `ForAccordion` from `forty-cdk/accordion`, and so on — backed by the shared `forty-cdk/core` entry point. Each lives in its own folder under `projects/forty-cdk/` with its own `README.md` documenting its anatomy, API, keyboard interaction and styling hooks. The `@internationalized/date` adapters live in a dedicated `forty-cdk/internationalized-date` entry point so that optional peer stays truly optional. The cross-primitive contract types a primitive's public API references — `WritingDirection`, `VetoableEvent`, `DateAdapter`, `FloatingSide`, … — are published by [`forty-cdk/shared`](shared); the main `forty-cdk` barrel is **intentionally empty** (it exports no symbols), so always import primitives from the specific `forty-cdk/<primitive>` entry point. Standalone directives plus `"sideEffects": false` mean your bundle only ever includes the primitives you import.

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

| Primitive                            | What it is                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [Calendar](calendar)                 | A single-date calendar grid (APG Grid) over a pluggable date adapter, with roving-tabindex navigation.     |
| [Date Field](date-field)             | A segmented date (and optional time) input — each part a spinbutton with locale-driven order and clamping. |
| [Date Picker](date-picker)           | A trigger that opens a floating calendar to pick a date, composing Calendar inside a dismissable popover.  |
| [Date Range Field](date-range-field) | Two labelled spinbutton endpoints (start / end) sharing locale, granularity and bounds.                    |
| [Time Field](time-field)             | A segmented time-of-day input with 12 / 24-hour cycles, optional seconds and min / max clamping.           |
| [Time Picker](time-picker)           | A trigger that opens a floating listbox of generated time slots over a pluggable date adapter.             |
| [Time Range Field](time-range-field) | Two time-of-day endpoints (start / end) sharing the hour cycle and min / max bounds.                       |

### Disclosure & content

| Primitive                | What it is                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [Accordion](accordion)   | A stack of collapsible sections, optionally allowing multiple panels open at once.                                   |
| [Disclosure](disclosure) | A single trigger that shows or hides a related region of content.                                                    |
| [Carousel](carousel)     | A slideshow of panels with previous / next controls, indicators, looping, multi-slide views and accessible autoplay. |

### Data & layout

| Primitive                    | What it is                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Table](table)               | A headless data table over a native `<table>` or `<div>` grid: sticky headers, 2D keyboard navigation, row selection, sortable headers, column resizing and reordering. |
| [Tree](tree)                 | A nested tree view for hierarchical data: expandable nodes with roving-tabindex navigation, selection and typeahead.                                                    |
| [Scroll Area](scroll-area)   | A scrollable region with cross-browser, stylable synthetic scrollbars.                                                                                                  |
| [Pane Resizer](pane-resizer) | A focusable divider that resizes the panes on either side — draggable and keyboard-operable.                                                                            |
| [Separator](separator)       | A static, optionally semantic divider between groups of content, horizontal or vertical.                                                                                |
| [Aspect Ratio](aspect-ratio) | A container that keeps its content at a fixed width-to-height ratio.                                                                                                    |
| [Avatar](avatar)             | A user image with a graceful fallback across its loading lifecycle.                                                                                                     |

### Feedback

| Primitive            | What it is                                                                   |
| -------------------- | ---------------------------------------------------------------------------- |
| [Progress](progress) | A bar that reflects the completion progress of a task.                       |
| [Meter](meter)       | A gauge that shows a scalar value within a known range, bucketed into bands. |

### Utilities

Headless — no DOM or ARIA of their own; an `inject*` / provider API that other primitives compose.

| Utility                          | What it is                                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [Breakpoints](breakpoints)       | A signal-first, zoneless, SSR-safe viewport breakpoint observer (`injectBreakpoints`).                                                 |
| [Drag & Drop](drag-drop)         | Headless, accessible drag-and-drop for sortable lists and cross-list transfers, keyboard and pointer driven.                           |
| [Virtualization](virtualization) | A headless windowing core (`injectVirtualizer`) plus a `[forVirtualViewport]` layer that renders only the visible slice of huge lists. |

## Building

```bash
ng build forty-cdk
```

Build artifacts land in `dist/forty-cdk` (consumed locally via the `forty-cdk` path alias in the root `tsconfig.json`).

## Testing

Tests run on Vitest via the Angular CLI builder `@angular/build:unit-test`:

```bash
pnpm test                                              # all specs, single pass
pnpm exec ng test forty-cdk --watch                    # watch mode
pnpm exec ng test forty-cdk --include "../accordion/src/accordion.spec.ts"  # single file (path relative to projects/forty-cdk/src/)
pnpm exec ng test forty-cdk --filter "Enter and Space select"  # tests by name (regex)
```

The `-- <path>` / `-- -t "<name>"` passthrough forms do **not** work on this setup (pnpm mangles the quoted `--`, so `ng` rejects it) — use the builder's own `--include` (repeatable) and `--filter` (regex) flags instead.

Every primitive's test suite includes a case running under `provideZonelessChangeDetection()` to keep reactivity working without Zone.js.
