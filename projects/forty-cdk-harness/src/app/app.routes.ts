import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dialog', pathMatch: 'full' },
  {
    path: 'dialog',
    loadComponent: () => import('./fixtures/dialog.fixture').then((m) => m.DialogFixture),
  },
  {
    path: 'accordion',
    loadComponent: () =>
      import('./fixtures/accordion.fixture').then((m) => m.AccordionFixture),
  },
  {
    path: 'drawer',
    loadComponent: () => import('./fixtures/drawer.fixture').then((m) => m.DrawerFixture),
  },
  {
    path: 'popover',
    loadComponent: () => import('./fixtures/popover.fixture').then((m) => m.PopoverFixture),
  },
  {
    path: 'menu',
    loadComponent: () =>
      import('./fixtures/dropdown-menu.fixture').then((m) => m.DropdownMenuFixture),
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
    path: 'tooltip',
    loadComponent: () => import('./fixtures/tooltip.fixture').then((m) => m.TooltipFixture),
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
    path: 'navigation-menu',
    loadComponent: () =>
      import('./fixtures/navigation-menu.fixture').then((m) => m.NavigationMenuFixture),
  },
  {
    path: 'nested',
    loadComponent: () => import('./fixtures/nested.fixture').then((m) => m.NestedFixture),
  },
  {
    path: 'slider',
    loadComponent: () => import('./fixtures/slider.fixture').then((m) => m.SliderFixture),
  },
];
