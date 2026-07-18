# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.11.0] - 2026-07-18

### Added

- **Table (declarative layer)** — declarative **column reordering** through `<for-table-body>`: mark a
  column `reorderable` on its `ForColumnDef`, drop a `[forColumnDragPlaceholder]` template, and the body
  wires the drag-reorder header (single grid tab stop, inherited keyboard lift) and emits `(columnReorder)`.
- **Table (declarative layer)** — **per-column resize** options forwarded from each `ForColumnDef`
  (`resizeMin` / `resizeMax` / `resizeStep`, `autoFit`, `fitIncludesHeader`), plus a `[(columnWidths)]`
  two-way model on the body that seeds the resize handles and collects width changes in one serializable
  binding.
- **Table (declarative layer)** — **column-shaped placeholder rows**: a `placeholderCells` flag on
  `[forRowDef]` stamps one disabled skeleton cell per column (each from the def's `[forPlaceholderCell]`),
  keeping the grid rectangular and stepped over by roving navigation — for interleaved / trailing loading
  states, alongside the existing full-span variant rows.
- **Table (declarative layer)** — **variable row heights** in the virtualized body via a `measureRows`
  input; the `TableVirtualWindow` seam gains `measureRow(el)` so measured heights feed the virtualizer
  instead of a fixed row size.
- **Table (declarative layer)** — **whole-row interaction hooks** for navigation-list tables: an
  `interactiveRows` opt-in surfaces `(rowActivate)` / `(rowContextMenu)`, and `[rowClass]` / `[rowAttrs]`
  apply per-datum styling and attributes to the stamped rows. Interactive descendants (a per-row actions
  button or link) own their own events and do not trigger row activation.
- **Table (declarative layer)** — cell-template **type narrowing** and styling seams: `[forRowCellWhen]` /
  `[forDataCellUnless]` type-guard inputs narrow the `let-row` context, and `headerClass` / `cellClass` on
  `ForColumnDef` add a class to the stamped header and data cells.
- **Table (declarative layer)** — `<for-table-body>` registers its own `rows().length`, so the table's
  `rowCount` is derived automatically; the root `[rowCount]` becomes an optional override instead of a
  required duplicate binding.

### Fixed

- **Table** — a click on consumer-placed interactive content (a per-row action `<button>`, an `<a href>`,
  an `<input>`) inside a selectable row's data cell no longer also toggles the row's selection; the click's
  origin is checked so the inner control owns its event.

## [0.10.0] - 2026-07-17

### Added

- **Table (declarative layer)** — a new `ForColumnDef` + `<for-table-body>` layer over the raw cell primitives: declare each column once and the body renders its header and data cells, auto-wiring sort and resize (selection stays consumer-placed via `rowKey`). Dropping `[forTableVirtualized]` on the same table now windows the rows automatically — no `#v` ref, manual sizer, `@for` window, or `[virtualIndex]` binding (fixed-size rows, height in CSS). `[forRowDef]` + `[forRowCell]` render a full-span variant row (group headers, section separators, summary / empty-state) for the data a `[when]` predicate matches: a presentational, non-selectable cell that still counts towards `aria-rowindex` / `aria-rowcount`, is stepped over by the roving 2D grid, and composes with virtualization.
- **Table** — the virtualization-seam types (`TableVirtualWindow`, `TableVirtualRow`) are exported from the `forty-cdk/table` barrel, so a consumer can type against the window the body publishes.
- **Combobox** — `[forComboboxAction]`, a `role="button"` affordance pinned inside the popup that never joins the option / value collection and is keyboard-reachable through a Tab-into-actions ring.

### Changed

- **Core** — **BREAKING.** The legacy `startPointerResize` transport (and its `PointerResizeConfig` type) is removed from `forty-cdk/core`. `ForPaneResizer` and `ForTableColumnResizer` now ride the shared `createPointerDragSession`, inheriting its post-drag click suppression and Escape-to-cancel. A consumer that imported `startPointerResize` directly should migrate to `createPointerDragSession`.

### Fixed

- **Table** — `Enter` on a sortable grid header cell commits the sort instead of also entering a co-located column resizer / reorder handle, and `Space` / `Enter` split correctly when sort and drag-reorder share the same header (`Space` lifts the column for reorder, `Enter` sorts).
- **Table** — a row without a bound value no longer emits `aria-selected="false"`; the attribute is dropped entirely on non-selectable rows.
- **Progress** — `getValueLabel` is fed the sanitized effective max, so a custom value label reflects the clamped range.
- **Drawer** — the drag handle sets `touch-action` / `user-select` (with a `-webkit-user-select` fallback for older WebKit) so a mouse or touch drag on the handle no longer selects text.
- **File Upload** — an all-rejected dialog (browse) selection now clears the native input, so a native form submission can't ship a file the primitive already rejected; a drop never wipes a prior valid dialog selection.

## [0.9.0] - 2026-07-07

### Added

- **Menu** — an opt-in `fallbackAxisSideDirection` input (default `'none'`) on the three menu roots, forwarded through `FloatingConfig` into `flip()`, so a side-anchored submenu whose preferred axis overflows on both sides can drop to a perpendicular axis to stay inside the viewport.

### Changed

- **Table** — **BREAKING.** In `mode="grid"` / `treegrid`, a row-reorderable table's rows no longer form independent tab stops — they yield to the composite grid's single tab stop (WAI-ARIA Data Grid contract), and keyboard reorder now starts from a focused **cell**: `Ctrl`/`Cmd` + `Space` lifts the enclosing row (was plain `Space` on a focused row). The static `mode="table"` and pointer reordering are unchanged.

### Fixed

- **Popover** — an outside-interaction close (pointer / focus outside) no longer returns focus to the trigger, so a stacked tooltip anchored to that trigger does not reopen.
- **Dismissable-layer** — outside pointer, focus, and Escape events are routed per channel, so an Escape-only layer no longer swallows outside-pointer / focus dismissal meant for the layer below it.

### Performance

- **Calendar / Date Adapter** — `Intl.DateTimeFormat` is memoized per `(locale, options)` on each adapter instance, so repeated formatting reuses the same instance instead of re-resolving the ICU pattern on every `format()` — cutting the cost that dominates time-picker slot rebuilds and calendar grid rendering.

## [0.8.0] - 2026-07-06

### Added

- **Breadcrumbs** — the navigation landmark `aria-label` is now localizable per scope, so `provideForBreadcrumbsDefaults` translates it in place.
- **Calendar / Date Adapter** — `ForCalendar` gains a `locale` input and the date adapters format value labels locale-aware, so month/weekday labels and the displayed value follow the configured locale.
- **Date Picker** — a `locale` input for the displayed value, matching `ForCalendar`.
- **Dialog / Drawer** — `open()` accepts an opt-in `injector`, so a single programmatic open can resolve per-scope defaults and dependency injection from the caller's context.
- **Search / Stepper** — the `[forSearchClear]` `aria-label` and the `[forStepperProgress]` `aria-valuetext` are now localizable through scope defaults, completing the accessible-string i18n rollout.
- **Select** — multi-select range keyboard (Shift + Arrow, Shift + Home/End, Ctrl/Cmd + A) on the non-virtualized listbox.
- **Select / Listbox / Combobox / Tree** — a new optional `[dataVersion]` input plus an `invalidateSnapshot()` method, so a same-length dataset re-sort or refresh purges stale off-window entries instead of misdirecting navigation.
- **Time Range Field** — opt-in overnight ranges, where an end earlier than the start is treated as crossing midnight.
- **Drag & Drop** — `[forDraggable]` reflects `data-highlighted` when it is the roving-active candidate (parity with every other roving-item primitive), and `FOR_DROP_LIST_ROVING_DELEGATE` gains an optional `isItemHighlighted` member so a composing widget can govern the highlight alongside the tab stop.
- **Core** — `findFirstFocusable` and `FOCUSABLE_SELECTOR` are exported from `forty-cdk/core`, so a primitive whose focus-finding needs differ from `FocusTrap`'s can reuse the canonical contract instead of inlining a private copy.

### Changed

- **Radio Group** — **BREAKING.** `ForRadioGroup.value` is now `model<string | null>` defaulting to `null` (was `model<string>('')`) and implements `FormValueControl<string | null>`, so "nothing selected" is `null` and a form model can distinguish it from a real empty string. `ForRadioGroupContext.value` is retyped `Signal<string | null>`.
- **Meter / Progress** — **BREAKING.** `value` is downgraded from a two-way `model()` to a one-way `input()`; the `[(value)]` binding and the implicit `valueChange` output are removed, since both are display-only. One-way `[value]` is unchanged.
- **Avatar** — **BREAKING.** `ForAvatarImage`'s `(loadStatusChanged)` output is renamed to `(loadStatusChange)` (present tense, matching the rest of the library's outputs).
- **Public contexts** — **BREAKING.** The writable `ModelSignal` members leaking through eight exported `*Context` interfaces (select, combobox, popover, menubar, navigation-menu, toggle-group, menu-radio-group, time-picker) are retyped to read-only `Signal`, so a custom piece can no longer bypass the root's guards via `ctx.value.set` / `ctx.open.set` / `ctx.query.set`. `ForPopoverContext` gains an explicit `close()` mutator for the one piece that wrote its model directly.
- **Table** — **BREAKING.** `ForTable` is now generic (`ForTable<T>`) and its selection model is renamed `selection` → `value` for family consistency; the drag-drop `ForDragDropEvent<T>` drops its decorative generic, so a BYO-data `[forDropList]` types `item` as `unknown`.
- **Search** — **BREAKING.** `[forSearchClear]` no longer takes the `[forSearch]` instance through a selector input. Wrap the field and the clear button in a new `[forSearchGroup]`, which bridges the two (mirroring `number-input`'s group token); the exported `ForSearchContext` surfaces read-only signals plus `clear()` / `focusInput()`.
- **Date Picker** — **BREAKING.** The non-form range mode is retired: the `selectionMode` input, the `range` model, its `rangeChange` output, and the inherited `rangeSeparator` input are removed. Use `ForDateRangePicker` (which implements `FormValueControl<DateRange<D> | null>`) for date-range selection.
- **Calendar** — **BREAKING.** A second range click before the anchor now commits the inverted range `[click, anchor]` — honouring the hover preview (WYSIWYG) — instead of discarding it and re-anchoring.

### Fixed

- **Core (state / collections / navigation)** — SSR resolves the ambient text direction server-side, so a `dir="rtl"` document hydrates without mismatch; `snapToStep` rounds to the finer of the step/min decimals; the virtualized navigator no longer settles `aria-activedescendant` on a freshly-mounted disabled option; the collection observer watches up to the hosts' deepest common ancestor, so intermediate-wrapper reorders are detected; and modifier keydowns (Meta/Ctrl/Alt) no longer flip input modality to keyboard.
- **Core (overlay infrastructure)** — the listbox overlay bails when already closed, so a Tab-commit close reason survives a late `focusin`; the focus trap keys its Tab cycle off tabbable elements (skipping `tabindex="-1"` roving items), adds `iframe` / `summary`, skips return-focus to a disconnected target, and keeps focus in place on a surface with no tabbables; an item-aligned Select no longer flashes at the viewport origin during its exit animation; infinite host animations no longer strand overlay teardown; and the dismissable-layer `focusin` listener runs on the capture phase, so an app-level `stopPropagation` can't disable focus-outside dismissal.
- **Date Field / Calendar** — `NativeDateAdapter` builds years 1–99 literally and preserves the wall-clock time across `addDays` / `addMonths` / `addYears` / `setTime`; flat keyboard moves (arrows, `Home`, `End`) clamp into `[min, max]`; a persistently mounted calendar's `today()` follows the clock across midnight; and a partially typed segment digit is dropped on blur instead of being left painted.
- **Progress** — indicator `data-max` / `data-min` parity with the root, and a localizable completion announcement.
- **Select / Listbox** — scroll the range-focused option into view, and guard the virtualized multi-select range keys.
- **Calendar** — retain focus on bound-disabled prev / next / view-trigger buttons instead of ejecting it to the document.
- **Table** — a single tab stop for a column-reorderable grid; `Enter` / `F2` cell-entry now shares the focus-trap finder, so it skips CSS-hidden widgets and recognizes the full focusable set.
- **Combobox** — purge removed options from the inline completion.
- **Number Input / Core** — keep incremental edits of grouped values, and parse spaced-literal number formats in fr-style locales.
- **File Upload** — enforce `accept` on the dialog (browse) path, not only on drop.
- **Button / Avatar** — Space activates on `keyup` rather than `keydown`, and the avatar image decode is guarded after destroy.
- **Toggle / Toolbar** — drop the native `disabled` attribute on roving items and restrict the host selectors.
- **Meter / Progress** — a coherent sanitized ARIA range and a uniform `ariaLabel`.
- **Core** — read the navigator's pending slot untracked, so the adapter bridge effect no longer self-invalidates and double-runs across Select / Listbox / Tree / TableVirtualized.

### Performance

- **Virtualization** — memoize the computed virtual items, so an identical scroll window skips re-rendering the row set.
- **Collection / Slider** — epoch-based membership tracking and a cached track rect.
- **Drag & Drop** — cache the drag geometry once at lift instead of recomputing it on every pointer move.
- **Virtualization / Table** — row and virtual reorder attach their `document` pointer listeners on drag start and detach on drag end, so there are none at rest.

## [0.7.0] - 2026-07-04

### Added

- **Accordion** — `ForAccordion` gains a root `disabled` input that disables every item at once (an _effective_ disabled OR'd into each item, so per-item `[disabled]` is no longer needed), reflected as `data-disabled` on the root and exposed on the context.
- **Combobox** — the clear button and chip group `aria-label`s are now localizable per scope. `ForComboboxClear` gains an `ariaLabel` input, and `ForComboboxDefaults` adds `clearAriaLabel` (`'Clear'`) and `chipsAriaLabel` (`'Selected items'`), so `provideForComboboxDefaults` translates every combobox clear button / chip group in a scope at once.
- **Menu** — `[forMenuRadioGroup]` can now be given an accessible name by a projected `[forMenuGroupLabel]`, wiring `aria-labelledby` with the same mechanism `[forMenuGroup]` already uses.

### Changed

- **Overlay managers (Dialog / Drawer / Toast)** — **BREAKING.** The three imperative managers are unified onto one contract:
  - `OverlayRef.closed` now resolves `{ reason, result }` (was `R | undefined`), so a programmatic `close(value)` is distinguishable from an Escape / backdrop / close-button dismissal. `ForDialogRef` / `ForDrawerRef` type `reason` as their respective close-reason union.
  - `injectDrawerData<T>()` now returns `T | null` (was `T`), matching `injectDialogData` and the runtime.
  - Config callbacks renamed to mirror the declarative outputs: `ForDrawerOpenConfig.onDrag` / `onRelease` / `onActiveSnapPointChange` → `dragMove` / `release` / `activeSnapPointChange`, and `ForToastConfig.action.onClick` → `activate`.
  - `ForDialogDefaults` gains the shared behavior keys `modal` / `dismissible` / `returnFocus` / `initialFocus`, resolved by `ForDialogManager`, matching what `ForDrawerDefaults` already exposed.
- **Contract & context types** — **BREAKING.** The range value type moves to `forty-cdk/core` and is renamed `CalendarDateRange<D>` → `DateRange<D>` (no compat alias). Cross-primitive contract and context types (e.g. `VetoableEvent` / `VetoableNativeEvent`, `FloatingSide` / `FloatingAlign`, `DateAdapter` / `TimeCapableDateAdapter`, `SegmentType`, and the roving / menu / segment coordination types surfaced through the `FOR_*_CONTEXT` tokens) are now re-exported from each primitive's own entry point, so advanced-composition consumers import them from the entry they already use instead of the no-semver-guarantees `forty-cdk/core` barrel.

### Fixed

- **SSR** — server-side rendering no longer runs browser-only side effects (floating positioning, focus traps, timers) during the initial render.
- **Menu / Menubar / Context Menu / Navigation Menu** — context-menu now binds the trigger id for the menu's `aria-labelledby` and adds a pointer long-press fallback for touch; menubar gets orientation-aware trigger keys, anchored/cycling typeahead, and a guarded hover-keepalive detach; navigation-menu scopes Escape to focus within the nav; menu skips return-focus on outside-interaction closes and stops Space from activating an item mid-typeahead.
- **Combobox** — ignores keydown during IME composition; inline-completes against the active option; focuses the trigger before Tab-closing in the picker anatomy; corrects virtualized `aria-posinset` / `aria-setsize`.
- **Select** — purges removed options from the snapshot; scrolls the selected option into view on open; dev-throws on `selectionFollowsFocus` + virtualization; `onFocusOut` now checks the wrapper rather than the trigger.
- **Listbox / Tree** — dev-throw on `selectionFollowsFocus` + virtualization; tree keeps a tab stop when selection points to an unrendered node, and fixes virtualized resume, the multi-select guard, and drag handles.
- **Radio Group** — four-cursor arrow navigation and readonly focus move; keeps a tab stop when the selected radio is disabled.
- **Tooltip / Hover Card** — Escape dismissal, a touch guard, and shared scroll-dismiss.
- **Toast** — announces via pre-existing live regions instead of creating its own.
- **Table** — grid header-row ARIA, page-move keys, and a composite tab stop.
- **Pagination** — reconciles the current page against the count via `effectivePage`.
- **Scroll Area** — focusable viewport so keyboard scrolling works.
- **Virtualization** — fixes the row-content Space/Enter seam and `scrollMargin`.
- **Drag & Drop** — connected auto-scroll, lifted Home/End, and flick; cancels the drag when the lifted item is destroyed; core pointerId filtering, swipe hygiene, and settle duration.
- **Slider** — `touch-action` on the thumb/resizer and a step-rounded clamp.
- **Stepper** — `role="presentation"` on the item in interactive mode.
- **Field** — error docs, `aria-describedby` composition, and slot counting.
- **Form primitives** — focus-on-error rollout across the form family.
- **File Upload** — enforces `accept` on drop and emits `filesRejected`.
- **Number Input** — parses percent input back to the fraction; guards name double-submit and step precision; core now parses negatives written with U+2212 / a fullwidth minus.
- **Date Field / Date Picker** — don't clamp mid-typing compositions; don't leak transient time nulls or the sentinel date.
- **Date Range Field / Time Range Field** — reflect `data-invalid` when the endpoints are out of order.
- **OTP Input** — reconciles the input on blur after an external reset.
- **Dialog** — exempts the backdrop from the dismissable layer.
- **Overlay Manager** — guards the synchronous tick against `NG0101`.
- **Focus Trap** — skips CSS-hidden elements when trapping focus.
- **Typeahead (core)** — diacritics-insensitive matching.

## [0.6.0] - 2026-07-02

### Added

- **Table** — opt-in double-click auto-fit on the column resizer sizes a column to its widest data cell. `fitIncludesHeader` (paired with `[forTableColumnLabel]`) makes the fit also account for the header label width, and `fitToContent()` is exposed via `exportAs` for programmatic use.
- **Toast** — toast viewports now coexist with an open modal dialog / drawer instead of being trapped behind it. `ForToastDefaults.overModal` (`'peer'` | `'inert'`) chooses, per scope, whether toasts stay interactive above the modal or become inert while it is open.
- **Tooltip** — dismisses on pointer press (a new `'press'` close reason for instant teardown) and now opens on focus only for keyboard focus, not pointer focus.
- **Virtualization** — `ForVirtualReorder` brings keyboard- and pointer-driven windowed drag-reorder to plain `*forVirtualFor` lists.
- **Drag & Drop** — a single drag gesture can scrub-reorder onto far, not-yet-rendered virtualized rows by holding Shift near the viewport edge to window through the list.

### Fixed

- **Listbox** — a listbox rendered with a pre-seeded selection no longer triggers an `NG0950` error on first render.

## [0.5.0] - 2026-06-25

### Added

- **DatePicker** — `ForDateRangePicker` (`[forDateRangePicker]`): the form-capable range root, implementing `FormValueControl<CalendarDateRange<D> | null>`, so a date range inside a form auto-wires with `[formField]` instead of being hand-wired through the plain `[(range)]` model exposed by `ForDatePicker[selectionMode="range"]`.
- **DateRangeField** — new `forty-cdk/date-range-field` entry point. Headless, segmented, spin-editable date **range** input: two labelled `role="group"` endpoints (start / end) of locale-ordered spinbutton segments nested in one outer group, implementing `FormValueControl<CalendarDateRange<D> | null>`. The committed value stays `null` until both endpoints are fully entered and ordered (`start <= end`); a half-entered or out-of-order range never reaches the form.
- **TimeRangeField** — new `forty-cdk/time-range-field` entry point. The time-of-day analog of DateRangeField: two endpoints of spinbutton time segments anchored on a DST-stable sentinel date, implementing the same `FormValueControl<CalendarDateRange<D> | null>` contract. Requires a time-capable adapter (`provideInternationalizedDateTimeAdapter()` or `provideNativeDateAdapter()`) and throws a descriptive error if a day-only adapter is active.

### Fixed

- **Tooltip** — dismisses when an ancestor scrolls, without lingering at the stale position or flickering back open.
- **Hover Card** — dismisses on ancestor scroll without lingering or reopen flicker, matching the tooltip's behavior.
- **Combobox** — the active option is now scrolled into view after the content portal mounts, so opening an editable combobox with a pre-selected value reveals that option instead of leaving it off-screen.
- **Drag & Drop** — a drag stands down when the initiating `pointerdown` was already `defaultPrevented`, so it cooperates with consumers that handle the pointer first.

## [0.4.0] - 2026-06-24

### Added

- **Tree** — `ForTreeNodeDrag` drag announcements are now i18n-configurable, so the live-region messages for lift, move, drop, and cancel can be localized through the defaults provider.
- **Listbox** — `ForListboxReorder` drag announcements are now i18n-configurable, matching the tree's localizable live-region messages.

### Fixed

- **Tree** — a vetoed (canceled) drop now keeps its invalid-drop announcement instead of being silently swallowed, so the screen reader still reports that the drop was rejected.
- **Table** — the column resizer now measures the header cell via dependency injection rather than DOM traversal, making the measured width robust to wrapper markup.

### Performance

- **Drag & Drop** — pointer-move resolution is coalesced to a single animation frame, cutting redundant drop-target recomputation during fast drags.

## [0.3.0] - 2026-06-23

### Added

- **Breakpoints** — new headless, signal-first viewport breakpoint observer. Configure the breakpoint map once with `provideForBreakpoints` (defaulting to the Tailwind scale) and read reactive `Signal<boolean>` queries anywhere via `injectBreakpoints()`. It is a reactive utility, not a UI primitive — no DOM, ARIA, or template — and is zoneless- and SSR-safe.
- **Listbox** — `ForListboxReorder` coordinator makes listbox options keyboard- and pointer-reorderable on top of selection, reusing the shared drag-drop transport.
- **Combobox** — the overlay's `sideOffset` and `collisionPadding` are now tunable through the defaults provider, so a consumer scope can override the positioning without re-binding the inputs at every call site.

### Changed

- **BREAKING — per-primitive import surface.** `forty-cdk` now ships as per-primitive secondary entry points (the `@angular/cdk` model). Import each primitive from its own subpath — `import { ForButton } from 'forty-cdk/button'`, `import { ForDialog } from 'forty-cdk/dialog'` — and shared infrastructure from `forty-cdk/core`. The single `forty-cdk` barrel no longer re-exports the primitives, so a bundler code-splits each route down to only the primitives it imports instead of pulling the whole library through one module. Migration: rewrite every `from 'forty-cdk'` import to the matching `forty-cdk/<primitive>` subpath (the `@internationalized/date` adapters stay at `forty-cdk/internationalized-date`, the virtualization core at `forty-cdk/virtualization`).

## [0.2.0] - 2026-06-22

### Added

- **Tooltip** — imperative `show()` / `hide()` methods for programmatic control beyond hover and focus. `show()` respects `openDelay` and the `disabled` / `showOnOverflow` gates; `hide()` respects `closeDelay` and disarms the hoverable-content grace bridge. `[(open)]` stays the instant, unconditional escape hatch.
- **Toast** — `animateLeave` programmatic exit-animation hook, so a toast dismissed from code can play its leave animation instead of tearing down synchronously.
- **Drag & Drop** — new `[forFreeDrag]` free-drag primitive: a boundary-confined draggable with `lockAxis`, `disabled`, a restorable two-way `[(position)]`, and an optional `rootElement` drag handle.
- **Drag & Drop** — `"mixed"` drop orientation for wrapping grids, reordering by both row and column.

### Fixed

- **Search** — clearing now resets the native input value, not just the model, so the field box is visibly emptied.

## [0.1.0] - 2026-06-21

First minor release. From this version on, `forty-cdk` follows a `0.MINOR.PATCH`
scheme while pre-1.0: feature and breaking changes bump the minor (`0.x.0`),
bugfixes bump the patch (`0.x.y`). This keeps the npm caret (`^0.1.0`) flowing
patches automatically while holding back across a minor that may carry breaking
changes.

### Added

- **Breadcrumbs** — new headless primitive for breadcrumb trails, following the WAI-ARIA breadcrumb pattern.
- **Search** — new headless search-field primitive.
- **Pagination** — new headless pagination primitive.
- **FileUpload** — new headless file-upload primitive, including directory (folder) upload support.
- **Button** — new `ForButton` interaction primitive, backed by shared focus-visible / pressed / hovered interaction-state helpers.
- **Tooltip** — `showOnOverflow` and `hoverableContent` options.
- **Listbox / Select / Combobox** — `PageUp` / `PageDown` keyboard navigation.
- **Textarea** — opt-in autosize on `ForTextarea`.
- **Table** — `firstClickDirection` on sortable column headers, and the virtualization `range` is now exposed on `ForTableVirtualized`.
- **DatePicker / TimePicker** — an `anchor` part for positioning against the field box, and `FOR_TIME_VALUE_SOURCE` is exported so wrappers can supply the time value.
- **Tree** — drop-indicator hook for tree-node drag & drop.
- **A11y** — `data-reduced-motion` hook on tooltip and popover.

### Changed

- **BREAKING — Virtualization moved to the `forty-cdk/virtualization` secondary entry point.** The windowing core (`injectVirtualizer`), the declarative `[forVirtualViewport]` + `*forVirtualFor` layer, infinite-scroll detection (`injectInfiniteScroll`), the `[forTableVirtualized]` companion, and their related types / context now ship from `forty-cdk/virtualization` instead of the main `forty-cdk` entry point. This isolates `@tanstack/virtual-core` to its own bundle chunk, so apps that don't virtualize — and lazy routes that don't, even when a sibling route in the same app does — no longer pull it into the shared `forty-cdk` chunk. **Migration:** update imports of `injectVirtualizer`, `ForVirtualViewport`, `ForVirtualFor`, `injectInfiniteScroll`, `ForTableVirtualized` (and their related types) from `'forty-cdk'` to `'forty-cdk/virtualization'`. No API shapes changed.
- **Table** — `ForTableColumnReorder`'s wrapped drop list now defaults to a horizontal orientation.

### Fixed

- **Tooltip** — a tap no longer opens the tooltip on touch.
- **Combobox** — the active descendant no longer re-scrolls when options are appended, and hover is suppressed during keyboard-driven scrolling.
- **Table** — the column resizer's `aria-valuenow` is now derived from the measured column width.
- **Drag & Drop** — `dragDisabled` now fences the live-sort placeholder.
- **NumberInput** — fractional stepping (e.g. a `0.1` step) no longer emits floating-point artifacts such as `0.30000000000000004`; emitted values are now rounded to the step's precision, matching the slider.

## [0.0.4] - 2026-06-19

### Added

- **Table / DataGrid** — new headless primitive implementing the WAI-ARIA Grid and Treegrid patterns. A single role-as-mode core (`table` / `grid` / `treegrid`) provides structure, roles, and sticky headers; grid mode adds 2D keyboard navigation with roving tabindex; and the anatomy layers on row selection (a shared `SelectionModel`), sortable column headers (`aria-sort` + `sortChange`), column resizing, column / row reordering, expandable hierarchical rows in treegrid mode, and row virtualization with keyboard navigation past the rendered window.
- **Virtualization** — new headless windowing core (`injectVirtualizer`), a declarative `[forVirtualViewport]` + `*forVirtualFor` layer, and infinite-scroll detection. Combobox, Listbox, Select, and Tree gain opt-in virtualized windowing on top of the shared core.
- **Tree** — tree-node drag & drop for reordering and re-parenting nodes.
- **Drawer** — modal, region-scoped overlay that traps focus and locks body scroll within a container element.
- **Drag & Drop** — boundary constraints and an axis lock for pointer drag.
- **Carousel** — i18n hook for localizing the default slide and indicator labels.

### Changed

- **Angular** — minimum supported peer version raised from `^22.0.0` to `^22.0.1`.
- **@tanstack/virtual-core** — added as an auto-installed, tree-shakeable runtime dependency backing the new virtualization core.

### Fixed

- **Floating** — `transform-origin` and `data-side` / `data-align` are now retained through `animate.leave`, so anchored overlays keep their exit-animation origin and direction.
- **HoverCard** — a `closeDelay` of `0` no longer flickers open / closed when the pointer crosses overlapping content.
- **Drag & Drop** — the synthetic click that follows a pointer drag is now suppressed, so dropping no longer fires the dragged item's click handler.

## [0.0.3] - 2026-06-17

### Added

- **Stepper** — new headless primitive following the WAI-ARIA Tabs pattern, with a positional-index anatomy, a `pending` / `active` / `completed` / `error` `data-state` family, manual or automatic activation, Signal Forms step-completion gating, a `ForStepperProgress` part (`role="progressbar"`), and a completed-all content slot.
- **Drag & Drop** — new primitive for keyboard- and pointer-driven sortable lists and cross-list transfer, with a default drag preview, a `[forDragHandle]` part, consumer `ng-template` preview / placeholder, auto-scroll near container edges, a live-sort placeholder that follows the drop index, and opt-in FLIP reflow + drop-settle animations.
- **TimePicker** — new `ForTimePicker` slot-based listbox time picker; DST-safe and date-preserving.
- **Tree** — checkbox-selection anatomy with cascade tri-state selection, plus an expand-to-reveal helper for consumer-owned filtering.
- **Calendar** — direct month / year navigation, a view-switching month / year picker, and month / year `<select>` convenience directives.
- **Dialog / Drawer** — programmatic backdrops now animate on close; the drawer can portal into a container element, and the dialog's `[forDialogBackdrop]` is container-aware.
- **Floating** — `clipUntilPositioned` threads through anchored overlays, with a clip-path enter-baseline opt-out.

### Changed

- **BREAKING — outputs renamed to avoid colliding with native DOM events:** `ForDialog`, `ForDrawer`, and `ForToast` `(close)` → `(dismiss)`; `ForDrawer` `(drag)` → `(dragMove)`; `ForMenuItem`, `ForMenuCheckboxItem`, and `ForMenuRadioItem` `(select)` → `(activate)`; `ForPaneResizer` `(resize)` → `(resizing)`.

### Fixed

- **Drawer** — the snap-point close threshold now scales to the lowest snap point.
- **Toggle** — dropped an invalid `aria-orientation` from `ForToggleGroup`.
- **Tree** — item registration is deferred to `afterNextRender`, fixing an `NG0950` when a re-mounted node (e.g. after a filter clears) is read before its `value` input is bound.
- **Overlays** — `translate` is retained through `animate.leave`, and portal teardown is deferred so portaled overlays can play their exit animation.

## [0.0.2] - 2026-06-14

### Added

- **Carousel** — new headless primitive following the WAI-ARIA carousel pattern, with autoplay and a pause-on-interaction rotation control, pointer drag / swipe navigation, and end-snap trimming via `containScroll`.
- **Calendar / DatePicker** — date-range selection mode.
- **Combobox** — `trigger` part with a popup / list split, an `anchor` part for field-box positioning, and the picker now highlights the selected option on open.
- **Select / Combobox** — `anchor` part for field-box positioning.
- **Menu** — highlight follows the pointer on hover.
- **Dialog / Drawer** — vetoable dismiss hooks on the programmatic managers.
- **Tooltip / HoverCard / Popover** — positioning options exposed through their `*Defaults` providers.
- **Popover / Disclosure** — per-trigger `disabled`.
- Explicit root reference for anchored-overlay triggers, for select / combobox / date-picker triggers, and for stamped context-menu triggers.
- Single-value field bridge (`@angular/forms/signals`) for selection primitives.
- `hostDirectives` configs plus a wrapping guide for the form primitives.

### Changed

- **BREAKING — Dialog / Drawer:** the programmatic managers now play overlay enter / exit animations, so dismissal is no longer a synchronous teardown — the overlay stays mounted until its exit animation settles.
- **BREAKING — Combobox:** the picker's search query now resets when the picker closes and no longer commits the highlighted option as a label on close.

### Fixed

- **disabled reflection** — native `disabled` is now reflected non-destructively across the library, preserving consumer-set attributes.
- **ids** — consumer-set static `id` host bindings are preserved (tooltip trigger, `[id]` bindings library-wide).
- **Combobox** — input value syncs to the query on close; tolerant label-cache fold for static options.
- **number-input / slider** — value is excluded from form submission inside a disabled `[forFieldset]`.
- **pane-resizer** — `resizeCommit` only emits after a drag crosses the dead-zone.
- **overlay-shell** — modal-owned overlays stay interactive.
- **Menu / DropdownMenu** — no `data-highlighted` on pointer-open auto-focus; per-trigger `disabled` keeps the consumer attribute.
- **ContextMenu** — keyboard-synthesized `contextmenu` modality; trigger root resolved via a context token.
- **otp-input** — `ariaLabel` is reflected onto the injected input.
- Indicator parents are resolved via a token rather than the concrete class.

### Performance

- **Select** — reactive option label (drops the `afterEveryRender` `textContent` snapshot); selected labels / option resolved through a keyed map (O(N+M)).
- **Combobox** — `cachedOptions()` is memoized to avoid a per-read merge + sort.
- **focus-trap** — focusable list is cached and invalidated via a `MutationObserver`.
- **Tree** — visible-handle list is memoized to avoid per-navigation allocation.

## [0.0.1] - 2026-06-10

Initial public release. `forty-cdk` ships headless / styleless Angular UI
primitives with WAI-ARIA accessibility built in — state, behavior, focus
management, and keyboard interaction are provided; styling is left entirely to
the consumer.

Built for Angular 22: every primitive is standalone, `OnPush`, signal-based, and
works under `provideZonelessChangeDetection()`. Form-value primitives integrate
through Signal Forms (`@angular/forms/signals`) rather than
`ControlValueAccessor`. `@angular/forms` and `@internationalized/date` are
optional peer dependencies; `@floating-ui/dom` is a regular dependency used for
overlay positioning. `"sideEffects": false` lets bundlers drop unused
primitives.

### Added

- **Disclosure & layout** — accordion, disclosure, tabs, separator, aspect-ratio, scroll-area, pane-resizer, toolbar.
- **Overlays** — dialog, drawer, popover, tooltip, hover-card, toast.
- **Menus** — menu, menubar, dropdown-menu, context-menu, navigation-menu.
- **Form controls** — field, fieldset, input, switch, checkbox, radio-group, select, combobox, listbox, slider, toggle, number-input, otp-input.
- **Date & time** — calendar, date-field, date-picker, time-field.
- **Display** — avatar, progress, meter, tree.
- `forty-cdk/internationalized-date` secondary entry point exposing the `@internationalized/date` adapters for the date and time primitives.

[Unreleased]: https://github.com/tutkli/forty-cdk/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/tutkli/forty-cdk/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/tutkli/forty-cdk/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/tutkli/forty-cdk/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/tutkli/forty-cdk/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/tutkli/forty-cdk/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/tutkli/forty-cdk/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/tutkli/forty-cdk/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/tutkli/forty-cdk/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/tutkli/forty-cdk/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/tutkli/forty-cdk/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/tutkli/forty-cdk/compare/v0.0.4...v0.1.0
[0.0.4]: https://github.com/tutkli/forty-cdk/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/tutkli/forty-cdk/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/tutkli/forty-cdk/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/tutkli/forty-cdk/releases/tag/v0.0.1
