# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.0.1]: https://github.com/tutkli/forty-cdk/releases/tag/v0.0.1
