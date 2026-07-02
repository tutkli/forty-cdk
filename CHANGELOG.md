# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/tutkli/forty-cdk/compare/v0.6.0...HEAD
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
