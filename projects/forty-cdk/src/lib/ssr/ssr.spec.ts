import { ɵPLATFORM_SERVER_ID, isPlatformServer } from '@angular/common';
import {
  Component,
  type ElementRef,
  PLATFORM_ID,
  computed,
  provideZonelessChangeDetection,
  signal,
  type Type,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk/accordion';
import { ForAvatar, ForAvatarFallback, ForAvatarImage } from 'forty-cdk/avatar';
import { ForBreadcrumbItem, ForBreadcrumbSeparator, ForBreadcrumbs } from 'forty-cdk/breadcrumbs';
import { injectBreakpoints } from 'forty-cdk/breakpoints';
import { ForCheckbox } from 'forty-cdk/checkbox';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk/disclosure';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk/file-upload';
import { ForTextarea } from 'forty-cdk/input';
import {
  ForNumberInput,
  ForNumberInputDecrement,
  ForNumberInputGroup,
  ForNumberInputIncrement,
} from 'forty-cdk/number-input';
import { ForOtpInput, ForOtpInputSlot } from 'forty-cdk/otp-input';
import {
  ForPagination,
  ForPaginationItem,
  ForPaginationNext,
  ForPaginationPrevious,
} from 'forty-cdk/pagination';
import { ForPaneResizer } from 'forty-cdk/pane-resizer';
import { ForRadio, ForRadioGroup } from 'forty-cdk/radio-group';
import {
  ForScrollArea,
  ForScrollAreaContent,
  ForScrollAreaCorner,
  ForScrollAreaScrollbar,
  ForScrollAreaThumb,
  ForScrollAreaViewport,
} from 'forty-cdk/scroll-area';
import { ForSearch, ForSearchClear } from 'forty-cdk/search';
import { ForSlider, ForSliderRange, ForSliderThumb, ForSliderTrack } from 'forty-cdk/slider';
import { ForSwitch } from 'forty-cdk/switch';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';
import {
  ForToolbar,
  ForToolbarButton,
  ForToolbarLink,
  ForToolbarSeparator,
} from 'forty-cdk/toolbar';
import { ForCalendar } from '../calendar/calendar';
import { ForCalendarCell } from '../calendar/calendar-cell';
import { ForCalendarGrid } from '../calendar/calendar-grid';
import { ForCalendarHeading } from '../calendar/calendar-heading';
import { ForCalendarMonthCell } from '../calendar/calendar-month-cell';
import { ForCalendarMonthGrid } from '../calendar/calendar-month-grid';
import { ForCalendarMonthSelect } from '../calendar/calendar-month-select';
import { ForCalendarViewTrigger } from '../calendar/calendar-view-trigger';
import { ForCalendarYearCell } from '../calendar/calendar-year-cell';
import { ForCalendarYearGrid } from '../calendar/calendar-year-grid';
import { ForCalendarYearSelect } from '../calendar/calendar-year-select';
import { provideNativeDateAdapter } from '../calendar/native-date-adapter';
import { ForCombobox } from '../combobox/combobox';
import { ForComboboxContent } from '../combobox/combobox-content';
import { ForComboboxInput } from '../combobox/combobox-input';
import { ForComboboxOption } from '../combobox/combobox-option';
import { ForDateField } from '../date-field/date-field';
import { ForDateFieldLiteral } from '../date-field/date-field-literal';
import { ForDateFieldSegment } from '../date-field/date-field-segment';
import { ForDatePicker } from '../date-picker/date-picker';
import { ForDatePickerTrigger } from '../date-picker/date-picker-trigger';
import { ForDatePickerValue } from '../date-picker/date-picker-value';
import { ForDialog } from 'forty-cdk/dialog';
import { ForDialogBackdrop } from 'forty-cdk/dialog';
import { ForDialogTitle } from 'forty-cdk/dialog';
import { ForDrawer, ForDrawerBackdrop, ForDrawerTitle } from 'forty-cdk/drawer';
import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';
import {
  ForPopover,
  ForPopoverContent,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk/popover';
import { ForToast, ForToastTitle, ForToastViewport } from 'forty-cdk/toast';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

import { ForMenuContent } from '../menu/menu-content';
import { ForMenuItem } from '../menu/menu-item';
import { ForMenubar } from '../menubar/menubar';
import { ForMenubarTrigger } from '../menubar/menubar-trigger';
import { ForNavigationMenu } from '../navigation-menu/navigation-menu';
import { ForNavigationMenuContent } from '../navigation-menu/navigation-menu-content';
import { ForNavigationMenuItem } from '../navigation-menu/navigation-menu-item';
import { ForNavigationMenuLink } from '../navigation-menu/navigation-menu-link';
import { ForNavigationMenuList } from '../navigation-menu/navigation-menu-list';
import { ForNavigationMenuTrigger } from '../navigation-menu/navigation-menu-trigger';

import { ForSelect } from '../select/select';
import { ForSelectContent } from '../select/select-content';
import { ForSelectOption } from '../select/select-option';
import { ForSelectTrigger } from '../select/select-trigger';
import { ForSelectValue } from '../select/select-value';
import { ForButton } from 'forty-cdk/button';
import { ForCarousel } from '../carousel/carousel';
import { ForCarouselDrag } from '../carousel/carousel-drag';
import { ForCarouselIndicator } from '../carousel/carousel-indicator';
import { ForCarouselIndicators } from '../carousel/carousel-indicators';
import { ForCarouselNext } from '../carousel/carousel-next';
import { ForCarouselPrevious } from '../carousel/carousel-previous';
import { ForCarouselRotationControl } from '../carousel/carousel-rotation-control';
import { ForCarouselSlide } from '../carousel/carousel-slide';
import { ForCarouselTrack } from '../carousel/carousel-track';
import { ForCarouselViewport } from '../carousel/carousel-viewport';
import { ForTimeField } from '../time-field/time-field';
import { ForTimeFieldLiteral } from '../time-field/time-field-literal';
import { ForTimeFieldSegment } from '../time-field/time-field-segment';
import { ForTimePicker } from '../time-picker/time-picker';
import { ForTimePickerContent } from '../time-picker/time-picker-content';
import { ForTimePickerOption } from '../time-picker/time-picker-option';
import { ForTimePickerTrigger } from '../time-picker/time-picker-trigger';
import { ForTimePickerValue } from '../time-picker/time-picker-value';

import { ForTree } from '../tree/tree';
import { ForTreeGroup } from '../tree/tree-group';
import { ForTreeItem } from '../tree/tree-item';
import { ForTreeItemCheckbox } from '../tree/tree-item-checkbox';
import { ForTreeItemCheckboxIndicator } from '../tree/tree-item-checkbox-indicator';
import { ForTreeItemLabel } from '../tree/tree-item-label';
import { ForTreeItemToggle } from '../tree/tree-item-toggle';
import { ForTreeNodeDrag } from '../tree/tree-node-drag';
import { ForTreeNodeDragHandle } from '../tree/tree-node-drag-handle';
import { ForDragHandle } from '../drag-drop/drag-handle';
import { ForDragPlaceholder } from '../drag-drop/drag-placeholder';
import { ForDragPreview } from '../drag-drop/drag-preview';
import { ForDraggable } from '../drag-drop/draggable';
import { ForFreeDrag } from '../drag-drop/free-drag';
import { ForDropList } from '../drag-drop/drop-list';
import { ForDropListGroup } from '../drag-drop/drop-list-group';
import { ForTable } from '../table/table';
import { ForTableCell } from '../table/table-cell';
import { ForTableHeaderCell } from '../table/table-header-cell';
import { ForTableHeaderRow } from '../table/table-header-row';
import { ForTableRow } from '../table/table-row';
import { ForTableSortHeader } from '../table/table-sort-header';
import { ForTableColumnResizer } from '../table/table-column-resizer';
import { ForTableColumnReorder } from '../table/table-column-reorder';
import { ForTableRowReorder } from '../table/table-row-reorder';
import {
  ForTableVirtualized,
  ForVirtualFor,
  ForVirtualViewport,
  injectVirtualizer,
} from 'forty-cdk/virtualization';
import { ForStepper } from '../stepper/stepper';
import { ForStepperCompletedContent } from '../stepper/stepper-completed-content';
import { ForStepperContent } from '../stepper/stepper-content';
import { ForStepperIndicator } from '../stepper/stepper-indicator';
import { ForStepperItem } from '../stepper/stepper-item';
import { ForStepperList } from '../stepper/stepper-list';
import { ForStepperNext } from '../stepper/stepper-next';
import { ForStepperPrevious } from '../stepper/stepper-previous';
import { ForStepperSeparator } from '../stepper/stepper-separator';
import { ForStepperProgress } from '../stepper/stepper-progress';
import { ForStepperTrigger } from '../stepper/stepper-trigger';
import { ForContextMenu } from '../context-menu/context-menu';
import { ForContextMenuTrigger } from '../context-menu/context-menu-trigger';
import { ForDropdownMenu } from '../dropdown-menu/dropdown-menu';
import { ForDropdownMenuTrigger } from '../dropdown-menu/dropdown-menu-trigger';

import { ForListbox } from '../listbox/listbox';
import { ForListboxOption } from '../listbox/listbox-option';
import { ForListboxReorder } from '../listbox/listbox-reorder';
import { BodyScrollLock } from 'forty-cdk/core';
import { DismissableLayerStack } from 'forty-cdk/core';
import { IdGenerator } from 'forty-cdk/core';
import { InertSiblingsStack } from 'forty-cdk/core';
import { ForVisuallyHidden } from 'forty-cdk/core';

/**
 * SSR smoke tests. Forces `PLATFORM_ID` to `'server'` and asserts:
 *
 * - Each primitive constructs and renders without throwing on the server.
 * - Static markup (role, aria-*, ids, data-state) is present after
 *   change detection — these are the bits that need to match between
 *   server and client for hydration.
 * - The `providedIn: 'root'` singletons (`DismissableLayerStack`,
 *   `BodyScrollLock`, `InertSiblingsStack`, `IdGenerator`) are scoped per
 *   bootstrap, so two simulated SSR requests get isolated state.
 *
 * jsdom is still the underlying DOM, so `document` exists; what we
 * exercise is the gating: every overlay-side-effect path
 * (`injectPortal`, `DismissableLayerStack` constructor, `BodyScrollLock`,
 * `InertSiblingsStack`) is supposed to no-op when `isPlatformServer`
 * resolves true. Regressions that touch the DOM eagerly or share
 * module-level state between requests get caught here.
 *
 * Several fixtures mount in their OPEN / active state so the
 * overlay-open gating is exercised, not just the initial unmounted
 * render: trigger-anchored overlays (`PopoverOpenFixture`,
 * `SelectOpenFixture`, `ComboboxOpenFixture`, `@floating-ui` positioner
 * + `injectPortal`), free-floating overlays (`DialogOpenFixture`,
 * `DrawerOpenFixture`, modal shell + scroll lock + inert siblings), and
 * the disclosure / menu families that gate `isPlatformBrowser`-only
 * viewport / portal side effects (`NavigationMenuOpenFixture`,
 * `MenubarOpenFixture`). Each asserts the open render produces no throw
 * AND leaves `document.body` untouched — `injectPortal`, the shell side
 * effects, and the NavigationMenu viewport re-parenting all run inside
 * `afterNextRender`, which never fires server-side, so the content stays
 * in the view tree and nothing is appended to `<body>`.
 */

@Component({
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure>
      <button forDisclosureTrigger>Toggle</button>
      <section forDisclosureContent>content</section>
    </div>
  `,
})
class DisclosureFixture {}

@Component({
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <div forAccordion>
      <div forAccordionItem value="one">
        <button forAccordionTrigger>One</button>
        <section forAccordionContent>one body</section>
      </div>
    </div>
  `,
})
class AccordionFixture {}

@Component({
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs value="a">
      <div forTabsList>
        <button forTabsTrigger value="a">A</button>
      </div>
      <section forTabsContent value="a">A body</section>
    </div>
  `,
})
class TabsFixture {}

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableRow, ForTableHeaderCell, ForTableCell],
  template: `
    <table forTable aria-label="People">
      <thead>
        <tr forTableHeaderRow>
          <th forTableHeaderCell name="name" sticky>Name</th>
        </tr>
      </thead>
      <tbody>
        <tr forTableRow>
          <td forTableCell name="name">Ada</td>
        </tr>
      </tbody>
    </table>
  `,
})
class TableFixture {}

@Component({
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableSortHeader,
    ForTableColumnResizer,
    ForTableColumnReorder,
    ForTableRowReorder,
    ForDraggable,
  ],
  template: `
    <div forTable mode="grid" aria-label="People" [rowCount]="100" selectionMode="multiple">
      <div forTableHeaderRow forTableColumnReorder orientation="horizontal">
        <div forTableHeaderCell name="name" forTableSortHeader column="name" direction="ascending">
          Name
          <button forTableColumnResizer column="name" aria-label="Resize name"></button>
        </div>
        <div forTableHeaderCell name="role" forDraggable [dragData]="'role'">
          Role
          <button
            forTableColumnResizer
            column="role"
            [width]="120"
            aria-label="Resize role"
          ></button>
        </div>
      </div>
      <div role="rowgroup" forTableRowReorder>
        <div forTableRow [value]="1" forDraggable [dragData]="1">
          <div forTableCell name="name">Ada</div>
          <div forTableCell name="role">Engineer</div>
        </div>
      </div>
    </div>
  `,
})
class TableGridFixture {}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  template: `
    <div forTable mode="treegrid" [expanded]="expanded">
      <div role="rowgroup">
        <div forTableRow [value]="'a'" [level]="1" [expandable]="true">
          <div forTableCell name="name">Parent A</div>
        </div>
        <div forTableRow [value]="'a1'" [level]="2">
          <div forTableCell name="name">Child A1</div>
        </div>
        <div forTableRow [value]="'b'" [level]="1">
          <div forTableCell name="name">Leaf B</div>
        </div>
      </div>
    </div>
  `,
})
class TableTreegridFixture {
  readonly expanded = ['a'];
}

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableRow, ForTableCell],
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      aria-label="Big"
      [rowCount]="1000"
      #v="forTableVirtualized"
    >
      <div role="rowgroup" [style.height.px]="v.totalSize()" style="position: relative">
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div forTableRow [virtualIndex]="vrow.index">
            <div forTableCell name="a">{{ vrow.index }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class TableVirtualizedFixture {}

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForDraggable,
  ],
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      aria-label="Big reorder"
      [rowCount]="1000"
      #v="forTableVirtualized"
    >
      <div
        role="rowgroup"
        forTableRowReorder
        [style.height.px]="v.totalSize()"
        style="position: relative"
      >
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div forTableRow [virtualIndex]="vrow.index" forDraggable [dragData]="vrow.index">
            <div forTableCell name="a">{{ vrow.index }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class TableVirtualizedReorderFixture {}

@Component({
  imports: [
    ForCarousel,
    ForCarouselDrag,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselPrevious,
    ForCarouselNext,
    ForCarouselIndicators,
    ForCarouselIndicator,
    ForCarouselRotationControl,
  ],
  template: `
    <div forCarousel ariaLabel="Examples">
      <button forCarouselRotationControl></button>
      <button forCarouselPrevious aria-label="Previous">&#x2039;</button>
      <div forCarouselViewport forCarouselDrag>
        <div forCarouselTrack>
          <div forCarouselSlide>One</div>
          <div forCarouselSlide>Two</div>
        </div>
      </div>
      <button forCarouselNext aria-label="Next">&#x203a;</button>
      <div forCarouselIndicators ariaLabel="Choose slide">
        <button forCarouselIndicator></button>
        <button forCarouselIndicator></button>
      </div>
    </div>
  `,
})
class CarouselFixture {}

@Component({
  imports: [
    ForCarousel,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselRotationControl,
  ],
  template: `
    <div forCarousel ariaLabel="Examples" autoplay [autoplayInterval]="1000">
      <button forCarouselRotationControl></button>
      <div forCarouselViewport>
        <div forCarouselTrack>
          <div forCarouselSlide>One</div>
          <div forCarouselSlide>Two</div>
        </div>
      </div>
    </div>
  `,
})
class CarouselAutoplayFixture {}

@Component({
  imports: [ForSwitch],
  template: `<button forSwitch>switch</button>`,
})
class SwitchFixture {}

@Component({
  imports: [ForCheckbox],
  template: `<button forCheckbox>cb</button>`,
})
class CheckboxFixture {}

@Component({
  imports: [ForTextarea],
  template: `<textarea forTextarea autosize></textarea>`,
})
class TextareaFixture {}

@Component({
  imports: [ForSearch, ForSearchClear],
  template: `
    <input forSearch #s="forSearch" />
    <button [forSearchClear]="s" aria-label="Clear search">×</button>
  `,
})
class SearchFixture {}

@Component({
  imports: [ForButton],
  template: `
    <button forButton>native</button>
    <div forButton>custom</div>
  `,
})
class ButtonFixture {}

@Component({
  imports: [ForRadioGroup, ForRadio],
  template: `
    <div forRadioGroup>
      <button forRadio value="a">A</button>
    </div>
  `,
})
class RadioFixture {}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <span forTooltip>
      <button forTooltipTrigger>t</button>
      <div forTooltipContent>tip</div>
    </span>
  `,
})
class TooltipFixture {}

@Component({
  imports: [ForDialog, ForDialogTitle],
  template: `
    @if (open()) {
      <div forDialog ariaLabel="d">
        <h2 forDialogTitle>title</h2>
      </div>
    }
  `,
})
class DialogFixture {
  readonly open = signal(false);
}

@Component({
  imports: [ForAvatar, ForAvatarImage, ForAvatarFallback],
  template: `
    <span forAvatar #a="forAvatar">
      <img forAvatarImage src="https://example.test/avatar.png" alt="user" />
      @if (a.shouldShowFallback()) {
        <span forAvatarFallback>AB</span>
      }
    </span>
  `,
})
class AvatarFixture {}

@Component({
  imports: [
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
    ForScrollAreaCorner,
  ],
  template: `
    <div forScrollArea>
      <div forScrollAreaViewport>
        <div forScrollAreaContent>content</div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical">
        <div forScrollAreaThumb></div>
      </div>
      <div forScrollAreaScrollbar orientation="horizontal">
        <div forScrollAreaThumb></div>
      </div>
      <div forScrollAreaCorner></div>
    </div>
  `,
})
class ScrollAreaFixture {}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent, ForPopoverTitle],
  template: `
    <div forPopover [open]="true">
      <button forPopoverTrigger>Open</button>
      <div forPopoverContent>
        <h2 forPopoverTitle>Settings</h2>
        content
      </div>
    </div>
  `,
})
class PopoverOpenFixture {}

