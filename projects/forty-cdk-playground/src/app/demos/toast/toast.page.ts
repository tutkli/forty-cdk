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
      <playground-demo
        title="Variants"
        subtitle="The programmatic path: inject ForToastManager and call show({ title, … }) from anywhere, while a single <for-toast-viewport> renders the queue and owns the F6 focus hotkey. Each variant maps to role status/alert + aria-live so screen readers announce it without stealing focus, and reflects data-variant so the [forToast] attribute selectors can paint a per-variant accent."
        sourcePath="projects/forty-cdk-playground/src/app/demos/toast/examples/default.example.ts"
      >
        <app-toast-default-example />
      </playground-demo>

      <playground-demo
        title="Action & live update"
        subtitle="An action toast carries a [forToastAction] button that runs your handler and closes with reason 'action'. The save flow shows ref.update() mutating a toast in place — 'Saving…' becomes 'Saved' with a new variant and duration, re-announced automatically when the text changes."
        sourcePath="projects/forty-cdk-playground/src/app/demos/toast/examples/action.example.ts"
      >
        <app-toast-action-example />
      </playground-demo>

      <playground-demo
        title="Swipe to dismiss"
        subtitle="Opt in with swipeDirection on the viewport. Drag a toast with mouse or touch: the directive clamps pointer travel to the active half-line and exposes it as the --for-toast-swipe-movement-x/y variables, which the CSS turns into a live translate3d. Release past swipeThreshold to dismiss with reason 'swipe'; release short and data-swipe='cancel' springs it back."
        sourcePath="projects/forty-cdk-playground/src/app/demos/toast/examples/swipe-to-dismiss.example.ts"
      >
        <app-toast-swipe-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ToastPage {
  protected readonly readme = readmeContent;
}
