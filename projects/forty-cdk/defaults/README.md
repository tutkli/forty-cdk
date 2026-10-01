---
title: Defaults
group: utilities
archetype: [headless-utility]
---

# Defaults

Every `provideFor<Primitive>Defaults` provider, its `FOR_<PRIMITIVE>_DEFAULTS` token and its `For<Primitive>Defaults` interface, imported from `forty-cdk/defaults` so that configuring a primitive at the application root does not load the primitive itself.

Each primitive's entry point still re-exports its own pair, so `import { provideForTooltipDefaults } from 'forty-cdk/tooltip'` keeps compiling. Both paths name the same token object, so a provider from one and a primitive reading the other share one scope.

```ts
import { type ApplicationConfig } from '@angular/core';
import { provideForCalendarDefaults, provideForTooltipDefaults } from 'forty-cdk/defaults';

export const appConfig: ApplicationConfig = {
  providers: [
    provideForTooltipDefaults({ openDelay: 500 }),
    provideForCalendarDefaults({ firstDayOfWeek: 1 }),
  ],
};
```

## Why this exists

A bundler splits code into chunks one module at a time, and each forty-cdk entry point is published as a single module. A root `providers` array is in the static graph of your `main` bundle, so whatever module it imports is loaded before the application bootstraps, on every route, including the ones that never render that primitive.

Importing a provider from the primitive's own entry point therefore puts that primitive's directives in `main`. The re-export does not change it, because the bundler still has to load the module the re-export lives in. `forty-cdk/defaults` holds only the pairs and imports nothing but `@angular/core`, so the directives stay in the lazy chunks of the routes that render them.

Measured on a production build of an app with four lazy routes and these providers at the root, `provideForTooltipDefaults`, `provideForCalendarDefaults`, `provideForComboboxDefaults` and `provideForMenuDefaults`:

| Imported from          | `main` holds                                          | `main` size (raw / gzip) |
| ---------------------- | ----------------------------------------------------- | ------------------------ |
| Each primitive's entry | the Tooltip, Calendar, Combobox and Menu directives   | 281,035 B / 83,020 B     |
| `forty-cdk/defaults`   | the four defaults pairs and the tooltip's coordinator | 209,552 B / 63,578 B     |
| No root providers      | nothing from forty-cdk                                | 206,303 B / 62,301 B     |

A pair you do not import is not bundled: every token is a top-level `new InjectionToken(...)`, which a bundler drops when nothing reads it.

A date adapter follows the same rule from [`forty-cdk/date-adapter`](../date-adapter): `NativeDateAdapter`, `provideNativeDateAdapter` and the `FOR_DATE_ADAPTER` token they provide import nothing but `@angular/core`, so providing one next to these pairs keeps the primitives and the code they share out of `main`.

## API

Each pair resolves the same way: a scope's overrides merge key by key over its parent scope's, and the library fallback fills the rest. A key set to `undefined` is treated as omitted. Pass a function instead of an object to build the overrides where `inject()` is available; it runs once per injector that resolves the token. The primitive's README documents its keys.

