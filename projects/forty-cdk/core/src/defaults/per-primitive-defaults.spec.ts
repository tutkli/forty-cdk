import {
  type InjectionToken,
  type Provider,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_AVATAR_DEFAULTS,
  FOR_AVATAR_FALLBACK_DEFAULTS,
  provideForAvatarDefaults,
} from '../../../avatar/src/avatar-defaults';
import {
  FOR_BREADCRUMBS_DEFAULTS,
  FOR_BREADCRUMBS_FALLBACK_DEFAULTS,
  provideForBreadcrumbsDefaults,
} from '../../../breadcrumbs/src/breadcrumbs-defaults';
import {
  FOR_BREAKPOINTS_DEFAULTS,
  FOR_BREAKPOINTS_FALLBACK_DEFAULTS,
  provideForBreakpointsDefaults,
} from '../../../breakpoints/src/breakpoints-defaults';
import {
  FOR_CALENDAR_DEFAULTS,
  FOR_CALENDAR_FALLBACK_DEFAULTS,
  provideForCalendarDefaults,
} from '../../../calendar/src/calendar-defaults';
import {
  FOR_CAROUSEL_DEFAULTS,
  FOR_CAROUSEL_FALLBACK_DEFAULTS,
  provideForCarouselDefaults,
} from '../../../carousel/src/carousel-defaults';
import {
  FOR_COMBOBOX_DEFAULTS,
  FOR_COMBOBOX_FALLBACK_DEFAULTS,
  provideForComboboxDefaults,
} from '../../../combobox/src/combobox-defaults';
import {
  FOR_CONTEXT_MENU_DEFAULTS,
  FOR_CONTEXT_MENU_FALLBACK_DEFAULTS,
  provideForContextMenuDefaults,
} from '../../../context-menu/src/context-menu-defaults';
import {
  FOR_DATE_FIELD_DEFAULTS,
  FOR_DATE_FIELD_FALLBACK_DEFAULTS,
  provideForDateFieldDefaults,
} from '../../../date-field/src/date-field-defaults';
import {
  FOR_DATE_PICKER_DEFAULTS,
  FOR_DATE_PICKER_FALLBACK_DEFAULTS,
  provideForDatePickerDefaults,
} from '../../../date-picker/src/date-picker-defaults';
import {
  FOR_DATE_RANGE_PICKER_DEFAULTS,
  FOR_DATE_RANGE_PICKER_FALLBACK_DEFAULTS,
  provideForDateRangePickerDefaults,
} from '../../../date-picker/src/date-range-picker-defaults';
import {
  FOR_DATE_RANGE_FIELD_DEFAULTS,
  FOR_DATE_RANGE_FIELD_FALLBACK_DEFAULTS,
  provideForDateRangeFieldDefaults,
} from '../../../date-field/src/date-range-field-defaults';
import {
  FOR_DIALOG_DEFAULTS,
  FOR_DIALOG_FALLBACK_DEFAULTS,
  provideForDialogDefaults,
} from '../../../dialog/src/dialog-defaults';
import {
  FOR_DRAWER_DEFAULTS,
  FOR_DRAWER_FALLBACK_DEFAULTS,
  provideForDrawerDefaults,
} from '../../../drawer/src/drawer-defaults';
import {
  FOR_DROPDOWN_MENU_DEFAULTS,
  FOR_DROPDOWN_MENU_FALLBACK_DEFAULTS,
  provideForDropdownMenuDefaults,
} from '../../../dropdown-menu/src/dropdown-menu-defaults';
import {
  FOR_HOVER_CARD_DEFAULTS,
  FOR_HOVER_CARD_FALLBACK_DEFAULTS,
  provideForHoverCardDefaults,
} from '../../../hover-card/src/hover-card-defaults';
import {
  FOR_LISTBOX_DEFAULTS,
  FOR_LISTBOX_FALLBACK_DEFAULTS,
  provideForListboxDefaults,
} from '../../../listbox/src/listbox-defaults';
import {
  FOR_MENU_DEFAULTS,
  FOR_MENU_FALLBACK_DEFAULTS,
  provideForMenuDefaults,
} from '../../../menu/src/menu-defaults';
import {
  FOR_MENUBAR_DEFAULTS,
  FOR_MENUBAR_FALLBACK_DEFAULTS,
  provideForMenubarDefaults,
} from '../../../menubar/src/menubar-defaults';
import {
  FOR_NAVIGATION_MENU_DEFAULTS,
  FOR_NAVIGATION_MENU_FALLBACK_DEFAULTS,
  provideForNavigationMenuDefaults,
} from '../../../navigation-menu/src/navigation-menu-defaults';
import {
  FOR_NUMBER_INPUT_DEFAULTS,
  FOR_NUMBER_INPUT_FALLBACK_DEFAULTS,
  provideForNumberInputDefaults,
} from '../../../number-input/src/number-input-defaults';
import {
  FOR_POPOVER_DEFAULTS,
  FOR_POPOVER_FALLBACK_DEFAULTS,
  provideForPopoverDefaults,
} from '../../../popover/src/popover-defaults';
import {
  FOR_PROGRESS_DEFAULTS,
  FOR_PROGRESS_FALLBACK_DEFAULTS,
  provideForProgressDefaults,
} from '../../../progress/src/progress-defaults';
import {
  FOR_RADIO_GROUP_DEFAULTS,
  FOR_RADIO_GROUP_FALLBACK_DEFAULTS,
  provideForRadioGroupDefaults,
} from '../../../radio-group/src/radio-group-defaults';
import {
  FOR_SCROLL_AREA_DEFAULTS,
  FOR_SCROLL_AREA_FALLBACK_DEFAULTS,
  provideForScrollAreaDefaults,
} from '../../../scroll-area/src/scroll-area-defaults';
import {
  FOR_SEARCH_DEFAULTS,
  FOR_SEARCH_FALLBACK_DEFAULTS,
  provideForSearchDefaults,
} from '../../../search/src/search-defaults';
import {
  FOR_SELECT_DEFAULTS,
  FOR_SELECT_FALLBACK_DEFAULTS,
  provideForSelectDefaults,
} from '../../../select/src/select-defaults';
import {
  FOR_SLIDER_DEFAULTS,
  FOR_SLIDER_FALLBACK_DEFAULTS,
  provideForSliderDefaults,
} from '../../../slider/src/slider-defaults';
import {
  FOR_TABS_DEFAULTS,
  FOR_TABS_FALLBACK_DEFAULTS,
  provideForTabsDefaults,
} from '../../../tabs/src/tabs-defaults';
import {
  FOR_TIME_FIELD_DEFAULTS,
  FOR_TIME_FIELD_FALLBACK_DEFAULTS,
  provideForTimeFieldDefaults,
} from '../../../time-field/src/time-field-defaults';
import {
  FOR_TIME_RANGE_FIELD_DEFAULTS,
  FOR_TIME_RANGE_FIELD_FALLBACK_DEFAULTS,
  provideForTimeRangeFieldDefaults,
} from '../../../time-field/src/time-range-field-defaults';
import {
  FOR_TOAST_DEFAULTS,
  FOR_TOAST_FALLBACK_DEFAULTS,
  provideForToastDefaults,
} from '../../../toast/src/toast-defaults';
import {
  FOR_TOGGLE_DEFAULTS,
  FOR_TOGGLE_FALLBACK_DEFAULTS,
  provideForToggleDefaults,
} from '../../../toggle/src/toggle-defaults';
import {
  FOR_TOOLBAR_DEFAULTS,
  FOR_TOOLBAR_FALLBACK_DEFAULTS,
  provideForToolbarDefaults,
} from '../../../toolbar/src/toolbar-defaults';
import {
  FOR_TOOLTIP_DEFAULTS,
  FOR_TOOLTIP_FALLBACK_DEFAULTS,
  provideForTooltipDefaults,
} from '../../../tooltip/src/tooltip-defaults';
import {
  FOR_TIME_PICKER_DEFAULTS,
  FOR_TIME_PICKER_FALLBACK_DEFAULTS,
  provideForTimePickerDefaults,
} from '../../../time-picker/src/time-picker-defaults';
import {
  FOR_DRAG_DROP_DEFAULTS,
  FOR_DRAG_DROP_FALLBACK_DEFAULTS,
  provideForDragDropDefaults,
} from '../../../drag-drop/src/drag-drop-defaults';
import {
  FOR_PAGINATION_DEFAULTS,
  FOR_PAGINATION_FALLBACK_DEFAULTS,
  provideForPaginationDefaults,
} from '../../../pagination/src/pagination-defaults';
import {
  FOR_STEPPER_DEFAULTS,
  FOR_STEPPER_FALLBACK_DEFAULTS,
  provideForStepperDefaults,
} from '../../../stepper/src/stepper-defaults';
import {
  FOR_TREE_DEFAULTS,
  FOR_TREE_FALLBACK_DEFAULTS,
  provideForTreeDefaults,
} from '../../../tree/src/tree-defaults';

