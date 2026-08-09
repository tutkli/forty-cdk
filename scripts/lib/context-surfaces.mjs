/**
 * The ceiling on a published `For<X>Context` ([#1722]).
 *
 * A coordination context is the **consumer read surface**: signals a consumer
 * reads and commands a consumer invokes. Everything whose only caller is a piece
 * of the same primitive lives on the unexported `<X>Context` interface and is
 * TS-`private` on the root, so the library keeps refactoring its wiring after
 * 1.0 — see the conventions section "The public context carries only what a
 * consumer reads or invokes".
 *
 * The number is not a budget to spend down to. It is the point at which a
 * surface stops reading as "what a consumer does with this primitive" and starts
 * reading as an inventory of its internals, which is the signal that the
 * inverted default was not applied.
 */
export const CONTEXT_SURFACE_CEILING = 25;

/**
 * Contexts still above the ceiling, each pinned at the size it has today.
 *
 * An entry is a written justification, not a waiver, and the gate reads it in
 * both directions: it fails when the surface grows past the recorded `ceiling`,
 * **and** when the surface drops to the global ceiling and the entry is left
 * behind. So the list can only drain, one primitive per pass, and raising
 * `CONTEXT_SURFACE_CEILING` to absorb a new root — the move that would make the
 * whole gate decorative — is exactly what it exists to prevent.
 *
 * These ten are the roots the #1399 / #1722 split has not reached yet. None is
 * argued to be legitimately wide: each carries members whose only caller is a
 * piece of its own primitive, and each needs the same read Combobox, Select,
 * Carousel, Table and Avatar got. Two things about the sizes are worth knowing
 * before reading them as a ranking. The count is the **flattened** surface, so
 * the three anchored overlays each carry the eleven positioning members of the
 * blessed `AnchoredPositioningContext` they inherit — genuinely consumer-facing,
 * and counted three times. Flattening follows **inheritance only**: a member
 * typed with a facade counts as one however wide that facade is
 * (`ForSelectContext.overlay`), so retyping members behind a new interface
 * lowers the number without narrowing what a consumer reaches, and is not a way
 * to drain an entry. And a wide context is not by itself a defect: what
 * the number detects is a surface that has stopped describing what a consumer
 * does with the primitive, which is a judgement the entry below has to make.
 */
export const CONTEXT_SURFACE_EXCEPTIONS = {
  ForCalendarContext: {
    ceiling: 61,
    reason:
      'Not split. Carries the day-cell grid model (`[forCalendarCell]` focus / range / hover ' +
      'preview) beside the consumer-facing value and view state.',
  },
  ForMenuContext: {
    ceiling: 54,
    reason:
      'Not split. The shared menu-overlay surface every menu flavour composes, so it carries the ' +
      'item registry, the typeahead buffer and the sibling-navigation protocol.',
  },
  ForPopoverContext: {
    ceiling: 46,
    reason:
      'Not split. 11 of these are the inherited `AnchoredPositioningContext`; the rest are the ' +
      'trigger / content / arrow wiring `[forPopoverContent]` drives.',
  },
  ForDatePickerContext: {
    ceiling: 45,
    reason:
      'Not split. Composes the field, the calendar and the overlay, and republishes each of the ' +
      "three anatomies' piece surfaces.",
  },
  ForTooltipContext: {
    ceiling: 35,
    reason: 'Not split. 11 inherited positioning members plus the hover-intent schedule protocol.',
  },
  ForTimePickerContext: {
    ceiling: 34,
    reason: "Not split. Mirrors DatePicker's composition over the time field and the slot list.",
  },
  ForHoverCardContext: {
    ceiling: 32,
    reason: 'Not split. 11 inherited positioning members plus the hover-intent schedule protocol.',
  },
  ForStepperContext: {
    ceiling: 31,
    reason:
      'Not split. Reuses the Tabs backbone, so it carries the trigger / content registry and the ' +
      'roving model alongside the step state a consumer reads.',
  },
  ForTreeContext: {
    ceiling: 30,
    reason:
      'Not split. Carries the activedescendant focus model and the per-item ARIA index arithmetic ' +
      'beside the expansion / selection commands, plus the `compareWith` the selection contract ' +
      'mandates on the read surface.',
  },
  ForListboxContext: {
    ceiling: 27,
    reason:
      'Not split. Carries the APG range-selection and typeahead handlers `[forListboxOption]` ' +
      "routes its keys through — the same members Select's pass moved.",
  },
};
