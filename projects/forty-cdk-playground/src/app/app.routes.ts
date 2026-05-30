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
  { path: '**', redirectTo: 'accordion' },
];