interface DefaultsCase<D extends object> {
  /** Name of the primitive's provider, used as the test suite label. */
  readonly name: string;
  /** Token consumers inject to read the resolved defaults. */
  readonly token: InjectionToken<D>;
  /** The production fallback exported from the primitive's `*-defaults.ts`. */
  readonly fallback: D;
  /**
   * Provider factory under test. Almost every helper takes `Partial<D>` and
   * drops in directly; a helper whose signature is not the partial shape
   * (`provideForBreakpointsDefaults(breakpoints)`) is adapted by a lambda here,
   * so the three assertions below stay identical across every case.
   */
  readonly provide: (overrides: Partial<D>) => Provider[];
  /** A single key whose override value differs from the fallback. */
  readonly override: Partial<D>;
}

function defaultsCase<D extends object>(c: DefaultsCase<D>): DefaultsCase<object> {
  return c as DefaultsCase<object>;
}

const CASES: readonly DefaultsCase<object>[] = [
  defaultsCase({
    name: 'provideForTabsDefaults',
    token: FOR_TABS_DEFAULTS,
    fallback: FOR_TABS_FALLBACK_DEFAULTS,
    provide: provideForTabsDefaults,
    override: { activationMode: 'manual' },
  }),
  defaultsCase({
    name: 'provideForSliderDefaults',
    token: FOR_SLIDER_DEFAULTS,
    fallback: FOR_SLIDER_FALLBACK_DEFAULTS,
    provide: provideForSliderDefaults,
    override: { stepMultiplier: 25 },
  }),
  defaultsCase({
    name: 'provideForAvatarDefaults',
    token: FOR_AVATAR_DEFAULTS,
    fallback: FOR_AVATAR_FALLBACK_DEFAULTS,
    provide: provideForAvatarDefaults,
    override: { fallbackDelayMs: 500 },
  }),
  defaultsCase({
    name: 'provideForToggleDefaults',
    token: FOR_TOGGLE_DEFAULTS,
    fallback: FOR_TOGGLE_FALLBACK_DEFAULTS,
    provide: provideForToggleDefaults,
    override: { loop: false },
  }),
  defaultsCase({
    name: 'provideForToolbarDefaults',
    token: FOR_TOOLBAR_DEFAULTS,
    fallback: FOR_TOOLBAR_FALLBACK_DEFAULTS,
    provide: provideForToolbarDefaults,
    override: { loop: false },
  }),
  defaultsCase({
    name: 'provideForMenuDefaults',
    token: FOR_MENU_DEFAULTS,
    fallback: FOR_MENU_FALLBACK_DEFAULTS,
    provide: provideForMenuDefaults,
    override: { subMenuOpenDelay: 250 },
  }),
  defaultsCase({
    name: 'provideForSearchDefaults',
    token: FOR_SEARCH_DEFAULTS,
    fallback: FOR_SEARCH_FALLBACK_DEFAULTS,
    provide: provideForSearchDefaults,
    override: { clearAriaLabel: 'Limpiar' },
  }),
  defaultsCase({
    name: 'provideForSelectDefaults',
    token: FOR_SELECT_DEFAULTS,
    fallback: FOR_SELECT_FALLBACK_DEFAULTS,
    provide: provideForSelectDefaults,
    override: { sideOffset: 12 },
  }),
  defaultsCase({
    name: 'provideForRadioGroupDefaults',
    token: FOR_RADIO_GROUP_DEFAULTS,
    fallback: FOR_RADIO_GROUP_FALLBACK_DEFAULTS,
    provide: provideForRadioGroupDefaults,
    override: { loop: false },
  }),
  defaultsCase({
    name: 'provideForScrollAreaDefaults',
    token: FOR_SCROLL_AREA_DEFAULTS,
    fallback: FOR_SCROLL_AREA_FALLBACK_DEFAULTS,
    provide: provideForScrollAreaDefaults,
    override: { scrollHideDelay: 1200 },
  }),
  defaultsCase({
    name: 'provideForProgressDefaults',
    token: FOR_PROGRESS_DEFAULTS,
    fallback: FOR_PROGRESS_FALLBACK_DEFAULTS,
    provide: provideForProgressDefaults,
    override: { announceCompletion: true },
  }),
  defaultsCase({
    name: 'provideForNavigationMenuDefaults',
    token: FOR_NAVIGATION_MENU_DEFAULTS,
    fallback: FOR_NAVIGATION_MENU_FALLBACK_DEFAULTS,
    provide: provideForNavigationMenuDefaults,
    override: { openDelay: 500 },
  }),
  defaultsCase({
    name: 'provideForListboxDefaults',
    token: FOR_LISTBOX_DEFAULTS,
    fallback: FOR_LISTBOX_FALLBACK_DEFAULTS,
    provide: provideForListboxDefaults,
    override: { selectionFollowsFocus: true },
  }),
  defaultsCase({
    name: 'provideForComboboxDefaults',
    token: FOR_COMBOBOX_DEFAULTS,
    fallback: FOR_COMBOBOX_FALLBACK_DEFAULTS,
    provide: provideForComboboxDefaults,
    override: { sideOffset: 12 },
  }),
  defaultsCase({
    name: 'provideForContextMenuDefaults',
    token: FOR_CONTEXT_MENU_DEFAULTS,
    fallback: FOR_CONTEXT_MENU_FALLBACK_DEFAULTS,
    provide: provideForContextMenuDefaults,
    override: { collisionPadding: 16 },
  }),
  defaultsCase({
    name: 'provideForDropdownMenuDefaults',
    token: FOR_DROPDOWN_MENU_DEFAULTS,
    fallback: FOR_DROPDOWN_MENU_FALLBACK_DEFAULTS,
    provide: provideForDropdownMenuDefaults,
    override: { sideOffset: 16 },
  }),
  defaultsCase({
    name: 'provideForTooltipDefaults',
    token: FOR_TOOLTIP_DEFAULTS,
    fallback: FOR_TOOLTIP_FALLBACK_DEFAULTS,
    provide: provideForTooltipDefaults,
    override: { side: 'bottom' },
  }),
  defaultsCase({
    name: 'provideForHoverCardDefaults',
    token: FOR_HOVER_CARD_DEFAULTS,
    fallback: FOR_HOVER_CARD_FALLBACK_DEFAULTS,
    provide: provideForHoverCardDefaults,
    override: { side: 'bottom' },
  }),
  defaultsCase({
    name: 'provideForPopoverDefaults',
    token: FOR_POPOVER_DEFAULTS,
    fallback: FOR_POPOVER_FALLBACK_DEFAULTS,
    provide: provideForPopoverDefaults,
    override: { side: 'top' },
  }),
  defaultsCase({
    name: 'provideForCarouselDefaults',
    token: FOR_CAROUSEL_DEFAULTS,
    fallback: FOR_CAROUSEL_FALLBACK_DEFAULTS,
    provide: provideForCarouselDefaults,
    override: { slidesPerView: 3 },
  }),
  defaultsCase({
    name: 'provideForCalendarDefaults',
    token: FOR_CALENDAR_DEFAULTS,
    fallback: FOR_CALENDAR_FALLBACK_DEFAULTS,
    provide: provideForCalendarDefaults,
    override: { firstDayOfWeek: 1 },
  }),
  defaultsCase({
    name: 'provideForDatePickerDefaults',
    token: FOR_DATE_PICKER_DEFAULTS,
    fallback: FOR_DATE_PICKER_FALLBACK_DEFAULTS,
    provide: provideForDatePickerDefaults,
    override: { sideOffset: 12 },
  }),
  defaultsCase({
    name: 'provideForDateRangePickerDefaults',
    token: FOR_DATE_RANGE_PICKER_DEFAULTS,
    fallback: FOR_DATE_RANGE_PICKER_FALLBACK_DEFAULTS,
    provide: provideForDateRangePickerDefaults,
    override: { sideOffset: 12 },
  }),
  defaultsCase({
    name: 'provideForNumberInputDefaults',
    token: FOR_NUMBER_INPUT_DEFAULTS,
    fallback: FOR_NUMBER_INPUT_FALLBACK_DEFAULTS,
    provide: provideForNumberInputDefaults,
    override: { stepMultiplier: 5 },
  }),
  defaultsCase({
    name: 'provideForMenubarDefaults',
    token: FOR_MENUBAR_DEFAULTS,
    fallback: FOR_MENUBAR_FALLBACK_DEFAULTS,
    provide: provideForMenubarDefaults,
    override: { sideOffset: 12 },
  }),
  defaultsCase({
    name: 'provideForTreeDefaults',
    token: FOR_TREE_DEFAULTS,
    fallback: FOR_TREE_FALLBACK_DEFAULTS,
    provide: provideForTreeDefaults,
    override: { selectionFollowsFocus: true },
  }),
  defaultsCase({
    name: 'provideForTimePickerDefaults',
    token: FOR_TIME_PICKER_DEFAULTS,
    fallback: FOR_TIME_PICKER_FALLBACK_DEFAULTS,
    provide: provideForTimePickerDefaults,
    override: { sideOffset: 12 },
  }),
  defaultsCase({
    name: 'provideForDragDropDefaults',
    token: FOR_DRAG_DROP_DEFAULTS,
    fallback: FOR_DRAG_DROP_FALLBACK_DEFAULTS,
    provide: provideForDragDropDefaults,
    override: { itemRoleDescription: 'draggable' },
  }),
  defaultsCase({
    name: 'provideForStepperDefaults',
    token: FOR_STEPPER_DEFAULTS,
    fallback: FOR_STEPPER_FALLBACK_DEFAULTS,
    provide: provideForStepperDefaults,
    override: { activationMode: 'automatic' },
  }),
  defaultsCase({
    name: 'provideForPaginationDefaults',
    token: FOR_PAGINATION_DEFAULTS,
    fallback: FOR_PAGINATION_FALLBACK_DEFAULTS,
    provide: provideForPaginationDefaults,
    override: { siblingCount: 2 },
  }),
  defaultsCase({
    name: 'provideForBreadcrumbsDefaults',
    token: FOR_BREADCRUMBS_DEFAULTS,
    fallback: FOR_BREADCRUMBS_FALLBACK_DEFAULTS,
    provide: provideForBreadcrumbsDefaults,
    override: { label: 'Ruta' },
  }),
  defaultsCase({
    name: 'provideForDialogDefaults',
    token: FOR_DIALOG_DEFAULTS,
    fallback: FOR_DIALOG_FALLBACK_DEFAULTS,
    provide: provideForDialogDefaults,
    override: { modal: false },
  }),
  defaultsCase({
    name: 'provideForDrawerDefaults',
    token: FOR_DRAWER_DEFAULTS,
    fallback: FOR_DRAWER_FALLBACK_DEFAULTS,
    provide: provideForDrawerDefaults,
    override: { side: 'top' },
  }),
  defaultsCase({
    name: 'provideForToastDefaults',
    token: FOR_TOAST_DEFAULTS,
    fallback: FOR_TOAST_FALLBACK_DEFAULTS,
    provide: provideForToastDefaults,
    override: { viewportAriaLabel: 'Notificaciones' },
  }),
  defaultsCase({
    name: 'provideForDateFieldDefaults',
    token: FOR_DATE_FIELD_DEFAULTS,
    fallback: FOR_DATE_FIELD_FALLBACK_DEFAULTS,
    provide: provideForDateFieldDefaults,
    override: { emptySegmentText: 'Vacío' },
  }),
  defaultsCase({
    name: 'provideForDateRangeFieldDefaults',
    token: FOR_DATE_RANGE_FIELD_DEFAULTS,
    fallback: FOR_DATE_RANGE_FIELD_FALLBACK_DEFAULTS,
    provide: provideForDateRangeFieldDefaults,
    override: { startLabel: 'Fecha de inicio' },
  }),
  defaultsCase({
    name: 'provideForTimeFieldDefaults',
    token: FOR_TIME_FIELD_DEFAULTS,
    fallback: FOR_TIME_FIELD_FALLBACK_DEFAULTS,
    provide: provideForTimeFieldDefaults,
    override: { emptySegmentText: 'Vacío' },
  }),
  defaultsCase({
    name: 'provideForTimeRangeFieldDefaults',
    token: FOR_TIME_RANGE_FIELD_DEFAULTS,
    fallback: FOR_TIME_RANGE_FIELD_FALLBACK_DEFAULTS,
    provide: provideForTimeRangeFieldDefaults,
    override: { startLabel: 'Hora de inicio' },
  }),
  defaultsCase({
    name: 'provideForBreakpointsDefaults',
    token: FOR_BREAKPOINTS_DEFAULTS,
    fallback: FOR_BREAKPOINTS_FALLBACK_DEFAULTS,
    provide: ({ breakpoints }) => provideForBreakpointsDefaults(breakpoints!),
    override: { breakpoints: { mobile: 0, tablet: 768, desktop: 1280 } },
  }),
];

