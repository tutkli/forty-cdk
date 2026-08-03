import { type Type } from '@angular/core';

import {
  AccordionFixture,
  AccordionRtlFixture,
  DisclosureFixture,
  StepperCompletedFixture,
  StepperFixture,
  StepperServerFixture,
  TabsFixture,
  TabsServerFixture,
  TabsServerRepeatFixture,
} from './disclosure';
import {
  ComboboxOpenFixture,
  ListboxFixture,
  ListboxReorderFixture,
  ListboxVirtualizedFixture,
  SelectOpenFixture,
  SelectVirtualizedOpenFixture,
  TreeCascadeFixture,
  TreeCheckboxFixture,
  TreeFixture,
  TreeNodeDragFixture,
  TreeVirtualizedFixture,
} from './collection';
import {
  CalendarDropdownsFixture,
  CalendarFixture,
  CalendarMonthViewFixture,
  CalendarSelectDirectivesFixture,
  CalendarYearViewFixture,
  DateFieldFixture,
  DatePickerFixture,
  DateRangeFieldFixture,
  DateRangePickerOpenFixture,
  TimeFieldFixture,
  TimePickerOpenFixture,
  TimeRangeFieldFixture,
} from './datetime';
import {
  AspectRatioFixture,
  AvatarFixture,
  BreadcrumbsFixture,
  BreakpointsFixture,
  MeterFixture,
  PaginationFixture,
  PaneResizerFixture,
  ProgressFixture,
  ScrollAreaFixture,
  SeparatorFixture,
  ToolbarFixture,
  VisuallyHiddenFixture,
} from './display';
import {
  ButtonFixture,
  CheckboxFixture,
  FieldFixture,
  FieldsetFixture,
  FileUploadFixture,
  NumberInputFixture,
  OtpInputFixture,
  RadioFixture,
  SearchFixture,
  SliderFixture,
  SwitchFixture,
  TextareaFixture,
  ToggleFixture,
  ToggleGroupFixture,
} from './form';
import {
  ContextMenuOpenFixture,
  DropdownMenuOpenFixture,
  MenuMultiOpenerOpenFixture,
  MenuSubOpenFixture,
  MenubarOpenFixture,
  NavigationMenuOpenFixture,
  NavigationMenuViewportOpenFixture,
} from './menu';
import {
  CarouselAutoplayFixture,
  CarouselFixture,
  DragDropFixture,
  FreeDragFixture,
  VirtualReorderFixture,
  VirtualViewportFixture,
  VirtualizerFixture,
} from './motion';
import {
  DialogContainedFixture,
  DialogContainedModalFixture,
  DialogFixture,
  DialogOpenFixture,
  DrawerContainedFixture,
  DrawerContainedModalFixture,
  DrawerOpenFixture,
  HoverCardOpenFixture,
  PopoverOpenFixture,
  ToastFixture,
  TooltipFixture,
  TooltipOpenFixture,
} from './overlay';
import {
  TableBodyFixture,
  TableBodyPlaceholderVariantFixture,
  TableBodyReorderFixture,
  TableBodyRowInteractionFixture,
  TableBodyRowVariantFixture,
  TableBodyVirtualizedFixture,
  TableFixture,
  TableGridFixture,
  TableTreegridFixture,
  TableVirtualizedFixture,
  TableVirtualizedReorderFixture,
  TableVirtualizedUnknownTotalFixture,
} from './table';

/**
 * One element's expected server markup. Every field is asserted against the
 * first element matching {@link SsrMarkup.select} inside the fixture host, so a
 * surface that never renders server-side fails before any attribute is read.
 */
export interface SsrMarkup {
  /** CSS selector for the element under test, resolved inside the fixture host. */
  readonly select: string;
  /** Attributes that must carry exactly this value — `null` asserts absence. */
  readonly attributes?: Readonly<Record<string, string | null>>;
  /**
   * Attributes that must carry a non-empty value, whatever it is — a generated
   * `id`, a `data-status` token. A **boolean** `data-*` / `hidden` attribute is
   * emitted with an empty value by convention, so it is falsy here and belongs
   * in {@link SsrMarkup.attributes} as `''` instead.
   */
  readonly present?: readonly string[];
  /**
   * Attribute → selector of the element whose `id` it must equal. This is the
   * pairing hydration re-resolves on the client (trigger↔surface
   * `aria-controls`, label↔control `aria-labelledby`), and the only assertion
   * that fails when a primitive drops a reference server-side.
   */
  readonly pairs?: Readonly<Record<string, string>>;
  /** Selector of an element the selected one must stay a descendant of. */
  readonly within?: string;
}

