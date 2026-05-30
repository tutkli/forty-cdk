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
    path: 'switch',
    loadComponent: () => import('./demos/switch.demo').then((m) => m.SwitchDemo),
  },
  { path: '**', redirectTo: 'accordion' },
];
