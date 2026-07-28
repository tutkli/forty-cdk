# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The pre-1.0 naming and API-alignment sweep ([#1400](https://github.com/tutkli/forty-cdk/issues/1400)):
fifteen inconsistencies where the same concept was spelled two ways across the library, resolved onto one
name each. Nothing here changes behaviour except where noted — it is a rename pass, deliberately taken
before 1.0 freezes the surface, with **no deprecated aliases anywhere**. Two renames are silent at compile
time and need a template grep: `(action)` on `[forComboboxAction]` and `(valueComplete)` / `(valueInvalid)`
on `[forOtpInput]` both sit on native elements, so a stale binding registers a DOM listener for an event
that never fires instead of failing the build.

### Changed

- **Listbox / Select / Combobox — BREAKING.** The equality comparator input `[isItemEqualToValue]` is
  renamed `[compareWith]`, so all four selection-capable primitives (`ForListbox`, `ForSelect`,
  `ForCombobox`, `ForTable`) spell it the same way and match the name Angular uses on its own
  `@angular/forms` select controls. The member is renamed on the public `ForListboxContext` /
  `ForSelectContext` / `ForComboboxContext` interfaces and inside the exported
  `FOR_LISTBOX_HOST_DIRECTIVE_INPUTS` / `FOR_SELECT_HOST_DIRECTIVE_INPUTS` /
  `FOR_COMBOBOX_HOST_DIRECTIVE_INPUTS` tuples. Migration is a find-and-replace; the call signature and the
  `(a, b) => a === b` default are unchanged.
- **Core (dismissible layer) — BREAKING.** The misspelled `Dismissable*` family is renamed to
  `Dismissible*`. From `forty-cdk/core`: `DismissableLayerStack` → `DismissibleLayerStack` and
  `injectDismissableLayer` → `injectDismissibleLayer`. The core-internal `DismissableLayer`,
  `DismissableLayerChannel`, `DismissableLayerNesting` and `DismissableLayerActivateOptions` are renamed to
  match, and the module moved from `core/dismissable-layer/` to `core/dismissible-layer/`.
- **Menu family — BREAKING.** `ForMenuContext.dismissableExemptions` is renamed `dismissibleExemptions`.
  The member is published from `forty-cdk/shared` and is also a public `readonly` signal on
  `ForContextMenu`, `ForDropdownMenu`, `ForMenuSub` and the menubar per-menu context, so a consumer
  injecting `FOR_MENU_CONTEXT` or holding one of those directive instances must rename the property.
- **Toast — BREAKING.** `[forToast]`'s `[closable]` input is now `[dismissible]`, matching Dialog's and
  Drawer's input of the same name. `ForToastConfig.closable` (the `ForToastManager.show()` /
  `ForToastRef.update()` config field) and `ForToastContext.closable` are renamed too. A stale `[closable]`
  binding fails Angular's strict-template typecheck and a stale `show({ closable })` fails at compile time.
- **Menubar / NavigationMenu — BREAKING.** `[forMenubar]` and `[forNavigationMenu]` `value` are now
  `model<string | null>` defaulting to `null`; `null` (not `''`) is the "nothing open" sentinel, aligning
  them with `[forTabs]` / `[forRadioGroup]`. `ForMenubarContext.value`, `ForNavigationMenuContext.value`
  and `ForNavigationMenuContext.previousValue` widen to `Signal<string | null>`, and both roots' implicit
  `(valueChange)` now emits `string | null`. Consumers seeding the model with `''` must switch to `null` —
  an empty string now reads as an open value with no matching trigger/item, reflecting
  `data-state="open"` on the root (and, on Menubar, removing its roving tab stop). Truthiness checks
  (`open() ? … : …`) are unaffected; explicit `=== ''` comparisons invert and must become `=== null`.
- **Slider — BREAKING.** `[forSliderThumb]`'s `[label]` input is renamed `[ariaLabel]` and retyped from
  `input<string>('')` to `input<string | null>(null)`, matching the library-wide uniform accessible-name
  input. A wrapper reading it back now sees `null` rather than `''` when unset.
- **Slider — BREAKING.** `[forSlider]`'s `[largeStep]` input is renamed `[stepMultiplier]` and its meaning
  changes from an absolute increment to a multiplier over `step`, matching `[forNumberInput]`.
  `[step]="5" [largeStep]="25"` becomes `[step]="5" [stepMultiplier]="5"`. `ForSliderDefaults.largeStep` →
  `ForSliderDefaults.stepMultiplier` (same `number` type, same `10` fallback), `ForSliderContext.largeStep`
  → `ForSliderContext.stepMultiplier`, and `FOR_SLIDER_HOST_DIRECTIVE_INPUTS` swaps `'largeStep'` for
  `'stepMultiplier'`. `[forPaneResizer]` deliberately keeps its absolute `largeStep` — its value is
  unit-agnostic, so there is no `step` grid to multiply against.
- **Drag & drop — BREAKING.** The drop-list coordination token is renamed `FOR_DRAG_DROP_CONTEXT` →
  `FOR_DROP_LIST_CONTEXT`, so it pairs with the `ForDropListContext` interface it already carried (and with
  the sibling `FOR_DROP_LIST_ROVING_DELEGATE` / `FOR_DROP_LIST_GROUP`). The interface name is unchanged, as
  are `FOR_DRAG_DROP_DEFAULTS` / `provideForDragDropDefaults` / `ForDragDropDefaults`,
  `FOR_DRAGGABLE_CONTEXT` and `ForDragDropEvent`.
- **Drag & drop — BREAKING.** `[forFreeDrag]`'s outputs are renamed `(dragStart)` / `(dragMove)` /
  `(dragEnd)` → `(moveStart)` / `(moveMove)` / `(moveEnd)`, keeping their `{ x, y }` payloads. They
  previously collided with `[forDraggable]`'s same-named reorder outputs, which carry entirely different
  payloads (`{ source, index }` / `{ dropped }`) and are **not** renamed.
- **Drawer — BREAKING.** The `(dragMove)` and `(release)` outputs are replaced by the toast-aligned
  `swipe*` family — `(swipeStart)`, `(swipeMove)`, `(swipeEnd)`, `(swipeCancel)`. This is a channel split,
  not just a rename: a `pointercancel` or a mid-gesture direction abort used to fire `release` with
  `willClose: false` and now fires `(swipeCancel)` and never `(swipeEnd)`. The arming pointer move used to
  emit `dragMove` twice; it now emits `(swipeStart)` once and `(swipeMove)` once. `ForDrawerOpenConfig`'s
  `dragMove` / `release` callbacks are replaced by `swipeStart` / `swipeMove` / `swipeEnd` / `swipeCancel`.
- **Drawer — BREAKING.** Payload types renamed: `ForDrawerDragEvent` → `ForDrawerSwipeEvent` with
  `percentageDragged: number` → `progress: number` (same `[0, 1]` value, correcting a fraction named
  "percentage"), and `ForDrawerReleaseEvent` → `ForDrawerSwipeEndEvent` (fields unchanged).
  `ForDrawerSwipeEvent` — the `swipeCancel` payload — drops `willClose` / `nextSnapPoint`, which were
  constants on that path; read the snap through `[(activeSnapPoint)]`.
