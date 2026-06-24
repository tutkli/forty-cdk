# Spike: date/calendar `range` mode as a Signal Forms value

> **Type**: SPIKE (investigate + design). Deliverable is this note. Tracks
> [#1033](https://github.com/tutkli/forty-cdk/issues/1033) / plan
> [`plans/011-spike-date-range-signal-forms.md`](../plans/011-spike-date-range-signal-forms.md).
>
> **Verdict**: **BUILD IT.** Signal Forms expresses a composite `{ start, end }`
> value with no friction, and the existing range state machine already produces
> exactly the committed-only, always-valid value shape a form wants. The one real
> obstacle — `selectionMode` flips the value type on one directive instance — is
> resolved by a **dedicated range control** that implements
> `FormValueControl<CalendarDateRange<D> | null>`, leaving the single-date
> `ForDatePicker` untouched. Follow-up implementation effort: **L**.

## Drift since the plan was written (`855a477` → `28d8634`)

The plan and the issue cite paths under `projects/forty-cdk/src/lib/<primitive>/`
(e.g. `calendar/calendar.ts:69`, `date-picker/date-picker.ts:236`). **Those
paths no longer exist.** The library has since been restructured into
**per-primitive secondary entry points**: every primitive now lives at
`projects/forty-cdk/<primitive>/src/` with its own `public-api.ts`, consumed as
`forty-cdk/<primitive>`. The date code is now at:

- `projects/forty-cdk/calendar/src/calendar.ts` — `ForCalendar`, exports `CalendarDateRange` from `forty-cdk/calendar`.
- `projects/forty-cdk/calendar/src/calendar-range-selection.ts` — the range state machine.
- `projects/forty-cdk/date-picker/src/date-picker.ts` — `ForDatePicker`.
- `projects/forty-cdk/date-field/src/date-field.ts` — `ForDateField` (single-value only; no range).
- `projects/forty-cdk/core/src/form-ui-control/form-ui-control-base.ts` — `FormUiControlBase` (re-exported from `forty-cdk/core`).
- `projects/forty-cdk/signal-forms/src/single-value-field.ts` — `forSingleValueField` (`forty-cdk/signal-forms`).

The substance the plan describes is unchanged — `ForDatePicker` still implements
`FormValueControl<D | null>` for single mode and exposes a plain
`range = model<CalendarDateRange<D> | null>(null)` for range mode with no form
contract — but two things changed that the conclusions below already account for:

1. **A new `forty-cdk/signal-forms` entry point exists** (`forSingleValueField`).
   It is direct precedent for reconciling a field's value type with a control's
   fixed contract, and it shapes the Q2 recommendation.
2. **The range control will live in its own entry-point graph.** Anything new
   ships from `forty-cdk/date-picker` (or a sibling entry point) and crosses
   `CalendarDateRange<D>` by value — that type is a forty-cdk-owned interface
   (structural, no `instanceof`), exported from `forty-cdk/calendar`, so there is
   **no optional-peer hazard**; `@angular/forms` stays a type-only import.

## What was verified, and how

All claims below are checked against the real `@angular/forms@22.0.2` type
definitions (`node_modules/@angular/forms/types/signals.d.ts` and
`_structure-chunk.d.ts`) and a throwaway prototype, not from memory.

- **`pnpm typecheck` exited 0** with a throwaway directive
  `implements FormValueControl<CalendarDateRange<Date> | null>` extending
  `FormUiControlBase`, plus a `form(signal({ stay: CalendarDateRange<Date> | null }))`
  yielding a `FieldTree<CalendarDateRange<Date> | null>` assigned at that type.
- **The Angular unit-test builder compiled that prototype** — including the
  template `<div spikeRangePicker [formField]="booking.stay">` — under
  `strictTemplates`/ngtsc **without a type error**. (The run then failed at the
  Vitest runtime stage on an unrelated local-environment fault: jsdom's
  `@acemir/cssom` transitive dep is missing from this checkout's `node_modules`.
  A compile error in the composite `[formField]` binding would have aborted
  _before_ Vitest ever started, so the compile success is the load-bearing
  evidence.) The prototype was deleted before this note shipped — no
  production form-control code is left on the branch.

## Q1 — Can Signal Forms express a composite `{ start, end }` field value?

**Yes, with no constraint and no special handling.**

`FormValueControl<TValue>` requires exactly one member, and `TValue` is
unbounded — there is no scalar/primitive restriction:

```ts
// @angular/forms/types/signals.d.ts
interface FormValueControl<TValue> extends FormUiControl<TValue> {
  readonly value: ModelSignal<TValue>;
  readonly checked?: undefined; // mutually exclusive with FormCheckboxControl
}
```

So `TValue = CalendarDateRange<D> | null` is legal, and a control whose
`value = model<CalendarDateRange<D> | null>(null)` satisfies the contract. The
`[formField]` directive (`FormField<T>`, `selector "[formField]"`, input
`field` ← `Field<T>`) auto-detects any directive on its host that implements the
interface via the `[ɵNgFieldDirective]` marker — no token registration, exactly
as for the single-date control today.

On the field side, `FieldTree<TModel>` already understands composite models. For
an object `TModel` it resolves to a callable `FieldState<TModel>` _intersected
with_ `Subfields<TModel>`:

```ts
// _structure-chunk.d.ts (abridged)
type FieldTree<TModel, …> =
  (() => … FieldStateByMode<TModel, …>)
  & (TModel extends ReadonlyArray<infer U> ? ReadonlyArrayLike<…>
     : TModel extends Record<string, any> ? Subfields<TModel, …>
     : object);
```

That means `form(signal({ stay: range }))` gives you both `stay()` (the whole
`FieldState<CalendarDateRange<D> | null>`, with `.value()` returning the object)
**and** `stay.start` / `stay.end` sub-fields for free. A
`FormValueControl<CalendarDateRange<D> | null>` binds the **whole-object** field
(`[formField]="form.stay"`); the sub-fields are available if a consumer ever
wants per-endpoint validation, but the control never needs them.

One caveat worth recording (not a blocker): because the model type is a union
with `null`, the `Subfields` arm distributes over the union, so `stay.start` /
`stay.end` are typed as if the parent could be `null`. This only matters if a
future segmented range field binds the endpoints as separate sub-fields; the
whole-object binding this spike recommends is unaffected.

## Q2 — How does the value-type-switches-by-mode problem resolve?

The crux: today `selectionMode = input<'single' | 'range'>` flips the value type
on **one** `ForDatePicker<D>` instance — single uses `value: model<D | null>`
(the `FormValueControl` backing), range uses a separate `range: model<CalendarDateRange<D> | null>`
that is _not_ a form value. A `FormValueControl<TValue>` has a single fixed
`TValue`, and `[formField]` binds the member literally named `value`. The three
options, evaluated:

### (a) Widen to a union on the existing directive — **rejected**

`ForDatePicker<D> implements FormValueControl<D | CalendarDateRange<D> | null>`,
with `value` holding either shape by mode.

- **Breaks the single-date contract.** A consumer's existing
  `FieldTree<D | null>` would no longer be assignable to a `value` model widened
  to `D | CalendarDateRange<D> | null` — `[formField]="profile.dob"` (which works
  today, exercised in `date-picker.spec.ts`) would stop type-checking. The plan's
  hard requirement is that single-date behaviour stays unchanged. This violates it.
- **Conflates two models into one.** `value` and `range` would have to merge;
  every read (`injectHiddenInput` serialization, `formattedValue`) must re-narrow
  by mode. More surface, worse inference, no upside.

### (b) A dedicated range control — **chosen**

A separate root — call it `ForDateRangePicker<D>` (selector `[forDateRangePicker]`)
— that `extends FormUiControlBase implements FormValueControl<CalendarDateRange<D> | null>`,
whose `value` model **is** the committed range:

```ts
@Directive({
  selector: '[forDateRangePicker]',
  exportAs: 'forDateRangePicker',
  providers: [{ provide: FOR_DATE_RANGE_PICKER_CONTEXT, useExisting: ForDateRangePicker }],
})
export class ForDateRangePicker<D>
  extends FormUiControlBase
  implements FormValueControl<CalendarDateRange<D> | null>
{
  readonly value = model<CalendarDateRange<D> | null>(null);
  // …reuses the picker's overlay/trigger/anchor/dismiss machinery and the
  //   calendar selection bridge (forcing the projected ForCalendar to
  //   selectionMode="range"); writes value + markTouched() on commit.
}
```

- **Single-date `ForDatePicker` is byte-for-byte unchanged** — it keeps
  `FormValueControl<D | null>`. Zero risk to the shipping contract.
- **`[formField]` binds it exactly like any other control** (verified: the
  prototype compiled under strictTemplates). Generic inference resolves `D` from
  the bound field, the same way `ForDatePicker<D>`'s single-date binding already
  does in its spec.
- **Reuses the existing range state machine wholesale** — `ForCalendar`'s
  `selectionMode="range"` + `CalendarRangeSelection` already produce the value;
  only the _root that owns the form contract_ is new.

The cost is real (see Q5): the picker's overlay/trigger/anchor/content/dismiss/
focus machinery should be factored into a shared base so the range root doesn't
duplicate ~600 lines, and range needs its own hidden-input serialization (two
inputs, or one serialized `start/end` pair).

### (c) A field-level adapter à la `forSingleValueField` — **insufficient alone**

`forSingleValueField` (`forty-cdk/signal-forms`) bridges a `FieldTree<T | null>`
to the array-backed selection controls' **fixed** `FormValueControl<readonly T[]>`
by returning a derived `FieldTree<readonly T[]>` view. It is excellent precedent
that the team reconciles value-type mismatches **at the field layer when the
control's contract is fixed** — but it presupposes a control that already
implements the target contract. No control today exposes the range as `value`, so
an adapter has nothing to bind to. **The control must come first (option b).**
Once it ships, the same precedent lets a consumer who models their domain
differently (a `[D, D]` tuple, a `{ from, to }`) write a thin `forDateRangeField`
adapter to bind it — that is the _follow-on_, not a substitute for the control.

**Decision: option (b).** A single directive instance cannot be two different
`FormValueControl<T>` at once, so range-as-form-value is structurally a distinct
control. Make it explicit rather than overloading `ForDatePicker`.

> **Migration question for the follow-up plan (not decided here):** what happens
> to the current `ForDatePicker[selectionMode="range"]` + `[(range)]`? Two
> defensible answers: (i) keep it as the non-form, two-way-bound range picker and
> add `ForDateRangePicker` as the form-capable sibling; or (ii) deprecate
> `selectionMode` on `ForDatePicker` and route all range use through the new root.
> (i) is lower-churn and pre-1.0-friendly; (ii) is tidier long-term. Recommend
> (i) for the first increment.

## Q3 — Validity & error semantics for a half-entered range

**The form never sees a half-entered range — and that is the cleanest possible
contract.** Two facts from `calendar-range-selection.ts` + `calendar-context.ts`:

1. `CalendarDateRange<D>` is `{ readonly start: D; readonly end: D }` — **both
   endpoints non-null** by type.
2. The two-click flow keeps the pending anchor in a **private** `#anchor` signal.
   On the first click `select()` does `this.#host.range.set(null)` then stashes
   the anchor; the committed `range` model is written **only** on the second
   click (`range.set({ start: anchor, end: date })`). The `{ start, end: null }`
   intermediate the plan worried about **does not exist in the model** — `range()`
   is `null` throughout the pending state.

So the form value is always either `null` (nothing committed / cleared) or a
**complete, ordered** range (`start <= end` is guaranteed by construction, since
`select()` swaps endpoints when the second click precedes the anchor). Proposed
contract:

- **`start <= end` is an invariant, never an error.** Don't surface a "range out
  of order" error; the state machine can't produce one.
- **Emptiness vs `required`.** A `null` value is the empty state; pair it with the
  standard `required` rule (`required(p.stay)`) so `invalid()` flips when the form
  demands a value and none is committed. `FormUiControlBase` already owns the
  `required` / `invalid` / `errors` inputs and reflects `aria-required` /
  `aria-invalid`.
- **Bounds and length** map to ordinary Signal Forms validators on the composite
  field, flowing back through the `errors: input<readonly ValidationError.WithOptionalFieldTree[]>`
  input that `FormUiControlBase` already exposes:
  - min/max selectable date → a `validate(p.stay, …)` checking `value.start` /
    `value.end` against the picker's `minDate` / `maxDate` (the control keeps the
    `minDate`/`maxDate` naming — `FormUiControl.min`/`max` are reserved and typed
    `NonNullable<TValue>`, i.e. the range object itself, which is meaningless here).
  - min/max **length** (inclusive day count) → either the existing
    `minRangeLength` / `maxRangeLength` calendar inputs (enforced as a no-op guard
    in the state machine, _not_ surfaced as a form error today) **or** a
    `validate(p.stay, …)` if the consumer wants it to read as an `errors` entry.
    Recommend keeping the silent guard as the default and documenting the
    validator recipe for consumers who want a visible error.
