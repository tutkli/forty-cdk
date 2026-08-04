# SPIKE — Drag-reorder inside a virtualized list

> **Plan 013** (`plans/013-...`), issue
> [#1035](https://github.com/tutkli/forty-cdk/issues/1035). Deliverable: this
> design note plus the README guidance it scopes. No production engine code is
> written under this plan.

## Verdict

**Works — with a constraint — and the supported path already ships.**

Drag-reorder inside a virtualized list is a solved, documented, E2E-covered
capability **at the table composition layer** (`[forTableVirtualized]` +
`[forTableRowReorder]`). It is **not** supported on the raw
`[forDropList]` + `*forVirtualFor` composition the original plan framed the spike
around, because the bare drop list emits **window-relative** indices, never pins
the lifted node against recycling, and confines keyboard stepping to the rendered
window. The pieces needed to make the raw composition correct are exactly the
three the table companion already implements; they are available as shared
`forty-cdk/core` building blocks, so the gap is one of _wiring and documentation_,
not missing engine capability.

| Composition                                      | Pointer in window          | Auto-scroll past edge   | Keyboard across dataset | Status                         |
| ------------------------------------------------ | -------------------------- | ----------------------- | ----------------------- | ------------------------------ |
| `[forTableVirtualized]` + `[forTableRowReorder]` | ✅                         | ✅                      | ✅                      | **Supported, shipped**         |
| Raw `[forDropList]` + `*forVirtualFor`           | ⚠️ window-relative indices | ❌ lifted node recycles | ❌ window-bound         | **Unsupported out of the box** |

The single genuinely-deferred behavior, even on the supported path, is a
**single-gesture free pointer drag to an arbitrary far row that auto-scroll
cannot reach** (you must auto-scroll there, or use the keyboard jumps).

## Drift note (the plan was written before the integration landed)

The plan (commit `855a477`, 2026-06-22) asserted "no integration exists; no
harness fixture composes a `[forDropList]` inside a virtualized table," and based
its premise on `grep -in "virtual" drag-drop/*.ts` returning zero hits. **That is
now stale.** The drift-check range the plan supplies
(`git diff --stat 855a477..HEAD`) shows ~9.3k lines added across
`drag-drop/` / `virtualization/` / `table/`, and the structure was refactored
into per-primitive secondary entry points
([#1046](https://github.com/tutkli/forty-cdk/issues/1046)): `_internal` is now
`forty-cdk/core`, and drag-drop / table / virtualization are each their own entry
point.

Since the plan was authored, the table epic landed a full row-reorder ×
virtualization integration — `[forTableRowReorder]`
(`projects/forty-cdk/table/src/table-row-reorder.ts`), a reusable index-mapping
core helper (`projects/forty-cdk/core/src/drag-session/window-index-map.ts`),
a fixture (`table-virtualized-reorder.fixture.ts`), and an E2E spec
(`table-virtualized-reorder.e2e.ts`). The spike's job therefore shifts from
"discover whether it can work" to "document the boundary between the supported
composition and the unsupported one, and record what the integration costs."

## Method

Code-tracing of the drag-drop drop-resolution path, the virtualization recycling
path, and the table row-reorder companion, cross-checked against the existing
supported-path E2E (`table-virtualized-reorder.e2e.ts`, which asserts absolute —
not window-relative — emitted indices for pointer-in-window, keyboard ArrowDown,
keyboard `End`→dataset-end, and pointer auto-scroll past the window). No new
throwaway "broken raw list" fixture was added: the break is provable from source
(below), and re-demonstrating a known-broken composition in the harness would
leave a misleading fixture behind. The supported path is proven by its existing,
passing E2E rather than a duplicate.

---

## Q1 — Does it work at all today?

**Raw `[forDropList]` + `*forVirtualFor`: no — silently wrong.** Two independent
reasons, both at the drop-list ↔ collection boundary:

1. **Only windowed rows are registered.** Each `[forDraggable]` registers itself
   into the drop list's `Collection` on construction and unregisters on destroy
   (`draggable.ts:126-154`, via `registerHandle`). `*forVirtualFor` destroys the
   embedded view of every row that leaves the window
   (`virtual-for.ts:94-103`, `viewContainer.remove(index)`). So
   `ForDropList.items()` only ever contains the _rendered_ rows.

2. **The emitted indices are window-relative.** `ForDropList.drop()` computes
   `previousIndex = this.#items.indexOfHost(liftedHost)` and `currentIndex`
   from a slot built over `this.#items.items().length`
   (`drop-list.ts:482-527`) — both are positions **within the rendered window**,
   not the absolute dataset index. The drag-drop README's canonical handler
   applies `moveItemInArray(this.items(), event.previousIndex, event.currentIndex)`
   over the **full** array (`drag-drop/README.md`, "Sortable list"). If the
   window starts at dataset index 50, dragging the 3rd visible row onto the 6th
   emits `{2 → 5}`, and the consumer reorders elements 2 and 5 of a 10 000-row
   array. The drop "succeeds" with no error — it just moves the wrong rows.

**`[forTableVirtualized]` + `[forTableRowReorder]`: yes, correctly.** The
companion subscribes to the same `dragDrop` and translates the window-relative
pair into absolute dataset indices before emitting `rowReorder`
(`table-row-reorder.ts:279-297`), using each rendered row's `virtualIndex()` as
the `windowIndices` map fed to `translateWindowReorder`
(`window-index-map.ts:31-47`). Its descriptor JSDoc states the contract directly:
_"Absolute (dataset) index under virtualization, else rendered order"_
(`table-row-reorder.ts:18-22`).

## Q2 — What breaks when the target leaves the window?

On the **raw** composition, two distinct failures, both rooted in the drop list
assuming live, mounted item nodes:

1. **The lifted node itself gets recycled (first failure point:
   `virtual-for.ts:94-103`).** Auto-scroll (`drop-list.ts:341-367`,
   `#onAutoScrollFrame` at `:427-434`) advances the viewport while the pointer
   sits near the edge. As the window moves, `*forVirtualFor` destroys the views
   for now-off-window rows — including the dragged row if it scrolls out. Its
   `[forDraggable]` destroy hook unregisters it
   (`draggable.ts:151-152`) and, for a keyboard drag, the destroy-driven blur
   fires `onBlur()` → `this.#list.cancel()` (`draggable.ts:242-247`), aborting the
   drag. The drop list has no mechanism to keep the lifted row mounted.

2. **`#resolveDrop` only ever sees the window's rects (`drop-list.ts:369-406`).**
   It builds `itemRects` from `ctx.items().map(h => h.host.getBoundingClientRect())`
   — the rendered rows only. Rows outside the window have no node and no rect, so
   the pointer can never resolve a drop index onto them; the resolved index
   saturates at the window edge.

3. **Keyboard stepping is window-bound (`drop-list.ts:440-480`).**
   `moveLifted` steps over slots built from `this.#items.items().length`
   (`buildDragSlots`) and `stepSlot` clamps within that slot count — the lifted
   row cannot step past the last _rendered_ row, so the keyboard path cannot
   traverse the dataset either.

On the **table** composition these are exactly the three things
`ForTableRowReorder` neutralizes (see Q3) — which is _why_ it works and the raw
list does not.

## Q3 — Is there a viable approach, and at what cost?

There is, and **it is already built** for tables. Making windowed drag-reorder
correct requires three cooperating mechanisms, all of which exist today:

1. **Absolute-index translation.** `translateWindowReorder(windowIndices,
previousIndex, currentIndex)` (`window-index-map.ts:31-47`) maps the
   window-relative pair to absolute dataset indices, given the absolute index of
   every rendered draggable row in DOM order. It is a **general** core helper, not
   table-specific, and reduces to the identity when the window spans the whole
   dataset (so non-virtualized callers are unaffected).

2. **Pin the lifted node against recycling.** The virtualized table augments its
   rendered window with a `retain` set containing the focused row and the
   `reorderingRowIndex` (`table-virtualized.ts:94-118`), so the dragged row stays
   mounted at its true offset even after auto-scroll carries the window past it.
   `ForTableRowReorder` sets that index from both the pointer-down capture
   (`table-row-reorder.ts:266-277`) and the keyboard lift
   (`table-row-reorder.ts:209-219`). Note: the retained row is deliberately kept
   out of the virtualizer's `range()` signal (`table-virtualized.ts:125-130`) so
   pinning never widens the infinite-scroll window.

3. **Dataset-wide keyboard reorder.** Rather than reuse the drop list's
   window-bound `moveLifted`, the companion runs its own keyboard mediator
   (`createKeyboardDragMediator`, `table-row-reorder.ts:115-185`) that steps a
   `#kbTarget` over the **true** `rowCount` with ArrowUp/Down, Home/End,
   PageUp/PageDown, scrolls unmounted target rows into view via
   `virtualRowNavigation().scrollToRow` (`:221-227`), and emits absolute
   `from`/`to` (`:229-236`).

**Cost to generalize to the raw `[forDropList]` + `*forVirtualFor` list:**
MED-HIGH, and explicitly **out of scope here** (it is production engine work — a
STOP condition for this spike). A bare drop list has no `virtualIndex` per item,
no row-retention signal, and no `rowCount`/`scrollToRow` navigator; wiring those
generically would mean either (a) a new opt-in `[forDropList]` mode that accepts a
window-index accessor + a pin callback + a total-count source, or (b) a
drag-drop-side companion mirroring `ForTableRowReorder` for plain
`*forVirtualFor` lists. Both are real follow-up plans, not edits to this one.
Until then, the table companion is the reference integration and the supported
answer.

## Q4 — Deliverable

- **README — `drag-drop/README.md`:** a new "Virtualized lists" section states
  that the raw `[forDropList]` + `*forVirtualFor` composition is unsupported (and
  _why_ — window-relative indices, no pin, window-bound keyboard), points
  consumers to `[forTableRowReorder]` as the supported reference integration, and
  lists the three mechanisms any custom integration must supply (with
  `translateWindowReorder` called out as the reusable core helper).
- **Guide — `docs/table-reordering.md`:** the "Reordering under virtualization" section
  already documents the supported usage and the one deferred gap; it gains a
  cross-link to this note for the rationale.
- **Example + E2E:** the supported path already ships
  `table-virtualized-reorder.fixture.ts` +
  `table-virtualized-reorder.e2e.ts` (asserts absolute indices for
  pointer-in-window, keyboard ArrowDown, keyboard `End`→dataset-end, and pointer
  auto-scroll past the window). No new fixture added.

### Follow-up candidates (not created as issues here)

- **Generalize windowed drag-reorder to plain `*forVirtualFor` lists** — a
  drag-drop-side opt-in that supplies window-index mapping, lifted-node pinning,
  and dataset-wide keyboard stepping for non-table virtualized lists, reusing
  `translateWindowReorder`. P3, MED-HIGH, engine work.
- **Close the deferred gap on the supported path** — single-gesture free pointer
  drag to a far row auto-scroll cannot reach (windowed drop resolution that
  resolves against scroll position rather than mounted rects). Interacts with the
  deferred rect-caching idea in plan 008's maintenance notes; cross-reference if
  both are pursued. P3, HIGH.