/** A fixture registered with the SSR smoke suite. */
export interface SsrFixture {
  /** The fixture component the sweeps mount. */
  readonly component: Type<unknown>;
  /**
   * `true` when the fixture mounts in its open / active state, so the
   * browser-only side effects (portal, scroll lock, inert siblings, dismissible
   * layer, focus trap, floating positioner, autoplay interval) would run if
   * their `isPlatformBrowser` gate were missing. The listener / timer /
   * position / `<body>` sweeps iterate these.
   */
  readonly open?: boolean;
  /**
   * Why the fixture emits no `role` / `aria-*` / `data-state` wiring server-side
   * — a primitive whose whole output is inline style, one whose semantics are
   * native to its tag, or a fixture mounted closed. The absence is asserted, not
   * skipped: a primitive that should wire ARIA cannot be quietly parked here,
   * and one that shouldn't cannot start. It composes with {@link
   * SsrFixture.markup}, which is how a primitive with no ARIA of its own still
   * pins what it does emit.
   */
  readonly noWiring?: string;
  /** Per-element markup the server render must emit. */
  readonly markup?: readonly SsrMarkup[];
}

/**
 * The suite's registry. Adding a primitive means adding its fixture component
 * and one entry here; the sweeps in `ssr.spec.ts` pick it up from this list.
 *
 * `markup` is where a primitive's server-side ARIA pairing is pinned, and it is
 * the reason the sweep can fail: without it an entry only proves the render did
 * not throw and emitted *some* wiring.
 */