| Configures      | Provider                            | Token                            | Also exported                                                                                            |
| --------------- | ----------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| avatar          | `provideForAvatarDefaults`          | `FOR_AVATAR_DEFAULTS`            | `ForAvatarDefaults`                                                                                      |
| breadcrumbs     | `provideForBreadcrumbsDefaults`     | `FOR_BREADCRUMBS_DEFAULTS`       | `ForBreadcrumbsDefaults`                                                                                 |
| breakpoints     | `provideForBreakpointsDefaults`     | `FOR_BREAKPOINTS_DEFAULTS`       | `BreakpointMap`, `ForBreakpointsDefaults`, `forBreakpointsTailwind`, `TailwindBreakpointName`            |
| calendar        | `provideForCalendarDefaults`        | `FOR_CALENDAR_DEFAULTS`          | `ForCalendarDefaults`                                                                                    |
| carousel        | `provideForCarouselDefaults`        | `FOR_CAROUSEL_DEFAULTS`          | `CarouselAlign`, `ForCarouselDefaults`                                                                   |
| combobox        | `provideForComboboxDefaults`        | `FOR_COMBOBOX_DEFAULTS`          | `ForComboboxDefaults`, `ForComboboxOpenHighlight`                                                        |
| context-menu    | `provideForContextMenuDefaults`     | `FOR_CONTEXT_MENU_DEFAULTS`      | `ForContextMenuDefaults`                                                                                 |
| date-field      | `provideForDateFieldDefaults`       | `FOR_DATE_FIELD_DEFAULTS`        | `DEFAULT_DATE_FIELD_SEGMENT_LABELS`, `ForDateFieldDefaults`, `ForDateFieldSegmentLabels`                 |
| date-picker     | `provideForDatePickerDefaults`      | `FOR_DATE_PICKER_DEFAULTS`       | `ForDatePickerDefaults`                                                                                  |
| date-field      | `provideForDateRangeFieldDefaults`  | `FOR_DATE_RANGE_FIELD_DEFAULTS`  | `DEFAULT_DATE_RANGE_FIELD_SEGMENT_LABELS`, `ForDateRangeFieldDefaults`, `ForDateRangeFieldSegmentLabels` |
| date-picker     | `provideForDateRangePickerDefaults` | `FOR_DATE_RANGE_PICKER_DEFAULTS` | `ForDateRangePickerDefaults`                                                                             |
| dialog          | `provideForDialogDefaults`          | `FOR_DIALOG_DEFAULTS`            | `ForDialogDefaults`                                                                                      |
| drag-drop       | `provideForDragDropDefaults`        | `FOR_DRAG_DROP_DEFAULTS`         | `ForDragDropDefaults`                                                                                    |
| drawer          | `provideForDrawerDefaults`          | `FOR_DRAWER_DEFAULTS`            | `ForDrawerDefaults`                                                                                      |
| dropdown-menu   | `provideForDropdownMenuDefaults`    | `FOR_DROPDOWN_MENU_DEFAULTS`     | `ForDropdownMenuDefaults`                                                                                |
| hover-card      | `provideForHoverCardDefaults`       | `FOR_HOVER_CARD_DEFAULTS`        | `ForHoverCardDefaults`, `HoverCardCoordinator`, `HoverCardDefaultsOptions`                               |
| listbox         | `provideForListboxDefaults`         | `FOR_LISTBOX_DEFAULTS`           | `ForListboxDefaults`                                                                                     |
| menubar         | `provideForMenubarDefaults`         | `FOR_MENUBAR_DEFAULTS`           | `ForMenubarDefaults`                                                                                     |
| menu            | `provideForMenuDefaults`            | `FOR_MENU_DEFAULTS`              | `ForMenuDefaults`                                                                                        |
| navigation-menu | `provideForNavigationMenuDefaults`  | `FOR_NAVIGATION_MENU_DEFAULTS`   | `ForNavigationMenuDefaults`                                                                              |
| number-input    | `provideForNumberInputDefaults`     | `FOR_NUMBER_INPUT_DEFAULTS`      | `ForNumberInputDefaults`                                                                                 |
| pagination      | `provideForPaginationDefaults`      | `FOR_PAGINATION_DEFAULTS`        | `ForPaginationDefaults`                                                                                  |
| popover         | `provideForPopoverDefaults`         | `FOR_POPOVER_DEFAULTS`           | `ForPopoverDefaults`                                                                                     |
| progress        | `provideForProgressDefaults`        | `FOR_PROGRESS_DEFAULTS`          | `ForProgressDefaults`                                                                                    |
| radio-group     | `provideForRadioGroupDefaults`      | `FOR_RADIO_GROUP_DEFAULTS`       | `ForRadioGroupDefaults`                                                                                  |
| scroll-area     | `provideForScrollAreaDefaults`      | `FOR_SCROLL_AREA_DEFAULTS`       | `ForScrollAreaDefaults`, `ForScrollAreaTrackPress`                                                       |
| search          | `provideForSearchDefaults`          | `FOR_SEARCH_DEFAULTS`            | `ForSearchDefaults`                                                                                      |
| select          | `provideForSelectDefaults`          | `FOR_SELECT_DEFAULTS`            | `ForSelectDefaults`                                                                                      |
| slider          | `provideForSliderDefaults`          | `FOR_SLIDER_DEFAULTS`            | `ForSliderDefaults`                                                                                      |
| stepper         | `provideForStepperDefaults`         | `FOR_STEPPER_DEFAULTS`           | `ForStepperDefaults`, `StepperActivationMode`                                                            |
| tabs            | `provideForTabsDefaults`            | `FOR_TABS_DEFAULTS`              | `ForTabsDefaults`, `TabsActivationMode`                                                                  |
| time-field      | `provideForTimeFieldDefaults`       | `FOR_TIME_FIELD_DEFAULTS`        | `DEFAULT_TIME_FIELD_SEGMENT_LABELS`, `ForTimeFieldDefaults`, `ForTimeFieldSegmentLabels`                 |
| time-picker     | `provideForTimePickerDefaults`      | `FOR_TIME_PICKER_DEFAULTS`       | `ForTimePickerDefaults`                                                                                  |
| time-field      | `provideForTimeRangeFieldDefaults`  | `FOR_TIME_RANGE_FIELD_DEFAULTS`  | `DEFAULT_TIME_RANGE_FIELD_SEGMENT_LABELS`, `ForTimeRangeFieldDefaults`, `ForTimeRangeFieldSegmentLabels` |
| toast           | `provideForToastDefaults`           | `FOR_TOAST_DEFAULTS`             | `ForToastDefaults`, `ForToastStackShift`                                                                 |
| toggle          | `provideForToggleDefaults`          | `FOR_TOGGLE_DEFAULTS`            | `ForToggleDefaults`                                                                                      |
| toolbar         | `provideForToolbarDefaults`         | `FOR_TOOLBAR_DEFAULTS`           | `ForToolbarDefaults`                                                                                     |
| tooltip         | `provideForTooltipDefaults`         | `FOR_TOOLTIP_DEFAULTS`           | `ForTooltipDefaults`, `TooltipCoordinator`, `TooltipDefaultsOptions`                                     |
| tree            | `provideForTreeDefaults`            | `FOR_TREE_DEFAULTS`              | `ForTreeDefaults`                                                                                        |

`forBreakpointsTailwind` is the default breakpoint map, the Tailwind CSS scale value for value. `provideForBreakpointsDefaults` takes a whole map and replaces it rather than merging key by key.

### Skip-delay windows

Tooltips and hover cards share a skip-delay window per scope: right after one closes, the next one in the same window opens without its open delay. `provideForTooltipDefaults` and `provideForHoverCardDefaults` take a second `options` argument whose `skipDelayScope` decides whether the scope starts its own window (`'own'`) or shares its parent's (`'inherit'`).

| Export                            | What it is                                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `TooltipCoordinator`              | The window of a tooltip scope. Inject it to read `skipDelay()` or to call `startSkipDelay()` / `cancelSkipDelay()` from your own code. |
| `HoverCardCoordinator`            | The same window for hover cards. It is never shared with a tooltip scope.                                                              |
| `createSkipDelayWindow(duration)` | A standalone window, owned by its caller: `active` reads `true` from `start()` until `duration()` ms later, or until `cancel()`.       |
| `SkipDelayWindow`                 | The handle `createSkipDelayWindow` returns.                                                                                            |