@Component({
  imports: [ForDialog, ForDialogTitle],
  template: `
    <div forDialog ariaLabel="d">
      <h2 forDialogTitle>title</h2>
    </div>
  `,
})
class DialogOpenFixture {}

@Component({
  imports: [ForDialog, ForDialogBackdrop, ForDialogTitle],
  template: `
    <div #box style="position: relative">
      <div forDialog [modal]="false" [container]="box" ariaLabel="d">
        <div forDialogBackdrop></div>
        <h2 forDialogTitle>title</h2>
      </div>
    </div>
  `,
})
class DialogContainedFixture {}

@Component({
  imports: [ForDrawer, ForDrawerTitle],
  template: `
    <div forDrawer ariaLabel="d">
      <h2 forDrawerTitle>title</h2>
    </div>
  `,
})
class DrawerOpenFixture {}

@Component({
  imports: [ForDrawer, ForDrawerBackdrop, ForDrawerTitle],
  template: `
    <div #box style="position: relative">
      <div forDrawer [modal]="false" [container]="box" ariaLabel="d">
        <div forDrawerBackdrop></div>
        <h2 forDrawerTitle>title</h2>
      </div>
    </div>
  `,
})
class DrawerContainedFixture {}

@Component({
  standalone: true,
  imports: [ForDrawer, ForDrawerBackdrop, ForDrawerTitle],
  template: `
    <section #box style="position: relative">
      <div forDrawer [modal]="true" [container]="box" ariaLabel="d">
        <div forDrawerBackdrop></div>
        <h2 forDrawerTitle>title</h2>
      </div>
    </section>
  `,
})
class DrawerContainedModalFixture {}

