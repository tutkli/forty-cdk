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
  /** Attributes that must carry a non-empty value, whatever it is. */
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
  { component: DisclosureFixture },
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
  { component: AccordionRtlFixture },
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
  { component: TabsServerFixture },
  { component: TabsServerRepeatFixture },
  { component: TableFixture },
  { component: TableGridFixture },
  { component: TableBodyFixture },
  { component: TableBodyRowVariantFixture },
  { component: TableBodyPlaceholderVariantFixture },
  { component: TableBodyRowInteractionFixture },
  { component: TableBodyReorderFixture },
  { component: TableTreegridFixture },
  { component: TableVirtualizedFixture },
  { component: TableBodyVirtualizedFixture },
  { component: TableVirtualizedReorderFixture },
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
  { component: StepperCompletedFixture },
  { component: StepperServerFixture },
  { component: CarouselFixture },
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
  { component: SearchFixture },
  { component: ButtonFixture },
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
  { component: ScrollAreaFixture },
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
      { select: '[forNavigationMenuTrigger]', attributes: { 'aria-expanded': 'true' } },
      {
        select: '[forNavigationMenuContent]',
        attributes: { 'data-state': 'open' },
        present: ['id'],
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
      { select: '[forNavigationMenuContent]', within: '[forNavigationMenuItem]' },
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
  { component: OtpInputFixture },
  {
    component: TreeFixture,
    markup: [
      { select: '[forTree]', attributes: { role: 'tree' } },
      {
        select: '[forTreeItem]',
        attributes: { role: 'treeitem', 'aria-level': '1' },
        present: ['id'],
      },
    ],
  },
  { component: TreeCheckboxFixture },
  { component: TreeCascadeFixture },
  { component: TreeVirtualizedFixture },
  { component: TreeNodeDragFixture },
  { component: CalendarFixture },
  { component: CalendarDropdownsFixture },
  { component: CalendarSelectDirectivesFixture },
  { component: CalendarMonthViewFixture },
  { component: CalendarYearViewFixture },
  { component: DateFieldFixture },
  { component: TimeFieldFixture },
  { component: DateRangeFieldFixture },
  { component: TimeRangeFieldFixture },
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
  { component: DragDropFixture },
  { component: FreeDragFixture },
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
  { component: ListboxReorderFixture },
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
  { component: PaneResizerFixture },
  {
    component: NumberInputFixture,
    markup: [{ select: '[forNumberInput]', attributes: { role: 'spinbutton' } }],
  },
  {
    component: ToolbarFixture,
    markup: [{ select: '[forToolbar]', attributes: { role: 'toolbar' } }],
  },
  { component: PaginationFixture },
  { component: BreadcrumbsFixture },
  { component: MeterFixture },
  { component: ProgressFixture },
  {
    component: ToggleFixture,
    markup: [{ select: '[forToggle]', attributes: { 'aria-pressed': 'false' } }],
  },
  { component: ToggleGroupFixture },
  { component: SeparatorFixture },
  { component: AspectRatioFixture, noWiring: 'the ratio is inline style only' },
  { component: FileUploadFixture },
  { component: VirtualizerFixture, noWiring: 'the sizer is inline style only' },
  { component: VirtualViewportFixture, noWiring: 'the sizer is inline style only' },
  { component: VirtualReorderFixture, noWiring: 'the sizer is inline style only' },
  { component: BreakpointsFixture, noWiring: 'a composable with no host of its own' },
  { component: VisuallyHiddenFixture, noWiring: 'the clip is inline style only' },
  { component: FieldFixture },
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
