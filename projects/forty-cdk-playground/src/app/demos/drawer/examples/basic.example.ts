import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerClose,
  type ForDrawerCloseReason,
  ForDrawerDescription,
  ForDrawerHandle,
  type ForDrawerSide,
  ForDrawerTitle,
  ForDrawerTrigger,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-drawer-basic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
    ControlSwitch,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Sides & anatomy"
      subtitle="A side / bottom-sheet built on the Modal Dialog pattern — focus trap, scroll lock, Escape, dismissable layer and portal, plus pointer-driven swipe-to-dismiss. Surfaces portal to <body>, so their CSS lives in styles.css (global)."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/basic.example.ts"
    >
      <div demo class="pg-center">
        <button
          forDrawerTrigger
          class="pg-btn pg-btn--primary"
          [(open)]="basicOpen"
          controls="pg-basic-drawer"
        >
          Open drawer
        </button>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="side"
          hint="Edge the drawer is anchored to. Sets the swipe-to-dismiss direction and the data-side attribute the consumer styles off."
          [options]="sideOptions"
          [(value)]="basicSide"
        />
        <app-control-switch
          label="modal"
          hint="Locks body scroll, traps focus, and inerts the rest of the page. Turn off for a non-modal drawer that coexists with the page behind it."
          [(checked)]="basicModal"
        />
        <app-control-switch
          label="dismissible"
          hint="When on, Escape, backdrop click, clicking outside, and a swipe past the close threshold all close the drawer. Turn off for confirm flows that must be answered explicitly."
          [(checked)]="basicDismissible"
        />
        <app-control-switch
          label="alert"
          hint="Switches the role to alertdialog so assistive tech interrupts the user — for destructive or must-acknowledge prompts rather than a plain dialog."
          [(checked)]="basicAlert"
        />
        <app-control-switch
          label="handleOnly"
          hint="The swipe gesture only arms when the drag starts on the drawer handle, so scrollable content inside keeps its own scroll gesture."
          [(checked)]="basicHandleOnly"
        />
        <app-control-switch
          label="swipeToDismiss"
          hint="Enables the pointer-drag gesture: dragging the surface toward its anchored edge past the close threshold dismisses it."
          [(checked)]="basicSwipe"
        />

        <p class="pg-state">
          last close: <b>{{ basicReason() ?? '—' }}</b>
        </p>
      </div>
    </playground-demo>

    @if (basicOpen()) {
      <div
        forDrawer
        id="pg-basic-drawer"
        class="pg-drawer"
        [side]="basicSide()"
        [modal]="basicModal()"
        [dismissible]="basicDismissible()"
        [alert]="basicAlert()"
        [handleOnly]="basicHandleOnly()"
        [swipeToDismiss]="basicSwipe()"
        (close)="onBasicClose($event)"
        [animate.enter]="basicEnter()"
        [animate.leave]="basicLeave()"
      >
        <div
          forDrawerBackdrop
          class="pg-drawer-backdrop"
          animate.enter="pg-backdrop-in"
          animate.leave="pg-backdrop-out"
        ></div>
        @if (basicVertical()) {
          <div forDrawerHandle class="pg-drawer-handle"></div>
        }
        <h2 forDrawerTitle class="pg-drawer-title">Drawer title</h2>
        <p forDrawerDescription class="pg-drawer-desc">
          Swipe toward the edge, press Escape, or click the backdrop to dismiss.
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
export class DrawerBasicExample {
  protected readonly sideOptions: readonly ControlOption<ForDrawerSide>[] = [
    { value: 'bottom', label: 'bottom' },
    { value: 'top', label: 'top' },
    { value: 'left', label: 'left' },
    { value: 'right', label: 'right' },
  ];

  protected readonly basicOpen = signal(false);
  protected readonly basicSide = signal<ForDrawerSide>('bottom');
  protected readonly basicModal = signal(true);
  protected readonly basicDismissible = signal(true);
  protected readonly basicAlert = signal(false);
  protected readonly basicHandleOnly = signal(false);
  protected readonly basicSwipe = signal(true);
  protected readonly basicReason = signal<ForDrawerCloseReason | null>(null);

  protected readonly basicVertical = computed(
    () => this.basicSide() === 'bottom' || this.basicSide() === 'top',
  );
  protected readonly basicEnter = computed(() => `pg-drawer-in-${this.basicSide()}`);
  protected readonly basicLeave = computed(() => `pg-drawer-out-${this.basicSide()}`);

  protected onBasicClose(reason: ForDrawerCloseReason): void {
    this.basicReason.set(reason);
    this.basicOpen.set(false);
  }
}
