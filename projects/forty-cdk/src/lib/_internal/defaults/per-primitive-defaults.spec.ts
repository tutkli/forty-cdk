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
} from '../../avatar/avatar-defaults';
import {
  FOR_CALENDAR_DEFAULTS,
  FOR_CALENDAR_FALLBACK_DEFAULTS,
  provideForCalendarDefaults,
} from '../../calendar/calendar-defaults';
import {
  FOR_CAROUSEL_DEFAULTS,
  FOR_CAROUSEL_FALLBACK_DEFAULTS,
  provideForCarouselDefaults,
} from '../../carousel/carousel-defaults';
import {
  FOR_CONTEXT_MENU_DEFAULTS,
  FOR_CONTEXT_MENU_FALLBACK_DEFAULTS,
  provideForContextMenuDefaults,
} from '../../context-menu/context-menu-defaults';
import {
  FOR_DATE_PICKER_DEFAULTS,
  FOR_DATE_PICKER_FALLBACK_DEFAULTS,
  provideForDatePickerDefaults,
} from '../../date-picker/date-picker-defaults';
import {
  FOR_DROPDOWN_MENU_DEFAULTS,
  FOR_DROPDOWN_MENU_FALLBACK_DEFAULTS,
  provideForDropdownMenuDefaults,
} from '../../dropdown-menu/dropdown-menu-defaults';
import {
  FOR_HOVER_CARD_DEFAULTS,
  FOR_HOVER_CARD_FALLBACK_DEFAULTS,
  provideForHoverCardDefaults,
} from '../../hover-card/hover-card-defaults';
import {
  FOR_LISTBOX_DEFAULTS,
  FOR_LISTBOX_FALLBACK_DEFAULTS,
  provideForListboxDefaults,
} from '../../listbox/listbox-defaults';
import {
  FOR_MENU_DEFAULTS,
  FOR_MENU_FALLBACK_DEFAULTS,
  provideForMenuDefaults,
} from '../../menu/menu-defaults';
import {
  FOR_MENUBAR_DEFAULTS,
  FOR_MENUBAR_FALLBACK_DEFAULTS,
  provideForMenubarDefaults,
} from '../../menubar/menubar-defaults';
import {
  FOR_NAVIGATION_MENU_DEFAULTS,
  FOR_NAVIGATION_MENU_FALLBACK_DEFAULTS,
  provideForNavigationMenuDefaults,
} from '../../navigation-menu/navigation-menu-defaults';
import {
  FOR_NUMBER_INPUT_DEFAULTS,
  FOR_NUMBER_INPUT_FALLBACK_DEFAULTS,
  provideForNumberInputDefaults,
} from '../../number-input/number-input-defaults';
import {
  FOR_POPOVER_DEFAULTS,
  FOR_POPOVER_FALLBACK_DEFAULTS,
  provideForPopoverDefaults,
} from '../../popover/popover-defaults';
import {
  FOR_PROGRESS_DEFAULTS,
  FOR_PROGRESS_FALLBACK_DEFAULTS,
  provideForProgressDefaults,
} from '../../progress/progress-defaults';
import {
  FOR_RADIO_GROUP_DEFAULTS,
  FOR_RADIO_GROUP_FALLBACK_DEFAULTS,
  provideForRadioGroupDefaults,
} from '../../radio-group/radio-group-defaults';
import {
  FOR_SCROLL_AREA_DEFAULTS,
  FOR_SCROLL_AREA_FALLBACK_DEFAULTS,
  provideForScrollAreaDefaults,
} from '../../scroll-area/scroll-area-defaults';
import {
  FOR_SELECT_DEFAULTS,
  FOR_SELECT_FALLBACK_DEFAULTS,
  provideForSelectDefaults,
} from '../../select/select-defaults';
import {
  FOR_SLIDER_DEFAULTS,
  FOR_SLIDER_FALLBACK_DEFAULTS,
  provideForSliderDefaults,
} from '../../slider/slider-defaults';
import {
  FOR_TABS_DEFAULTS,
  FOR_TABS_FALLBACK_DEFAULTS,
  provideForTabsDefaults,
} from '../../tabs/tabs-defaults';
import {
  FOR_TOGGLE_DEFAULTS,
  FOR_TOGGLE_FALLBACK_DEFAULTS,
  provideForToggleDefaults,
} from '../../toggle/toggle-defaults';
import {
  FOR_TOOLBAR_DEFAULTS,
  FOR_TOOLBAR_FALLBACK_DEFAULTS,
  provideForToolbarDefaults,
} from '../../toolbar/toolbar-defaults';
import {
  FOR_TOOLTIP_DEFAULTS,
  FOR_TOOLTIP_FALLBACK_DEFAULTS,
  provideForTooltipDefaults,
} from '../../tooltip/tooltip-defaults';
import {
  FOR_TIME_PICKER_DEFAULTS,
  FOR_TIME_PICKER_FALLBACK_DEFAULTS,
  provideForTimePickerDefaults,
} from '../../time-picker/time-picker-defaults';
import {
  FOR_DRAG_DROP_DEFAULTS,
  FOR_DRAG_DROP_FALLBACK_DEFAULTS,
  provideForDragDropDefaults,
} from '../../drag-drop/drag-drop-defaults';
import {
  FOR_PAGINATION_DEFAULTS,
  FOR_PAGINATION_FALLBACK_DEFAULTS,
  provideForPaginationDefaults,
} from '../../pagination/pagination-defaults';
import {
  FOR_STEPPER_DEFAULTS,
  FOR_STEPPER_FALLBACK_DEFAULTS,
  provideForStepperDefaults,
} from '../../stepper/stepper-defaults';
import {
  FOR_TREE_DEFAULTS,
  FOR_TREE_FALLBACK_DEFAULTS,
  provideForTreeDefaults,
} from '../../tree/tree-defaults';