- **Drawer — BREAKING.** The public `dragProgress` member on `ForDrawer` / `ForDrawerContext` is renamed
  `swipeProgress`, and `ForDrawer.dragTranslate: Signal<string>` is replaced by
  `swipeMovementX: Signal<number>` / `swipeMovementY: Signal<number>` (CSS px). `dragging` and the
  `data-dragging` attribute are unchanged.
- **Drawer — BREAKING (CSS).** `--for-drawer-translate` (a `"<x> <y>"` shorthand string) is replaced by
  `--for-drawer-swipe-movement-x` and `--for-drawer-swipe-movement-y`, each a px length (`0px` at rest).
  Compose the shorthand yourself: `translate: var(--for-drawer-translate, 0px 0px)` becomes
  `translate: var(--for-drawer-swipe-movement-x, 0px) var(--for-drawer-swipe-movement-y, 0px)`.
  `--for-drawer-drag-progress` is renamed `--for-drawer-swipe-progress` (same unitless `[0, 1]` value, same
  `[forDrawerBackdrop]` host).
- **Drawer — BREAKING.** `[forDrawer]` now reflects `data-state-nested` as a presence-only boolean (empty
  value) instead of `data-state-nested="true"`, following the library's boolean `data-*` rule. Consumer CSS
  keyed on `[data-state-nested="true"]` must switch to `[data-state-nested]`, and JS reading
  `getAttribute('data-state-nested') === 'true'` must switch to `hasAttribute('data-state-nested')`.
- **Carousel — BREAKING (CSS).** `--for-carousel-drag` is replaced by the orientation-gated pair
  `--for-carousel-swipe-movement-x` (horizontal) / `--for-carousel-swipe-movement-y` (vertical). Only the
  primary-axis property is written; consumers already branch their track transform on
  `[data-orientation='vertical']`, so the fix is one token per existing rule. `ForCarouselDrag.dragVar` is
  replaced by the `swipeMovementX` / `swipeMovementY` computeds — the CSS property was always the supported
  contract. `[forToast]` is unchanged: it already owned the canonical `swipe*` output and
  `--for-toast-swipe-movement-x` / `-y` vocabulary that Drawer and Carousel now match.
- **Combobox — BREAKING.** `[forComboboxAction]`'s `(action)` output is renamed `(activate)`, aligning it
  with `[forButton]` and the menu-item family (`activate` is the library-wide verb for click / Enter /
  Space activation). The payload is unchanged (`output<void>`). **Grep, don't trust your build:** the
  directive is applied to a `<button>`, so a leftover `(action)="…"` binding compiles fine and your handler
  silently never fires.
- **OTP input — BREAKING.** The `(valueComplete)` output is renamed `(complete)` and `(valueInvalid)` to
  `(reject)`, and `FOR_OTP_INPUT_HOST_DIRECTIVE_OUTPUTS` now lists `'complete'` / `'reject'` instead.
  Wrappers spreading the tuple pick this up automatically; wrappers that hand-listed the outputs must be
  updated. As with Combobox, a leftover binding does **not** fail the build — `[forOtpInput]` sits on a
  plain element, so Angular registers the old name as a DOM listener that never fires.
- **OTP input — BREAKING.** As a consequence of the output rename, the public `ForOtpInput.complete()`
  state signal is renamed `filled()`. The reflected host attribute is **unchanged** — still
  `data-complete` — so CSS hooks keep working. A template calling `otp.complete()` still compiles but now
  resolves to the `OutputEmitterRef`, not the boolean signal; switch to `otp.filled()`.
- **Select / core positioner — BREAKING (CSS).** The item-aligned positioner now publishes the shared
  `--for-available-height` instead of `--for-select-content-available-height`. It was generic core code
  naming a property after its only consumer, for a quantity the anchored positioner already publishes under
  the shared name. Both are the maximum block-size the surface may occupy before colliding; the value is
  still computed per positioner (anchor-relative from floating-ui's `size` in `popper`, viewport height
  minus `collisionPadding` on both edges in `item-aligned`), so `max-height: var(--for-available-height)`
  now works unchanged across both modes. `--for-available-width` stays `popper`-only — item-aligned
  computes no width budget.

### Removed