@Component({
  standalone: true,
  imports: [ForDialog, ForDialogBackdrop, ForDialogTitle],
  template: `
    <section #box style="position: relative">
      <div forDialog [modal]="true" [container]="box" ariaLabel="d">
        <div forDialogBackdrop></div>
        <h2 forDialogTitle>title</h2>
      </div>
    </section>
  `,
})
class DialogContainedModalFixture {}

@Component({
  imports: [ForToastViewport, ForToast, ForToastTitle],
  template: `
    <for-toast-viewport>
      <div forToast>
        <div forToastTitle>Saved</div>
      </div>
    </for-toast-viewport>
  `,
})
class ToastFixture {}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectValue, ForSelectContent, ForSelectOption],
  template: `
    <div forSelect [open]="true" [(value)]="value">
      <button forSelectTrigger>
        <span forSelectValue></span>
      </button>
      <div forSelectContent>
        <button forSelectOption value="a">A</button>
      </div>
    </div>
  `,
})
class SelectOpenFixture {
  readonly value = signal<readonly string[]>(['a']);
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  template: `
    <div forSelect [open]="true" [totalCount]="3" [(value)]="value">
      <button forSelectTrigger>T</button>
      <div forSelectContent>
        <button forSelectOption value="a" [posInSet]="0">A</button>
        <button forSelectOption value="b" [posInSet]="1">B</button>
        <button forSelectOption value="c" [posInSet]="2">C</button>
      </div>
    </div>
  `,
})
class SelectVirtualizedOpenFixture {
  readonly value = signal<readonly string[]>([]);
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div forCombobox [open]="true">
      <input forComboboxInput />
      <div forComboboxContent>
        <div forComboboxOption value="a" label="A">A</div>
      </div>
    </div>
  `,
})
class ComboboxOpenFixture {}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
  ],
  template: `
    <nav forNavigationMenu value="products">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button forNavigationMenuTrigger>Products</button>
          <div forNavigationMenuContent>
            <a href="/web" forNavigationMenuLink>Web</a>
          </div>
        </li>
      </ul>
    </nav>
  `,
})
class NavigationMenuOpenFixture {}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forMenubar value="file" ariaLabel="Main">
      <button forMenubarTrigger value="file">File</button>
      <div forMenuContent>
        <button forMenuItem>New</button>
      </div>
    </div>
  `,
})
class MenubarOpenFixture {}

@Component({
  imports: [ForOtpInput, ForOtpInputSlot],
  template: `
    <div forOtpInput [length]="4" #otp="forOtpInput">
      @for (i of otp.slots(); track i) {
        <div forOtpInputSlot [index]="i">{{ i }}</div>
      }
    </div>
  `,
})
class OtpInputFixture {}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle, ForTreeGroup],
  template: `
    <ul forTree ariaLabel="Files">
      <li forTreeItem value="root">
        <div forTreeItemLabel>
          <span forTreeItemToggle>▸</span>
          Root
        </div>
        <ul forTreeGroup>
          <li forTreeItem value="child">
            <div forTreeItemLabel>Child</div>
          </li>
        </ul>
      </li>
    </ul>
  `,
})
class TreeFixture {}