interface DefaultsCase<D extends object> {
  /** Name of the primitive's provider, used as the test suite label. */
  readonly name: string;
  /** Token consumers inject to read the resolved defaults. */
  readonly token: InjectionToken<D>;
  /** The production fallback exported from the primitive's `*-defaults.ts`. */
  readonly fallback: D;
  /** Provider factory under test. */
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
    override: { largeStep: 25 },
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
    override: { delayDuration: 500 },
  }),
  defaultsCase({
    name: 'provideForListboxDefaults',
    token: FOR_LISTBOX_DEFAULTS,
    fallback: FOR_LISTBOX_FALLBACK_DEFAULTS,
    provide: provideForListboxDefaults,
    override: { selectionFollowsFocus: true },
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
    override: { closeDelay: 300 },
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
];

describe('per-primitive defaults providers', () => {
  for (const c of CASES) {
    describe(c.name, () => {
      it('exposes the exported library fallback at the root injector', () => {
        TestBed.configureTestingModule({});
        const resolved = TestBed.runInInjectionContext(() => inject(c.token));
        expect(resolved).toEqual(c.fallback);
      });

      it('runs under provideZonelessChangeDetection', () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const resolved = TestBed.runInInjectionContext(() => inject(c.token));
        expect(resolved).toEqual(c.fallback);
      });

      it('merges a per-key override over the fallback, leaving other keys intact', () => {
        const fallback = c.fallback as Record<string, unknown>;
        const override = c.override as Record<string, unknown>;
        const overrideKey = Object.keys(override)[0];
        expect(fallback[overrideKey]).not.toEqual(override[overrideKey]);

        TestBed.configureTestingModule({ providers: [c.provide(c.override)] });
        const resolved = TestBed.runInInjectionContext(() => inject(c.token));
        expect(resolved).toEqual({ ...c.fallback, ...c.override });
      });
    });
  }
});
