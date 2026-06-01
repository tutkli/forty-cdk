import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ToastPersistentExample } from './examples/persistent.example';
import { ToastSwipeExample } from './examples/swipe-to-dismiss.example';
import { ToastExample } from './examples/toast.example';

@Component({
  selector: 'app-toast-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ToastExample, ToastPersistentExample, ToastSwipeExample],
  template: `
    <primitive-page slug="toast">
      <app-toast-example />
      <app-toast-persistent-example />
      <app-toast-swipe-example />
    </primitive-page>
  `,
})
export class ToastPage {}
