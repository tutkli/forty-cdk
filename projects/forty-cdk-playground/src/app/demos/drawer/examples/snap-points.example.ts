import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerHandle,
  type ForDrawerSnapPoint,
  ForDrawerTitle,
  ForDrawerTrigger,
} from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-drawer-snap-points-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Snap points"
      subtitle="Vaul-style snap points: drag the sheet between peek / half / full. Release resolves to the nearest snap by position (or dismisses past the lowest one). The consumer positions each snap via CSS keyed off data-active-snap-point; data-dragging disables the transition mid-gesture."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/snap-points.example.ts"
    >
      <div demo class="pg-center">
        <button
          forDrawerTrigger
          class="pg-btn pg-btn--primary"
          [(open)]="snapOpen"
          controls="pg-snap-drawer"
        >
          Open bottom sheet
        </button>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label='fade backdrop from "half"' [(checked)]="snapFade" />

        <p class="pg-state">
          active snap: <b>{{ snapActiveDisplay() }}</b>
        </p>
        <p class="pg-hint">
          Jump-to-snap buttons live inside the sheet — clicking outside a modal drawer dismisses it.
        </p>
      </div>
    </playground-demo>

    @if (snapOpen()) {
      <div
        forDrawer
        id="pg-snap-drawer"
        class="pg-drawer"
        [snapPoints]="snapPoints"
        [(activeSnapPoint)]="snapActive"
        [fadeFromIndex]="snapFade() ? 1 : undefined"
        (close)="snapOpen.set(false)"
        animate.enter="pg-drawer-in-bottom"
        animate.leave="pg-drawer-out-bottom"
      >
        <div
          forDrawerBackdrop
          class="pg-drawer-backdrop"
          [class.pg-drawer-backdrop--fade]="snapFade()"
        ></div>
        <div forDrawerHandle class="pg-drawer-handle"></div>
        <h2 forDrawerTitle class="pg-drawer-title">Snap points</h2>
        <div class="pg-btn-row">
          <button class="pg-btn" type="button" (click)="snapActive.set(peek)">Peek</button>
          <button class="pg-btn" type="button" (click)="snapActive.set(half)">Half</button>
          <button class="pg-btn" type="button" (click)="snapActive.set(full)">Full</button>
        </div>
        <div class="pg-drawer-scroll">
          @for (item of snapItems; track item) {
            <div class="pg-row">{{ item }}</div>
          }
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
export class DrawerSnapPointsExample {
  protected readonly peek: ForDrawerSnapPoint = '148px';
  protected readonly half: ForDrawerSnapPoint = 0.5;
  protected readonly full: ForDrawerSnapPoint = 1;
  protected readonly snapPoints: ReadonlyArray<ForDrawerSnapPoint> = [
    this.peek,
    this.half,
    this.full,
  ];
  protected readonly snapItems = Array.from({ length: 14 }, (_, i) => `List item ${i + 1}`);

  protected readonly snapOpen = signal(false);
  protected readonly snapActive = signal<ForDrawerSnapPoint | null>(this.peek);
  protected readonly snapFade = signal(false);
  protected readonly snapActiveDisplay = computed(() => {
    const value = this.snapActive();
    return value == null ? '—' : String(value);
  });
}
