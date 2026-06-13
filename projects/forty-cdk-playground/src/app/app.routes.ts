import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'accordion', pathMatch: 'full' },
  {
    path: 'accordion',
    loadComponent: () => import('./demos/accordion/accordion.page').then((m) => m.AccordionPage),
  },
  {
    path: 'dialog',
    loadComponent: () => import('./demos/dialog/dialog.page').then((m) => m.DialogPage),
  },
  {
    path: 'drawer',
    loadComponent: () => import('./demos/drawer/drawer.page').then((m) => m.DrawerPage),
  },
  {
    path: 'field',
    loadComponent: () => import('./demos/field/field.page').then((m) => m.FieldPage),
  },
  {
    path: 'switch',
    loadComponent: () => import('./demos/switch/switch.page').then((m) => m.SwitchPage),
  },
  {
    path: 'checkbox',
    loadComponent: () => import('./demos/checkbox/checkbox.page').then((m) => m.CheckboxPage),
  },
  {
    path: 'toggle',
    loadComponent: () => import('./demos/toggle/toggle.page').then((m) => m.TogglePage),
  },
  {
    path: 'radio-group',
    loadComponent: () =>
      import('./demos/radio-group/radio-group.page').then((m) => m.RadioGroupPage),
  },
  {
    path: 'slider',
    loadComponent: () => import('./demos/slider/slider.page').then((m) => m.SliderPage),
  },
  {
    path: 'disclosure',
    loadComponent: () => import('./demos/disclosure/disclosure.page').then((m) => m.DisclosurePage),
  },
  {
    path: 'tabs',
    loadComponent: () => import('./demos/tabs/tabs.page').then((m) => m.TabsPage),
  },
  {
    path: 'separator',
    loadComponent: () => import('./demos/separator/separator.page').then((m) => m.SeparatorPage),
  },
  {
    path: 'pane-resizer',
    loadComponent: () =>
      import('./demos/pane-resizer/pane-resizer.page').then((m) => m.PaneResizerPage),
  },
  {
    path: 'aspect-ratio',
    loadComponent: () =>
      import('./demos/aspect-ratio/aspect-ratio.page').then((m) => m.AspectRatioPage),
  },
  {
    path: 'avatar',
    loadComponent: () => import('./demos/avatar/avatar.page').then((m) => m.AvatarPage),
  },
  {
    path: 'progress',
    loadComponent: () => import('./demos/progress/progress.page').then((m) => m.ProgressPage),
  },
  {
    path: 'meter',
    loadComponent: () => import('./demos/meter/meter.page').then((m) => m.MeterPage),
  },
  {
    path: 'toolbar',
    loadComponent: () => import('./demos/toolbar/toolbar.page').then((m) => m.ToolbarPage),
  },
  {
    path: 'scroll-area',
    loadComponent: () =>
      import('./demos/scroll-area/scroll-area.page').then((m) => m.ScrollAreaPage),
  },
  {
    path: 'popover',
    loadComponent: () => import('./demos/popover/popover.page').then((m) => m.PopoverPage),
  },
  {
    path: 'tooltip',
    loadComponent: () => import('./demos/tooltip/tooltip.page').then((m) => m.TooltipPage),
  },
  {
    path: 'hover-card',
    loadComponent: () => import('./demos/hover-card/hover-card.page').then((m) => m.HoverCardPage),
  },
  {
    path: 'dropdown-menu',
    loadComponent: () =>
      import('./demos/dropdown-menu/dropdown-menu.page').then((m) => m.DropdownMenuPage),
  },
  {
    path: 'menu',
    loadComponent: () => import('./demos/menu/menu.page').then((m) => m.MenuPage),
  },
  {
    path: 'context-menu',
    loadComponent: () =>
      import('./demos/context-menu/context-menu.page').then((m) => m.ContextMenuPage),
  },
  {
    path: 'menubar',
    loadComponent: () => import('./demos/menubar/menubar.page').then((m) => m.MenubarPage),
  },
  {
    path: 'navigation-menu',
    loadComponent: () =>
      import('./demos/navigation-menu/navigation-menu.page').then((m) => m.NavigationMenuPage),
  },
  {
    path: 'select',
    loadComponent: () => import('./demos/select/select.page').then((m) => m.SelectPage),
  },
  {
    path: 'combobox',
    loadComponent: () => import('./demos/combobox/combobox.page').then((m) => m.ComboboxPage),
  },
  {
    path: 'listbox',
    loadComponent: () => import('./demos/listbox/listbox.page').then((m) => m.ListboxPage),
  },
  {
    path: 'tree',
    loadComponent: () => import('./demos/tree/tree.page').then((m) => m.TreePage),
  },
  {
    path: 'calendar',
    loadComponent: () => import('./demos/calendar/calendar.page').then((m) => m.CalendarPage),
  },
  {
    path: 'toast',
    loadComponent: () => import('./demos/toast/toast.page').then((m) => m.ToastPage),
  },
  {
    path: 'fieldset',
    loadComponent: () => import('./demos/fieldset/fieldset.page').then((m) => m.FieldsetPage),
  },
  {
    path: 'input',
    loadComponent: () => import('./demos/input/input.page').then((m) => m.InputPage),
  },
  {
    path: 'number-input',
    loadComponent: () =>
      import('./demos/number-input/number-input.page').then((m) => m.NumberInputPage),
  },
  {
    path: 'otp-input',
    loadComponent: () => import('./demos/otp-input/otp-input.page').then((m) => m.OtpInputPage),
  },
  {
    path: 'date-field',
    loadComponent: () => import('./demos/date-field/date-field.page').then((m) => m.DateFieldPage),
  },
  {
    path: 'time-field',
    loadComponent: () => import('./demos/time-field/time-field.page').then((m) => m.TimeFieldPage),
  },
  {
    path: 'date-picker',
    loadComponent: () =>
      import('./demos/date-picker/date-picker.page').then((m) => m.DatePickerPage),
  },
  {
    path: 'carousel',
    loadComponent: () => import('./demos/carousel/carousel.page').then((m) => m.CarouselPage),
  },
  { path: '**', redirectTo: 'accordion' },
];
