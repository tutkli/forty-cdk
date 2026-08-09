# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.22.0] - 2026-08-09

A release about what the library tells you and where you reach it from. Every error and warning now
carries a stable `FORCDK-<AREA>-<NNN>` code with a `Cause` and a `Fix`, so a message is something you
can look up and assert on instead of a string that reads differently in each primitive. The context
tokens stop advertising the machinery a primitive coordinates itself with — `ForComboboxContext` went
from 77 members to 22 — so what a consumer can inject is what a consumer was meant to use. The two
range-field entry points fold into their bases, the floating positioners' CSS custom properties take
a `--for-floating-*` namespace, and `ForTree` finally keys expansion and selection by the node value
like `ForTable` does. Five breaking changes, all of them a find-and-replace or a type argument.

### Added

- **Stable error codes across every developer-facing message**
  ([#1721](https://github.com/tutkli/forty-cdk/issues/1721)). Every error and warning the library
  reports now carries a `FORCDK-<AREA>-<NNN>` code, plus a `Cause` and a `Fix` line where they add
  something — 129 codes across 48 areas, with one layout definition and nothing building a
  `[forty-cdk/…]` prefix by hand. The prefix is derived from the code's area, so the two can never
  disagree, and a shared check that runs on behalf of a primitive reports under that primitive
  (`FORCDK-CORE-007` prints `[forty-cdk/accordion]` when an accordion piece resolved no root). The
  codes are the stable handle: numbering is arbitrary and immutable, retiring a failure frees its
  number rather than renumbering the rest. Two consequences worth knowing: the `ng-template` caveat
  that is the actual cause of an orphan-context error shipped in 10 of ~55 resolvers and is now on
  all of them, and the four `[forTable]` context resolvers that used to emit two indistinguishable
  messages now name the token that failed. The 12 `console.warn` sites follow the same layout, so the
  console surface is not split in two.
- **Tree** — `ForTree<T = string>` keys expansion and selection by the node value
  ([#1738](https://github.com/tutkli/forty-cdk/issues/1738)). `expanded` named the same concept on
  `ForTree` and `ForTable` and carried two shapes — `readonly string[]` on a tree that was not
  generic at all, `readonly T[]` on the table — so a tree over object nodes had to maintain a second
  identity vocabulary of string keys. `ForTree` now takes the type parameter: `value` / `expanded`
  are `model<readonly T[]>`, `selected` is `Signal<T | null>`, `descendantsOf` is
  `input<(value: T) => readonly T[]>`, and `T` is inferred from `[(value)]` / `[(expanded)]`. It
  ships with the `compareWith` input the selection contract mandates (`(a: T, b: T) => boolean`,
  defaulting to `===` and mirrored on `ForTreeContext`), routing every identity question through it —
  selection and expansion membership, the cascade tri-state, the range anchor, the visible-node fold
  and the drag resolver's comparisons — because a generic parameter without a comparator would
  resolve object nodes by reference and report a fully-checked subtree as unchecked. The `= string`
  defaults keep every existing tree compiling and behaving as before, and the string case keeps its
  old complexity through a hashed fast path. One requirement to know when you leave `string`:
  `[forTreeNodeDrag]` has no input carrying `T` except `[canDrop]`, so a non-string tree that omits
  it leaves the directive at the `string` default and `(nodeDrop)` reports the wrong event type — a
  `() => true` veto is enough, its only job is to carry the inference.

### Changed

- **Date field / Time field (breaking, import specifiers)** — the `forty-cdk/date-range-field` and
  `forty-cdk/time-range-field` entry points are folded into their bases
  ([#1716](https://github.com/tutkli/forty-cdk/issues/1716)). Both specifiers stop resolving; all 16
  symbols of each — `ForDateRangeField`, `ForDateRangeFieldEndpoint`, `FOR_DATE_RANGE_FIELD_CONTEXT`,
  `provideForDateRangeFieldDefaults` and their time-field twins among them — are now exported from
  `forty-cdk/date-field` and `forty-cdk/time-field`. Nothing is renamed and no signature moves: a
  range field is a variant of its base the way `ForDateRangePicker` is a variant of `ForDatePicker`,
  and it never imported anything from the base, so it never earned an entry point of its own. Their
  error prefixes follow the entry point too, so a range field now reports `[forty-cdk/date-field]` /
  `[forty-cdk/time-field]`. **Migration:** rewrite the two import specifiers; the symbol names and
  everything you bind to them are unchanged.
- **Floating positioners (breaking, consumer CSS)** — the six CSS custom properties the shared
  `core/floating` positioners publish are namespaced under a `--for-floating-*` family
  ([#1507](https://github.com/tutkli/forty-cdk/issues/1507)). `--for-anchor-width`,
  `--for-anchor-height`, `--for-available-width`, `--for-available-height`,
  `--for-content-transform-origin` and `--for-arrow-offset` become `--for-floating-anchor-width`,
  `--for-floating-anchor-height`, `--for-floating-available-width`,
  `--for-floating-available-height`, `--for-floating-content-transform-origin` and
  `--for-floating-arrow-offset`. They were the library's only `--for-*` properties without a
  namespace segment, which the naming rule adopted in
  [#1400](https://github.com/tutkli/forty-cdk/issues/1400) makes mandatory, and the segment after
  `--for-` followed no rule of its own: `anchor-*` named the measured element, `content-*` the
  styled one, `available-*` neither. A `<primitive>` segment is not available to them — the
  positioners write on behalf of whichever of eleven primitives mounted the surface — so they take
  the family name of the machinery that computes them. Nothing about the values, the direction, or
  the cleared / retained lifecycle changes; only the names do.
  **Migration:** rewrite every `var(--for-…)` read and every `--for-arrow-offset` declaration in
  your stylesheets. A find-and-replace of the four stems — `--for-anchor-`, `--for-available-`,
  `--for-content-transform-origin`, `--for-arrow-offset` — to their `--for-floating-` forms covers
  it. **No aliases ship**, and an unmigrated `var(--for-available-height)` resolves to nothing
  rather than erroring, so a surface silently loses its `max-height` instead of failing loudly —
  grep before upgrading. Affects every primitive with floating content: Combobox, Context menu,
  Date picker, Dropdown menu, Hover card, Menu, Menubar, Popover, Select, Time picker and Tooltip.

- **Errors and warnings (breaking, message text)** — every message changed shape to carry its code,
  and two prefixes were corrected ([#1721](https://github.com/tutkli/forty-cdk/issues/1721)).
  `[forty-cdk/toggle-group]` becomes `[forty-cdk/toggle]`, which is the entry point that exists, and
  the date adapter's split `[forty-cdk/calendar]` / `[forty-cdk/date-adapter]` — one file, one
  concern, neither of them an entry point — now reports under the entry point the caller belongs to,
  so a `forty-cdk/date-field` consumer missing an adapter reads `[forty-cdk/date-field]`.
  **Migration:** only a consumer asserting on message text is affected; match on the
  `FORCDK-<AREA>-<NNN>` code instead, which is what it is there for. Dev/production gating is
  unchanged — an orphan context still throws unconditionally, pure assertions stay behind
  `isDevMode()`, `fortyWarn` is dev-only.
- **Combobox / Select / Carousel / Table / Avatar contexts (breaking)** — a `For<X>Context` now lists
  only the signals a consumer reads and the commands a consumer invokes
  ([#1722](https://github.com/tutkli/forty-cdk/issues/1722)). The
  [#1399](https://github.com/tutkli/forty-cdk/issues/1399) split was stated as a naming pattern, so
  it caught only the members whose identifiers matched it and `ForComboboxContext` shipped 77 members
  to describe a widget with a handful of consumer-facing ones. The default is inverted: every member
  whose sole caller is a piece of the same primitive moves to an unexported internal context and goes
  private on the root. **Combobox 77 → 22** (positioning mirrors, ARIA ids, element slots, label
  caches, navigation cursors, the outside-interaction forwarders), **Select 51 → 16** (positioning
  mirrors, the APG range-selection and typeahead handlers, the virtualized activedescendant model),
  **Carousel 26 → 18** (roving tabindex, DOM-order lookups, viewport id, positional labels), **Table
  26 → 13** (the 2D roving grid model and the ARIA index arithmetic), and **Avatar** loses
  `reportStatus`, whose own JSDoc said consumers should not call it. Root inputs and outputs are
  untouched — only the context surface narrowed — and a published surface is now capped at 25
  members by a build gate that can only ever drain its exception list. **Migration:** a consumer
  injecting `FOR_COMBOBOX_CONTEXT`, `FOR_SELECT_CONTEXT`, `FOR_CAROUSEL_CONTEXT`,
  `FOR_TABLE_CONTEXT` or `FOR_AVATAR_CONTEXT` to reach a moved member — or calling one off an
  `exportAs` template reference — no longer compiles; drive the primitive through its inputs and
  outputs. As a side effect every `[forTable]` and avatar piece now checks its root in dev mode, so a
  piece mounted outside its root reports a prefixed error instead of failing further downstream.
- **Tree contracts (breaking, type argument)** — reading `FOR_TREE_CONTEXT` without a type argument
  now yields `unknown` node values ([#1738](https://github.com/tutkli/forty-cdk/issues/1738)). The
  same holds for every other generic contract the barrel exports — `ForTreeItemHandle`,
  `ForTreeVisibleNode`, `ForTreeContainerContext`, `ForTreeItemContext` — and for
  `ForTreeNodeDragContext.dropIndicator`; `ForTreeContext` additionally gains a `compareWith` member.
  **Migration:** pass the node value type where you inject the context (`injectTreeContext<string>()`
  restores the old shape exactly). Every other public signature is source-compatible thanks to the
  `= string` defaults on `ForTreeDragDropEvent`, `ForTreeDropIndicator`, `ForTreeNodeDrag`,
  `moveTreeNode` and `expandToReveal`.

## [0.21.1] - 2026-08-07

A bugfix release about pressing, holding and letting go. A touch or pen press that reports a non-zero
`button` no longer dies on a guard written for a mouse, in the six gestures that still applied it bare. The
two virtualized reorder coordinators stop retaining a row for a press that never became a drag, and stop
retaining it on surfaces where nothing else in the stack agrees a gesture is happening. A keyboard lift on a
windowed list finally reflects `data-dragging`, a last-row `End` jump keeps the viewport it jumped to, the
default drag preview stops duplicating the source's `id`s into the document, `[stackShift]` re-measures when
a toast grows on its own, and a click on a `[forField]` label reaches the first editable segment instead of
dead-ending on a `role="group"` host. No API changes, nothing to migrate.

### Fixed

- **Tree / Pane resizer / Slider / Scroll area / Table.** A non-mouse press that reports a non-zero `button`
  no longer refuses the gesture outright ([#1699](https://github.com/tutkli/forty-cdk/issues/1699),
  [#1708](https://github.com/tutkli/forty-cdk/issues/1708)). The primary-button rule only means anything for
  a mouse — a touch or pen press whose engine reports `button: 2` is an ordinary press — and six gestures
  still applied it unqualified: `[forTreeNodeDrag]`, `[forPaneResizer]`, `[forTableColumnResizer]`,
  `[forSlider]`'s track press and both `[forScrollArea]` track and thumb presses. All six now guard
  `pointerType === 'mouse' && button !== 0`, matching the eleven siblings that already did, so `grep`ping the
  bare rule across the library returns nothing. For `[forTreeNodeDrag]` the refusal was the end of the whole
  gesture — no lift, no preview, no drop indicator, no `nodeDrop` — since it owns its session outright. The
  `[forScrollAreaScrollbar]` README's hand-rolled track-press recipe carried the same defect and is corrected
  too.
- **Virtual reorder / Table.** An ordinary click on a row no longer pins it into the rendered window forever
  ([#1695](https://github.com/tutkli/forty-cdk/issues/1695)). Both virtualized reorder coordinators wrote
  their lifted-row pin on `pointerdown` but cleared it only from the commit / cancel callbacks, which fire
  for an _armed_ session — so a press that never crossed `armThreshold` left one off-window row mounted,
  focusable and inside `[forDropList]`'s registered `items()` for the rest of the page's life. The pin now
  shares the armed session's lifecycle: it is written on lift, not on press. The same write also clobbered
  the pin a live _keyboard_ lift had set, stranding that gesture with its row recycled away; both
  coordinators now run the `'idle' | 'keyboard' | 'pointer'` state machine `[forListboxReorder]` and
  `[forTreeNodeDrag]` already carried, so a press is refused while a keyboard lift is live, a lift key is
  ignored during a pointer drag, and each channel releases only the pin it owns.
- **Virtual reorder / Table.** A pointer press is refused on a disabled list, on a secondary mouse button and
  on a disabled drag handle, instead of pinning a row for the duration of the press
  ([#1697](https://github.com/tutkli/forty-cdk/issues/1697)). Both coordinators resolved the press through a
  `canStart` that applied only a hit test, so they retained a row on exactly the surfaces where nothing else
  in the stack agrees a gesture is happening — `[forDraggable]` refuses all three, so no `data-dragging`,
  preview, placeholder, auto-scroll or drop ever appeared. They now apply the guard set their siblings apply
  at the same seam. One documented consequence in `[forTableRowReorder]`: a press on a row carrying no
  registered draggable is now refused rather than tracked.
- **Drag & drop / Virtual reorder / Table.** A keyboard lift on a windowed list reflects `data-dragging`
  ([#1693](https://github.com/tutkli/forty-cdk/issues/1693)). The keyboard-drag mediator intercepts the lift
  key in the capture phase, so `[forDraggable]`'s own handler never ran and the drop list never learned a
  lift had happened — the attribute the README promises was absent on the lifted row _and_ on the list host,
  for every `[forVirtualReorder]` lift and for `[forTableRowReorder]`'s virtualized branch only, which made
  one primitive behave two ways depending on whether the table was windowed. The coordinators now mark the
  lift on the list through a dedicated seam that leaves the list's own lift state untouched, so nothing on
  the `lift` / `moveLifted` / `drop` / `cancel` path moves, and the mark clears on drop, `Escape`, focus
  leave and destroy.
- **Drag & drop.** The default drag preview no longer duplicates the source's `id`s into the document
  ([#1691](https://github.com/tutkli/forty-cdk/issues/1691)). The preview is a deep clone that lives in
  `document.body` for the whole gesture, and it carried every attribute except `data-testid` — so mid-drag
  the document held two nodes for each `id` in the dragged subtree and `getElementById` was ambiguous,
  whatever `aria-hidden` said. `id` is now stripped from the clone root and every descendant carrying one.
  The clone still answers the source's attribute selectors by design; `data-for-drag-preview` remains the
  supported way to exclude it from a query, and the README and JSDoc now say so.
- **Table.** A keyboard reorder lift on the last rendered row keeps the viewport an `End` jump moved it to
  ([#1704](https://github.com/tutkli/forty-cdk/issues/1704)). The focus restore added in 0.21.0 called
  `focus()` plainly, and because the retained row keeps rendering at its original offset, that call scrolled
  the viewport straight back off the destination — the gesture survived the jump, the scroll position did
  not. The restore now passes `preventScroll`.
- **Toast.** `[stackShift]`'s FLIP baseline is dropped when a row reflows on its own
  ([#1684](https://github.com/tutkli/forty-cdk/issues/1684)). The baseline is measured during the previous
  mutation of the row set, so a row that changed height between mutations — the `ForToastRef.update()` flow
  the API's own JSDoc promotes — left the map pointing at a spot the rows had already left, and the next add
  or remove glided them from there. A `ResizeObserver` on the viewport host now invalidates it, discriminated
  by delivery order so a mutation's own pass is never mistaken for an independent reflow: no measuring in the
  handler, and nothing observed at all while `[stackShift]` is unset. This closes the limit 0.21.0 shipped
  documented; the three residual cases are named in the JSDoc and each self-corrects on the pass after it.
- **Field.** A `[forLabel]` click inside a `[forField]` reaches the control's focus target instead of
  dead-ending on a non-focusable host ([#1683](https://github.com/tutkli/forty-cdk/issues/1683)). The field
  focused whatever element the control nominated for `aria-*` and `id`, which for a composite is its
  `role="group"` host — so a label click did nothing on `[forDateField]`, `[forTimeField]`,
  `[forDateRangeField]` and `[forTimeRangeField]`, and landed on the group rather than the checked item or
  the first thumb on `[forListbox]`, `[forRadioGroup]`, `[forSlider]` and `[forToggleGroup]`. Control handles
  now carry an optional focus hook, which the field prefers over the association target and which every
  `FormValueControl.focus` implementor supplies for free; where the two coincide — select, combobox, date
  picker, time picker, OTP input — nothing moves. A native `<label forLabel>` is forwarded by the directive
  only when the browser will not do it itself, so nothing double-activates, and a label click on a disabled
  control is a no-op rather than a `focus()` call on an unfocusable element.

## [0.21.0] - 2026-08-05

The release where a keyboard reorder survives the window it is standing on. Lifting a row and pressing
`End` recycled the rendered window underneath the gesture: the lifted row's own DOM node was detached to
re-index it, focus fell to `<body>`, and the lift was announced as cancelled for something the user never
did. The renderer no longer detaches a row it is keeping, three coordinators hold the lift across a jump,
all four agree on what a `focusout` with no destination means, and a press on an `<svg>` icon inside a drag
handle starts the drag instead of failing an `instanceof` one interface too narrow. Above that, two
structural cleanups move imports rather than behaviour: `forty-cdk/virtualization` stops statically
importing two other primitives, which takes the module graph behind a plain `injectVirtualizer` from 462 KB
to 150 KB, and the eight roots that split their coordination surface in two go back to providing one token —
now with a dev-mode error when a consumer provides it wrong, instead of a `TypeError` from library code.
Toast's surviving rows finally have something to animate.

### Added

- **Toast.** `[stackShift]` on `[forToastViewport]` opts into a FLIP glide for the rows a mount or unmount
  pushes around ([#1680](https://github.com/tutkli/forty-cdk/issues/1680)). `animateEnter` / `animateLeave`
  only ever covered the row that appears or disappears; its siblings reflowed to their new spot in a single
  frame with no property of their own for CSS to transition. The input takes
  `ForToastStackShift | number | null` — a bare number being shorthand for `{ duration }` with `linear`
  easing — and reads its default from the new `ForToastDefaults.stackShift` key, so a design system declares
  the motion once per scope and `[stackShift]="0"` opts a single viewport back out. There is no motion unless
  asked for: an unset viewport keeps today's synchronous reflow. The glide drives the individual `translate`
  property, never `transform` — `transform` is the consumer's by this primitive's own documentation (the
  swipe recipe writes it, the exit-animation example keyframes it), and the browser applies `translate`
  first, so the two compose instead of the glide suppressing them. `prefers-reduced-motion: reduce` skips the
  glide while keeping the position map fresh, so the first shift after the preference flips off is measured
  from the right baseline; an easing the platform rejects warns once per viewport in dev mode rather than
  throwing out of the observer callback. Known limit: a row that reflows on its own — text swapped by
  `ForToastRef.update()`, a late font — is measured from the previous mutation's baseline
  ([#1684](https://github.com/tutkli/forty-cdk/issues/1684)).
- **Split-context roots.** Providing `FOR_<PRIMITIVE>_CONTEXT` with a value that is not the root is now a
  prefixed dev-mode error naming the provider shape to write
  ([#1669](https://github.com/tutkli/forty-cdk/issues/1669)). Nothing checked that cast: a consumer whose
  providers satisfied the public interface typechecked, resolved, and then failed inside the first piece to
  reach the registration protocol — a bare `TypeError`, no `[forty-cdk/<entry>]` prefix, and a stack pointing
  at a library file for a mistake made in consumer providers. Each root's internal resolver now probes the
  resolved value and throws the library's own error, naming
  `{ provide: FOR_<X>_CONTEXT, useExisting: MyRoot }` — which is also the precondition of the migration
  below. `[forSelectTrigger]` and `[forComboboxTrigger]` guard their explicit-root binding from the same call
  site, a widening that was unchecked before the collapse, and a nullish explicit reference now reports the
  orphan error instead of being handed back. A production build probes nothing.

### Changed

- **Virtualization (breaking)** — `[forTableVirtualized]` and `[forVirtualReorder]` moved out of
  `forty-cdk/virtualization` into two new entry points,
  **`forty-cdk/table-virtualization`** and **`forty-cdk/virtual-reorder`**
  ([#1589](https://github.com/tutkli/forty-cdk/issues/1589)). `forty-cdk/virtualization` exists to isolate
  `@tanstack/virtual-core`, but it also statically imported `forty-cdk/table` (for the table adapter's
  context) and `forty-cdk/drag-drop` (for the reorder adapter's drop list) — so a consumer who wanted
  nothing but `injectVirtualizer` for a plain list got an entry point whose FESM top-level-imported two
  other primitives. That is a code-splitting problem rather than a tree-shaking one: a static import edge
  between two entry points is what merges their chunks, which is the whole reason the library ships
  per-primitive entry points at all. Measured on the built package, the module graph reachable from an
  `injectVirtualizer`-only import drops from 462 KB to 150 KB, with the table and drag-drop bundles gone
  from it entirely. Each adapter got its own entry rather than sharing one, because a single
  `forty-cdk/table-virtualization` holding the list-reorder directive would have pulled the table into
  every windowed-list bundle and left the entry point's name describing the wrong thing.
  **Migration:** re-point the imports — `ForTableVirtualized` now comes from
  `'forty-cdk/table-virtualization'`, and `ForVirtualReorder` / `ForVirtualReorderEvent` from
  `'forty-cdk/virtual-reorder'`; both previously came from `'forty-cdk/virtualization'`.
  `injectVirtualizer`, `injectInfiniteScroll`, `[forVirtualViewport]` and `*forVirtualFor` stay
  where they are, and no API shape, input, output or emitted attribute changed. The two directives'
  orphan `Error` messages now carry their new entry point's prefix
  (`[forty-cdk/table-virtualization]` / `[forty-cdk/virtual-reorder]`).
- **Split-context roots (breaking)** — `provideForAccordion`, `provideForCarousel`,
  `provideForCombobox`, `provideForNavigationMenu`, `provideForRadioGroup`, `provideForSelect`,
  `provideForTabs` and `provideForToast` are removed
  ([#1593](https://github.com/tutkli/forty-cdk/issues/1593)). Eight of the nine roots that split their
  coordination surface in two provided their internal registration token as
  `{ provide: <PRIMITIVE>_CONTEXT, useExisting: root }` — the **same object** the public
  `FOR_<PRIMITIVE>_CONTEXT` already aliased — so the second token only re-typed a reference DI was
  already returning. The registration protocol stays exactly as private as it was: it lives on an
  unexported `<Primitive>Context` interface that `inject<Primitive>Context` reads the public token at,
  and each root's members stay TS-`private` (or carry the narrow public type, as `ForSelect.overlay`
  does), so nothing new reaches the emitted `.d.ts`. What goes away is the machinery the second token
  forced: a provider helper per root, the positive wrapper spec guarding it, and its roster line.
  **Migration:** replace the helper with the one-line re-provide every unsplit root already uses —
  `providers: [{ provide: FOR_SELECT_CONTEXT, useExisting: MySelect }]` in place of
  `providers: provideForSelect(MySelect)`, and likewise for the other seven. `provideForTable` is
  **not** affected: Table's protocol crosses an entry-point boundary and is aliased to a separate
  `TableRegistry` provider its own constructor injects, so a hand-written list still cannot wrap it.
  `provideForTableDefRegistry` and every `provideFor<Primitive>Defaults` helper are untouched, and no
  role, ARIA attribute, `data-state` or input / output changed.

### Fixed

- **Virtualization / Table.** A keyboard reorder lift survives a window jump — `End`, `Home`, `PageUp` and
  `PageDown` no longer lose the gesture when they carry the rendered window past the lifted row
  ([#1666](https://github.com/tutkli/forty-cdk/issues/1666),
  [#1671](https://github.com/tutkli/forty-cdk/issues/1671)). Two independent mechanisms were destroying it.
  In `*forVirtualFor`, the surviving views were re-indexed **before** the departed ones were removed, so a
  survivor reached its new position through `ViewContainerRef.move` — a detach and re-insert, which blurs the
  node; the removal now happens first, and because both the window and the container are ascending by index,
  no survivor ever needs moving. That also takes the churn out of ordinary scrolling, where a one-item window
  shift used to detach and re-insert every surviving row and silently blur a focused one in any windowed
  list, reorder or not. In `[forTableRowReorder]`, Angular's reconciler takes that same path only for the
  live tail wanted at the new head, so a lift on the **last** rendered row died on a downward jump while a
  mid-window lift survived and an upward jump was already safe; the coordinator now captures the element
  focused at lift and re-asserts it whenever the rendered-row set changes while focus has fallen outside the
  rowgroup. That restore covers a lift started from a focusable non-HTML element too — an
  `<svg tabindex="0">` control inside a cell, which a narrower reading dropped to the row host and its `-1`
  grid tab stop ([#1679](https://github.com/tutkli/forty-cdk/issues/1679)).
- **Keyboard reorder.** A focus change that never left the widget no longer cancels the gesture, so a
  consumer re-render mid-lift stops announcing `movement cancelled` for something the user never did
  ([#1673](https://github.com/tutkli/forty-cdk/issues/1673)). The keyboard-drag mediator handed each
  coordinator the raw `focusout` and left "where did focus go?" to be re-answered per call site — four
  coordinators, three different answers. The resolution moves into the mediator, and `[forListboxReorder]`,
  `[forTreeNodeDrag]`, `[forTableRowReorder]` and `[forVirtualReorder]` now agree on three channels: a
  destination inside the host keeps the lift, a destination outside cancels immediately, and a `focusout`
  reporting no destination at all is deferred one microtask and decided against `document.activeElement`.
  `[forVirtualReorder]` had the loosest of the four — it compared `event.target` against the lifted host and
  never read `relatedTarget`, so focus moving to another element **inside the same viewport** cancelled the
  gesture there and nowhere else.
- **Tree / Virtualization / Table.** A pointer press that lands on an `<svg>` icon inside a drag handle
  starts the drag ([#1677](https://github.com/tutkli/forty-cdk/issues/1677)). The three reorder coordinators
  disagreed on what a grab target is: `[forVirtualReorder]` and `[forTableRowReorder]` narrowed to
  `HTMLElement`, so a press on an SVG child — the shape a handle icon usually takes — failed the check and
  never pinned the row, while `[forTreeNodeDrag]` reached the same value through an
  `event.target as HTMLElement` cast that only happened to work. All three now read it as `Element`, which is
  what `closest()` and the tree's element-keyed host map need, and `isInsideGrabArea` widens to `Node` since
  it only calls `contains`. The keyboard path keeps its own `Node` narrowing — it compares by identity and
  containment, where `Node` is already the sound minimum rather than a third reading of the same value.

## [0.20.0] - 2026-08-04

The release where the server render stops lying. Three primitives derived ARIA from a registration that
only happened in the browser, so Angular Universal served a tree item at position `0` of `0`, a navigation
menu trigger controlling `""`, and a grid claiming a thousand rows and no columns — values WAI-ARIA does
not define, on the document a screen reader reaches first. Registration is synchronous now, unknown totals
report the `-1` the spec reserves for them, and the two navigation-menu pieces that measure geometry are
gated on the browser rather than on a registry that happened to be empty. A consumer's static `id` on a
fieldset legend survives instead of being clobbered, and the emitted declarations are typechecked in the
build, which is how `forty-cdk-avatar.d.ts` stopped failing to compile. Underneath, mounting a
2000-row grid went from 8.2 s to 0.77 s: the cost was never the collection, it was one signal every cell
in the table transitively depended on.

### Added

- **Menu family.** `fallbackAxisSideDirection` now reads its default from each root's own defaults
  provider ([#1659](https://github.com/tutkli/forty-cdk/issues/1659)), so a design system declares its
  narrow-viewport degradation policy once for the whole app instead of repeating a binding on every call
  site. The key joins `ForMenuDefaults`, `ForDropdownMenuDefaults`, `ForContextMenuDefaults` and
  `ForMenubarDefaults`, and is read by `[forMenu]`, `[forMenuSub]`, `[forDropdownMenu]`,
  `[forContextMenu]` and `[forMenubarTrigger]`. A per-instance binding still wins over the scope default,
  exactly as `sideOffset` behaves, and the library fallback stays `'none'` — a consumer calling neither
  the provider nor the input observes unchanged positioning. The menubar's multiplexed context reads it
  too, so a scope override is in force on the surface the bar renders before any trigger opens.
- **Fieldset.** A dev-mode warning when two `[forFieldsetLegend]` pieces are registered under one
  `[forFieldset]` ([#1654](https://github.com/tutkli/forty-cdk/issues/1654)). `legendId` is one id, not an
  id list, so the last registration owns it and the group is named by that legend; before this release two
  legends merely shared a generated id, and now they compete over which consumer id names the group, which
  is worth reporting. The check reads the settled count, so a structural swap that mounts the replacement
  before destroying the outgoing legend is not a duplicate and does not warn.

### Changed

- **BREAKING — `[forToastViewport]`'s `[label]` is now `[ariaLabel]`**
  ([#1598](https://github.com/tutkli/forty-cdk/issues/1598)). It was the library's last un-migrated
  accessible name: a non-uniform input name carrying a hardcoded English literal. The input defaults to
  the new `ForToastDefaults.viewportAriaLabel` (fallback `'Notifications'`), so the name is localizable
  per scope, a static `aria-label` still wins, and `[ariaLabel]="null"` still drops the attribute.
  Migration: `[label]="x"` → `[ariaLabel]="x"`.
- **BREAKING — `ForToastDefaults` is the resolved shape; `provideForToastDefaults` takes the partial**
  ([#1627](https://github.com/tutkli/forty-cdk/issues/1627)). Its keys were all-optional while the
  fallback it described was typed with a module-private interface no consumer could name. The two are
  folded into one, following the other 38 defaults providers: `ForToastDefaults` has required keys and
  `provideForToastDefaults(defaults: Partial<ForToastDefaults> = {})` takes the partial. Call sites are
  unaffected — `provideForToastDefaults({ duration: 4000 })` still typechecks, and
  `inject(FOR_TOAST_DEFAULTS)` still returns a fully-populated value. What breaks is annotating a partial
  literal as `ForToastDefaults`.
- **BREAKING — `[forComboboxStatus]` and `[forComboboxEmpty]` emit `role="status"` and nothing else**
  ([#1626](https://github.com/tutkli/forty-cdk/issues/1626)). Both declared their live-region semantics
  twice: a static `role` beside the `aria-live` / `aria-atomic` values that role already implies. What a
  screen reader does is unchanged ([ARIA 1.2 §status](https://www.w3.org/TR/wai-aria-1.2/#status)), but
  CSS or tests selecting these hosts by `[aria-live]` / `[aria-atomic]` stop matching. The role is the
  surviving channel here because `[forComboboxEmpty]` self-hides and comes back with its message already
  in the DOM — an insertion into the accessibility tree, which is what a live role is read reliably on.
- **BREAKING — a `LiveAnnouncer` region no longer carries a `role`**
  ([#1598](https://github.com/tutkli/forty-cdk/issues/1598)). The same doubling, resolved the opposite
  way: these regions are anonymous off-screen text sinks rather than a status or alert landmark a user
  should be able to navigate to, and they are inserted empty and only ever have their text rewritten, so
  the role bought them nothing. `aria-live` + `aria-atomic` stay — the pair states `aria-atomic` outright
  instead of leaving it to an implicit role mapping. A selector matching `[role="status"]` or
  `[role="alert"]` on an announcer region stops matching; `[aria-live]` still does.
- **BREAKING — a table def handle's `host` is a `Node`**
  ([#1562](https://github.com/tutkli/forty-cdk/issues/1562)). `[forColumnDef]` on an `<ng-container>`
  anchors at a comment node, so the handles `ForTableDefRegistry` registers claimed an element they never
  had. The parameters are widened, so every existing call site is unaffected; a consumer who implements or
  wraps that registry and reads element APIs off `handle.host` now narrows it themselves.
- **BREAKING — `aria-colcount` / `aria-rowcount` report `-1` when no channel knows the total**
  ([#1640](https://github.com/tutkli/forty-cdk/issues/1640),
  [#1648](https://github.com/tutkli/forty-cdk/issues/1648)). See the Fixed entry below for what this
  repairs; the part to migrate is that a grid whose count is genuinely unresolved now advertises the
  sentinel instead of `0`. An explicit `[rowCount]` / `[colCount]` is still emitted verbatim, including
  `0`, and an empty non-virtualized grid still counts its own rendered rows.
- **BREAKING — `[forNavigationMenuTrigger]` omits `aria-controls` when it cannot resolve one**
  ([#1636](https://github.com/tutkli/forty-cdk/issues/1636)). It emitted `aria-controls=""` — a malformed
  ID reference rather than an absent one, and the last fallback of its kind in the library. A selector
  matching `[aria-controls]` on a trigger whose panel is not mounted stops matching.

### Fixed

- **Tree (SSR).** `[forTreeItem]` served `aria-posinset="0"` / `aria-setsize="0"` on every item in a
  server render ([#1639](https://github.com/tutkli/forty-cdk/issues/1639)). Both derived from a
  registration scheduled with `afterNextRender`, a hook that never fires under `ngServerMode`, and ARIA
  defines neither value — `aria-posinset` must be ≥ 1 and an unknown total is `-1`. Registration is
  synchronous now, so both resolve in the creation pass, and the tab stop the same registration decides
  resolves with them.
- **Navigation menu (SSR).** `[forNavigationMenuTrigger]` shipped `aria-controls=""` and
  `[forNavigationMenuContent]` shipped no `aria-labelledby` at all in a server render
  ([#1636](https://github.com/tutkli/forty-cdk/issues/1636)) — the same deferred registration, so the
  pairing lookups iterated empty registries and the pre-hydration document reached assistive tech
  unpaired. Both register synchronously now. Resolving them server-side also exposed two geometry reads
  in `[forNavigationMenuIndicator]` and `[forNavigationMenuViewport]` that would have thrown on Angular
  Universal, where the platform DOM implements no layout API; both are gated on the browser rather than on
  a registry that happened to be empty.
- **Table.** A grid with an unresolved window advertised `aria-colcount="0"`
  ([#1640](https://github.com/tutkli/forty-cdk/issues/1640),
  [#1648](https://github.com/tutkli/forty-cdk/issues/1648)) — a grid claiming a thousand rows and no
  columns, which is a contradiction rather than a count. Both channels now report the `-1` ARIA reserves
  for a total the author cannot determine, the row channel only where the grid is actually windowed: an
  empty non-virtualized grid's rendered rows _are_ all its rows, so a header row with zero data rows
  reports `1`, not the sentinel.
- **Fieldset.** A consumer's static `id` on `[forFieldsetLegend]` was clobbered by the generated one on
  the first host-binding pass, so every external reference to it resolved to nothing
  ([#1654](https://github.com/tutkli/forty-cdk/issues/1654)) — on the piece most likely to be referenced
  from outside the primitive, since it is a label. The legend now adopts a static id through the
  fieldset's context, and the group's `aria-labelledby` follows it with no second change.
- **Emitted declarations.** `forty-cdk-avatar.d.ts` did not compile
  ([#1630](https://github.com/tutkli/forty-cdk/issues/1630)): `ForAvatar.reportStatus` was tagged
  `@internal` while the `ForAvatarContext.reportStatus` it implements was not, so `stripInternal` deleted
  the member and left the class failing its own `implements` clause with `TS2420`. Any consumer compiling
  with `skipLibCheck: false` saw it. The tag is gone — the context published the member either way — and
  the build now typechecks every emitted declaration under `strict` with `skipLibCheck: false`, resolving
  them through the published `exports` map, so this class of break cannot ship again.

### Performance

- **Table / roving tabindex.** Mounting a non-virtualized 2000-row × 10-column `[forTable]` in `grid`
  mode goes from **8227 ms to 765 ms** (10.8×), and the curve across 500 / 1000 / 2000 rows from 8.4× to
  3.24× per 4× row count — linear ([#1584](https://github.com/tutkli/forty-cdk/issues/1584)). The cost was
  not the collection, which sorts once per mount and totals 1.0%: it was `[forTable]`'s first-enabled-cell
  derivation reading _every_ row's cells, making all 20 000 cell bindings transitive consumers of each
  row's registration. It short-circuits at the first row that answers. The second half is library-wide —
  `RovingTabindex`'s reconciling `linkedSignal` read the item list even with no active item, where the
  computation returns null whatever the list holds, so every item in a roving group was a consumer of the
  whole list. Any roving primitive whose item list is a fold over per-child registries had that shape
  latent in it. `Collection.indexOfHost` / `findByHost` are O(1) now, served by a lazily built index map.

## [0.19.0] - 2026-08-02

A hardening release for the overlay core. Focus and dismissal now answer every question against the
composed tree, so an overlay that contains a web component — or lives inside one — traps `Tab` at its own
edges, keeps a press on a shadow-nested control from dismissing it, and returns focus to the trigger
rather than to `<body>`; the walk that resolves all of it was measured and pre-filtered, so a dialog over
a 10k-element table pays roughly half of what it did. Underneath, three habits the library had outgrown
are retired: a label cache that a long-lived remote-search combobox never stopped filling, an exception
used as control flow for an unwritten input, and `effect()` used as a validation channel — an assertion
now fires at its point of use, on the interaction it degrades. And where a diagnosis is all the library
can offer, it now offers one: two dev-mode warnings name the overlay left mounted while closed and the
focus trap left active on destroy.

### Added

- **Overlays.** A dev-mode warning for a content surface still mounted, while closed, after its first
  render ([#1591](https://github.com/tutkli/forty-cdk/issues/1591)). Forgetting the `@if` breaks nothing
  visible — the surface renders permanently, `data-state="closed"` lands on a visible element, the ARIA
  stays internally consistent — so it reads as a CSS bug, and the consumer concludes the animation support
  is broken because `animate.enter` / `animate.leave` never fire on a node that never unmounts. Adopted by
  the nine trigger-anchored surfaces (popover, select, combobox, menu, tooltip, hover-card, date picker,
  time picker, navigation menu); the message names the piece and quotes the primitive's own README
  expression back. Deliberately **not** adopted where the library blesses an always-mounted surface: the
  `aria-hidden` + `inert` family (tabs, stepper and carousel panels, accordion and disclosure content) and
  `[forMenuContent]` under `[forMenubar]`. Dialog, drawer and toast have no closed state to observe. If
  you followed the tooltip README's examples, which mounted the content with no `@if`, expect the warning
  — those examples are corrected in this release.
- **Focus trap.** A dev-mode warning when the teardown safety net below actually fires
  ([#1617](https://github.com/tutkli/forty-cdk/issues/1617)), naming `injectFocusTrap` and the fix: call
  `trap.deactivate({ returnFocus })` from the owner's own `DestroyRef.onDestroy`. The gate defers past the
  whole destroy chain with a `queueMicrotask`, so it reports only an owner that never deactivated, on
  either hook registration order — a synchronous check would warn on every correct dialog and drawer
  dismissal. A production build and a trap that was never activated schedule nothing at all.

### Changed

- **Combobox — BREAKING.** `ForComboboxContext` renames both label members to say what they now hold:
  `cachedOptions()` → `selectedEntries()` and `inlineCompletionOptions()` → `completionEntries()`
  ([#1580](https://github.com/tutkli/forty-cdk/issues/1580)). Pre-1.0, no deprecated aliases; only a
  consumer injecting the context directly is affected.
- **Combobox / Select — BREAKING.** Label resolution now reads two bounded stores instead of one
  accumulated snapshot ([#1580](https://github.com/tutkli/forty-cdk/issues/1580)), and the change is
  visible in three places. A selected value's label **survives a source rebuild**: the cache is keyed by
  the selection, not the dataset, so a `totalCount` transition no longer drops the trigger back to the
  serialized form value mid-refresh. Conversely, a value that _enters_ the selection while its option sits
  outside the rendered window now falls back to `[itemToStringLabel]` until that option renders once —
  `selected().label` used to resolve it from the merged snapshot. And under virtualization, a
  **closed-state** typeahead (`[forSelect]`) or inline completion (`[forComboboxInput]`) matches within the
  last rendered slice rather than every slice scrolled through; off-window matching while open is
  unchanged, still served by the navigator's position map. `[dataVersion]` and `invalidateSnapshot()` are
  unchanged inputs, but they now govern that position map alone — the label cache reads neither, because a
  window that lands replaces the store outright and leaves no stale accumulation to purge.
- **Listbox / Select / Combobox / Tabs / Table — BREAKING.** A missing `[value]` on an option, or a missing
  `[forTabsTrigger]` / `[forTabsContent]` / `[forColumnDef]` / `[forRowDef]` name, is now a **dev-mode
  runtime error instead of a template type-check error**
  ([#1601](https://github.com/tutkli/forty-cdk/issues/1601)). Those seven pieces seed an out-of-band
  sentinel rather than declaring `input.required`, which retires the `try` / `catch` on Angular's NG0950
  that ten parent lookups had been using as control flow. Both channels that used to reject a missing
  binding at compile time — `strictTemplates` and Angular's `hostDirectives` required-input validation —
  now accept it, and `assertInputBound` throws `[forty-cdk/<primitive>] <piece> has no [<input>] binding.`
  from a view effect, which aborts `detectChanges` rather than degrading to an `ErrorHandler` report. A
  production build creates no reactive node per piece and no longer writes a symbol into `[(value)]`: an
  unbound option is skipped by activation, by range selection and by every label callback, while still
  taking focus.
- **Listbox / Select / Tree — BREAKING.** `selectionFollowsFocus` combined with virtualization no longer
  throws at first render; it throws on the keyboard move it degrades
  ([#1583](https://github.com/tutkli/forty-cdk/issues/1583)) — the arrow navigation **and** the typeahead
  match, and for `[forTree]` also entering a child or leaving to a parent. Expanding in place moves no
  focus and reports nothing, and neither does merely configuring the combination. Because Angular routes a
  host listener's throw to the application `ErrorHandler`, this is a documented degradation rather than an
  error a consumer can `try` around: an app with its own `ErrorHandler` sees it there. Discovery therefore
  moves from first paint to first keyboard move — but the render-time throw it replaces was unattributable
  (its stack named the effect scheduler) and re-thrown on every run.
- **Table (declarative layer) — BREAKING.** `[forColumnDef]`'s name and width-track validation runs where
  the values reach CSS — `ForTableBody.track`, the derivation that interpolates them into
  `--for-table-col-<name>-width` and `grid-template-columns` — instead of from two effects on the def
  ([#1583](https://github.com/tutkli/forty-cdk/issues/1583)). Only a **displayed** column is checked, which
  is exactly the set whose values reach CSS: a def left out of `displayedColumns` is no longer validated. A
  production build carries no reactive node per def, and because the check now sits in a `computed` read
  during the render, the throw still aborts it and `detectChanges()` still re-raises it.

### Removed

- **Signal Forms (breaking)** — `forSingleValueField` and the `forty-cdk/signal-forms` entry point are
  both gone, with no deprecated alias ([#1579](https://github.com/tutkli/forty-cdk/issues/1579)). The
  helper adapted a `FieldTree<T | null>` into the `FieldTree<readonly T[]>` view `ForSelect` /
  `ForListbox` / `ForCombobox` accept, and could only do it by reflecting over `@angular/forms/signals`
  internals — a `Proxy` standing in for `FieldState`, with `.set` / `.update` / `.asReadonly` glued onto a
  `computed`, both holes erased by `as unknown as`. Each of those bets would have failed silently on a
  dependency bump rather than at compile time, in a consumer's form. A single-select form field is now
  modeled as the same `readonly T[]` the control exposes, kept at length ≤ 1. **Migration:** change the
  model field's type from `T | null` to `readonly T[]`, then drop the `forSingleValueField(…)` call and its
  import — the `[formField]` binding itself is unchanged, and `disabled` / `readonly` / `required` /
  `invalid` / `errors` / `touched` and focus still flow through it. Read the picked value off the
  primitive's `selected` / `selectedItem` accessor for display, and map to a `T | null` shape at the edge
  that needs it (a request payload, a persisted record) rather than in the binding. See
  [the selection value-type contract](docs/selection-value-type-contract.md) and
  [Wrapping form primitives](docs/wrapping-form-primitives.md).

### Fixed

- **Overlays / focus (Shadow DOM).** Every question the overlay core asks about focus, or about whether an
  interaction landed inside a surface, is now answered against the **composed tree**, through open shadow
  roots ([#1586](https://github.com/tutkli/forty-cdk/issues/1586)). Four consumer-visible defects go with
  it: `Tab` escaped a focus trap whose first or last focusable lived inside a web component (a WCAG 2.1.2
  failure) and now wraps at it; a press on a control inside a web component read as _outside_ the open
  surface and dismissed it; a modal rendered inside a shadowed app shell resolved no root-level child and
  the fallback inerted the very subtree it lived in; and a trigger inside a `ViewEncapsulation.ShadowDom`
  wrapper captured its non-focusable host, so return focus dropped to `<body>` on close. The focusable
  query descends into open shadow roots — including the trap container's own — and the `[inert]` /
  CSS-hidden ancestor walks cross the boundary, so a hidden or inert host disqualifies its shadow content
  instead of the walk ending one element short. Closed roots, `<slot>` ordering and `delegatesFocus` stay
  out of scope, documented rather than half-supported.
- **Focus trap.** A trap whose owner is destroyed without calling `deactivate()` no longer leaves its
  `document` keydown listener and its stack entry behind
  ([#1587](https://github.com/tutkli/forty-cdk/issues/1587)) — the pair that made a stale trap topmost
  again as soon as the trap above it deactivated, then `preventDefault()`-ed `Tab` and focused a detached
  node, killing keyboard navigation for the rest of the session with no error. The safety net releases the
  keyboard channel only: focus, `isActive` and the container's temporary `tabindex` are left alone, so an
  owner's own `deactivate({ returnFocus: true })` still runs and still returns focus, whichever order the
  two teardown hooks were registered in.
- **Combobox.** The picker-vs-editable anatomy is derived reactively instead of from a single constructor
  read ([#1581](https://github.com/tutkli/forty-cdk/issues/1581)). A `[forComboboxTrigger]` that registered
  after the content — projected through `<ng-content>`, or declared later in the template — left the
  overlay with **no focus management at all**: no move into `[forComboboxInput]` on open, no return focus on
  close, and neither `(autoFocusOnOpen)` nor `(autoFocusOnClose)` firing. A trigger arriving in the same
  pass is now picked up in time; one arriving later, while the surface is already open, deliberately does
  not pull focus out of wherever the user left it, but owns return focus, `(autoFocusOnClose)` and the
  Escape fallback from that moment on. The dev-mode warning that used to ask the consumer to reorder their
  template is gone — the shape is supported.
- **Combobox / Select.** The option-label cache no longer accumulates every option window the session ever
  rendered ([#1580](https://github.com/tutkli/forty-cdk/issues/1580)). A long-lived remote-search combobox
  retained one entry per option per query; the two stores that replace it are bounded by the selection size
  and by a single window respectively, so 25 disjoint rebuilds of 20 options leave 21 entries behind
  instead of 500. Committing `value` also stops re-reading every handle in the window.

### Performance

- **Focus trap.** The composed-tree walk pre-filters its candidates before consulting the selector engine
  ([#1620](https://github.com/tutkli/forty-cdk/issues/1620)), so a structural `div` / `td` / `span` is
  rejected by a `Set` lookup and two attribute probes rather than by a `matches()` call against a
  twelve-clause list. Measured on a modal dialog over a non-virtualized 1000-row grid (~10k elements), the
  wrapping `Tab` press — the one the trap handles itself — goes from **6.2 ms to 3.5 ms**; the walk in
  isolation from 4.2 ms to 2.6 ms, against a 1.6 ms floor for merely enumerating the subtree. The selector
  stays the single source of truth: the pre-filter is a deliberate superset and `matches()` still decides,
  so candidate order, closed-root opacity and the `[inert]` / CSS-hidden filtering are unchanged.

## [0.18.0] - 2026-07-31

A composition release. The menu family stops assuming one menu has one opener: a new `[forMenu]` root
drives a single content definition from any number of heterogeneous openers, each with its own anchor,
id, accessible name and — through `[menuPositioning]` — its own placement, which the two presets resolve
too. The declarative table gains the seam a design system needs to wrap it: defs now register through DI,
so a preset column component can keep its def in its own view and a scaffold wrapper can re-project
consumer defs. Alongside them, the read-only state becomes stylable on nine hosts that already enforced
it, and the date picker's trigger finally declares a role that supports the properties it was announcing
— which is also what surfaced the labelling bug underneath it.

### Added

- **Menu.** New `[forMenu]` root ([#1324](https://github.com/tutkli/forty-cdk/issues/1324)) — an
  opener-agnostic menu whose single `[forMenuContent]` definition is driven by any number of openers, so a
  table row can expose the same actions from a kebab `[forDropdownMenuTrigger]` **and** a row-wide
  `[forContextMenuTrigger]` without duplicating an item. Return-focus, the surface's `aria-labelledby`
  fallback, the floating-ui anchor, the dismissible exemption and the trigger `id` all resolve against the
  **active** opener, so a pointer-anchored right-click region and an element-anchored button coexist. A
  shared menu whose active opener is a button names itself after that button; one opened from a region
  emits nothing and wants `[ariaLabel]`
  ([#1573](https://github.com/tutkli/forty-cdk/issues/1573)). `[forDropdownMenu]` and `[forContextMenu]`
  stay as single-opener presets, unchanged for consumers.
- **Menu.** Per-opener positioning overrides ([#1574](https://github.com/tutkli/forty-cdk/issues/1574)) —
  `[forDropdownMenuTrigger]` and `[forContextMenuTrigger]` accept a `[menuPositioning]` seed
  (`side` / `align` / `sideOffset` / `alignOffset`, every key optional, typed by the new
  `MenuOpenerPositioning` published from `forty-cdk/shared`), resolved against the active opener with the
  root's own input as the per-key fallback. The presets resolve it too — the triggers are shared with
  `[forMenu]`, so an override must not go silently inert under a preset root. The remaining six
  positioning inputs stay root-only: they are collision and viewport policy for the surface, not a
  property of the opener that fired.
- **Table (declarative layer).** A def registration seam for wrapper components
  ([#1372](https://github.com/tutkli/forty-cdk/issues/1372)) — `[forColumnDef]`, `[forRowDef]`,
  `[forColumnDragPlaceholder]` and `[forPlaceholderCellDefault]` now register themselves through DI in
  document order instead of being discovered by content queries, which makes both design-system authoring
  shapes expressible: a **preset column component** keeping its def in its own view, and a **scaffold
  wrapper** re-projecting consumer defs into `<for-table-body [defs]>`. Public surface is the reachability
  only — `FOR_TABLE_DEF_REGISTRY`, the read-only `ForTableDefRegistry` interface and
  `provideForTableDefRegistry()` — and a body whose registry is unreachable throws a
  `[forty-cdk/table]` error naming the provider helper
  ([#1563](https://github.com/tutkli/forty-cdk/issues/1563)). Subclassing `<for-table-body>` is not a
  wrapping shape: Angular inherits neither `template` nor `imports`, so a subclassed body renders nothing.
- **Table (declarative layer).** `fallbackWidth` on `[forColumnDef]`
  ([#1370](https://github.com/tutkli/forty-cdk/issues/1370)) — a `grid-template-columns` track fragment
  used as the resize-var fallback for a column with no explicit `width`, so a column can render as a
  weighted, floor-bounded fluid track (`minmax(120px, 2.5fr)`) before its first resize and still be driven
  by the resizer. Unlike `width` it never pins the column, and an unset value produces the same
  `minmax(0, 1fr)` track as before. A dev-mode guard now validates both inputs, rejecting only fragments
  that escape the value they are interpolated into (an empty fragment, a `;` / `{` / `}` / quote / comment
  opener, unbalanced parentheses) — a stray `)` used to close the enclosing `var(` early and swallow every
  later column.
- **Table (declarative layer).** `<ng-template forPlaceholderCellDefault>`
  ([#1371](https://github.com/tutkli/forty-cdk/issues/1371)) — a body-level default placeholder template,
  so a table whose columns share one skeleton shape declares it once instead of repeating
  `[forPlaceholderCell]` in every def. Resolution per column is the column's own template → the body
  default → an empty cell, unchanged when neither exists.
- **Form controls.** A `data-readonly` styling hook on nine hosts that already enforced the state: the six
  `[forListbox]`, `[forCombobox]`, `[forSelect]`, `[forTimePicker]`, `[forDatePicker]` and `[forOtpInput]`
  roots ([#1560](https://github.com/tutkli/forty-cdk/issues/1560)) and the `[forSelectTrigger]`,
  `[forTimePickerTrigger]` and `[forDatePickerTrigger]` buttons
  ([#1554](https://github.com/tutkli/forty-cdk/issues/1554),
  [#1542](https://github.com/tutkli/forty-cdk/issues/1542)). The library ships no CSS, so `data-*` **is**
  the styling API, and `readonly` is not a valid attribute of `<button>` — the `data-*` channel is the only
  one available on a trigger. Emitted truthy-only (`data-readonly=""` / absent), like `data-disabled`.

### Changed

- **Date picker — BREAKING.** `[forDatePickerTrigger]` now declares `role="combobox"`
  ([#1542](https://github.com/tutkli/forty-cdk/issues/1542)). It was the only picker trigger with no
  `role`, so it took the implicit `button` role of its host while emitting `aria-readonly` and
  `aria-required` — two `aria-allowed-attr` violations, on the only focusable surface a closed date picker
  exposes. The role supports both properties, so the announcement is kept rather than dropped, and it is
  the shape `[forSelectTrigger]` and `[forTimePickerTrigger]` already ship. Consequences for consumers: the
  button's text content no longer contributes to its accessible name (`combobox` is Name From: author — the
  primitive nominates the trigger as the field's labelled element, see Fixed), and selectors or assertions
  keyed on the implicit `button` role must move to `combobox`.
- **Menu — BREAKING.** `ForMenuContext.triggerLabelsMenu` widens from `boolean` to `Signal<boolean>`
  ([#1573](https://github.com/tutkli/forty-cdk/issues/1573)). The member is read inside a `computed`, so a
  plain boolean could never change after the surface's first evaluation — which is why a shared menu could
  not derive its labelling policy from the active opener. `ForMenuContext` is published by
  `forty-cdk/shared`, so a consumer implementing the interface by hand must wrap the value in a signal; the
  three library implementors that omit the member keep the `true` default. Pre-1.0 this lands without a
  major.
- **Menubar — BREAKING.** A switch between sibling triggers is no longer a close, and it parks focus on the
  trigger ([#1458](https://github.com/tutkli/forty-cdk/issues/1458),
  [#1555](https://github.com/tutkli/forty-cdk/issues/1555)). Hovering a sibling trigger while another menu
  is open now moves DOM focus to the **hovered trigger** instead of dragging it into the popup that just
  opened — the shape the APG reference implementation ships, with `ArrowDown` as the keyboard handoff into
  the menu the switch left open. And the outgoing surface no longer fires `(autoFocusOnClose)` nor performs
  a return-focus move on any switch modality (hover, cross-menu `ArrowLeft` / `ArrowRight`, a click on a
  sibling trigger), because focus goes straight to wherever the incoming open puts it. `(autoFocusOnOpen)`
  correspondingly stops firing on a hover-switch: there is no focus move to veto. Genuine closes — Escape,
  an outside interaction, Tab, a consumer's own `value.set(null)` — keep their current emissions and
  return-focus. A click open still enters the menu, and hovering the already-open trigger is a no-op.
- **Table (declarative layer) — BREAKING.** A def with no reachable registry now throws a
  `[forty-cdk/table]` error instead of being silently inert
  ([#1372](https://github.com/tutkli/forty-cdk/issues/1372)), and a `<for-table-body>` with a bound
  `[defs]` throws if defs were also declared inside its own tags, since those would be dropped. The raw
  `[forTableCell]` / `[forTableHeaderCell]` path is unaffected.

### Fixed

- **Date picker / time picker.** Inside a `[forField]`, the labelling and focus target is the trigger, not
  the root ([#1553](https://github.com/tutkli/forty-cdk/issues/1553)). `[forDatePicker]` and
  `[forDateRangePicker]` never nominated their trigger, so `aria-labelledby` / `controlId` landed on the
  non-focusable `<div>` wrapper: the label's `for` pointed at an element that cannot take focus, a
  non-`<label>` `[forLabel]` click reached nothing, and — once the trigger became a `role="combobox"` — the
  control had no accessible name at all. All three roots also implement `FormValueControl.focus()`
  forwarding to their trigger, so Signal Forms' focus-on-error lands on the focusable element instead of
  the wrapper (the time picker already nominated its trigger; this was its missing half).

## [0.17.0] - 2026-07-30

A coherence release: every breaking change here removes a _second_ way of saying something the library
already said once, and none of them changes behaviour. The disabled state now travels on a single channel
across thirteen hosts, nine hosts stop emitting an `aria-*` property their role does not support, and the
registration-context split reaches six more roots — retiring their `register*` protocols and twelve handle
types from the public surface. Each migration is a selector swap or a provider swap, both mechanical.
Alongside them, the navigation-menu focus-leave family is resolved end to end: three stacked fixes that
together make dismissal one containment rule in both viewport placements. The rest is keyboard and
server-rendering repair — menubar, toolbar and menu chains, a virtualized grid's header, and the tabs ARIA
pairing that a real server render never emitted.

### Changed

- **Overlay triggers / form controls — BREAKING.** Thirteen hosts stop emitting `aria-disabled="true"` when
  disabled, leaving the native `disabled` attribute as the single channel: the seven `<button>` triggers
  `[forSelectTrigger]`, `[forPopoverTrigger]`, `[forDialogTrigger]`, `[forDrawerTrigger]`,
  `[forDisclosureTrigger]`, `[forDatePickerTrigger]` and `[forTimePickerTrigger]`
  ([#1455](https://github.com/tutkli/forty-cdk/issues/1455)), plus the six native form-element hosts
  `[forInput]`, `[forTextarea]`, `[forSearch]`, `[forComboboxInput]`, `[forNumberInput]` and `[forOtpInput]`
  ([#1550](https://github.com/tutkli/forty-cdk/issues/1550)). The HTML content attribute already maps to the
  unavailable state through HTML-AAM, so the ARIA copy was read by nothing while giving consumers two
  selectors for one condition. Consumer CSS or test selectors keyed on `[aria-disabled]`,
  `[aria-disabled="true"]` or `:not([aria-disabled])` for these thirteen must move to `:disabled` or
  `[data-disabled]`, both emitted today and unchanged. Nothing else moves: focusability, tab order, click
  suppression, `data-disabled=""` and the rest of the form ARIA (`aria-readonly` / `aria-required` /
  `aria-invalid` / `aria-busy`) are untouched. `role="combobox"` triggers resolve to the native channel like
  the others — the native attribute is their activation guard, so dropping it would let a disabled trigger
  open. `[forAccordionTrigger]` and `[forFieldset]` keep both attributes on purpose: each reads a
  _different_ signal on each channel, so the two can never describe the same state.
- **Accordion / Carousel / RadioGroup / Tabs / Toast / NavigationMenu — BREAKING.** Six more roots split
  their registration protocol out of the public context
  ([#1524](https://github.com/tutkli/forty-cdk/issues/1524),
  [#1530](https://github.com/tutkli/forty-cdk/issues/1530)). Their `register*` / `unregister*` members leave
  `For<Primitive>Context`, and twelve handle types — the nine on those five primitives plus
  `ForNavigationMenuTriggerHandle` / `ForNavigationMenuContentHandle` / `ForNavigationMenuViewportHandle` —
  are no longer exported. `FOR_<PRIMITIVE>_CONTEXT` and `For<Primitive>Context` keep their exports and their
  read surface, so a consumer only injecting one is unaffected. **A wrapper that subclasses one of these
  roots must now spread the new `provideForAccordion(MyRoot)` / `provideForCarousel` /
  `provideForRadioGroup` / `provideForTabs` / `provideForToast` / `provideForNavigationMenu` helper**: a
  hand-written re-provide of the public token alone leaves the internal token absent, and every child piece
  orphans with the same "must be used inside" error a consumer would hit. `ForRadioGroupContext` /
  `ForTabsContext` keep `hasSelected*` / `isFirstEnabled*` — a hand-written item piece needs them to answer
  "do I own the group's tab stop?" — and `ForAccordionItemContext.adopt*Id` stays, being the library-wide
  static-id adoption seam rather than registry membership.
- **Date field / Date range field / Time field / Time range field / Slider / Toggle group / Toggle —
  BREAKING.** Seven hosts stop emitting `aria-required` and reflect `data-required=""` instead
  ([#1539](https://github.com/tutkli/forty-cdk/issues/1539)). `role="group"` supports only
  `aria-activedescendant` beyond the globals, and `role="button"` only `aria-expanded` / `aria-pressed`, so
  the property announced nothing. Unlike read-only, the requirement is deliberately **not** re-announced
  from a child: `role="slider"` does not support it either, and re-emitting it per `role="spinbutton"`
  segment would say "required" once per part of a composite field. `data-required` plus the consumer's own
  label / description wiring is the field-level channel. Select on `[data-required]` in place of
  `[aria-required]`.
- **Select / Time picker — BREAKING.** `[forSelectContent]` and `[forTimePickerContent]` stop emitting
  `aria-modal` and reflect `data-modal` instead ([#1539](https://github.com/tutkli/forty-cdk/issues/1539)).
  The property is gated to `role="dialog"` / `alertdialog` and these surfaces are `role="listbox"`;
  modality has always come from the modal shell's `inert` siblings and focus trap, which are unchanged, so
  the attribute announced nothing. Select on `[data-modal]` in CSS.

### Fixed

- **Navigation menu** — the APG close-on-leave rule now works from anywhere in the widget, in both viewport
  placements ([#1453](https://github.com/tutkli/forty-cdk/issues/1453),
  [#1530](https://github.com/tutkli/forty-cdk/issues/1530)). `[forNavigationMenu]` declares the `'focus'`
  channel on its dismissible layer, so a panel that a `[forNavigationMenuViewport]` re-parented outside the
  `<nav>` — whose `focusout` never bubbled to the nav host — is dismissed like an internally placed one, and
  tabbing out of the document from that external panel closes it. Focus moving between the trigger row, the
  viewport and the panel still never dismisses. The dismiss widening is deliberate and library-wide for the
  primitive: a focus move landing outside the widget now closes an open panel even when the host-bubbled
  handler never saw it.
- **Navigation menu** — staying _inside_ the widget no longer dismisses it
  ([#1530](https://github.com/tutkli/forty-cdk/issues/1530),
  [#1535](https://github.com/tutkli/forty-cdk/issues/1535)). Pressing a non-focusable region of an open
  panel sent focus to `<body>`, which is indistinguishable from leaving the document, and closed the panel;
  the layer now answers whether a press was its own, and a leave with no destination is read as
  pointer-induced. Focus moving into an interactive surface stacked above the panel — a hover card anchored
  inside a mega-menu — keeps it open too, since containment is resolved by the layer's stack-aware rule
  instead of a host listener that bypassed it. When a real dismissible layer sits above an open navigation
  menu (a dialog opened from a mega-menu link), the navigation now **stays open behind it**: per-channel
  routing decides the owner, not whichever path fired first.
- **Menubar / Toolbar / Navigation menu** — arrowing or typing along an overflowing bar now reveals the item
  it focuses ([#1460](https://github.com/tutkli/forty-cdk/issues/1460)). All three in-flow roving
  collections follow focus with `scrollIntoView({ block: 'nearest' })`, matching the Listbox / Select / Tree
  idiom, so a roved item can no longer stay out of view.
- **Menu** — `ArrowLeft` / `ArrowRight` on an open submenu chain no longer dismantles it when there is
  nowhere to go ([#1460](https://github.com/tutkli/forty-cdk/issues/1460)). The horizontal-arrow handler
  collapsed the whole chain and only then asked the bar to switch, so a bar with no available sibling
  (disabled, no registered triggers, or on the last trigger with `loop` off) tore down the user's chain and
  moved nowhere. It now switches first and collapses only once the bar confirms a real move; the happy path
  performs the same work in the same tick.
- **Tabs** — a server render now emits the trigger↔panel ARIA pairing
  ([#1409](https://github.com/tutkli/forty-cdk/issues/1409)). `[forTabsTrigger]` and `[forTabsContent]`
  registered through a render hook that never fires on the server, so the pre-hydration DOM shipped panels
  with no `aria-labelledby` and the selected trigger with no `aria-controls`. Both now register
  synchronously, with the root's lookups guarding against a not-yet-bound sibling instead of deferring.
  Consumer-set static `id` adoption is unaffected — the pairing still points at the consumer's id on both
  sides.
- **Table** — in a virtualized grid whose header joins the roving grid, `ArrowUp` / `PageUp` from the top of
  the data now crosses up into the header cell of the same column
  ([#1427](https://github.com/tutkli/forty-cdk/issues/1427)), matching the non-virtualized policy that
  `Ctrl+Home` already followed. The grid also scrolls to row 0 first, so it is never left focused on its
  header while the window sits at the bottom of the dataset. `PageUp` deeper than one page and `ArrowUp`
  from any later row still page by window.

## [0.16.0] - 2026-07-29

Headlined by the pre-1.0 naming and API-alignment sweep
([#1400](https://github.com/tutkli/forty-cdk/issues/1400)): fifteen inconsistencies where the same concept
was spelled two ways across the library, resolved onto one name each. That sweep changes no behaviour except
where noted — it is a rename pass, deliberately taken before 1.0 freezes the surface, with **no deprecated
aliases anywhere**. Two of its renames are silent at compile time and need a template grep: `(action)` on
`[forComboboxAction]` and `(valueComplete)` / `(valueInvalid)` on `[forOtpInput]` both sit on native
elements, so a stale binding registers a DOM listener for an event that never fires instead of failing the
build. Alongside it, the tail of the July 18 audit closes out: keyboard operability on non-button
checkbox / switch hosts, `type="button"` precedence across fifty pieces, and four menubar
accessible-name / id defects.

### Added

- **Combobox** — `ForComboboxDefaults` gains a `chipRemoveLabel: (label: string) => string` builder, so
  `[forComboboxChipRemove]`'s accessible name can be localized per scope through
  `provideForComboboxDefaults({ chipRemoveLabel })`. The name is computed per chip, so the piece
  deliberately does not adopt a consumer static `aria-label`; the scope default is the channel. The library
  fallback is `` (label) => `Remove ${label}` ``, byte-identical to the previous hardcoded output.
- **Shared** — `accessibleTextContent` is published from `forty-cdk/shared`, so a consumer reasoning about
  the text the library derives from an element (option label, typeahead matching, reorder announcements) has
  a supported path to the same definition instead of forking the walk. Same function object as the internal
  one; no behaviour or signature change.
- **Breakpoints / Time picker** — two types that a public signature already exposed but no barrel exported
  are now nameable: `TailwindBreakpointName` from `forty-cdk/breakpoints` (the fallback union behind
  `BreakpointName`) and `BuildTimeSlotsConfig` from `forty-cdk/time-picker` (the parameter of the exported
  `buildTimeSlots`). Consumers no longer have to fall back to structural typing to hold either.

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
- **All button-hosted pieces — BREAKING.** The fifty pieces that force submit protection now resolve
  `type="button"` through a host **binding** instead of a static host attribute, so the directive's value
  wins over a consumer's own static `type`. `<button forCheckbox type="submit">` no longer submits its
  surrounding `<form>` on click — it is treated as an authoring error rather than an override, which is the
  behaviour the JSDoc always promised. The flip side: a non-`<button>` host now gets **no** `type` attribute
  at all instead of an invalid `type="button"` (`type` is not valid on `<div>` / `<span>`), so CSS or
  querying keyed on `[type="button"]` must switch to the piece's own attribute selector. `[forButton]` is
  deliberately exempt and still preserves a consumer `type` — a `[forButton]` on a real submit button is
  legitimate usage.
- **Core (menu) — BREAKING.** `ForMenuContext` drops `focusFirstEnabledItem` and `focusLastEnabledItem`.
  Every piece resolves its initial focus through the single `focusInitialEnabledItem(target)` entry, so the
  contract asks for one way to say it instead of three. Source-breaking only for an external implementor of
  the interface, and the migration is deleting two methods. The pair stays on the concrete controllers
  (`[forDropdownMenu]`, `[forContextMenu]`, `[forMenuSub]`) as the imperative escape hatch for an explicit
  first / last move independent of the resolved `initialFocus` target.

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
- **Checkbox / Switch** — `[forCheckbox]` and `[forSwitch]` on a non-`<button>` host are now keyboard
  operable. They accept any host element and announce `role="checkbox"` / `role="switch"` plus their
  `aria-checked` state, but bound only `(click)`, so a `<div forCheckbox>` was not even focusable: no
  `tabindex` and no key handler. Both now synthesize `tabindex="0"` and activation on `Enter` (keydown) /
  `Space` (keyup) on a non-button host, always suppressing `Space` page scrolling — including while
  `disabled` — and dropping a half-finished `Space` press on blur. A native `<button>` host is untouched
  (the platform already synthesizes the click). The fix lives in host bindings, so a `hostDirectives`-composed
  wrapper gets it too.
- **Drag & drop** — a `[forDropList]` that hands its floating preview to the drop animation now releases its
  reference when the animation settles. The field kept pointing at a disposed preview for the rest of the
  list's lifetime after the first animated drop, and the destroy hook then called `destroy()` on it a second
  time.
- **Menubar** — a menu surface no longer renders `id=""` / `aria-labelledby=""` mid-close. The ids and the
  accessible name now survive the whole close transition (including a deferred exit animation), and a surface
  that has never been associated with a trigger emits no attribute at all rather than an empty one.
- **Menubar** — a consumer's static `id` on a `[forMenuContent]` that belongs to no single trigger is
  preserved. Both trigger-agnostic mount shapes were affected: an unconditionally mounted surface carried no
  `id` while closed and flipped to a generated `for-menubar-content-N` on the first activation, and a single
  surface shared by every trigger through one `@if (value() !== null)` lost the id the moment the open menu
  switched. `aria-controls` on every trigger now resolves to the consumer's id in both shapes. The canonical
  one-`@if`-per-trigger shape keeps its per-trigger adoption unchanged.
- **Menubar** — closing a menu through the documented `[(value)]` two-way binding no longer degrades the
  surface. The last-open-trigger snapshot is now derived from `value` instead of being written by the
  trigger-driven open / close paths only, so a consumer-driven close (or a bar whose menus are only ever
  opened by a `[(value)]` write) keeps the surface's `id` / `aria-labelledby` during the close and returns
  focus to the trigger.
- **Select** — a virtualized `[forSelect]` no longer shows a label folded from a previous dataset. The label
  snapshot now restarts on a `totalCount` transition — the consumer's own "the source was rebuilt" signal —
  so a stale option label cannot survive a query change. Non-virtualized selects are unaffected (they never
  see a transition), and closed-state typeahead, the purge of options removed while open and the
  close → re-open persistence all keep their current semantics.
- **Toast (SSR)** — `ForToastManager` no longer installs its document-level hotkey listener during a server
  render. A `[forToastViewport]` registers synchronously on construction, so rendering one under Angular
  Universal reached `document.addEventListener` on the server; the listener is now gated on
  `isPlatformBrowser`.

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

[Unreleased]: https://github.com/tutkli/forty-cdk/compare/v0.22.0...HEAD
[0.22.0]: https://github.com/tutkli/forty-cdk/compare/v0.21.1...v0.22.0
[0.21.1]: https://github.com/tutkli/forty-cdk/compare/v0.21.0...v0.21.1
[0.21.0]: https://github.com/tutkli/forty-cdk/compare/v0.20.0...v0.21.0
[0.20.0]: https://github.com/tutkli/forty-cdk/compare/v0.19.0...v0.20.0
[0.19.0]: https://github.com/tutkli/forty-cdk/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/tutkli/forty-cdk/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/tutkli/forty-cdk/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/tutkli/forty-cdk/compare/v0.15.0...v0.16.0
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