/**
 * Every `<primitive>-defaults.ts` in the library, read as source so the case
 * table above can be checked against the providers that actually ship.
 *
 * The eight primitives [#1627](https://github.com/tutkli/forty-cdk/issues/1627)
 * added went uncovered for as long as they did because a missing case is
 * *invisible*: the suite reports 31 green primitives whether the table lists 31
 * or 39, and nothing turns red when a fortieth joins them. Deriving the
 * expected set from source is what makes the gap loud — the same "the list
 * cannot rot" property the core-tier and registration-surface gates have.
 *
 * A source scan rather than a runtime one because there is nothing to reflect:
 * `createDefaults` returns a plain `{ token, provideDefaults }` pair, and a
 * primitive that never exported its fallback is exactly the primitive this spec
 * cannot import.
 */
const DEFAULTS_SOURCES = import.meta.glob('../../../*/src/*-defaults.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * The `provideFor<Primitive>Defaults` helpers the library ships, sorted. Same
 * regex as the generated `defaults providers` matrix in
 * `scripts/lib/convention-matrices.mjs`, so the two rosters read the same 39
 * providers today; the glob above is the narrower half of the pair, keyed on
 * the `<primitive>-defaults.ts` file name the conventions require and the
 * `forty-cdk/require-defaults-sibling` lint enforces.
 */
function shippedDefaultsProviders(): string[] {
  const names: string[] = [];
  for (const source of Object.values(DEFAULTS_SOURCES)) {
    const match = source.match(/^export function (provideFor[A-Za-z]+Defaults)/m);
    if (match) {
      names.push(match[1]!);
    }
  }
  return names.sort();
}

describe('per-primitive defaults providers', () => {
  it('covers every defaults provider the library ships, and no retired one', () => {
    expect(CASES.map((c) => c.name).sort()).toEqual(shippedDefaultsProviders());
  });

  for (const c of CASES) {
    describe(c.name, () => {
      it('exposes the exported library fallback at the root injector', () => {
        TestBed.configureTestingModule({});
        const resolved = TestBed.runInInjectionContext(() => inject(c.token));
        expect(resolved).toEqual(c.fallback);
      });

      it('resolves the fallback under an explicit provideZonelessChangeDetection()', () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const resolved = TestBed.runInInjectionContext(() => inject(c.token));
        expect(resolved).toEqual(c.fallback);
      });

      it('merges a per-key override over the fallback, leaving other keys intact', () => {
        const fallback = c.fallback as Record<string, unknown>;
        const override = c.override as Record<string, unknown>;
        const overrideKey = Object.keys(override)[0]!;
        expect(fallback[overrideKey]).not.toEqual(override[overrideKey]);

        TestBed.configureTestingModule({ providers: [c.provide(c.override)] });
        const resolved = TestBed.runInInjectionContext(() => inject(c.token));
        expect(resolved).toEqual({ ...c.fallback, ...c.override });
      });
    });
  }
});
