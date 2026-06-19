# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.0.3]: https://github.com/tutkli/forty-cdk/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/tutkli/forty-cdk/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/tutkli/forty-cdk/releases/tag/v0.0.1
