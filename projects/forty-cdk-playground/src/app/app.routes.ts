import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'accordion', pathMatch: 'full' },
  {
    path: 'accordion',
    loadComponent: () => import('./demos/accordion.demo').then((m) => m.AccordionDemo),
  },
  {
    path: 'dialog',
    loadComponent: () => import('./demos/dialog.demo').then((m) => m.DialogDemo),
  },
  {
    path: 'drawer',
    loadComponent: () => import('./demos/drawer.demo').then((m) => m.DrawerDemo),
  },
  {
    path: 'switch',
    loadComponent: () => import('./demos/switch.demo').then((m) => m.SwitchDemo),
  },
  {
    path: 'checkbox',
    loadComponent: () => import('./demos/checkbox.demo').then((m) => m.CheckboxDemo),
  },
  {
    path: 'toggle',
    loadComponent: () => import('./demos/toggle.demo').then((m) => m.ToggleDemo),
  },
  {
    path: 'radio-group',
    loadComponent: () => import('./demos/radio-group.demo').then((m) => m.RadioGroupDemo),
  },
  {
    path: 'slider',
    loadComponent: () => import('./demos/slider.demo').then((m) => m.SliderDemo),
  },
  {
    path: 'disclosure',
    loadComponent: () => import('./demos/disclosure.demo').then((m) => m.DisclosureDemo),
  },
  {
    path: 'tabs',
    loadComponent: () => import('./demos/tabs.demo').then((m) => m.TabsDemo),
  },
  {
    path: 'separator',
    loadComponent: () => import('./demos/separator.demo').then((m) => m.SeparatorDemo),
  },
  {
    path: 'aspect-ratio',
    loadComponent: () => import('./demos/aspect-ratio.demo').then((m) => m.AspectRatioDemo),
  },
  {
    path: 'avatar',
    loadComponent: () => import('./demos/avatar.demo').then((m) => m.AvatarDemo),
  },
  {
    path: 'progress',
    loadComponent: () => import('./demos/progress.demo').then((m) => m.ProgressDemo),
  },
  {
    path: 'meter',
    loadComponent: () => import('./demos/meter.demo').then((m) => m.MeterDemo),
  },
  {
    path: 'toolbar',
    loadComponent: () => import('./demos/toolbar.demo').then((m) => m.ToolbarDemo),
  },
  {
    path: 'scroll-area',
    loadComponent: () => import('./demos/scroll-area.demo').then((m) => m.ScrollAreaDemo),
  },
  {
    path: 'popover',
    loadComponent: () => import('./demos/popover.demo').then((m) => m.PopoverDemo),
  },
  {
    path: 'tooltip',
    loadComponent: () => import('./demos/tooltip.demo').then((m) => m.TooltipDemo),
  },
  {
    path: 'hover-card',
    loadComponent: () => import('./demos/hover-card.demo').then((m) => m.HoverCardDemo),
  },
  { path: '**', redirectTo: 'accordion' },
];