export const SSR_FIXTURES: readonly SsrFixture[] = [
  {
    component: DisclosureFixture,
    markup: [
      {
        select: '[forDisclosureTrigger]',
        attributes: { 'aria-expanded': 'false', 'aria-controls': null },
      },
      { select: '[forDisclosureContent]', present: ['id'] },
    ],
  },
  {
    component: AccordionFixture,
    markup: [
      {
        select: '[forAccordionTrigger]',
        attributes: { 'aria-expanded': 'false', 'aria-controls': null },
        present: ['id'],
      },
      { select: '[forAccordionContent]', present: ['id'] },
    ],
  },
  {
    component: AccordionRtlFixture,
    markup: [{ select: '[forAccordion]', attributes: { dir: 'rtl' } }],
  },
  {
    component: TabsFixture,
    markup: [
      {
        select: '[forTabsTrigger]',
        attributes: { role: 'tab', 'aria-selected': 'true' },
        pairs: { 'aria-controls': '[forTabsContent]' },
      },
      { select: '[forTabsContent]', pairs: { 'aria-labelledby': '[forTabsTrigger]' } },
    ],
  },
  {
    component: TabsServerFixture,
    markup: [{ select: '[forTabsTrigger]', attributes: { role: 'tab', 'aria-selected': 'true' } }],
  },
  { component: TabsServerRepeatFixture },
  {
    component: TableFixture,
    markup: [
      {
        select: '[forTable]',
        attributes: {
          role: 'table',
          'data-mode': 'table',
          'aria-label': 'People',
          'aria-rowcount': null,
          'aria-colcount': null,
        },
      },
      { select: '[forTableHeaderRow]', attributes: { role: 'row', 'aria-rowindex': null } },
      {
        select: '[forTableHeaderCell]',
        attributes: {
          role: 'columnheader',
          'data-column': 'name',
          'data-sticky': '',
          'aria-colindex': null,
        },
      },
      { select: '[forTableRow]', attributes: { role: 'row', 'aria-rowindex': null } },
      {
        select: '[forTableCell]',
        attributes: { role: 'cell', 'data-column': 'name', 'aria-colindex': null },
      },
    ],
  },
  {
    component: TableGridFixture,
    markup: [
      {
        select: '[forTable]',
        attributes: {
          role: 'grid',
          'data-mode': 'grid',
          'aria-rowcount': '101',
          'aria-colcount': '2',
          'aria-multiselectable': 'true',
        },
      },
      {
        select: '[forTableHeaderRow]',
        attributes: { role: 'row', 'aria-rowindex': '1', 'data-orientation': 'horizontal' },
      },
      {
        select: '[forTableHeaderCell]',
        attributes: { role: 'columnheader', 'aria-sort': 'ascending', tabindex: '0' },
      },
      { select: '[forTableHeaderCell][forDraggable]', present: ['tabindex'] },
      {
        select: '[forTableRow]',
        attributes: { role: 'row', 'aria-rowindex': '2', 'aria-selected': 'false' },
      },
      {
        select: '[forTableCell]',
        attributes: { role: 'gridcell', 'data-column': 'name', 'aria-colindex': '1' },
      },
      { select: '[forTableRowReorder]', attributes: { 'data-orientation': 'vertical' } },
    ],
  },
  {
    component: TableBodyFixture,
    markup: [
      {
        select: '[forTable]',
        attributes: {
          role: 'grid',
          'data-mode': 'grid',
          'aria-rowcount': '3',
          'aria-colcount': '2',
        },
      },
      { select: '[forTableHeaderRow]', attributes: { role: 'row', 'aria-rowindex': '1' } },
      {
        select: '[forTableHeaderCell]',
        attributes: { role: 'columnheader', 'data-column': 'name', 'aria-colindex': '1' },
      },
      { select: '[forTableRow]', attributes: { role: 'row', 'aria-rowindex': '2' } },
      {
        select: '[forTableCell]',
        attributes: { role: 'gridcell', 'data-column': 'name', 'aria-colindex': '1' },
      },
    ],
  },
  {
    component: TableBodyRowVariantFixture,
    markup: [
      {
        select: '[data-row-variant]',
        attributes: { role: 'gridcell', 'aria-colindex': '1', 'aria-colspan': '2' },
      },
    ],
  },
  { component: TableBodyPlaceholderVariantFixture },
  {
    component: TableBodyRowInteractionFixture,
    markup: [{ select: '[forTableRow]', attributes: { tabindex: '0', 'data-open': '' } }],
  },
  {
    component: TableBodyReorderFixture,
    markup: [{ select: '[forTableHeaderRow]', attributes: { forTableColumnReorder: '' } }],
  },
  {
    component: TableTreegridFixture,
    markup: [
      { select: '[forTable]', attributes: { role: 'treegrid', 'data-mode': 'treegrid' } },
      {
        select: '[forTableRow]',
        attributes: {
          'aria-expanded': 'true',
          'data-state': 'open',
          'aria-level': '1',
          'aria-posinset': '1',
          'aria-setsize': '2',
        },
      },
    ],
  },
  {
    component: TableVirtualizedFixture,
    markup: [
      {
        select: '[forTable]',
        attributes: {
          role: 'grid',
          'data-mode': 'grid',
          'aria-rowcount': '1000',
          'aria-colcount': '-1',
        },
      },
    ],
  },
  {
    component: TableVirtualizedUnknownTotalFixture,
    markup: [
      {
        select: '[forTable]',
        attributes: {
          role: 'grid',
          'data-mode': 'grid',
          'aria-rowcount': '-1',
          'aria-colcount': '1',
        },
      },
      { select: '[forTableHeaderRow]', attributes: { role: 'row', 'aria-rowindex': '1' } },
    ],
  },
  {
    component: TableBodyVirtualizedFixture,
    markup: [
      {
        select: '[forTable]',
        attributes: { role: 'grid', 'data-mode': 'grid', 'aria-rowcount': '1001' },
      },
      {
        select: '[forTableHeaderCell]',
        attributes: { role: 'columnheader', 'data-column': 'a', 'aria-colindex': '1' },
      },
    ],
  },
  {
    component: TableVirtualizedReorderFixture,
    markup: [
      {
        select: '[forTable]',
        attributes: {
          role: 'grid',
          'data-mode': 'grid',
          'aria-rowcount': '1000',
          'aria-colcount': '-1',
        },
      },
      {
        select: '[forTableRowReorder]',
        attributes: { role: 'rowgroup', 'data-orientation': 'vertical' },
      },
    ],
  },
  {
    component: StepperFixture,
    markup: [
      {
        select: '[forStepperTrigger]',
        pairs: { 'aria-controls': '[forStepperContent]' },
      },
      { select: '[forStepperContent]', pairs: { 'aria-labelledby': '[forStepperTrigger]' } },
    ],
  },
  {
    component: StepperCompletedFixture,
    markup: [
      { select: '[forStepperList]', attributes: { role: 'tablist', 'aria-label': 'Checkout' } },
      {
        select: '[forStepperTrigger]',
        attributes: {
          role: 'tab',
          'aria-selected': 'false',
          'data-state': 'pending',
          'aria-controls': null,
        },
      },
      {
        select: '[forStepperContent]',
        attributes: {
          role: 'tabpanel',
          'aria-hidden': 'true',
          'data-state': 'inactive',
          inert: '',
        },
        pairs: { 'aria-labelledby': '[forStepperTrigger]' },
      },
      {
        select: '[forStepperCompletedContent]',
        attributes: { role: 'group', 'data-state': 'active' },
      },
    ],
  },
  {
    component: StepperServerFixture,
    markup: [
      { select: '[forStepperTrigger]', pairs: { 'aria-controls': '[forStepperContent]' } },
      { select: '[forStepperContent]', pairs: { 'aria-labelledby': '[forStepperTrigger]' } },
    ],
  },
  {
    component: CarouselFixture,
    markup: [
      {
        select: '[forCarousel]',
        attributes: { 'aria-roledescription': 'carousel', 'aria-label': 'Examples' },
      },
    ],
  },
  {
    component: CarouselAutoplayFixture,
    open: true,
    markup: [{ select: '[forCarousel]', attributes: { 'aria-roledescription': 'carousel' } }],
  },
  {
    component: SwitchFixture,
    markup: [
      {
        select: '[forSwitch]',
        attributes: { role: 'switch', 'aria-checked': 'false', 'data-state': 'unchecked' },
      },
    ],
  },
  {
    component: CheckboxFixture,
    markup: [
      { select: '[forCheckbox]', attributes: { role: 'checkbox', 'aria-checked': 'false' } },
    ],
  },
  {
    component: TextareaFixture,
    noWiring: 'a native <textarea>; autosize writes inline style only',
  },
  {
    component: SearchFixture,
    markup: [
      { select: '[forSearch]', attributes: { role: 'searchbox' } },
      {
        select: '[forSearchClear]',
        attributes: { 'aria-label': 'Clear search', hidden: '' },
      },
    ],
  },
  {
    component: ButtonFixture,
    markup: [
      { select: 'button[forButton]', attributes: { type: 'button' } },
      { select: 'div[forButton]', attributes: { role: 'button', tabindex: '0' } },
    ],
  },
  {
    component: RadioFixture,
    markup: [
      { select: '[forRadioGroup]', attributes: { role: 'radiogroup' } },
      { select: '[forRadio]', attributes: { role: 'radio', 'aria-checked': 'false' } },
    ],
  },
  {
    component: TooltipFixture,
    markup: [
      { select: '[forTooltipTrigger]', attributes: { 'aria-describedby': null } },
      { select: '[forTooltipContent]', attributes: { role: 'tooltip', 'data-state': 'closed' } },
    ],
  },
  {
    component: TooltipOpenFixture,
    open: true,
    markup: [
      {
        select: '[forTooltipTrigger]',
        pairs: { 'aria-describedby': '[forTooltipContent]' },
      },
      { select: '[forTooltipContent]', attributes: { role: 'tooltip', 'data-state': 'open' } },
    ],
  },
  { component: DialogFixture, noWiring: 'mounts nothing while closed' },
  {
    component: AvatarFixture,
    noWiring: 'load state is `data-status`; the <img> carries the semantics',
    markup: [{ select: '[forAvatarImage]', present: ['data-status'] }],
  },
  {
    component: ScrollAreaFixture,
    markup: [
      { select: '[forScrollArea]', attributes: { 'data-type': 'hover' } },
      { select: '[forScrollAreaViewport]', attributes: { tabindex: '0' } },
      {
        select: '[forScrollAreaScrollbar]',
        attributes: { 'data-orientation': 'vertical', 'data-state': 'hidden', hidden: '' },
      },
      {
        select: '[forScrollAreaThumb]',
        attributes: { 'data-orientation': 'vertical', 'data-state': 'hidden' },
      },
      { select: '[forScrollAreaCorner]', attributes: { hidden: '' } },
    ],
  },
  {
    component: PopoverOpenFixture,
    open: true,
    markup: [
      {
        select: '[forPopoverTrigger]',
        attributes: { 'aria-haspopup': 'dialog', 'aria-expanded': 'true' },
        pairs: { 'aria-controls': '[forPopoverContent]' },
      },
      {
        select: '[forPopoverContent]',
        attributes: { role: 'dialog', 'data-state': 'open' },
        pairs: { 'aria-labelledby': '[forPopoverTitle]' },
      },
    ],
  },
  {
    component: DialogOpenFixture,
    open: true,
    markup: [
      {
        select: '[forDialog]',
        attributes: { role: 'dialog', 'aria-modal': 'true', 'data-state': 'open' },
      },
    ],
  },
  {
    component: DialogContainedFixture,
    open: true,
    markup: [{ select: '[forDialog]', attributes: { role: 'dialog', 'aria-modal': null } }],
  },
  {
    component: DialogContainedModalFixture,
    open: true,
    markup: [
      {
        select: '[forDialog]',
        attributes: { role: 'dialog', 'aria-modal': 'true' },
        within: 'section',
      },
    ],
  },
  {
    component: DrawerOpenFixture,
    open: true,
    markup: [
      {
        select: '[forDrawer]',
        attributes: { role: 'dialog', 'aria-modal': 'true', 'data-state': 'open' },
      },
    ],
  },
  {
    component: DrawerContainedFixture,
    open: true,
    markup: [{ select: '[forDrawer]', attributes: { role: 'dialog', 'aria-modal': null } }],
  },
  {
    component: DrawerContainedModalFixture,
    open: true,
    markup: [
      {
        select: '[forDrawer]',
        attributes: { role: 'dialog', 'aria-modal': 'true' },
        within: 'section',
      },
    ],
  },
  {
    component: ToastFixture,
    open: true,
    markup: [{ select: 'for-toast-viewport', attributes: { role: 'region', tabindex: '-1' } }],
  },
  {
    component: SelectOpenFixture,
    open: true,
    markup: [
      {
        select: '[forSelectTrigger]',
        attributes: { role: 'combobox', 'aria-haspopup': 'listbox', 'aria-expanded': 'true' },
        pairs: { 'aria-controls': '[forSelectContent]' },
      },
      { select: '[forSelectContent]', attributes: { role: 'listbox' } },
      { select: '[forSelectOption]', attributes: { role: 'option', 'aria-selected': 'true' } },
    ],
  },
  {
    component: SelectVirtualizedOpenFixture,
    open: true,
    markup: [
      {
        select: '[forSelectTrigger]',
        pairs: { 'aria-controls': '[forSelectContent]' },
      },
      { select: '[forSelectContent]', attributes: { role: 'listbox' } },
      { select: '[forSelectOption]', attributes: { role: 'option', 'aria-setsize': '3' } },
    ],
  },
  {
    component: ComboboxOpenFixture,
    open: true,
    markup: [
      {
        select: '[forComboboxInput]',
        attributes: { role: 'combobox', 'aria-haspopup': 'listbox', 'aria-expanded': 'true' },
        pairs: { 'aria-controls': '[forComboboxList]' },
      },
      { select: '[forComboboxContent]', attributes: { role: null } },
      { select: '[forComboboxList]', attributes: { role: 'listbox' } },
      { select: '[forComboboxAction]', attributes: { role: 'button' } },
      { select: '[forComboboxOption]', attributes: { role: 'option' } },
    ],
  },
  {
    component: NavigationMenuOpenFixture,
    open: true,
    markup: [
      {
        select: '[forNavigationMenuTrigger]',
        attributes: { 'aria-expanded': 'true' },
        pairs: { 'aria-controls': '[forNavigationMenuContent]' },
      },
      {
        select: '[forNavigationMenuContent]',
        attributes: { 'data-state': 'open' },
        present: ['id'],
        pairs: { 'aria-labelledby': '[forNavigationMenuTrigger]' },
      },
    ],
  },
  {
    component: NavigationMenuViewportOpenFixture,
    open: true,
    markup: [
      {
        select: '[forNavigationMenuViewport]',
        attributes: { 'aria-hidden': 'false', 'data-state': 'open' },
      },
      {
        select: '[forNavigationMenuContent]',
        within: '[forNavigationMenuItem]',
        pairs: { 'aria-labelledby': '[forNavigationMenuTrigger]' },
      },
    ],
  },
  {
    component: MenubarOpenFixture,
    open: true,
    markup: [
      {
        select: '[forMenubarTrigger]',
        attributes: { role: 'menuitem', 'aria-haspopup': 'menu', 'aria-expanded': 'true' },
        pairs: { 'aria-controls': '[forMenuContent]' },
      },
      { select: '[forMenuContent]', attributes: { role: 'menu' } },
      { select: '[forMenuItem]', attributes: { role: 'menuitem' } },
    ],
  },
  {
    component: OtpInputFixture,
    markup: [
      {
        select: '[forOtpInput]',
        attributes: { role: 'group', 'data-complete': null, 'aria-label': null },
      },
      { select: '[forOtpInputSlot]', attributes: { 'data-empty': '', 'data-active': null } },
    ],
  },
  {
    component: TreeFixture,
    markup: [
      { select: '[forTree]', attributes: { role: 'tree' } },
      {
        select: '[forTreeItem]',
        attributes: {
          role: 'treeitem',
          'aria-level': '1',
          'aria-posinset': '1',
          'aria-setsize': '1',
          tabindex: '0',
        },
        present: ['id'],
      },
      {
        select: '[forTreeGroup] [forTreeItem]',
        attributes: {
          role: 'treeitem',
          'aria-level': '2',
          'aria-posinset': '1',
          'aria-setsize': '1',
          tabindex: '-1',
        },
        present: ['id'],
      },
    ],
  },
  {
    component: TreeCheckboxFixture,
    markup: [
      {
        select: '[forTree]',
        attributes: { role: 'tree', 'aria-label': 'Categories', 'aria-orientation': 'vertical' },
      },
      {
        select: '[forTreeItem]',
        attributes: {
          role: 'treeitem',
          'aria-level': '1',
          'aria-posinset': '1',
          'aria-setsize': '2',
          'aria-checked': 'false',
          'data-checked': 'false',
        },
        present: ['id'],
      },
      {
        select: '[forTreeItemCheckbox]',
        attributes: { 'aria-hidden': 'true', 'data-state': 'unchecked' },
      },
      {
        select: '[forTreeItemCheckboxIndicator]',
        attributes: { 'data-state': 'unchecked', hidden: '' },
      },
    ],
  },
  {
    component: TreeCascadeFixture,
    markup: [
      { select: '[forTree]', attributes: { role: 'tree', 'aria-label': 'Groups' } },
      {
        select: '[forTreeItem]',
        attributes: {
          role: 'treeitem',
          'aria-level': '1',
          'aria-posinset': '1',
          'aria-setsize': '2',
          'aria-checked': 'false',
          'data-checked': 'false',
        },
        present: ['id'],
      },
      {
        select: '[forTreeItemCheckbox]',
        attributes: { 'aria-hidden': 'true', 'data-state': 'unchecked' },
      },
    ],
  },
  {
    component: TreeVirtualizedFixture,
    markup: [
      {
        select: '[forTree]',
        attributes: {
          role: 'tree',
          'aria-label': 'Virtualized',
          tabindex: '0',
          'aria-activedescendant': null,
        },
      },
      {
        select: '[forTreeItem]',
        attributes: {
          role: 'treeitem',
          'aria-level': '1',
          'aria-setsize': '3',
          'aria-posinset': '1',
          'aria-selected': 'false',
        },
        present: ['id'],
      },
    ],
  },
  {
    component: TreeNodeDragFixture,
    markup: [
      { select: '[forTree]', attributes: { role: 'tree', 'aria-label': 'Files' } },
      {
        select: '[forTreeItem]',
        attributes: {
          role: 'treeitem',
          'aria-level': '1',
          'aria-posinset': '1',
          'aria-setsize': '1',
          'aria-expanded': 'false',
          'data-state': 'closed',
        },
        present: ['id'],
      },
      { select: '[forTreeGroup]', attributes: { role: 'group' } },
      {
        select: '[forTreeGroup] [forTreeItem]',
        attributes: {
          role: 'treeitem',
          'aria-level': '2',
          'aria-posinset': '1',
          'aria-setsize': '1',
        },
        present: ['id'],
      },
      { select: '[forTreeNodeDragHandle]' },
    ],
  },
  {
    component: CalendarFixture,
    markup: [{ select: '[forCalendarGrid]', pairs: { 'aria-labelledby': '[forCalendarHeading]' } }],
  },
  {
    component: CalendarDropdownsFixture,
    markup: [
      { select: '[forCalendar]', attributes: { 'data-view': 'day' } },
      {
        select: '[forCalendarGrid]',
        attributes: { role: 'grid' },
        pairs: { 'aria-labelledby': '[forCalendarHeading]' },
      },
      {
        select: '[forCalendarCell]',
        attributes: { role: 'gridcell', 'aria-selected': 'false' },
        present: ['aria-label'],
      },
    ],
  },
  {
    component: CalendarSelectDirectivesFixture,
    markup: [
      { select: '[forCalendar]', attributes: { 'data-view': 'day' } },
      {
        select: '[forCalendarGrid]',
        attributes: { role: 'grid' },
        pairs: { 'aria-labelledby': '[forCalendarHeading]' },
      },
      {
        select: '[forCalendarCell]',
        attributes: { role: 'gridcell', 'aria-selected': 'false' },
        present: ['aria-label'],
      },
    ],
  },
  {
    component: CalendarMonthViewFixture,
    markup: [
      { select: '[forCalendar]', attributes: { 'data-view': 'month' } },
      {
        select: '[forCalendarMonthGrid]',
        attributes: { role: 'grid', 'data-view': 'month' },
        pairs: { 'aria-labelledby': '[forCalendarHeading]' },
      },
      {
        select: '[forCalendarMonthCell]',
        attributes: { role: 'gridcell', 'aria-selected': 'false' },
      },
    ],
  },
  {
    component: CalendarYearViewFixture,
    markup: [
      { select: '[forCalendar]', attributes: { 'data-view': 'year' } },
      {
        select: '[forCalendarYearGrid]',
        attributes: { role: 'grid', 'data-view': 'year' },
        pairs: { 'aria-labelledby': '[forCalendarHeading]' },
      },
      {
        select: '[forCalendarYearCell]',
        attributes: { role: 'gridcell', 'aria-selected': 'false' },
      },
    ],
  },
  {
    component: DateFieldFixture,
    markup: [
      {
        select: '[forDateField]',
        attributes: { role: 'group', 'aria-label': 'Date', 'data-empty': '' },
      },
      {
        select: '[forDateFieldSegment]',
        attributes: {
          role: 'spinbutton',
          'aria-valuetext': 'Empty',
          'aria-valuenow': null,
          'data-placeholder': '',
        },
        present: ['aria-label', 'aria-valuemin', 'aria-valuemax'],
      },
      { select: '[forDateFieldLiteral]', attributes: { 'aria-hidden': 'true' } },
    ],
  },
  {
    component: TimeFieldFixture,
    markup: [
      {
        select: '[forTimeField]',
        attributes: { role: 'group', 'aria-label': 'Time', 'data-empty': '' },
      },
      {
        select: '[forTimeFieldSegment]',
        attributes: { role: 'spinbutton', 'aria-valuenow': null, 'data-placeholder': '' },
        present: ['aria-label', 'aria-valuemin', 'aria-valuemax'],
      },
      { select: '[forTimeFieldLiteral]', attributes: { 'aria-hidden': 'true' } },
    ],
  },
  {
    component: DateRangeFieldFixture,
    markup: [
      {
        select: '[forDateRangeField]',
        attributes: { role: 'group', 'aria-label': 'Stay', 'data-empty': '' },
      },
      {
        select: '[forDateRangeFieldStart]',
        attributes: { role: 'group', 'aria-label': 'Start date' },
      },
      { select: '[forDateRangeFieldEnd]', attributes: { role: 'group', 'aria-label': 'End date' } },
      {
        select: '[forDateRangeFieldSegment]',
        attributes: {
          role: 'spinbutton',
          'aria-valuetext': 'Empty',
          'aria-valuenow': null,
          'data-placeholder': '',
        },
        present: ['aria-label', 'aria-valuemin', 'aria-valuemax'],
      },
      { select: '[forDateRangeFieldLiteral]', attributes: { 'aria-hidden': 'true' } },
    ],
  },
  {
    component: TimeRangeFieldFixture,
    markup: [
      {
        select: '[forTimeRangeField]',
        attributes: { role: 'group', 'aria-label': 'Opening hours', 'data-empty': '' },
      },
      {
        select: '[forTimeRangeFieldStart]',
        attributes: { role: 'group', 'aria-label': 'Start time' },
      },
      { select: '[forTimeRangeFieldEnd]', attributes: { role: 'group', 'aria-label': 'End time' } },
      {
        select: '[forTimeRangeFieldSegment]',
        attributes: { role: 'spinbutton', 'aria-valuenow': null, 'data-placeholder': '' },
        present: ['aria-label', 'aria-valuemin', 'aria-valuemax'],
      },
      { select: '[forTimeRangeFieldLiteral]', attributes: { 'aria-hidden': 'true' } },
    ],
  },
  {
    component: DatePickerFixture,
    markup: [
      {
        select: '[forDatePickerTrigger]',
        attributes: {
          role: 'combobox',
          'aria-haspopup': 'dialog',
          'aria-expanded': 'false',
          'aria-controls': null,
        },
      },
    ],
  },
  {
    component: DateRangePickerOpenFixture,
    open: true,
    markup: [
      {
        select: '[forDatePickerTrigger]',
        attributes: { role: 'combobox', 'aria-expanded': 'true' },
        pairs: { 'aria-controls': '[forDatePickerContent]' },
      },
      { select: '[forDatePickerContent]', attributes: { role: 'dialog' } },
    ],
  },
  {
    component: TimePickerOpenFixture,
    open: true,
    markup: [
      {
        select: '[forTimePickerTrigger]',
        attributes: { role: 'combobox', 'aria-haspopup': 'listbox', 'aria-expanded': 'true' },
        pairs: { 'aria-controls': '[forTimePickerContent]' },
      },
      { select: '[forTimePickerContent]', attributes: { role: 'listbox' } },
      { select: '[forTimePickerOption]', attributes: { role: 'option' } },
    ],
  },
  {
    component: DragDropFixture,
    markup: [
      { select: '[forDropList]', attributes: { 'data-orientation': 'vertical' } },
      {
        select: '[forDraggable]',
        attributes: { 'aria-roledescription': 'sortable', tabindex: '0' },
      },
      { select: '[forDragHandle]', attributes: { 'data-drag-handle': '' } },
    ],
  },
  {
    component: FreeDragFixture,
    noWiring: 'free repositioning is pointer-only; the moved element keeps its own semantics',
    markup: [
      {
        select: '[forFreeDrag]',
        attributes: { role: null, 'aria-roledescription': null, tabindex: null },
      },
      { select: '[forDragHandle]', attributes: { 'data-drag-handle': '' } },
    ],
  },
  {
    component: DropdownMenuOpenFixture,
    open: true,
    markup: [
      {
        select: '[forDropdownMenuTrigger]',
        attributes: { 'aria-haspopup': 'menu', 'aria-expanded': 'true' },
        pairs: { 'aria-controls': '[forMenuContent]' },
      },
      { select: '[forMenuContent]', attributes: { role: 'menu' } },
    ],
  },
  {
    component: MenuSubOpenFixture,
    open: true,
    markup: [
      { select: '[forMenuContent]', attributes: { role: 'menu' } },
      {
        select: '[forMenuSubTrigger]',
        attributes: { role: 'menuitem', 'aria-haspopup': 'menu', 'aria-expanded': 'true' },
        pairs: { 'aria-controls': '[forMenuSubContent]' },
      },
      { select: '[forMenuSubContent]', attributes: { role: 'menu', 'data-state': 'open' } },
    ],
  },
  {
    component: ContextMenuOpenFixture,
    open: true,
    markup: [{ select: '[forMenuContent]', attributes: { role: 'menu' } }],
  },
  {
    component: MenuMultiOpenerOpenFixture,
    open: true,
    markup: [
      { select: '[forMenuContent]', attributes: { role: 'menu', 'aria-label': 'Row actions' } },
    ],
  },
  {
    component: HoverCardOpenFixture,
    open: true,
    markup: [{ select: '[forHoverCardContent]', attributes: { 'data-state': 'open' } }],
  },
  {
    component: ListboxFixture,
    markup: [
      { select: '[forListbox]', attributes: { role: 'listbox', 'aria-label': 'Fruit' } },
      {
        select: '[forListboxOption]',
        attributes: { role: 'option', 'aria-selected': 'false' },
        present: ['id'],
      },
    ],
  },
  {
    component: ListboxVirtualizedFixture,
    markup: [
      { select: '[forListbox]', attributes: { role: 'listbox' } },
      { select: '[forListboxOption]', attributes: { role: 'option', 'aria-setsize': '3' } },
    ],
  },
  {
    component: ListboxReorderFixture,
    markup: [
      {
        select: '[forListbox]',
        attributes: {
          role: 'listbox',
          'aria-label': 'Tags',
          'aria-multiselectable': 'true',
          'aria-orientation': 'vertical',
        },
      },
      {
        select: '[forListboxOption]',
        attributes: { role: 'option', 'aria-selected': 'false', 'data-state': 'unchecked' },
        present: ['id'],
      },
    ],
  },
  {
    component: SliderFixture,
    markup: [
      {
        select: '[forSliderThumb]',
        attributes: { role: 'slider', 'aria-label': 'Volume' },
        present: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
      },
    ],
  },
  {
    component: PaneResizerFixture,
    markup: [
      {
        select: '[forPaneResizer]',
        attributes: {
          role: 'separator',
          'aria-orientation': 'vertical',
          'aria-valuemin': '0',
          'aria-valuemax': '100',
          'aria-valuenow': '50',
          'data-orientation': 'vertical',
          tabindex: '0',
        },
      },
    ],
  },
  {
    component: NumberInputFixture,
    markup: [{ select: '[forNumberInput]', attributes: { role: 'spinbutton' } }],
  },
  {
    component: ToolbarFixture,
    markup: [{ select: '[forToolbar]', attributes: { role: 'toolbar' } }],
  },
  {
    component: PaginationFixture,
    markup: [
      {
        select: '[forPagination]',
        attributes: { role: 'navigation', 'aria-label': 'Pagination' },
      },
    ],
  },
  {
    component: BreadcrumbsFixture,
    markup: [
      {
        select: '[forBreadcrumbs]',
        attributes: { role: 'navigation', 'aria-label': 'Breadcrumb' },
      },
    ],
  },
  {
    component: MeterFixture,
    markup: [
      {
        select: '[forMeter]',
        attributes: {
          role: 'meter',
          'aria-valuemin': '0',
          'aria-valuemax': '100',
          'aria-valuenow': '40',
        },
      },
    ],
  },
  {
    component: ProgressFixture,
    markup: [
      {
        select: '[forProgress]',
        attributes: {
          role: 'progressbar',
          'aria-valuemin': '0',
          'aria-valuemax': '100',
          'aria-valuenow': '40',
        },
      },
    ],
  },
  {
    component: ToggleFixture,
    markup: [{ select: '[forToggle]', attributes: { 'aria-pressed': 'false' } }],
  },
  {
    component: ToggleGroupFixture,
    markup: [{ select: '[forToggleGroup]', attributes: { role: 'group' } }],
  },
  {
    component: SeparatorFixture,
    markup: [{ select: '[forSeparator]', attributes: { role: 'separator' } }],
  },
  { component: AspectRatioFixture, noWiring: 'the ratio is inline style only' },
  {
    component: FileUploadFixture,
    markup: [
      { select: 'input[forFileUploadInput]', attributes: { type: 'file' } },
      { select: '[forFileUploadTrigger]', attributes: { type: 'button' } },
    ],
  },
  { component: VirtualizerFixture, noWiring: 'the sizer is inline style only' },
  { component: VirtualViewportFixture, noWiring: 'the sizer is inline style only' },
  { component: VirtualReorderFixture, noWiring: 'the sizer is inline style only' },
  { component: BreakpointsFixture, noWiring: 'a composable with no host of its own' },
  { component: VisuallyHiddenFixture, noWiring: 'the clip is inline style only' },
  {
    component: FieldFixture,
    markup: [
      { select: '[forLabel]', present: ['id'], pairs: { for: '[forFieldControl]' } },
      {
        select: '[forFieldControl]',
        pairs: { 'aria-labelledby': '[forLabel]', 'aria-errormessage': '[forFieldError]' },
      },
    ],
  },
  {
    component: FieldsetFixture,
    markup: [{ select: '[forFieldControl]', pairs: { 'aria-labelledby': '[forLabel]' } }],
  },
];

/**
 * The subset of {@link SSR_FIXTURES} mounted in their open / active state. A
 * closed overlay proves nothing about the browser-only side effects, which is
 * why the listener / timer / position / `<body>` sweeps iterate this list rather
 * than every fixture.
 */
export const OPEN_STATE_FIXTURES: ReadonlyArray<Type<unknown>> = SSR_FIXTURES.filter(
  (fixture) => fixture.open,
).map((fixture) => fixture.component);