- **`pending` (anchor set, awaiting commit) is intentionally invisible to the
  form.** Committed-only is the right semantic: a form should validate a chosen
  range, not a half-drawn one.

## Q4 — Touched semantics

**Touch fires on commit and on close — already the behaviour, just routed through
the new control.** In `date-picker.ts` the range bridge does, on every
`calendar.range` emission:

```ts
this.range.set(next as CalendarDateRange<D> | null);
this.markTouched();
if (next !== null && this.closeOnSelect()) this.close(); // close() also markTouched()
```

`FormUiControlBase.markTouched()` flips the `touched` model **and** emits the
`touch` output together, which `[formField]` listens to (`touched` is write-only
from the form's side since v22). The recommended contract for the range control,
aligned with the single-date control:

- **On commit** (second click writes the range model) → `markTouched()`.
- **On close** (`close()` → blur-equivalent: Escape, outside-pointer, selection)
  → `markTouched()`. This mirrors single-date exactly.
- **Not on first anchor click.** The anchor is a transient pending state, not a
  committed interaction; marking touched there would fight the committed-only
  value semantics from Q3. (Single-date has no equivalent intermediate, so this
  is the faithful analogue.)

No new touch machinery is needed — the range root just calls the inherited
`markTouched()` at the same two moments the single-date path already does.

## Q5 — Recommendation: **BUILD IT** (follow-up effort L)

Every obstacle the plan flagged dissolved under inspection:

| Concern                                 | Finding                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| Can Signal Forms hold `{ start, end }`? | Yes — `TValue` is unconstrained; verified by compile (Q1).                       |
| Value type flips by mode                | Resolved by a dedicated range control; single-date untouched (Q2).               |
| Half-entered range validity             | Never reaches the model — committed-only, always ordered (Q3).                   |
| Touched timing                          | Already correct (commit + close); reuse `markTouched()` (Q4).                    |
| Optional-peer hazard                    | None — `CalendarDateRange` is forty-cdk-owned; `@angular/forms` stays type-only. |

### Sketch of the follow-up implementation plan

1. **Factor a shared picker base.** Lift the overlay/trigger/anchor/content/
   dismiss/focus/return-focus machinery and the calendar-selection-bridge effect
   out of `ForDatePicker` into a shared base (or a set of internal helpers) so the
   range root reuses them instead of duplicating ~600 lines. Keep `ForDatePicker`'s
   public surface identical.
2. **Add `ForDateRangePicker<D>`** (`forty-cdk/date-picker`):
   `extends FormUiControlBase implements FormValueControl<CalendarDateRange<D> | null>, …Context`,
   `value = model<CalendarDateRange<D> | null>(null)`, forces the projected
   `ForCalendar` to `selectionMode="range"`, writes `value` + `markTouched()` on
   commit, honours `closeOnSelect`. Range is day-granular (no time composition).
3. **Hidden-input serialization** for native submission: two named inputs
   (`name` + `-start` / `-end`, or a documented single serialized pair) via
   `injectHiddenInput`, gated on `effectiveDisabled`.
4. **Wrapping contract** (required by conventions): a
   `date-range-picker-host-directive.ts` sibling exposing
   `FOR_DATE_RANGE_PICKER_HOST_DIRECTIVE_INPUTS` / `_OUTPUTS`, re-exported from the
   barrel (enforced by the `require-host-directive-sibling` ESLint rule). Add the
   row to `docs/wrapping-form-primitives.md`.
5. **Defaults sibling** `date-range-picker-defaults.ts` (stub is fine) — the
   `require-defaults-sibling` rule expects it.
6. **Tests**: behaviour (two-click commit, clear, bounds), a11y (roles + `aria-*`
   - keyboard + focus), the mandatory zoneless case, a `[formField]` integration
     case (schema `required` → `aria-required` on the trigger; a grid commit writes
     the bound model — mirror the single-date `Signal Forms via [formField]` block),
     and an SSR fixture in `ssr.spec.ts` (open-state, assert `<body>` untouched).
7. **README** with a styleless `[formField]` range example, and a playground demo.

**Effort: L** — mostly the base-factoring refactor (touching a 650-line directive
and its anatomy) plus the standard new-form-control checklist (host-directive
sibling, defaults sibling, SSR fixture, wrapping-doc row).

### Downstream (out of scope here, noted for sequencing)

The **segmented date/time range field** (`date-field` / `time-field` are
single-value only today) is the natural next consumer: it would implement the
**same** `FormValueControl<CalendarDateRange<D> | null>` contract this spike
defines, so it should be gated behind this work and inherit the contract rather
than invent its own. That is plan-territory for a separate follow-up.