@Component({
  imports: [
    ForTree,
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemCheckbox,
    ForTreeItemCheckboxIndicator,
  ],
  template: `
    <ul forTree selectionMode="checkbox" ariaLabel="Categories">
      <li forTreeItem value="a">
        <div forTreeItemLabel>
          <span forTreeItemCheckbox>
            <span forTreeItemCheckboxIndicator>✓</span>
          </span>
          Alpha
        </div>
      </li>
      <li forTreeItem value="b">
        <div forTreeItemLabel>
          <span forTreeItemCheckbox>
            <span forTreeItemCheckboxIndicator>✓</span>
          </span>
          Beta
        </div>
      </li>
    </ul>
  `,
})
class TreeCheckboxFixture {}

@Component({
  imports: [
    ForTree,
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemCheckbox,
    ForTreeItemCheckboxIndicator,
  ],
  template: `
    <ul forTree selectionMode="checkbox" cascade [descendantsOf]="descendantsFn" ariaLabel="Groups">
      <li forTreeItem value="parent">
        <div forTreeItemLabel>
          <span forTreeItemCheckbox>
            <span forTreeItemCheckboxIndicator>✓</span>
          </span>
          Parent
        </div>
      </li>
      <li forTreeItem value="child">
        <div forTreeItemLabel>
          <span forTreeItemCheckbox>
            <span forTreeItemCheckboxIndicator>✓</span>
          </span>
          Child
        </div>
      </li>
    </ul>
  `,
})
class TreeCascadeFixture {
  readonly descendantsFn = (v: string): readonly string[] => (v === 'parent' ? ['child'] : []);
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  template: `
    <ul forTree ariaLabel="Virtualized" [totalCount]="3">
      <li forTreeItem value="a" [level]="1" [setSize]="3" [posInSet]="1" [itemIndex]="0">
        <div forTreeItemLabel>A</div>
      </li>
      <li forTreeItem value="b" [level]="1" [setSize]="3" [posInSet]="2" [itemIndex]="1">
        <div forTreeItemLabel>B</div>
      </li>
      <li forTreeItem value="c" [level]="1" [setSize]="3" [posInSet]="3" [itemIndex]="2">
        <div forTreeItemLabel>C</div>
      </li>
    </ul>
  `,
})
class TreeVirtualizedFixture {}

@Component({
  imports: [
    ForTree,
    ForTreeNodeDrag,
    ForTreeNodeDragHandle,
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemToggle,
    ForTreeGroup,
  ],
  template: `
    <ul forTree forTreeNodeDrag ariaLabel="Files">
      <li forTreeItem value="root">
        <div forTreeItemLabel>
          <span forTreeNodeDragHandle aria-hidden="true">⠿</span>
          <span forTreeItemToggle>▸</span>
          Root
        </div>
        @if (true) {
          <ul forTreeGroup>
            <li forTreeItem value="child">
              <div forTreeItemLabel>
                <span forTreeNodeDragHandle aria-hidden="true">⠿</span>
                Child
              </div>
            </li>
          </ul>
        }
      </li>
    </ul>
  `,
})
class TreeNodeDragFixture {}

