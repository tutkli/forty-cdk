/**
 * The raw fields behind the library's aliased inputs, pinned as they stand today
 * ([#1724](https://github.com/tutkli/forty-cdk/issues/1724)).
 *
 * A `_`-prefixed member is internal, and `protected` is how the library states
 * that to the compiler rather than to a reader — every other one in the emit
 * says it that way. The raw field of an aliased input is the single member that
 * cannot: `strictInputAccessModifiers` (which `strictTemplates` turns on by
 * default, so every modern consumer has it) makes the template type-check block
 * assign to the **field**, not to the alias, so `protected readonly _dirInput`
 * fails a consumer's `[dir]="…"` binding with TS2445. Narrowing the visibility
 * would not even shrink the emit: TypeScript writes `protected` members into the
 * `.d.ts` with their full type, and only TS-`private` collapses to a typeless
 * placeholder.
 *
 * So the 56 fields below are public because Angular requires it, and the point
 * of the roster is that they are a 1.0 commitment made **by decision** rather
 * than by default. `check-alias-input-surface.mjs` reads it in both directions:
 * it fails when a new `_`-prefixed public member appears without an entry here,
 * **and** when an entry outlives the member it names. Every other `_`-prefixed
 * public member is a plain failure with no entry available — those are the ones
 * `protected` covers.
 *
 * The conventions section "`dir` defaults to `null` and resolves the inherited
 * ambient direction" carries the rule for the shape itself.
 */
export const ALIAS_INPUT_SURFACE = {
  'accordion/ForAccordion': ['_dirInput'],
  'calendar/ForCalendar': ['_dirInput'],
  'carousel/ForCarousel': ['_dirInput'],
  'combobox/ForCombobox': ['_dirInput', '_alignInput'],
  'context-menu/ForContextMenu': [
    '_sideInput',
    '_alignInput',
    '_sideOffsetInput',
    '_alignOffsetInput',
    '_dirInput',
  ],
  'core/AnchoredOverlayPositioningBase': [
    '_sideInput',
    '_alignInput',
    '_sideOffsetInput',
    '_collisionPaddingInput',
  ],
  'date-field/ForDateField': ['_dirInput'],
  'date-field/ForDateRangeField': ['_dirInput'],
  'date-picker/DatePickerBase': ['_dirInput'],
  'drag-drop/ForDropList': ['_dirInput'],
  'dropdown-menu/ForDropdownMenu': [
    '_sideInput',
    '_alignInput',
    '_sideOffsetInput',
    '_alignOffsetInput',
    '_dirInput',
  ],
  'listbox/ForListbox': ['_dirInput'],
  'menu/ForMenu': [
    '_sideInput',
    '_alignInput',
    '_sideOffsetInput',
    '_alignOffsetInput',
    '_dirInput',
  ],
  'menu/ForMenuSub': ['_dirInput', '_sideInput'],
  'menubar/ForMenubar': ['_dirInput'],
  'navigation-menu/ForNavigationMenu': ['_dirInput'],
  'pagination/ForPagination': ['_dirInput'],
  'pane-resizer/ForPaneResizer': ['_dirInput'],
  'radio-group/ForRadioGroup': ['_dirInput'],
  'scroll-area/ForScrollArea': ['_dirInput'],
  'select/ForSelect': ['_dirInput'],
  'slider/ForSlider': ['_dirInput'],
  'stepper/ForStepper': ['_dirInput'],
  'stepper/ForStepperItem': ['_completedInput', '_hasErrorInput'],
  'table/ForTable': ['_dirInput', '_rowCountInput'],
  'tabs/ForTabs': ['_dirInput'],
  'time-field/ForTimeField': ['_dirInput'],
  'time-field/ForTimeRangeField': ['_dirInput'],
  'time-picker/ForTimePicker': ['_dirInput'],
  'toggle/ForToggleGroup': ['_dirInput'],
  'toolbar/ForToolbar': ['_dirInput'],
  'tooltip/ForTooltip': ['_showOnOverflowInput', '_hoverableContentInput'],
  'tree/ForTree': ['_dirInput'],
  'tree/ForTreeItem': ['_levelInput', '_setSizeInput', '_posInSetInput'],
};
