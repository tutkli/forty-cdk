import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerTitle,
  ForDrawerTrigger,
  provideForDrawerDefaults,
} from 'forty-cdk/drawer';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-drawer-nested-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideForDrawerDefaults({ nestedTranslateYpx: 16 })],
  imports: [
    DemoLayout,
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <playground-demo
      title="Nested drawers"
      subtitle="A drawer mounted inside another joins a LIFO stack automatically — no flag needed. The parent recedes (data-state-nested), focus stays trapped in the topmost, scroll-lock is refcounted, and Escape closes the topmost first."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/nested.example.ts"
    >
      <div demo class="pg-center">
        <button
          forDrawerTrigger
          class="pg-btn pg-btn--primary"
          [(open)]="nestedOpen"
          controls="pg-nested-parent"
        >
          Open parent drawer
        </button>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          parent: <b>{{ nestedOpen() ? 'open' : 'closed' }}</b
          ><br />child: <b>{{ nestedChildOpen() ? 'open' : 'closed' }}</b>
        </p>
      </div>
    </playground-demo>

    @if (nestedOpen()) {
      <div
        forDrawer
        id="pg-nested-parent"
        class="pg-drawer"
        (dismiss)="nestedOpen.set(false)"
        animate.enter="pg-drawer-in-bottom"
        animate.leave="pg-drawer-out-bottom"
      >
        <div
          forDrawerBackdrop
          class="pg-drawer-backdrop"
          animate.enter="pg-backdrop-in"
          animate.leave="pg-backdrop-out"
        ></div>
        <div forDrawerHandle class="pg-drawer-handle"></div>
        <h2 forDrawerTitle class="pg-drawer-title">Parent drawer</h2>
        <p forDrawerDescription class="pg-drawer-desc">
          Open a nested drawer — the parent recedes and Escape closes the topmost first.
        </p>
        <div class="pg-drawer-actions">
          <button class="pg-btn pg-btn--primary" type="button" (click)="nestedChildOpen.set(true)">
            Open nested
          </button>
          <button class="pg-btn" forDrawerClose>Close</button>
        </div>

        @if (nestedChildOpen()) {
          <div
            forDrawer
            id="pg-nested-child"
            class="pg-drawer"
            (dismiss)="nestedChildOpen.set(false)"
            animate.enter="pg-drawer-in-bottom"
            animate.leave="pg-drawer-out-bottom"
          >
            <div forDrawerHandle class="pg-drawer-handle"></div>
            <h2 forDrawerTitle class="pg-drawer-title">Nested drawer</h2>
            <p forDrawerDescription class="pg-drawer-desc">
              data-depth="1". Escape closes me first, then the parent.
            </p>
            <div class="pg-drawer-actions">
              <button class="pg-btn" forDrawerClose>Close</button>
            </div>
          </div>
        }
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
export class DrawerNestedExample {
  protected readonly nestedOpen = signal(false);
  protected readonly nestedChildOpen = signal(false);
}