- **Slider (breaking)** — `[forSliderThumb]`'s `[labelledby]` input is gone. Write the native
  `aria-labelledby` attribute on the thumb instead: the directive no longer host-binds it, so a static
  value is preserved verbatim and a `[attr.aria-labelledby]="expr"` binding now works too (it previously
  fought the directive's own binding).
- **Core** — the `MenuOverlayCloseReason` and `MenuOverlayItemHandle` type twins are gone.
  `MenuOverlayCloseReason` was a byte-identical copy of the blessed `ForMenuCloseReason` (published by
  `forty-cdk/shared`) and `MenuOverlayItemHandle` was a bare alias of `MenuItemHandle`. Neither was
  exported from any barrel, so no consumer import path changes.

### Fixed

- **Slider** — a slider with a fractional `step` now pages proportionally on `PageUp` / `PageDown`.
  `[step]="0.1"` previously jumped by an absolute `10` (100 grid steps); it now jumps by
  `step × stepMultiplier` = `1` (10 grid steps), as the JSDoc had always promised. Behaviour is unchanged
  at the default `step` of `1`.

## [0.15.0] - 2026-07-27

The fourth resolution wave for the July 18, 2026 deep audit, and the release where the `forty-cdk/core`
stability boundary stops being prose. Core is explicitly **not** a public entry point any more: the 46
cross-primitive contracts that carry the library's semver guarantee are published from the new
`forty-cdk/shared` specifier, the barrel shrank from 353 to 210 exports, and a build gate holds the line
per symbol. Also lands the 14-item drag-drop / pane-resizer / carousel / scroll-area sweep, moves the
single-consumer engines out of core so a lazy-loaded route stops paying for them at startup, and takes the
piece-registration protocols off the public contexts of Table, Select and Combobox.

### Added

- **New `forty-cdk/shared` entry point** — one canonical specifier for the 40 cross-primitive contracts
  that carry the library's semver guarantee: 33 types (`DateAdapter`, `DateRange`, `WritingDirection`,
  `VetoableEvent`, `RovingTabindex`, `ListNavigationAction`, the segment / menu / swipe vocabularies, …)
  plus the runtime values `assertTimeCapable`, `FOR_DATE_ADAPTER`, `FOR_FIELDSET_CONTEXT`,
  `FOR_ID_SALT`, `FOR_MENU_CONTEXT`, `injectDateAdapter` and `provideForIdSalt`
  ([#1486](https://github.com/tutkli/forty-cdk/issues/1486)). Its built FESM is a single re-export line, so
  importing a type from it pulls no code and the DI singletons stay singly-compiled. The old → new import
  table lives in the entry point's README.
- **New `forty-cdk/visually-hidden` entry point** — `ForVisuallyHidden` gets a stable home outside core
  ([#1398](https://github.com/tutkli/forty-cdk/issues/1398)). It compiles to a pure re-export, so there is
  still exactly one class definition.
- **Multi-app id salt is importable** — `FOR_ID_SALT` / `provideForIdSalt` are published from
  `forty-cdk/shared` ([#1492](https://github.com/tutkli/forty-cdk/issues/1492)). Two Angular apps on one
  page both default to `APP_ID` `'ng'`, emit identical id sequences and cross-resolve each other's
  `aria-labelledby`; the salt was the documented remedy but had no supported import path. The new README's
  multiple-apps section carries the `bootstrapApplication` setup — the salt must be stable rather than
  random, or SSR hydration breaks. `IdGenerator` stays internal on purpose: a consumer configures the salt
  but never mints ids.
- **Scroll area** — pressing the scrollbar track scrolls the viewport, with a new `trackPress` input
  (`"page"` by default, plus `"jump"` and `"none"`), a press-and-hold repeat that stops when the thumb
  reaches the pointer, and `trackPressRepeatDelay` / `trackPressRepeatInterval` on
  `provideForScrollAreaDefaults` ([#1392](https://github.com/tutkli/forty-cdk/issues/1392)). The primitive
  hides the native scrollbar with a global stylesheet, so a synthetic track that ignored presses was
  strictly less capable than the control it replaces. `scrollToTrackPoint` and the axis geometry are on the
  context, so `trackPress="none"` is a complete escape hatch for exotic behaviour.
- **Carousel** — the rotation control's `startLabel` / `stopLabel` route through
  `provideForCarouselDefaults` (new `rotationStartLabel` / `rotationStopLabel` keys) instead of hardcoded
  English fallbacks ([#1392](https://github.com/tutkli/forty-cdk/issues/1392)).
- **Table / Select / Combobox** — `provideForTable`, `provideForSelect` and `provideForCombobox` return the
  full provider set a root installs, for wrappers that **subclass** it
  ([#1399](https://github.com/tutkli/forty-cdk/issues/1399)). Angular does not inherit a directive's
  `providers`, and now that these roots provide a second, unexported token, a hand-written re-provide of
  `FOR_<PRIMITIVE>_CONTEXT` alone can no longer wire the subclass up. Each root declares its own providers
  through the same helper, so the set has a single definition. See
  [Wrapping form primitives](docs/wrapping-form-primitives.md).
- **Select / Combobox** — imperative positioning-anchor registration is part of the public surface:
  `registerAnchor` / `unregisterAnchor` on `ForSelectOverlayFacade` (reached through
  `ForSelectContext.overlay`) and on `ForComboboxContext`. The declarative `[forSelectAnchor]` /
  `[forComboboxAnchor]` still covers the common case; the imperative channel is for an anchor element that
  lives in an ancestor component's template, where a directive would resolve DI outside the root.

### Changed

- **`forty-cdk/core` is not a public entry point — BREAKING.** The core surface is now split per symbol
  into a **blessed** tier (46 symbols carrying the library's semver guarantee, each published from exactly
  one entry point) and an **internal** tier (everything else, refactorable without notice), enforced by a
  `postbuild` gate instead of a prose disclaimer ([#1398](https://github.com/tutkli/forty-cdk/issues/1398),
  [#1486](https://github.com/tutkli/forty-cdk/issues/1486),
  [#1489](https://github.com/tutkli/forty-cdk/issues/1489)). Two consequences for consumers: the blessed
  contracts are **no longer re-exported from the 37 primitive barrels** (`WritingDirection` alone left 29 of
  them) — import them from `forty-cdk/shared`; and the core barrel dropped from 353 to 210 exports, so an
  import of an internal-tier symbol from `forty-cdk/core` no longer resolves. Six blessed symbols keep a
  primitive as their canonical publisher because it is their semantic home: `ForVisuallyHidden`
  (`forty-cdk/visually-hidden`), `ForDrawerSide` (`forty-cdk/drawer`) and the field-wiring set
  `FOR_FIELD_CONTEXT` / `ForFieldContext` / `FieldControlHandle` / `injectFieldWiring` (`forty-cdk/field`).
- **Carousel — BREAKING.** `[forCarouselPrevious]` / `[forCarouselNext]` reflect `aria-disabled` +
  `data-disabled` with an in-handler activation guard instead of the native `disabled` attribute
  ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 4), so reaching an edge in non-loop mode
  while the button holds focus no longer ejects focus to `<body>`. Styling keyed off `:disabled` must move
  to `[data-disabled]` / `[aria-disabled='true']`. This is the shape #1285 introduced for calendar
  navigation, verbatim.
- **Carousel — BREAKING.** `ForCarouselContext.setViewport(el, id)` is replaced by `registerViewport` /
  `unregisterViewport` ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 12): the viewport now
  clears its registration on destroy, and a duplicate viewport warns in dev mode.
- **Drag & drop — BREAKING.** `DropContainerGeometry` carries per-container `orientation` / `dir` and
  `resolveDropTarget` lost its two trailing parameters
  ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 1). Both are internal-tier core symbols as
  of this release and are listed only because they were importable from `forty-cdk/core` in 0.14.0.
- **Table / Select / Combobox (breaking)** — a primitive's public context interface no longer carries its
  piece-registration protocol ([#1399](https://github.com/tutkli/forty-cdk/issues/1399)). `ForTableContext`
  drops every `register*` / `set*` member (and the `rows` / `virtualWindow` / `virtualRowNavigation` /
  `reorderingRowIndex` read-backs that only served them); `ForSelectContext.overlay` is narrowed from the
  full `ListboxOverlayContext` to a documented read facade (`triggerId`, `contentId`, `lastCloseReason`,
  `openMenu`, `closeMenu`, `toggle`); `ForComboboxContext` drops its 16 `register*` / `unregister*`
  members plus `setActiveId` / `setInitialFocus`. Pieces coordinate through a second token no entry point
  exports, so refactoring how they wire up is no longer a breaking change to a public interface.

### Removed

- **Date field (breaking)** — the `DateTimeSegmentType` alias is gone from `forty-cdk/date-field` /
  `forty-cdk/date-range-field`; `SegmentType` (from `forty-cdk/shared`) is the only public name
  ([#1486](https://github.com/tutkli/forty-cdk/issues/1486)). A blessed symbol gets one public name and one
  import path — a second name is the same duplicate-path problem as a second specifier.
- **Table (breaking)** — the virtualization-seam and handle types (`TableVirtualWindow`, `TableVirtualRow`,
  `TableVirtualRowNavigation`, `ForTableRowHandle`, `ForTableCellHandle`) are no longer exported from the
  `forty-cdk/table` barrel; they moved to the internal tier with the members that needed them
  ([#1399](https://github.com/tutkli/forty-cdk/issues/1399)).
- **Select (breaking)** — `ForSelectOverlayContext` and `ForSelectOptionHandle` are no longer exported from
  the `forty-cdk/select` barrel; `ForSelectOverlayFacade` replaces the former as the consumer-facing
  overlay type ([#1399](https://github.com/tutkli/forty-cdk/issues/1399)).

### Fixed

- **Drag & drop** — a cross-container pointer drop resolves the insertion index on the **target's** axis
  and writing direction ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 1). A
  vertical→horizontal or ltr→rtl transfer computed it on the source list's axis and landed at the wrong
  position; the keyboard path always resolved per target, which is what hid the asymmetry.
- **Drag & drop** — cross-list announcements count valid insertion **positions** rather than items, so a
  transfer no longer announces "moved to position 4 of 3" and an empty target announces "1 of 1" instead of
  "1 of 0" ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 2). The `(label, index, total)`
  contract is now pinned in the defaults JSDoc so a custom builder cannot inherit the ambiguity.
- **Drag & drop** — an animated drop keeps a reference to the handed-off preview and destroys it on
  teardown, so an injector destroyed before the deferred cleanup renders (navigation triggered by the drop)
  no longer leaves the cloned, body-appended preview on screen forever
  ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 6).
- **Drag & drop** — a keyboard cross-list drop moves focus to the dropped item in the target list instead
  of letting it fall to `<body>`, with fallbacks for a consumer rendering fewer items or nothing focusable
  ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 7).
- **Drag & drop** — `orientation="mixed"` no longer oscillates between two insertion indices under a
  stationary pointer ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 8). The drop index is
  resolved from the single placeholder-free snapshot taken at lift — what `[liveSort]`'s JSDoc already
  promised — instead of from a re-measurement taken after the placeholder had displaced its siblings; the
  consumer-driven mid-drag item-count escape hatch is preserved.
- **Drag & drop** — FLIP first rects are captured before the placeholder teardown, so siblings no longer
  jump back to their un-parted positions and re-slide on drop
  ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 9). The placeholder clear moved into a
  `finally`, so a throwing consumer handler cannot leave the list parted.
- **Pane resizer** — the separator focuses itself on drag start (mirroring `[forSliderThumb]`), so arrow
  keys fine-tune immediately after release and assistive tech hears `aria-valuenow` during the drag
  ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 3).
- **Pane resizer** — a pending keyboard commit flushes on blur, so Tabbing away between `keydown` and
  `keyup` still fires `(resizeCommit)` ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 10).
- **Pane resizer** — the last non-minimum value is recorded on drag and keyboard commits, so the
  collapse toggle after a drag to the minimum restores the pre-drag size instead of the maximum
  ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 11). An Escape-reverted drag deliberately
  never becomes the restore target.
- **Carousel** — swapping the viewport no longer leaves the indicators pointing `aria-controls` at a
  detached element ([#1392](https://github.com/tutkli/forty-cdk/issues/1392) item 12).
- **Table** — `Ctrl`+`Home` scrolls a virtualized `mode="grid"` back to the top
  ([#1499](https://github.com/tutkli/forty-cdk/issues/1499)). Focus moved onto the first header cell but the
  virtual window never scrolled, so a keyboard-only user at the bottom of a 10 000-row grid was left on the
  header of a grid still showing row 9986 and the next `ArrowDown` landed back in the middle of the
  dataset. Focus keeps landing on the first **header** cell whenever the header joins the roving grid — the
  header row _is_ grid row 1 — so virtualized and non-virtualized no longer diverge.

### Performance

- **Lazy-loaded routes stop paying for engines they use** — the single-consumer modules that lived in
  `forty-cdk/core` moved into the entry point that owns them
  ([#1490](https://github.com/tutkli/forty-cdk/issues/1490),
  [#1496](https://github.com/tutkli/forty-cdk/issues/1496)): the drag-session engines (auto-scroll, drag
  slots, FLIP, handle guard, placeholder position) to `forty-cdk/drag-drop`, the tree drop resolver to
  `forty-cdk/tree`, the flat-hierarchy walk to `forty-cdk/table`, locale number parsing to
  `forty-cdk/number-input`, and snap-target resolution plus `ForDrawerScaleCoordinator` to
  `forty-cdk/drawer`. Measured against the published package with an eager component and a lazy route,
  `forty-cdk-core.mjs` inside the eager chunk shrank **20.4%** for an app lazy-loading drag & drop and
  **11.9%** for one lazy-loading the drawer; the bytes moved to the lazy chunk rather than disappearing. No
  public API or behaviour change.

## [0.14.0] - 2026-07-26

The third resolution wave for the July 18, 2026 deep audit — the menu family + toolbar sweep (19 items),
the form-primitives sweep (15 of 16 items) and three cross-cutting accessibility contracts: a consumer's
static `aria-label` / `aria-labelledby` / `aria-describedby` is now adopted instead of erased, and
`aria-readonly` is role-gated. Breaking changes in the menubar defaults, the separator emission policy,
the file-upload rejection payload, several public contexts, and the ARIA emitted by nine form hosts.

### Added

- **Search** — `Escape` clears a non-empty value (the native `<input type="search">` affordance),
  consuming the key only when it actually clears — an empty, disabled or read-only box lets it through to
  the enclosing overlay. The new `clearOnEscape` input (default `true`) opts out entirely, so a command
  palette inside a dialog dismisses on the first press.
- **Menu, select & combobox separators** — `<hr forMenuSeparator>`, `[forSelectSeparator]` and
  `[forComboboxSeparator]` gain `orientation` and `decorative` inputs, `role="none"` when decorative and
  an always-stamped `data-orientation`. All five separators in the library now share one emission policy.
- **Table & pane-resizer** — new teardown-safe revert channels: `[widthRevert]` on
  `[forTableColumnResizer]` (payload `TableResizeDescriptor`) and `[valueRevert]` on `[forPaneResizer]`
  (payload `number`) report the pre-drag value when a handle is destroyed mid-drag. They are callback
  inputs rather than outputs because an `output()` / `model()` emitter is already destroyed at teardown
  time. `<for-table-body>` binds `[widthRevert]` internally and folds the value back into
  `[(columnWidths)]`, so declarative consumers need no new wiring.
- **Menubar** — `provideForMenubarDefaults` can now tune the menu positioning (`sideOffset`,
  `collisionPadding`, …): the shell seeds from `MENU_POSITIONING_DEFAULTS` instead of hardcoded literals.
- **Button** — honours an enclosing `[forFieldset]`'s `disabled` through a new public `effectiveDisabled`.
- **Slider** — dev-mode `[forty-cdk/slider]` warnings for `min > max` and `step <= 0`.
- **Radio & toggle group** — `data-readonly` styling hooks on `[forRadio]` and `[forToggleGroup]`, the
  supported channel now that `aria-readonly` is gone from those roles.

### Changed

- **Accessibility (`aria-label`)** — **BREAKING.** 45 host bindings adopt a consumer's static
  `aria-label` instead of erasing it. An `[attr.aria-label]` binding resolving to `null` calls
  `removeAttribute`, so `<ul forListbox aria-label="Toppings">` previously ended up with **no** accessible
  name. On the six surfaces that also emit a generated `aria-labelledby` fallback, that fallback is now
  gated on the resolved name. Six hosts deliberately **keep** their computed name (`[forCalendarCell]`,
  `[forCarouselSlide]`, `[forCarouselIndicator]`, `[forCarouselRotationControl]`,
  `[forComboboxChipRemove]` and the date / time segments) because each is stamped per datum in a repeat or
  swaps with state; override those through their reactive `[ariaLabel]` input.
- **Accessibility (`aria-labelledby` / `aria-describedby`)** — **BREAKING.** The same adoption for all 18
  `aria-labelledby` hosts (the consumer's value **replaces** the library fallback) and all 4
  `aria-describedby` hosts (the consumer's value is **composed** first, since descriptions are additive).
  Markup that previously had its static value silently replaced now announces the consumer's name.
  `[forTooltipTrigger]` appends the open tooltip's id after a consumer hint instead of replacing it. The
  static-only boundary is unchanged: an `[attr.aria-labelledby]="expr"` property binding is not adopted.
- **Accessibility (`aria-readonly`)** — **BREAKING.** Nine hosts whose role does not support the property
  stop emitting it: `role="group"` on `[forSlider]`, `[forDateField]`, `[forTimeField]`,
  `[forDateRangeField]`, `[forTimeRangeField]` (plus both range endpoint groups) and `[forToggleGroup]`,
  and `role="button"` on `button[forToggle]`. Every one was an axe `aria-allowed-attr` violation; the
  announcement already lives where ARIA puts it (`role="slider"` on the thumb, `role="spinbutton"` on each
  segment, `role="radiogroup"` on the radio root). Style and assert on `[data-readonly]` instead.
- **Menubar** — **BREAKING.** The `closeDelay` input and its `ForMenubarDefaults` key are removed: the bar
  scheduled a hover-leave close with no focus check and stamped `'pointerDownOutside'`, so a wandering
  mouse unmounted a keyboard-focused menu and dropped focus on `<body>`. The APG Menubar pattern
  prescribes no hover-leave close, so the feature is gone rather than patched — hover-_switch_ between
  sibling triggers is unchanged. `ForMenubarDefaults` also gains two required keys.
- **Navigation menu** — **BREAKING.** `[forNavigationMenuTrigger]` no longer emits native `disabled`; the
  doubled reflection collapses to `aria-disabled`, and a root-disabled navigation menu stamps it on every
  trigger.
- **Dropdown menu** — **BREAKING.** `[forDropdownMenuTrigger]` no longer emits `aria-disabled` — one
  reflection channel, not two.
- **Menu, select & combobox separators** — **BREAKING.** None of the three emits the default
  `aria-orientation="horizontal"` any more; the ARIA default is omitted and the attribute is emitted only
  for `orientation="vertical"`. Selectors keyed on `[aria-orientation="horizontal"]` should move to
  `data-orientation`.
- **Menu close reasons** — **BREAKING.** `ForMenuCloseReason` and `MenuOverlayCloseReason` gain a
  `'hover'` member, so an exhaustive consumer `switch` sees a new case.
- **Menu context** — **BREAKING.** `ForMenuContext` gains `focusInitialEnabledItem(target)`, the single
  owner of the `'first' | 'last'` → focus-call mapping that was hand-written in three places. The contract
  already published the target vocabulary (`initialFocus` / `setInitialFocus`) but no way to act on it.
  Source-breaking for anyone implementing the interface themselves; `focusFirstEnabledItem` /
  `focusLastEnabledItem` stay as the granular pair.
- **Slider & combobox contexts** — **BREAKING.** `markTouched()` is removed from `ForSliderContext` and
  `ForComboboxContext` — nothing outside the owning primitive called either, and both revert to the
  inherited `protected` member. Select, time-picker, date-picker and number-input keep theirs (real
  external callers).
- **File upload** — **BREAKING.** `filesRejected` emits `ForFileUploadRejection[]` (`{ file, reason }`)
  instead of `File[]`.
- **Form contexts** — **BREAKING.** `ForFileUploadContext` gains `unregisterInput`,
  `ForNumberInputContext` gains `markTouched` and `ForSliderContext` gains `thumbBounds` — required
  members, so external implementers of those interfaces break.
- **Number input** — **BREAKING.** Keyboard stepping snaps to the step grid instead of precision-rounding:
  `ArrowUp` from `0.55` with `step=1` lands on `1`, not `1.55`. Off-grid page-sized travel follows the
  platform `HTMLInputElement.stepUp(n)` rule — snap to the adjacent grid point, discard the multiplier.
- **Slider** — **BREAKING.** `touch` emits on every touch-producing interaction (the once-guard is gone),
  matching the other 20 controls, and a `pointerdown` on the track or thumb is now `preventDefault()`ed —
  ancestor pointer-drag sessions stand down and no compat mouse events fire for that gesture.

### Fixed

- **Menubar** — the away-arrow on a plain item inside a nested submenu was a dead key: menu content is
  portaled to `<body>`, so the keydown never reached the bar. It now collapses every submenu level and
  switches to the adjacent menubar menu, both directions, RTL covered. `Enter` / `Space` / `ArrowDown` on
  an already-open trigger move focus to the first item (last for `ArrowUp`) instead of `preventDefault`ing
  into a no-op.
- **Menubar** — the same `[forMenuContent]` / `[forMenuItem]` markup no longer silently loses behaviour
  under a menubar: the six dismiss / auto-focus channels are declared on `ForMenubar` and forwarded, the
  Escape veto reads `VetoableNativeEvent` instead of raw `defaultPrevented`, and `registerContent` adopts
  a consumer's static `id`.
- **Menu (dropdown, context menu, submenu)** — an APG open key pressed on an already-open menu moves
  focus into the menu instead of being a consumed-but-dead keystroke that stranded focus on the trigger.
  `Enter` / `Space` on `[forDropdownMenuTrigger]` are handled on `keydown` and, per the APG menu-button
  pattern, only ever open — previously `Enter` on an open trigger fell through to the native click and
  closed the menu. Pointer click keeps its toggle semantics.
- **Dismissable layer** — a parent menu and one of its submenus mounted in the **same** render pass (a
  state-restore or hydration path) inverted the layer stack, because the two `afterNextRender` callbacks
  fire child-before-parent: the first focus inside the submenu then read as `focusOutside` on the parent
  and collapsed the whole chain. Nested layers now order by declared nesting depth; unrelated overlays
  keep plain LIFO, so a dialog opened from a submenu item still lands topmost.
- **Menu submenu** — the pointer paths route through the overlay pipeline instead of writing `open.set()`
  directly, so `lastCloseReason` is genuinely reset on every open and a programmatic open after a
  hover-close no longer inherits suppressed auto-focus.
- **Navigation menu** — hover handlers are gated by pointer type, so a touch press-and-hold no longer
  opens the panel mid-press and inverts it on the follow-up tap. `focusout` containment — plus the
  `'pointer'` dismiss channel and the Escape guard, all three now sharing one predicate — counts a panel
  rendered in an external viewport, so Tab into it keeps the panel open. The trigger finally honours the
  `item || menu` disabled merge its JSDoc promised.
- **Context menu** — a context menu is no longer named after its entire right-click region.
- **Toolbar** — `[forToolbarLink]` honours toolbar-level `disabled`: a disabled toolbar left links
  clickable, tabbable and unannounced, with arrow navigation dead around them. It now mirrors
  `ForToolbarButton` exactly, `stopImmediatePropagation` included.
- **Menus** — every focus move in the shared item list passes `preventScroll`.
- **Table & pane-resizer** — a resize handle destroyed mid-drag (its column dropped from
  `displayedColumns`, `resizable` toggled off) left the transient drag width committed and logged
  `NG0953: Unexpected emit for destroyed OutputRef`. Both resizers now cancel the pointer session on
  destroy and report the pre-drag value through the new revert channel; `Escape` / `pointercancel` keep
  reverting through `[(width)]` / `[(value)]` exactly as before.
- **Slider** — a track press focuses the thumb (the `pointerdown` is `preventDefault()`ed so the compat
  `mousedown` cannot clear the focus just set), and a thumb's `aria-valuemin` / `aria-valuemax` respect
  the neighbour gap enforced by `minStepsBetweenThumbs`, so assistive tech no longer announces a range the
  thumb cannot reach.
- **File upload** — under `multiple=false` the overflow files no longer vanish from both outputs: one
  source-ordered pass partitions them and the extras surface in `filesRejected` with reason `'multiple'`.
  Disabling mid-drag always resets `data-dragging` and the drag-depth counter. The input now unregisters
  on unmount, so an `@if`'d input no longer leaves `openFileDialog()` clicking a detached node.
- **Search** — the documented disabled / read-only no-op moved inside `clear()`, so every caller gets it.
- **Field** — the duplicate-control warning fires from a settled count, so two sibling `@if`s that
  transiently reach count 2 within one template pass no longer false-positive; all four slot warnings
  (control / label / description / error) share that path.
- **Number input** — the spinner buttons mark the field touched, so a pointer-only user no longer leaves
  it dirty-but-untouched with error display disengaged.
- **OTP input** — a rejected mid-string character preserves the caret: the pre-write selection is mapped
  through the filter and restored instead of being slammed to the end.

## [0.13.0] - 2026-07-24

The second resolution wave for the July 18, 2026 deep audit — three large sweeps across the date & time
family (including the shared field engines), select / combobox / listbox, and the overlay family
(dialog, drawer, toast, tooltip, hover-card), plus carousel, table, stepper and virtualization fixes.
Breaking changes in the date / time field value contract and contexts, select / combobox behavior, and
the tooltip / toast defaults.

### Added

- **Core (swipe dismiss)** — `SwipeDismissOptions` gains an optional `canBegin(detail)` pre-arm
  predicate, so a gesture can be vetoed before the pointer session arms — no pointer capture is taken
  and no post-release click trap is installed. The flick thresholds are now shared named exports:
  `FLICK_VELOCITY_PX_PER_MS`, `FLICK_STALE_VELOCITY_MS` and the pure `flickVelocity(raw, stale)` helper.
- **Core (accessible text)** — new `accessibleTextContent()` helper: an element's text content with
  `aria-hidden="true"` subtrees excluded.
- **Select** — new optional `selectedIndex` input: a virtualized open-time reveal hint that scrolls to
  the committed selection on first open (`[(value)]` stays authoritative).
- **Toast** — `ForToastRef.resetTimer()` restarts the auto-dismiss countdown.
- **Drawer** — `ForDrawerRef` gains `setActiveSnapPoint()` and a readonly `activeSnapPoint`, wired
  two-way through the outlet — programmatic parity with the declarative `[(activeSnapPoint)]`.
- **Hover-card** — ports tooltip's imperative `show()` / `hide()`, the `data-reduced-motion` reflection
  and the pointer-grace safe triangle.
- **Tooltip** — the public `scheduleOpen(reason)` threads the open reason.
- **Stepper** — `ForStepperContent` gains an optional `[step]` input declaring the panel's step index, so
  `data-state` / `inert` / `aria-hidden` / `aria-labelledby` follow the declared step rather than the
  panel's position among its siblings — the only way to pair panels when a middle one is `@if`'d out.
  Unbound, the positional contract is unchanged.
- **Virtualization** — `measureElement()` accepts `null` to trigger the virtualizer's eviction sweep for
  consumers doing manual dynamic measurement.

### Changed

- **Date & time fields** — **BREAKING.** Commit-on-settle: `value` / `(valueChange)` emit only on settled
  commits (segment completion / blur); mid-typing transients stay confined to the engine and are no
  longer observable. Blur flushes a pending transient as a settled, clamped commit, so a bound `minDate`
  / `maxDate` is never silently violated and the date-picker time bridge only ever sees settled values.
- **Date & time fields** — **BREAKING.** `data-empty` reflects the all-editable-segments-empty state (an
  AND across both endpoints for range fields) instead of `value() === null`.
- **Date & time fields** — **BREAKING.** `SegmentEditorContext` — and `ForDateFieldContext` /
  `ForTimeFieldContext` plus the range contexts that expose it — reach the per-segment methods through
  `ctx.delegate.*` (`SegmentEditorDelegate`) rather than directly on the context.
- **Date & time fields** — `Backspace` removes the last entered digit of the focused segment;
  `Delete` remains the whole-segment clear.
- **Combobox** — **BREAKING.** `[forComboboxAction]` dev-throws when used without a `[forComboboxList]`:
  `[forComboboxContent]` carries `role="listbox"`, so a `role="button"` placed directly inside it is an
  invalid listbox child. Wrap the options in a `[forComboboxList]` so the action becomes a sibling of the
  listbox.
- **Select** — **BREAKING.** The popup no longer returns focus to the trigger when dismissed by
  pointer-down-outside / focus-outside — focus follows where the user clicked, matching native
  `<select>`, popover, menu and the combobox picker (this reverses the narrow 0.9.0 select decision).
  Return-focus on selection / `Escape` / programmatic close is unchanged; modal select is untouched.
- **Select, combobox & listbox** — **BREAKING.** Option label and typeahead text exclude
  `aria-hidden="true"` subtrees, so a selected option's indicator glyph no longer breaks prefix matching
  (`[forListboxOptionIndicator]` is now `aria-hidden="true"` for parity). Consumer text marked
  `aria-hidden` is likewise excluded — the correct accessible-name semantics.
- **Tooltip** — **BREAKING.** The `hoverableContent` library default flips `false` → `true`, so tooltip
  content is hoverable by default (WCAG 1.4.13).
- **Toast** — **BREAKING.** A `duration` change while the toast is paused now applies on resume
  (reversing the earlier hold-until-restart behavior), and the auto-dismiss timer restarts on a dedupe
  re-show.
- **Dialog** — **BREAKING.** The declarative `[forDialog]` honors `provideForDialogDefaults`; it
  previously re-defaulted at the outlet and ignored the scope provider.
- **Drawer** — **BREAKING.** Internal composition surfaces changed: `ForDrawerRef`'s constructor gains a
  required third argument, `DrawerStackNode.side` is now a `Signal`, and the dead
  `DrawerStackNode.scaleBackground` field is removed.
- **Table** — **BREAKING.** `aria-multiselectable` is gated on mode: a `mode="table"` root no longer
  emits it under `selectionMode="multiple"` (WAI-ARIA permits the attribute only on selection-bearing
  composites — `grid`, `treegrid`, `listbox`, `tree`). Root-level twin of the 0.12.0 `aria-selected`
  gating.
- **Stepper** — **BREAKING.** `ForStepperContentHandle` gains a required `index: Signal<number>` member;
  a consumer implementing a custom content handle must supply it.

### Fixed

- **Date & time fields** — `granularity="day"` preserves the value's time-of-day, matching the calendar,
  instead of zeroing it.
- **Date & time fields** — `setDayPeriod` no longer fabricates an hour: an AM/PM chosen while the hour is
  empty stores the day period as its own nullable part.
- **Date & time fields** — segments accept Unicode digits (e.g. Arabic-Indic), and typed AM/PM matches
  non-Latin day-period names (午前 / 午後, 오전 / 오후, ص / م) with a Latin `a` / `p` fallback.
- **Date & time range fields** — `focus()` targets the first null endpoint.
- **Time picker** — around a DST spring-forward the slot list no longer duplicates labels or loses its
  single `aria-selected`: slots are generated off a DST-stable sentinel and grafted onto the value at
  activation, so activating a slot commits the time it displays.
- **Select** — typeahead cycles on a repeated keystroke and anchors at the active / selected option
  across all three paths (open, virtualized, closed) — the fix listbox already had.
- **Combobox** — virtualized inline completion resolves options outside the rendered window and never
  offers a disabled option.
- **Combobox** — the label cache keys by serialized value rather than the per-mount option id, so
  renaming an option's label between opens updates the chip and selected labels.
- **Combobox** — `Tab` off an action is guarded on `open()`, resolves a stale source id against the full
  collection, and keeps a just-disabled focused action in the ring; `Escape` on a chip closes an open
  popup, consistent with action `Escape`.
- **Listbox & combobox** — re-selecting the already-selected option no longer re-emits `valueChange`
  (the guard select already had).
- **Drawer** — a vetoed swipe (handle-only, or a scrollable region that is not at its edge) is declined
  before the pointer session arms, so it no longer captures the pointer or swallows the next click;
  `pointercancel` mid-swipe springs the drawer back instead of requesting a close; flick velocity is
  zeroed when the last `pointermove` is older than 100 ms; and the swipe-start snap cache is validated by
  dimension as the release path already did.
- **Drawer** — `[side]` and `[scaleBackground]` are reactive at runtime; the background-scale coordinator
  re-registers when the side flips.
- **Toast** — pausing at the expiry instant no longer sticks the toast open.
- **Tooltip** — a `'focus'` open is exempt from scroll suppression.
- **Hover-card** — traversing the gap between anchor and content no longer breaks at `closeDelay: 0`; the
  root owns the reconciliation, as in tooltip.
- **Carousel** — a drag starting on a scrollable slide that is not at its scroll edge is declined before
  the pointer session arms, so it takes no pointer capture and leaves the next click on that slide intact.
- **Virtualization** — `[forVirtualViewport]` sweeps detached recycled rows from the measurement cache
  once per render, so a monotonically scrolling list no longer retains one detached element plus a live
  `ResizeObserver` entry for every row scrolled past. Twin of the 0.12.0 table `measureRows` fix.
- **Stepper** — the trigger / panel ARIA pairing is keyed by step index rather than collection position,
  so a structurally hidden (`@if`) trigger or panel no longer shifts `aria-labelledby` / `aria-controls`
  past it, drops the whole `role="tablist"` out of the Tab order, or leaves two `tabindex="0"` entry
  points.

## [0.12.0] - 2026-07-23

The resolution wave for the July 18, 2026 deep audit — sweeps across the core state/navigation
utilities, core overlay infrastructure, the dismissable-layer, the static primitives, and the table +
virtualization primitives. Several breaking changes in `forty-cdk/core` and the
table / tabs / stepper / breakpoints primitives.

### Added

- **Tabs** — `ForTabsList` gains the uniform `ariaLabel` input, bound to `role="tablist"`.
- **Accordion & Pagination** — every disable-capable piece now reflects `data-disabled` (truthy-only)
  when effectively disabled, alongside the native `disabled` / `aria-disabled`, matching the disclosure
  precedent, so a disabled sibling can be styled off one attribute across primitives.
- **Core (drag)** — `createPointerDragSession` accepts an opt-in `cancelOnDestroy` flag that cancels an
  in-flight drag if the session is destroyed mid-gesture (default `false`, no change for existing callers).

### Changed

- **Core (roving tabindex)** — **BREAKING.** `reconcileRovingActive` and `ReconcileRovingActiveOptions`
  are removed from `forty-cdk/core`. Reconciliation is folded into `RovingTabindex` as a `linkedSignal`
  over a caller-supplied items signal, so a disabled / disconnected active handle now reconciles
  synchronously without a per-container reconcile `effect()`.
- **Core (a11y ids)** — **BREAKING.** `registerA11yName` / `registerA11yDescription` return a plain
  `string` (the generated id) instead of a decorative `Signal<string>`; host-bind `'[id]': 'id'` directly.
- **Core (collection / navigation)** — **BREAKING.** Removed the `readEntryGuarded` barrel alias (use
  `tryReadHandle`) and the `registerCollectionHandle` convenience overload.
- **Core (dismissable layer)** — **BREAKING.** A dismissable layer must now declare its channel ownership
  explicitly via a required `channels: readonly DismissableLayerChannel[]` field — it is no longer inferred
  from handler presence (the `handlesPointer` / `handlesFocus` getters are gone) — and the unused
  `DismissableLayerActivateOptions.onDismiss` callback is removed. `DismissableLayerChannel` is now
  exported from `forty-cdk/core`.
- **Tabs & Stepper** — **BREAKING.** Disabled triggers / steps stay in the roving cycle: `Arrow` / `Home`
  / `End` land on them (activation stays guarded) instead of skipping over them, so they are now
  focusable-but-inert, matching the WAI-ARIA APG. Listbox, toolbar, menubar and radio-group keep their
  disabled-skip navigation.
- **Stepper** — **BREAKING.** `ForStepperTriggerHandle` gains a required `index: Signal<number>` member;
  a consumer implementing a custom trigger handle must supply it.
- **Breakpoints** — **BREAKING.** Renamed to the standard defaults-provider scheme: `FOR_BREAKPOINTS` →
  `FOR_BREAKPOINTS_DEFAULTS`, `provideForBreakpoints` → `provideForBreakpointsDefaults`,
  `breakpointsTailwind` → `forBreakpointsTailwind`.
- **Table** — **BREAKING.** In `mode="grid"` / `treegrid`, `[forTableColumnResizer]` and
  `[forTableSelectAll]` emit `tabindex="-1"` and are reached via `Enter` / `F2` cell-entry, so the grid
  keeps a single tab stop instead of taking one `Tab` per resizable column.
- **Table** — **BREAKING.** Rows in `mode="table"` no longer emit `aria-selected` at all (it is gated to
  grid mode); style the falsy state on the attribute's absence, not `[aria-selected="false"]`.
- **Table** — **BREAKING.** `(columnReorder)`'s `from` / `to` are now indices in the full displayed
  column order (previously relative to reorderable cells only), so interleaved fixed columns no longer
  corrupt a `moveItemInArray`.
- **Table** — **BREAKING.** `[forTableRowSelector]` is now a focusable `role="checkbox"` — the incorrect
  `aria-hidden="true"` was dropped and it has a table-mode keyboard selection path.

### Fixed

- **Core (overlay)** — a leave animation defined on an inner panel rather than the overlay host is no
  longer cut short; the deferred-teardown path waits on `getAnimations({ subtree: true })`.
- **Core (focus trap)** — `FocusTrap` recomputes focusable / tabbable candidates on every read instead of
  caching them, so a container-external class / stylesheet / media-query change that hides a tabbable can
  no longer leave `Tab` able to escape the trap.
- **Core (drag)** — the post-drag click suppression only swallows a click within 2 px of the release
  point, so a release that produced no synthetic click (pointer released over an iframe / off-viewport)
  no longer eats the next genuine click.
- **Core (swipe dismiss)** — an off-axis wobble no longer kills a swipe: `onLift` may return `'skip'` to
  decline arming while keeping the press tracked, so an on-axis lift can still happen later in the same
  press.
- **Core (scroll dismiss)** — `ScrollDismissDispatcher` refcounts each registration independently, so
  registering the same callback twice yields two independent, idempotent teardowns.
- **Core (keyboard navigation)** — a backward looped move from the sentinel index clamps to the last
  index instead of overshooting.
- **Core (typeahead)** — keystrokes emitted during IME composition (`event.isComposing`) no longer
  pollute the typeahead buffer or move the active descendant.
- **Dismissable layer** — containment is stack-aware: an interactive Escape-only surface (a hover-card
  over a popover / menu) no longer leaks an "outside" dismissal to the layer below when the user clicks or
  tabs inside it. `Escape` also honors `event.defaultPrevented`, so an inner widget can cooperatively
  claim the key and keep its overlay open.
- **Tabs** — every trigger whose panel is registered emits `aria-controls` (previously only the selected
  trigger), and it still never dangles under the `@if(selected())` unmount pattern.
- **Stepper** — `navigate()` activates the correct step when a trigger is structurally hidden (`@if`),
  resolving the target by item index rather than trigger-collection position; and the progress
  `aria-valuenow` reaches 100 only at completion (divides by `total`, not `total - 1`).
- **Pagination** — `effectivePage` is read-only, so the page window / `aria-current` can no longer move
  without emitting `pageChange`; `count` / `siblingCount` / `boundaryCount` are coerced and clamped
  (NaN / ±Infinity / fractional / negative).
- **Avatar** — a late `load` / `error` from a replaced `src` can no longer settle the current request
  (guarded on `HTMLImageElement.complete`), and a garbage `fallbackDelayMs` coerces to the scope default.
- **Table (virtualization)** — a `measureRows` table no longer leaks detached rows: the measure seam
  triggers the virtualizer's eviction sweep, and retained (focused / reordering) out-of-window rows are
  positioned from their measured size instead of the raw estimate.
- **Table (virtualization)** — cross-window keyboard navigation steps over disabled placeholder /
  skeleton cells, and a pending cross-window target is cleared on the next grid key and clamped to the
  loaded prefix, so a late page load never steals focus mid-typing.
- **Table** — loading skeleton cells are stamped `disabled` with coherent row counts, and the
  interactive-descendant guard (for row activation / selection / sort) now also recognizes `label`,
  `contenteditable`, media controls, and interactive ARIA widget roles.
- **Table** — `Space` / `Enter` on a column resize handle inside a sortable header no longer also
  triggers the sort; `Ctrl+Home` resolves the same target in virtualized and non-virtualized modes; and
  `[(columnWidths)]` gains a removal path (a `removeColumnWidth` context method clears the
  `--for-table-col-*-width` var on reset / remove / unmount).
- **Table** — column names are validated at the CSS-interpolation choke points, throwing a dev-mode
  `[forty-cdk/table]` error on an unsafe name.

### Performance

- **Core (flat hierarchy)** — membership is computed in a single O(n) level-counter pass (was O(n²) on
  the table hot path); behavior is unchanged.

## [0.11.1] - 2026-07-23

### Fixed

- **Core (focus)** — CSS-hidden elements no longer count as focusable. `FocusTrap` and the
  focusable-descendant check now share one candidate filter, so a tab panel whose only focusable child
  is CSS-hidden is reported empty and `ForTabsContent` gives it `tabindex="0"` again.
- **Core (positioning)** — changing an overlay's positioning config while it stays open cancels the
  in-flight positioning run, so a superseded run no longer writes stale `translate` / `data-side` /
  arrow position. `onFirstPosition` now fires once per open cycle rather than once per positioning run.
- **Core (number parsing)** — the numeric-keypad `.` is treated as the decimal separator in locales
  whose decimal separator isn't `.` (e.g. `1.5` typed on the numpad in `de-DE` parses as `1.5`, not
  `15`).
- **Collection** — the collection observer re-anchors after its host is re-parented in the DOM, so
  registration order stays correct when a host element moves.
- **Live announcer** — live regions are exempt from the modal `inert` pass, so toasts and other
  announcements are still spoken over an open modal instead of being silenced.
- **Live announcer** — the announcement generation counter is scoped per region, so a rapid burst in
  one region no longer cancels a concurrent announcement in another.
- **Stepper** — server-side rendering renders the active step. The item, trigger and content register
  synchronously instead of in `afterNextRender`, so the initial SSR markup reflects the active step
  rather than the completed state.
- **Combobox** — `Escape` on a focused combobox surface closes the popup instead of falling through to
  an enclosing dismissable layer.
- **Combobox** — removing a selected chip no longer dismisses the open panel.
- **Drag & drop** — pressing `Escape` mid-drag cancels the drag while keeping the enclosing overlay
  (dialog / popover) open; the key is consumed at capture phase instead of bubbling to the dismissable
  layer.
- **Dialog & drawer** — return focus survives a close→open modal swap in a single change-detection
  pass. The return-focus target is resolved at close time — with an optional `returnFocusTarget`
  override threaded through the dialog and drawer managers — so focus no longer falls to `<body>` after
  a confirm-step or wizard hand-off.
- **Date field** — February 29 can be typed in natural locale order again; the leap-day resolver no
  longer re-clamps the day against a non-leap reference year.
- **Table** — a click that lands on an SVG icon (or its `<path>`) inside a consumer-placed control (an
  icon `<button>` or `<a>`) in a selectable row's data cell no longer also toggles the row's selection;
  the inner-control guard now matches SVG click targets.
- **Signal forms** — the `forSingleValueField` proxy is introspection-coherent: `in`, `Object.keys`,
  spread and `getOwnPropertyDescriptor` delegate to the wrapped field instead of reporting no members,
  and delegated members keep their signal brand.

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

[Unreleased]: https://github.com/tutkli/forty-cdk/compare/v0.15.0...HEAD
[0.15.0]: https://github.com/tutkli/forty-cdk/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/tutkli/forty-cdk/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/tutkli/forty-cdk/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/tutkli/forty-cdk/compare/v0.11.1...v0.12.0
[0.11.1]: https://github.com/tutkli/forty-cdk/compare/v0.11.0...v0.11.1
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
