import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dialog', pathMatch: 'full' },
  {
    path: 'dialog',
    loadComponent: () => import('./fixtures/dialog.fixture').then((m) => m.DialogFixture),
  },
  {
    path: 'dialog-programmatic',
    loadComponent: () =>
      import('./fixtures/dialog-programmatic.fixture').then((m) => m.DialogProgrammaticFixture),
  },
  {
    path: 'drawer-programmatic',
    loadComponent: () =>
      import('./fixtures/drawer-programmatic.fixture').then((m) => m.DrawerProgrammaticFixture),
  },
  {
    path: 'accordion',
    loadComponent: () => import('./fixtures/accordion.fixture').then((m) => m.AccordionFixture),
  },
  {
    path: 'drawer',
    loadComponent: () => import('./fixtures/drawer.fixture').then((m) => m.DrawerFixture),
  },
  {
    path: 'drawer-contained',
    loadComponent: () =>
      import('./fixtures/drawer-contained.fixture').then((m) => m.DrawerContainedFixture),
  },
  {
    path: 'disclosure',
    loadComponent: () => import('./fixtures/disclosure.fixture').then((m) => m.DisclosureFixture),
  },
  {
    path: 'button',
    loadComponent: () => import('./fixtures/button.fixture').then((m) => m.ButtonFixture),
  },
  {
    path: 'popover',
    loadComponent: () => import('./fixtures/popover.fixture').then((m) => m.PopoverFixture),
  },
  {
    path: 'popover-animation',
    loadComponent: () =>
      import('./fixtures/popover-animation.fixture').then((m) => m.PopoverAnimationFixture),
  },
  {
    path: 'radio-group',
    loadComponent: () => import('./fixtures/radio-group.fixture').then((m) => m.RadioGroupFixture),
  },
  {
    path: 'menu',
    loadComponent: () =>
      import('./fixtures/dropdown-menu.fixture').then((m) => m.DropdownMenuFixture),
  },
  {
    path: 'menu-base',
    loadComponent: () => import('./fixtures/menu-base.fixture').then((m) => m.MenuBaseFixture),
  },
  {
    path: 'menu-sub',
    loadComponent: () => import('./fixtures/menu-sub.fixture').then((m) => m.MenuSubFixture),
  },
  {
    path: 'context-menu',
    loadComponent: () =>
      import('./fixtures/context-menu.fixture').then((m) => m.ContextMenuFixture),
  },
  {
    path: 'combobox',
    loadComponent: () => import('./fixtures/combobox.fixture').then((m) => m.ComboboxFixture),
  },
  {
    path: 'otp-input',
    loadComponent: () => import('./fixtures/otp-input.fixture').then((m) => m.OtpInputFixture),
  },
  {
    path: 'tooltip',
    loadComponent: () => import('./fixtures/tooltip.fixture').then((m) => m.TooltipFixture),
  },
  {
    path: 'toolbar',
    loadComponent: () => import('./fixtures/toolbar.fixture').then((m) => m.ToolbarFixture),
  },
  {
    path: 'toggle-group',
    loadComponent: () =>
      import('./fixtures/toggle-group.fixture').then((m) => m.ToggleGroupFixture),
  },
  {
    path: 'hover-card',
    loadComponent: () => import('./fixtures/hover-card.fixture').then((m) => m.HoverCardFixture),
  },
  {
    path: 'select',
    loadComponent: () => import('./fixtures/select.fixture').then((m) => m.SelectFixture),
  },
  {
    path: 'listbox',
    loadComponent: () => import('./fixtures/listbox.fixture').then((m) => m.ListboxFixture),
  },
  {
    path: 'menubar',
    loadComponent: () => import('./fixtures/menubar.fixture').then((m) => m.MenubarFixture),
  },
  {
    path: 'navigation-menu',
    loadComponent: () =>
      import('./fixtures/navigation-menu.fixture').then((m) => m.NavigationMenuFixture),
  },
  {
    path: 'nested',
    loadComponent: () => import('./fixtures/nested.fixture').then((m) => m.NestedFixture),
  },
  {
    path: 'overlay-inside-dialog',
    loadComponent: () =>
      import('./fixtures/overlay-inside-dialog.fixture').then((m) => m.OverlayInsideDialogFixture),
  },
  {
    path: 'pane-resizer',
    loadComponent: () =>
      import('./fixtures/pane-resizer.fixture').then((m) => m.PaneResizerFixture),
  },
  {
    path: 'slider',
    loadComponent: () => import('./fixtures/slider.fixture').then((m) => m.SliderFixture),
  },
  {
    path: 'scroll-area',
    loadComponent: () => import('./fixtures/scroll-area.fixture').then((m) => m.ScrollAreaFixture),
  },
  {
    path: 'textarea',
    loadComponent: () => import('./fixtures/textarea.fixture').then((m) => m.TextareaFixture),
  },
  {
    path: 'tabs',
    loadComponent: () => import('./fixtures/tabs.fixture').then((m) => m.TabsFixture),
  },
  {
    path: 'stepper',
    loadComponent: () => import('./fixtures/stepper.fixture').then((m) => m.StepperFixture),
  },
  {
    path: 'toast',
    loadComponent: () => import('./fixtures/toast.fixture').then((m) => m.ToastFixture),
  },
  {
    path: 'tree',
    loadComponent: () => import('./fixtures/tree.fixture').then((m) => m.TreeFixture),
  },
  {
    path: 'tree-drag-drop',
    loadComponent: () =>
      import('./fixtures/tree-drag-drop.fixture').then((m) => m.TreeDragDropFixture),
  },
  {
    path: 'carousel',
    loadComponent: () => import('./fixtures/carousel.fixture').then((m) => m.CarouselFixture),
  },
  {
    path: 'calendar',
    loadComponent: () => import('./fixtures/calendar.fixture').then((m) => m.CalendarFixture),
  },
  {
    path: 'date-field',
    loadComponent: () => import('./fixtures/date-field.fixture').then((m) => m.DateFieldFixture),
  },
  {
    path: 'date-picker',
    loadComponent: () => import('./fixtures/date-picker.fixture').then((m) => m.DatePickerFixture),
  },
  {
    path: 'time-field',
    loadComponent: () => import('./fixtures/time-field.fixture').then((m) => m.TimeFieldFixture),
  },
  {
    path: 'date-time-picker',
    loadComponent: () =>
      import('./fixtures/date-time-picker.fixture').then((m) => m.DateTimePickerFixture),
  },
  {
    path: 'time-picker',
    loadComponent: () => import('./fixtures/time-picker.fixture').then((m) => m.TimePickerFixture),
  },
  {
    path: 'drag-drop',
    loadComponent: () => import('./fixtures/drag-drop.fixture').then((m) => m.DragDropFixture),
  },
  {
    path: 'drag-drop-grid',
    loadComponent: () =>
      import('./fixtures/drag-drop-grid.fixture').then((m) => m.DragDropGridFixture),
  },
  {
    path: 'drag-drop-templates',
    loadComponent: () =>
      import('./fixtures/drag-drop-templates.fixture').then((m) => m.DragDropTemplatesFixture),
  },
  {
    path: 'drag-drop-scroll',
    loadComponent: () =>
      import('./fixtures/drag-drop-scroll.fixture').then((m) => m.DragDropScrollFixture),
  },
  {
    path: 'drag-drop-animate',
    loadComponent: () =>
      import('./fixtures/drag-drop-animate.fixture').then((m) => m.DragDropAnimateFixture),
  },
  {
    path: 'free-drag',
    loadComponent: () => import('./fixtures/free-drag.fixture').then((m) => m.FreeDragFixture),
  },
  {
    path: 'table',
    loadComponent: () => import('./fixtures/table.fixture').then((m) => m.TableFixture),
  },
  {
    path: 'table-combined',
    loadComponent: () =>
      import('./fixtures/table-combined.fixture').then((m) => m.TableCombinedFixture),
  },
  {
    path: 'table-reorder',
    loadComponent: () =>
      import('./fixtures/table-reorder.fixture').then((m) => m.TableReorderFixture),
  },
  {
    path: 'table-treegrid',
    loadComponent: () =>
      import('./fixtures/table-treegrid.fixture').then((m) => m.TableTreegridFixture),
  },
  {
    path: 'table-virtualized',
    loadComponent: () =>
      import('./fixtures/table-virtualized.fixture').then((m) => m.TableVirtualizedFixture),
  },
  {
    path: 'table-virtualized-reorder',
    loadComponent: () =>
      import('./fixtures/table-virtualized-reorder.fixture').then(
        (m) => m.TableVirtualizedReorderFixture,
      ),
  },
  {
    path: 'combobox-virtualized',
    loadComponent: () =>
      import('./fixtures/combobox-virtualized.fixture').then((m) => m.ComboboxVirtualizedFixture),
  },
  {
    path: 'listbox-virtualized',
    loadComponent: () =>
      import('./fixtures/listbox-virtualized.fixture').then((m) => m.ListboxVirtualizedFixture),
  },
  {
    path: 'select-virtualized',
    loadComponent: () =>
      import('./fixtures/select-virtualized.fixture').then((m) => m.SelectVirtualizedFixture),
  },
  {
    path: 'tree-virtualized',
    loadComponent: () =>
      import('./fixtures/tree-virtualized.fixture').then((m) => m.TreeVirtualizedFixture),
  },
  {
    path: 'virtualization',
    loadComponent: () =>
      import('./fixtures/virtualization.fixture').then((m) => m.VirtualizationFixture),
  },
  {
    path: 'virtualization-dynamic',
    loadComponent: () =>
      import('./fixtures/virtualization-dynamic.fixture').then(
        (m) => m.VirtualizationDynamicFixture,
      ),
  },
  {
    path: 'virtualization-infinite',
    loadComponent: () =>
      import('./fixtures/virtualization-infinite.fixture').then(
        (m) => m.VirtualizationInfiniteFixture,
      ),
  },
  {
    path: 'pagination',
    loadComponent: () => import('./fixtures/pagination.fixture').then((m) => m.PaginationFixture),
  },
  {
    path: 'file-upload',
    loadComponent: () => import('./fixtures/file-upload.fixture').then((m) => m.FileUploadFixture),
  },
];
