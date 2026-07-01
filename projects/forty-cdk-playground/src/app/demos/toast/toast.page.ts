import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ToastActionExample } from './examples/action.example';
import { ToastDefaultExample } from './examples/default.example';
import { ToastSwipeExample } from './examples/swipe-to-dismiss.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/toast/README.md';

@Component({
  selector: 'app-toast-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, ToastDefaultExample, ToastActionExample, ToastSwipeExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="toast" [readme]="readme">
      <playground-demo hero sourcePath="toast/examples/default.example.ts">
        <app-toast-default-example />
      </playground-demo>

      <playground-demo
        title="Action & live update"
        subtitle="An action toast carries a <code>[forToastAction]</code> button that runs your handler and closes with reason <code>'action'</code>. The save flow shows <code>ref.update()</code> mutating a toast in place — 'Saving…' becomes 'Saved' with a new <code>variant</code> and <code>duration</code>, re-announced automatically when the text changes."
        sourcePath="toast/examples/action.example.ts"
      >
        <app-toast-action-example />
      </playground-demo>

      <playground-demo
        title="Swipe to dismiss"
        subtitle="Opt in with <code>swipeDirection</code> on the viewport. Drag a toast with mouse or touch: the directive clamps pointer travel to the active half-line and exposes it as the <code>--for-toast-swipe-movement-x/y</code> variables, which the CSS turns into a live <code>translate3d</code>. Release past <code>swipeThreshold</code> to dismiss with reason <code>'swipe'</code>; release short and <code>data-swipe='cancel'</code> springs it back."
        sourcePath="toast/examples/swipe-to-dismiss.example.ts"
      >
        <app-toast-swipe-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ToastPage {
  protected readonly readme = readmeContent;
}