@Component({
  imports: [ForCalendar, ForCalendarHeading, ForCalendarGrid, ForCalendarCell],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value">
      <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CalendarFixture {
  readonly value = new Date(2026, 5, 15);
}

@Component({
  imports: [ForCalendar, ForCalendarGrid, ForCalendarCell, ForCalendarHeading],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value" #cal="forCalendar">
      <select [value]="cal.visibleMonthNumber()">
        @for (m of cal.monthOptions(); track m.value) {
          <option [value]="m.value" [disabled]="m.disabled">{{ m.label }}</option>
        }
      </select>
      <select [value]="cal.visibleYear()">
        @for (y of years; track y) {
          <option [value]="y" [disabled]="cal.isYearDisabled(y)">{{ y }}</option>
        }
      </select>
      <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CalendarDropdownsFixture {
  readonly value = new Date(2026, 5, 15);
  readonly years = [2024, 2025, 2026, 2027, 2028];
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarMonthSelect,
    ForCalendarYearSelect,
    ForCalendarHeading,
    ForCalendarGrid,
    ForCalendarCell,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value">
      <select forCalendarMonthSelect #m="forCalendarMonthSelect">
        @for (opt of m.options(); track opt.value) {
          <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.label }}</option>
        }
      </select>
      <select forCalendarYearSelect #y="forCalendarYearSelect" [minYear]="2020" [maxYear]="2030">
        @for (opt of y.years(); track opt.value) {
          <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.value }}</option>
        }
      </select>
      <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CalendarSelectDirectivesFixture {
  readonly value = new Date(2026, 5, 15);
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarHeading,
    ForCalendarViewTrigger,
    ForCalendarMonthGrid,
    ForCalendarMonthCell,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value" view="month" #cal="forCalendar">
      <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
      <button forCalendarViewTrigger #vt="forCalendarViewTrigger">{{ vt.label() }}</button>
      <table forCalendarMonthGrid #mg="forCalendarMonthGrid">
        <tbody>
          @for (row of mg.rows(); track row.key) {
            <tr>
              @for (m of row.months; track m.value) {
                <td forCalendarMonthCell [month]="m.value">{{ m.label }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CalendarMonthViewFixture {
  readonly value = new Date(2026, 5, 15);
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarHeading,
    ForCalendarViewTrigger,
    ForCalendarYearGrid,
    ForCalendarYearCell,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forCalendar [value]="value" view="year" #cal="forCalendar">
      <h2 forCalendarHeading #heading="forCalendarHeading">{{ heading.label() }}</h2>
      <button forCalendarViewTrigger #vt="forCalendarViewTrigger">{{ vt.label() }}</button>
      <table forCalendarYearGrid #yg="forCalendarYearGrid">
        <tbody>
          @for (row of yg.rows(); track row.key) {
            <tr>
              @for (y of row.years; track y.value) {
                <td forCalendarYearCell [year]="y.value">{{ y.value }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CalendarYearViewFixture {
  readonly value = new Date(2026, 5, 15);
}

@Component({
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDateField [(value)]="value" ariaLabel="Date" #field="forDateField">
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forDateFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forDateFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
        }
      }
    </div>
  `,
})
class DateFieldFixture {
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forTimeField [(value)]="value" ariaLabel="Time" #field="forTimeField">
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forTimeFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forTimeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
        }
      }
    </div>
  `,
})
class TimeFieldFixture {
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerValue],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDatePicker [(value)]="value" ariaLabel="Choose date">
      <button forDatePickerTrigger>
        <span forDatePickerValue placeholder="Pick a date"></span>
      </button>
    </div>
  `,
})
class DatePickerFixture {
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [
    ForTimePicker,
    ForTimePickerTrigger,
    ForTimePickerValue,
    ForTimePickerContent,
    ForTimePickerOption,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forTimePicker [open]="true" [step]="60" #picker="forTimePicker">
      <button forTimePickerTrigger>
        <span forTimePickerValue placeholder="Pick a time"></span>
      </button>
      <div forTimePickerContent>
        @for (slot of picker.slots(); track slot.id) {
          <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">
            {{ slot.label }}
          </div>
        }
      </div>
    </div>
  `,
})
class TimePickerOpenFixture {}

@Component({
  imports: [
    ForDropListGroup,
    ForDropList,
    ForDraggable,
    ForDragHandle,
    ForDragPreview,
    ForDragPlaceholder,
  ],
  template: `
    <div forDropListGroup>
      <ul forDropList>
        <li forDraggable [dragData]="'a'">
          <span forDragHandle aria-hidden="true">::</span>
          Alpha
        </li>
        <li forDraggable [dragData]="'b'">
          Beta
          <ng-template forDragPreview>preview</ng-template>
          <ng-template forDragPlaceholder>gap</ng-template>
        </li>
      </ul>
      <ul forDropList>
        <li forDraggable [dragData]="'c'">Gamma</li>
      </ul>
    </div>
  `,
})
class DragDropFixture {}

@Component({
  imports: [ForFreeDrag, ForDragHandle],
  template: `
    <div class="dialog" style="position: relative">
      <header forFreeDrag rootElement=".dialog" boundary=".dialog">
        <span forDragHandle aria-hidden="true">::</span>
        Drag me
      </header>
    </div>
  `,
})
class FreeDragFixture {}

@Component({
  imports: [
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperIndicator,
    ForStepperSeparator,
    ForStepperContent,
    ForStepperNext,
    ForStepperPrevious,
    ForStepperProgress,
  ],
  template: `
    <div forStepper [selectedIndex]="0">
      <div forStepperProgress ariaLabel="Checkout progress"></div>
      <ol forStepperList ariaLabel="Checkout">
        <li forStepperItem>
          <button forStepperTrigger><span forStepperIndicator></span>One</button>
          <span forStepperSeparator></span>
        </li>
        <li forStepperItem [completed]="true">
          <button forStepperTrigger><span forStepperIndicator></span>Two</button>
        </li>
      </ol>
      <section forStepperContent>One body</section>
      <section forStepperContent>Two body</section>
      <button forStepperPrevious>Back</button>
      <button forStepperNext>Next</button>
    </div>
  `,
})
class StepperFixture {}

@Component({
  imports: [
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperContent,
    ForStepperCompletedContent,
  ],
  template: `
    <div forStepper [selectedIndex]="2">
      <ol forStepperList ariaLabel="Checkout">
        <li forStepperItem><button forStepperTrigger>One</button></li>
        <li forStepperItem><button forStepperTrigger>Two</button></li>
      </ol>
      <section forStepperContent>One body</section>
      <section forStepperContent>Two body</section>
      <section forStepperCompletedContent>All steps complete</section>
    </div>
  `,
})
class StepperCompletedFixture {}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forDropdownMenu [open]="true">
      <button forDropdownMenuTrigger>Options</button>
      <div forMenuContent>
        <button forMenuItem>Cut</button>
      </div>
    </div>
  `,
})
class DropdownMenuOpenFixture {}

@Component({
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forContextMenu [open]="true">
      <div forContextMenuTrigger>Right-click here</div>
      <div forMenuContent>
        <button forMenuItem>Rename</button>
      </div>
    </div>
  `,
})
class ContextMenuOpenFixture {}

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  template: `
    <span forHoverCard [open]="true">
      <a forHoverCardTrigger href="/users/ada">Ada</a>
      <div forHoverCardContent>Preview</div>
    </span>
  `,
})
class HoverCardOpenFixture {}

@Component({
  imports: [ForListbox, ForListboxOption],
  template: `
    <ul forListbox ariaLabel="Fruit">
      <li><button type="button" forListboxOption value="apple">Apple</button></li>
    </ul>
  `,
})
class ListboxFixture {}

@Component({
  imports: [ForListbox, ForListboxOption],
  template: `
    <div forListbox ariaLabel="Virtualized" [totalCount]="3">
      <button type="button" forListboxOption value="a" [posInSet]="0">A</button>
      <button type="button" forListboxOption value="b" [posInSet]="1">B</button>
      <button type="button" forListboxOption value="c" [posInSet]="2">C</button>
    </div>
  `,
})
class ListboxVirtualizedFixture {}

@Component({
  imports: [ForListbox, ForListboxOption, ForListboxReorder],
  template: `
    <ul forListbox forListboxReorder multiple ariaLabel="Tags">
      <li><button type="button" forListboxOption value="a">Alpha</button></li>
      <li><button type="button" forListboxOption value="b">Beta</button></li>
    </ul>
  `,
})
class ListboxReorderFixture {}

@Component({
  imports: [ForSlider, ForSliderTrack, ForSliderRange, ForSliderThumb],
  template: `
    <div forSlider [(value)]="value">
      <span forSliderTrack>
        <span forSliderRange></span>
        <span forSliderThumb [index]="0" label="Volume"></span>
      </span>
    </div>
  `,
})
class SliderFixture {
  readonly value = signal<readonly number[]>([50]);
}

@Component({
  imports: [ForPaneResizer],
  template: `
    <div forPaneResizer orientation="vertical" [(value)]="size" [min]="0" [max]="100"></div>
  `,
})
class PaneResizerFixture {
  readonly size = signal(50);
}

@Component({
  imports: [ForNumberInputGroup, ForNumberInput, ForNumberInputIncrement, ForNumberInputDecrement],
  template: `
    <div forNumberInputGroup>
      <button forNumberInputDecrement ariaLabel="Decrease">-</button>
      <input forNumberInput [(value)]="qty" [min]="0" [max]="10" />
      <button forNumberInputIncrement ariaLabel="Increase">+</button>
    </div>
  `,
})
class NumberInputFixture {
  readonly qty = signal<number | null>(5);
}

@Component({
  imports: [ForToolbar, ForToolbarButton, ForToolbarSeparator, ForToolbarLink],
  template: `
    <div forToolbar ariaLabel="Formatting">
      <button forToolbarButton>Undo</button>
      <span forToolbarSeparator></span>
      <a forToolbarLink href="/help">Help</a>
    </div>
  `,
})
class ToolbarFixture {}

@Component({
  imports: [ForPagination, ForPaginationItem, ForPaginationPrevious, ForPaginationNext],
  template: `
    <nav forPagination [count]="11" ariaLabel="Pagination" #pg="forPagination">
      <button forPaginationPrevious aria-label="Previous">‹</button>
      @for (item of pg.items(); track $index) {
        @if (item.type === 'page') {
          <button forPaginationItem [page]="item.value!">{{ item.value }}</button>
        } @else {
          <span aria-hidden="true">…</span>
        }
      }
      <button forPaginationNext aria-label="Next">›</button>
    </nav>
  `,
})
class PaginationFixture {}

@Component({
  imports: [ForBreadcrumbs, ForBreadcrumbItem, ForBreadcrumbSeparator],
  template: `
    <nav forBreadcrumbs>
      <ol>
        <li><a forBreadcrumbItem href="/">Home</a></li>
        <li forBreadcrumbSeparator>/</li>
        <li><a forBreadcrumbItem href="/library">Library</a></li>
        <li forBreadcrumbSeparator>/</li>
        <li><a forBreadcrumbItem href="/library/data" current>Data</a></li>
      </ol>
    </nav>
  `,
})
class BreadcrumbsFixture {}

@Component({
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div forFileUpload>
      <button forFileUploadTrigger>Choose files</button>
      <input forFileUploadInput aria-label="Upload" />
    </div>
  `,
})
class FileUploadFixture {}

@Component({
  template: `
    <div #scroll style="overflow:auto; height:200px">
      <div [style.height.px]="v.totalSize()" style="position:relative">
        @for (item of v.virtualItems(); track item.key) {
          <div
            [attr.data-index]="item.index"
            [attr.aria-setsize]="count()"
            [attr.aria-posinset]="item.index + 1"
            [style.height.px]="item.size"
          >
            Row {{ item.index }}
          </div>
        }
      </div>
    </div>
  `,
})
class VirtualizerFixture {
  readonly count = signal(1000);
  readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
  readonly v = injectVirtualizer({
    count: this.count,
    estimateSize: () => 40,
    scrollElement: this.scrollElement,
  });
}

@Component({
  imports: [ForVirtualViewport, ForVirtualFor],
  template: `
    <div
      forVirtualViewport
      [virtualCount]="rows().length"
      [estimateSize]="40"
      style="height: 200px"
    >
      <div *forVirtualFor="let row of rows()">{{ row }}</div>
    </div>
  `,
})
class VirtualViewportFixture {
  readonly rows = signal(Array.from({ length: 1000 }, (_, i) => `Row ${i}`));
}

@Component({
  imports: [ForVisuallyHidden],
  template: `
    <span forVisuallyHidden>Loading complete</span>
    <a href="#main" forVisuallyHidden focusable>Skip to content</a>
  `,
})
class VisuallyHiddenFixture {}

@Component({
  template: `
    <p>{{ active() ?? 'base' }}</p>
    @if (wide()) {
      <span>wide</span>
    }
  `,
})
class BreakpointsFixture {
  private readonly bp = injectBreakpoints();
  readonly active = this.bp.active;
  readonly wide = this.bp.up('lg');
}

const FIXTURES: ReadonlyArray<Type<unknown>> = [
  DisclosureFixture,
  AccordionFixture,
  TabsFixture,
  TableFixture,
  TableGridFixture,
  TableTreegridFixture,
  TableVirtualizedFixture,
  TableVirtualizedReorderFixture,
  StepperFixture,
  StepperCompletedFixture,
  CarouselFixture,
  CarouselAutoplayFixture,
  SwitchFixture,
  CheckboxFixture,
  TextareaFixture,
  SearchFixture,
  ButtonFixture,
  RadioFixture,
  TooltipFixture,
  DialogFixture,
  AvatarFixture,
  ScrollAreaFixture,
  PopoverOpenFixture,
  DialogOpenFixture,
  DialogContainedFixture,
  DialogContainedModalFixture,
  DrawerOpenFixture,
  DrawerContainedFixture,
  DrawerContainedModalFixture,
  ToastFixture,
  SelectOpenFixture,
  SelectVirtualizedOpenFixture,
  ComboboxOpenFixture,
  NavigationMenuOpenFixture,
  MenubarOpenFixture,
  OtpInputFixture,
  TreeFixture,
  TreeCheckboxFixture,
  TreeCascadeFixture,
  TreeVirtualizedFixture,
  TreeNodeDragFixture,
  CalendarFixture,
  CalendarDropdownsFixture,
  CalendarSelectDirectivesFixture,
  CalendarMonthViewFixture,
  CalendarYearViewFixture,
  DateFieldFixture,
  TimeFieldFixture,
  DatePickerFixture,
  TimePickerOpenFixture,
  DragDropFixture,
  FreeDragFixture,
  DropdownMenuOpenFixture,
  ContextMenuOpenFixture,
  HoverCardOpenFixture,
  ListboxFixture,
  ListboxVirtualizedFixture,
  ListboxReorderFixture,
  SliderFixture,
  PaneResizerFixture,
  NumberInputFixture,
  ToolbarFixture,
  PaginationFixture,
  BreadcrumbsFixture,
  FileUploadFixture,
  VirtualizerFixture,
  VirtualViewportFixture,
  BreakpointsFixture,
  VisuallyHiddenFixture,
];

function configureServer(): void {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: PLATFORM_ID, useValue: ɵPLATFORM_SERVER_ID },
    ],
  });
}

describe('SSR smoke tests', () => {
  beforeEach(() => {
    configureServer();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('reports the server platform', () => {
    expect(isPlatformServer(TestBed.inject(PLATFORM_ID))).toBe(true);
  });

  for (const fixture of FIXTURES) {
    it(`renders ${fixture.name} without throwing on the server`, () => {
      expect(() => {
        const f = TestBed.createComponent(fixture);
        f.detectChanges();
      }).not.toThrow();
    });
  }

  it('Disclosure renders ARIA wiring (id, aria-controls, aria-expanded) server-side', () => {
    const f = TestBed.createComponent(DisclosureFixture);
    f.detectChanges();
    const trigger = f.nativeElement.querySelector('[forDisclosureTrigger]') as HTMLElement;
    const content = f.nativeElement.querySelector('[forDisclosureContent]') as HTMLElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // Closed → aria-controls is gated off (open-only), so it must be absent on
    // the server too; the stable content id is what hydration matches on.
    expect(content.getAttribute('id')).toBeTruthy();
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
  });

  it('AvatarImage mounts with data-status server-side without constructing a MutationObserver', () => {
    const f = TestBed.createComponent(AvatarFixture);
    f.detectChanges();
    const img = f.nativeElement.querySelector('[forAvatarImage]') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.hasAttribute('data-status')).toBe(true);
  });

  it('IdGenerator is salted with APP_ID — identical render orders produce identical ids across requests', () => {
    const a = TestBed.inject(IdGenerator).next();
    TestBed.resetTestingModule();
    configureServer();
    const b = TestBed.inject(IdGenerator).next();
    // Both bootstraps share APP_ID's default value, so the salted
    // counters reset to 1 in both — that's the property hydration
    // relies on (server and client renders of the same app produce the
    // same ids in the same order).
    expect(a).toBe(b);
  });

  it('overlay singletons are isolated across simulated SSR requests', () => {
    const stack1 = TestBed.inject(DismissableLayerStack);
    const lock1 = TestBed.inject(BodyScrollLock);
    const inert1 = TestBed.inject(InertSiblingsStack);

    TestBed.resetTestingModule();
    configureServer();

    const stack2 = TestBed.inject(DismissableLayerStack);
    const lock2 = TestBed.inject(BodyScrollLock);
    const inert2 = TestBed.inject(InertSiblingsStack);

    expect(stack2).not.toBe(stack1);
    expect(lock2).not.toBe(lock1);
    expect(inert2).not.toBe(inert1);
  });

  it('opening a trigger-anchored overlay (Popover) does not portal or mutate <body> server-side', () => {
    const f = TestBed.createComponent(PopoverOpenFixture);
    f.detectChanges();
    const content = f.nativeElement.querySelector('[forPopoverContent]') as HTMLElement;
    expect(content.getAttribute('role')).toBe('dialog');
    expect(f.nativeElement.contains(content)).toBe(true);
    expect(content.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forPopoverContent]')).toBeNull();
  });

  it('opening a free-floating overlay (Dialog) does not portal or mutate <body> server-side', () => {
    const overflowBefore = document.body.style.overflow;
    const f = TestBed.createComponent(DialogOpenFixture);
    f.detectChanges();
    const dialog = f.nativeElement.querySelector('[forDialog]') as HTMLElement;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(f.nativeElement.contains(dialog)).toBe(true);
    expect(dialog.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forDialog]')).toBeNull();
    expect(document.body.style.overflow).toBe(overflowBefore);
  });

  it('opening a free-floating overlay (Drawer) does not portal or mutate <body> server-side', () => {
    const overflowBefore = document.body.style.overflow;
    const f = TestBed.createComponent(DrawerOpenFixture);
    f.detectChanges();
    const drawer = f.nativeElement.querySelector('[forDrawer]') as HTMLElement;
    expect(drawer.getAttribute('role')).toBe('dialog');
    expect(f.nativeElement.contains(drawer)).toBe(true);
    expect(drawer.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forDrawer]')).toBeNull();
    expect(document.body.style.overflow).toBe(overflowBefore);
  });

  it('opening a contained (scoped) Drawer does not portal or mutate <body> server-side', () => {
    const overflowBefore = document.body.style.overflow;
    const f = TestBed.createComponent(DrawerContainedFixture);
    f.detectChanges();
    const drawer = f.nativeElement.querySelector('[forDrawer]') as HTMLElement;
    expect(drawer.getAttribute('role')).toBe('dialog');
    expect(f.nativeElement.contains(drawer)).toBe(true);
    expect(drawer.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forDrawer]')).toBeNull();
    expect(document.body.style.overflow).toBe(overflowBefore);
  });

  it('opening a contained (scoped) Dialog does not portal or mutate <body> server-side', () => {
    const overflowBefore = document.body.style.overflow;
    const f = TestBed.createComponent(DialogContainedFixture);
    f.detectChanges();
    const dialog = f.nativeElement.querySelector('[forDialog]') as HTMLElement;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(f.nativeElement.contains(dialog)).toBe(true);
    expect(dialog.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forDialog]')).toBeNull();
    expect(document.body.style.overflow).toBe(overflowBefore);
  });

  it('opening a contained modal Drawer does not portal or mutate <body> server-side', () => {
    const overflowBefore = document.body.style.overflow;
    const f = TestBed.createComponent(DrawerContainedModalFixture);
    f.detectChanges();
    const drawer = f.nativeElement.querySelector('[forDrawer]') as HTMLElement;
    expect(drawer.getAttribute('role')).toBe('dialog');
    expect(f.nativeElement.contains(drawer)).toBe(true);
    const section = f.nativeElement.querySelector('section') as HTMLElement;
    expect(section.contains(drawer)).toBe(true);
    expect(document.body.querySelector(':scope > [forDrawer]')).toBeNull();
    expect(document.body.style.overflow).toBe(overflowBefore);
  });

  it('opening a contained modal Dialog does not portal or mutate <body> server-side', () => {
    const overflowBefore = document.body.style.overflow;
    const f = TestBed.createComponent(DialogContainedModalFixture);
    f.detectChanges();
    const dialog = f.nativeElement.querySelector('[forDialog]') as HTMLElement;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(f.nativeElement.contains(dialog)).toBe(true);
    const section = f.nativeElement.querySelector('section') as HTMLElement;
    expect(section.contains(dialog)).toBe(true);
    expect(document.body.querySelector(':scope > [forDialog]')).toBeNull();
    expect(document.body.style.overflow).toBe(overflowBefore);
  });

  it('opening a trigger-anchored overlay (Select) does not portal or mutate <body> server-side', () => {
    const f = TestBed.createComponent(SelectOpenFixture);
    f.detectChanges();
    const content = f.nativeElement.querySelector('[forSelectContent]') as HTMLElement;
    expect(content.getAttribute('role')).toBe('listbox');
    expect(f.nativeElement.contains(content)).toBe(true);
    expect(content.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forSelectContent]')).toBeNull();
  });

  it('opening a virtualized Select does not portal or mutate <body> server-side', () => {
    const f = TestBed.createComponent(SelectVirtualizedOpenFixture);
    f.detectChanges();
    const content = f.nativeElement.querySelector('[forSelectContent]') as HTMLElement;
    expect(content.getAttribute('role')).toBe('listbox');
    expect(f.nativeElement.contains(content)).toBe(true);
    expect(document.body.querySelector(':scope > [forSelectContent]')).toBeNull();
  });

  it('opening a trigger-anchored overlay (Combobox) does not portal or mutate <body> server-side', () => {
    const f = TestBed.createComponent(ComboboxOpenFixture);
    f.detectChanges();
    const content = f.nativeElement.querySelector('[forComboboxContent]') as HTMLElement;
    expect(content.getAttribute('role')).toBe('listbox');
    expect(f.nativeElement.contains(content)).toBe(true);
    expect(content.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forComboboxContent]')).toBeNull();
  });

  it('an open NavigationMenu does not re-parent into a viewport or mutate <body> server-side', () => {
    const f = TestBed.createComponent(NavigationMenuOpenFixture);
    f.detectChanges();
    const content = f.nativeElement.querySelector('[forNavigationMenuContent]') as HTMLElement;
    expect(f.nativeElement.contains(content)).toBe(true);
    expect(content.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forNavigationMenuContent]')).toBeNull();
  });

  it('an open Menubar menu does not portal or mutate <body> server-side', () => {
    const f = TestBed.createComponent(MenubarOpenFixture);
    f.detectChanges();
    const content = f.nativeElement.querySelector('[forMenuContent]') as HTMLElement;
    expect(content.getAttribute('role')).toBe('menu');
    expect(f.nativeElement.contains(content)).toBe(true);
    expect(content.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forMenuContent]')).toBeNull();
  });

  it('Carousel renders aria-roledescription on root and each slide server-side', () => {
    const f = TestBed.createComponent(CarouselFixture);
    f.detectChanges();
    const carouselRoot = f.nativeElement.querySelector('[forCarousel]') as HTMLElement;
    expect(carouselRoot.getAttribute('aria-roledescription')).toBe('carousel');
    const slides = f.nativeElement.querySelectorAll(
      '[forCarouselSlide]',
    ) as NodeListOf<HTMLElement>;
    expect(slides.length).toBe(2);
    slides.forEach((s) => {
      expect(s.getAttribute('aria-roledescription')).toBe('slide');
    });
  });

  it('opening a trigger-anchored overlay (TimePicker) does not portal or mutate <body> server-side', () => {
    const f = TestBed.createComponent(TimePickerOpenFixture);
    f.detectChanges();
    const content = f.nativeElement.querySelector('[forTimePickerContent]') as HTMLElement;
    expect(content.getAttribute('role')).toBe('listbox');
    expect(f.nativeElement.contains(content)).toBe(true);
    expect(content.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forTimePickerContent]')).toBeNull();
  });

  it('BodyScrollLock is a no-op on the server', () => {
    const lock = TestBed.inject(BodyScrollLock);
    document.body.style.overflow = 'auto';
    lock.lock();
    // Server gating prevents any mutation to <body>.
    expect(document.body.style.overflow).toBe('auto');
    lock.unlock();
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });

  it('opening DropdownMenu does not portal or mutate <body> server-side', () => {
    const f = TestBed.createComponent(DropdownMenuOpenFixture);
    f.detectChanges();
    const content = f.nativeElement.querySelector('[forMenuContent]') as HTMLElement;
    expect(f.nativeElement.contains(content)).toBe(true);
    expect(content.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forMenuContent]')).toBeNull();
  });

  it('opening ContextMenu does not portal or mutate <body> server-side', () => {
    const f = TestBed.createComponent(ContextMenuOpenFixture);
    f.detectChanges();
    const content = f.nativeElement.querySelector('[forMenuContent]') as HTMLElement;
    expect(f.nativeElement.contains(content)).toBe(true);
    expect(content.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forMenuContent]')).toBeNull();
  });

  it('opening HoverCard does not portal or mutate <body> server-side', () => {
    const f = TestBed.createComponent(HoverCardOpenFixture);
    f.detectChanges();
    const content = f.nativeElement.querySelector('[forHoverCardContent]') as HTMLElement;
    expect(f.nativeElement.contains(content)).toBe(true);
    expect(content.parentElement).not.toBe(document.body);
    expect(document.body.querySelector(':scope > [forHoverCardContent]')).toBeNull();
  });

  it('Virtualizer renders an empty window with the estimate total server-side', () => {
    const f = TestBed.createComponent(VirtualizerFixture);
    f.detectChanges();
    const spacer = f.nativeElement.querySelector('[style*="position: relative"]') as HTMLElement;
    expect(f.nativeElement.querySelectorAll('[data-index]').length).toBe(0);
    expect(spacer.style.height).toBe('40000px');
  });

  it('VirtualViewport renders the sizer with the estimate total and no rows server-side', () => {
    const f = TestBed.createComponent(VirtualViewportFixture);
    f.detectChanges();
    const host = f.nativeElement.querySelector('[forVirtualViewport]') as HTMLElement;
    const sizer = host.firstElementChild as HTMLElement;
    expect(f.nativeElement.querySelectorAll('[data-index]').length).toBe(0);
    expect(sizer.style.height).toBe('40000px');
  });

  it('Table treegrid mode renders role=treegrid + hierarchy ARIA server-side', () => {
    const f = TestBed.createComponent(TableTreegridFixture);
    f.detectChanges();
    const root = f.nativeElement.querySelector('[forTable]') as HTMLElement;
    expect(root.getAttribute('role')).toBe('treegrid');
    const rows = Array.from(f.nativeElement.querySelectorAll('[forTableRow]')) as HTMLElement[];
    const parentRow = rows[0];
    const childRow = rows[1];
    const leafRow = rows[2];
    expect(parentRow.getAttribute('aria-expanded')).toBe('true');
    expect(parentRow.getAttribute('data-state')).toBe('open');
    expect(parentRow.getAttribute('aria-level')).toBe('1');
    expect(parentRow.getAttribute('aria-posinset')).toBe('1');
    expect(parentRow.getAttribute('aria-setsize')).toBe('2');
    expect(childRow.getAttribute('aria-level')).toBe('2');
    expect(childRow.getAttribute('aria-posinset')).toBe('1');
    expect(childRow.getAttribute('aria-setsize')).toBe('1');
    expect(leafRow.getAttribute('aria-level')).toBe('1');
    expect(leafRow.getAttribute('aria-posinset')).toBe('2');
    expect(leafRow.getAttribute('aria-setsize')).toBe('2');
    expect(leafRow.hasAttribute('aria-expanded')).toBe(false);
    expect(leafRow.hasAttribute('data-state')).toBe(false);
  });

  it('Table grid mode renders role=grid + aria indices server-side', () => {
    const f = TestBed.createComponent(TableGridFixture);
    f.detectChanges();
    const root = f.nativeElement.querySelector('[forTable]') as HTMLElement;
    expect(root.getAttribute('role')).toBe('grid');
    expect(root.getAttribute('aria-rowcount')).toBe('100');
    expect(root.getAttribute('aria-colcount')).toBe('2');
    expect(root.getAttribute('aria-multiselectable')).toBe('true');
    const row = f.nativeElement.querySelector('[forTableRow]') as HTMLElement;
    expect(row.getAttribute('aria-rowindex')).toBe('1');
    expect(row.getAttribute('aria-selected')).toBe('false');
    const cell = f.nativeElement.querySelector('[forTableCell]') as HTMLElement;
    expect(cell.getAttribute('aria-colindex')).toBe('1');
    expect(cell.getAttribute('role')).toBe('gridcell');
    const headerName = f.nativeElement.querySelector('[forTableHeaderCell]') as HTMLElement;
    expect(headerName.getAttribute('aria-sort')).toBe('ascending');
    expect(headerName.getAttribute('tabindex')).toBe('0');
    const resizer = f.nativeElement.querySelector(
      '[forTableColumnResizer][column="role"]',
    ) as HTMLElement;
    expect(resizer.getAttribute('role')).toBe('separator');
    expect(resizer.getAttribute('aria-orientation')).toBe('vertical');
    expect(resizer.getAttribute('tabindex')).toBe('0');
    expect(resizer.getAttribute('aria-valuenow')).toBe('120');
    const unseededResizer = f.nativeElement.querySelector(
      '[forTableColumnResizer][column="name"]',
    ) as HTMLElement;
    expect(unseededResizer.hasAttribute('aria-valuenow')).toBe(false);
    const headerRow = f.nativeElement.querySelector('[forTableHeaderRow]') as HTMLElement;
    expect(headerRow.getAttribute('data-orientation')).toBe('horizontal');
    const draggableHeaderCell = f.nativeElement.querySelector(
      '[forTableHeaderCell][forDraggable]',
    ) as HTMLElement;
    expect(draggableHeaderCell.hasAttribute('tabindex')).toBe(true);
    const rowgroup = f.nativeElement.querySelector('[forTableRowReorder]') as HTMLElement;
    expect(rowgroup.getAttribute('data-orientation')).toBe('vertical');
    expect(document.body.querySelector('[data-drag-preview]')).toBeNull();
  });

  it('virtualized Table renders an empty window with the estimate total + true aria-rowcount server-side', () => {
    const f = TestBed.createComponent(TableVirtualizedFixture);
    f.detectChanges();
    const root = f.nativeElement.querySelector('[forTable]') as HTMLElement;
    expect(root.getAttribute('role')).toBe('grid');
    expect(root.getAttribute('aria-rowcount')).toBe('1000');
    expect(f.nativeElement.querySelectorAll('[forTableRow]').length).toBe(0);
    const body = f.nativeElement.querySelector('[role="rowgroup"]') as HTMLElement;
    expect(body.style.height).toBe('44000px');
  });

  it('Pagination renders role="navigation" + aria-label + exactly one aria-current="page" server-side', () => {
    const f = TestBed.createComponent(PaginationFixture);
    f.detectChanges();
    const root = f.nativeElement.querySelector('[forPagination]') as HTMLElement;
    expect(root.getAttribute('role')).toBe('navigation');
    expect(root.getAttribute('aria-label')).toBe('Pagination');
    const currentButtons = Array.from(
      f.nativeElement.querySelectorAll('[aria-current="page"]'),
    ) as HTMLElement[];
    expect(currentButtons.length).toBe(1);
  });

  it('FileUpload renders the native input with type="file" and the trigger with type="button" server-side', () => {
    const f = TestBed.createComponent(FileUploadFixture);
    f.detectChanges();
    const input = f.nativeElement.querySelector('input[forFileUploadInput]') as HTMLInputElement;
    expect(input.getAttribute('type')).toBe('file');
    const trigger = f.nativeElement.querySelector('[forFileUploadTrigger]') as HTMLButtonElement;
    expect(trigger.getAttribute('type')).toBe('button');
  });

  it('Breadcrumbs renders role="navigation" + default label + one aria-current="page" link server-side', () => {
    const f = TestBed.createComponent(BreadcrumbsFixture);
    f.detectChanges();
    const nav = f.nativeElement.querySelector('[forBreadcrumbs]') as HTMLElement;
    expect(nav.getAttribute('role')).toBe('navigation');
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    const current = Array.from(
      f.nativeElement.querySelectorAll('[forBreadcrumbItem][aria-current="page"]'),
    ) as HTMLElement[];
    expect(current.length).toBe(1);
    const separators = f.nativeElement.querySelectorAll(
      '[forBreadcrumbSeparator]',
    ) as NodeListOf<HTMLElement>;
    separators.forEach((sep) => expect(sep.getAttribute('aria-hidden')).toBe('true'));
  });

  it('VisuallyHidden clips its host inline server-side (hydration-stable markup)', () => {
    const f = TestBed.createComponent(VisuallyHiddenFixture);
    f.detectChanges();
    const hosts = Array.from(
      f.nativeElement.querySelectorAll('[forVisuallyHidden]'),
    ) as HTMLElement[];
    expect(hosts.length).toBe(2);
    hosts.forEach((host) => {
      expect(host.style.position).toBe('absolute');
      expect(host.style.width).toBe('1px');
      expect(host.hasAttribute('hidden')).toBe(false);
    });
  });

  it('Button renders role/tabindex on a non-button host and type on a native button server-side', () => {
    const f = TestBed.createComponent(ButtonFixture);
    f.detectChanges();
    const native = f.nativeElement.querySelector('button[forButton]') as HTMLElement;
    const custom = f.nativeElement.querySelector('div[forButton]') as HTMLElement;
    expect(native.getAttribute('type')).toBe('button');
    expect(custom.getAttribute('role')).toBe('button');
    expect(custom.getAttribute('tabindex')).toBe('0');
  });

  it('Search renders role="searchbox" + a hidden clear button server-side', () => {
    const f = TestBed.createComponent(SearchFixture);
    f.detectChanges();
    const input = f.nativeElement.querySelector('input[role="searchbox"]') as HTMLInputElement;
    expect(input.getAttribute('role')).toBe('searchbox');
    const clear = f.nativeElement.querySelector(
      'button[aria-label="Clear search"]',
    ) as HTMLButtonElement;
    expect(clear.hasAttribute('hidden')).toBe(true);
  });
});
