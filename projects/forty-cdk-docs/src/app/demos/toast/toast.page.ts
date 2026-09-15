import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ToastActionExample } from './examples/action.example';
import { ToastDefaultExample } from './examples/default.example';
import { ToastSwipeExample } from './examples/swipe-to-dismiss.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/toast.generated';

@Component({
  selector: 'app-toast-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, ToastDefaultExample, ToastActionExample, ToastSwipeExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="toast" [doc]="doc">
      <demo-layout hero sourcePath="toast/examples/default.example.ts">
        <app-toast-default-example />
      </demo-layout>

      <demo-layout heading="action--live-update" sourcePath="toast/examples/action.example.ts">
        <app-toast-action-example />
      </demo-layout>

      <demo-layout
        heading="swipe-to-dismiss"
        sourcePath="toast/examples/swipe-to-dismiss.example.ts"
      >
        <app-toast-swipe-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class ToastPage {
  protected readonly doc = DOC;
}
