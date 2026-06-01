import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ToastExample } from './examples/toast.example';

@Component({
  selector: 'app-toast-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ToastExample],
  template: `
    <primitive-page slug="toast">
      <app-toast-example />
    </primitive-page>
  `,
})
export class ToastPage {}
