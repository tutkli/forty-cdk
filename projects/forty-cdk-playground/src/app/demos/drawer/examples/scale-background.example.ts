import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDrawer,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerTitle,
  ForDrawerTrigger,
} from 'forty-cdk/drawer';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-drawer-scale-background-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Scale background"
      subtitle="Scale-background effect: [forDrawerWrapper] lives on the playground app shell, so opening this drawer scales and rounds the corners of the whole screen behind it — exactly the real-app effect. Watch the entire playground recede."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/scale-background.example.ts"
    >
      <div demo class="pg-center">
        <button
          forDrawerTrigger
          class="pg-btn pg-btn--primary"
          [(open)]="scaleOpen"
          controls="pg-scale-drawer"
        >
          Open drawer
        </button>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="setBackgroundColorOnScale"
          hint="Paints the body behind the scaled page so the gap between the receded wrapper and the viewport edge doesn't show through. Only applies while scaleBackground is on."
          [(checked)]="scaleBgColor"
        />

        <p class="pg-state">
          drawer: <b>{{ scaleOpen() ? 'open' : 'closed' }}</b>
        </p>
        <p class="pg-hint">
          The wrapper is on the app shell — the whole page scales behind the sheet.
        </p>
      </div>
    </playground-demo>

    @if (scaleOpen()) {
      <div
        forDrawer
        id="pg-scale-drawer"
        class="pg-drawer pg-drawer--tall"
        [scaleBackground]="true"
        [setBackgroundColorOnScale]="scaleBgColor()"
        (dismiss)="scaleOpen.set(false)"
        animate.enter="pg-drawer-in-bottom"
        animate.leave="pg-drawer-out-bottom"
      >
        <div forDrawerHandle class="pg-drawer-handle"></div>
        <h2 forDrawerTitle class="pg-drawer-title">Scaled background</h2>
        <p forDrawerDescription class="pg-drawer-desc">
          The wrapper behind receded and rounded its corners.
        </p>
        <div class="pg-drawer-actions">
          <button class="pg-btn" forDrawerClose>Close</button>
        </div>
      </div>
    }
  `,
  styles: `
    .pg-center {
      display: flex;
      justify-content: center;
    }
  `,
})
export class DrawerScaleBackgroundExample {
  protected readonly scaleOpen = signal(false);
  protected readonly scaleBgColor = signal(true);
}
