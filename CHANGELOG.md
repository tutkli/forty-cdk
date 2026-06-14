# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.0.2]: https://github.com/tutkli/forty-cdk/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/tutkli/forty-cdk/releases/tag/v0.0.1
