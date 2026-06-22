import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ForToastManager, type ForToastRef, type ForToastSwipeDirection } from 'forty-cdk/toast';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';

type SwipeChoice = 'right' | 'left' | 'up' | 'down' | 'right-down';

@Component({
  selector: 'app-toast-swipe-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ControlSelect],
  template: `
    <playground-demo
      title="Swipe to dismiss"
      subtitle="Each toast configures its own swipeDirection (single or an array of directions) and swipeThreshold in the show() config. Drag a toast with the mouse or a touch pointer: the dominant axis of your drag picks the active direction, the directive clamps pointer travel to that half-line and exposes it as the --for-toast-swipe-movement-x/y CSS variables, and the demo's global CSS turns those into a live translate3d. Release past the threshold and the toast closes with reason 'swipe'; release short and data-swipe='cancel' springs it back."
      sourcePath="projects/forty-cdk-playground/src/app/demos/toast/examples/swipe-to-dismiss.example.ts"
    >
      <div demo class="toast-demo">
        <div class="toast-triggers">
          <div class="pg-btn-row">
            <button type="button" class="pg-btn pg-btn--primary" (click)="notify()">
              Show a swipeable toast
            </button>
            <button type="button" class="pg-btn" (click)="manager.dismissAll()">Dismiss all</button>
          </div>
          <p class="pg-hint">
            Press and drag a toast toward the configured direction. The card follows your pointer;
            let go past {{ threshold() }} px to dismiss, or short of it to spring back. Toasts
            render in the single shared viewport above.
          </p>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="swipeDirection"
          hint="Direction(s) the drag can dismiss in. 'right + down' passes an array, so either dominant axis arms the gesture; the perpendicular drag is dropped."
          [options]="directionOptions"
          [(value)]="directionChoice"
        />
        <app-control-select
          label="swipeThreshold"
          hint="Pixels of pointer travel along the active direction needed to commit the dismiss. Below it, the release cancels and the card springs back."
          [options]="thresholdOptions"
          [(value)]="thresholdChoice"
        />

        <p class="pg-state">
          open toasts: <b>{{ manager.count() }}</b
          ><br />
          last swipe: <b>{{ lastSwipe() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .toast-demo {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      width: 100%;
    }

    .toast-triggers {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      align-items: center;
      max-width: 420px;
    }
  `,
})
export class ToastSwipeExample {
  protected readonly manager = inject(ForToastManager);

  protected readonly directionOptions: readonly ControlOption<SwipeChoice>[] = [
    { value: 'right', label: 'right' },
    { value: 'left', label: 'left' },
    { value: 'up', label: 'up' },
    { value: 'down', label: 'down' },
    { value: 'right-down', label: 'right + down' },
  ];

  protected readonly thresholdOptions: readonly ControlOption<'30' | '50' | '90'>[] = [
    { value: '30', label: '30 px' },
    { value: '50', label: '50 px (default)' },
    { value: '90', label: '90 px' },
  ];

  protected readonly directionChoice = signal<SwipeChoice>('right');
  protected readonly thresholdChoice = signal<'30' | '50' | '90'>('50');
  protected readonly lastSwipe = signal('—');

  protected readonly threshold = computed(() => Number(this.thresholdChoice()));

  protected readonly swipeDirection = computed<ForToastSwipeDirection>(() => {
    const choice = this.directionChoice();
    return choice === 'right-down' ? ['right', 'down'] : choice;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.manager.dismissAll());
  }

  protected notify(): void {
    const ref: ForToastRef = this.manager.show({
      variant: 'info',
      title: 'Swipe me away',
      description: 'Drag toward the configured direction to dismiss.',
      duration: 0,
      swipeDirection: this.swipeDirection(),
      swipeThreshold: this.threshold(),
    });
    ref.closed.then(({ reason }) => this.lastSwipe.set(`closed (${reason})`));
  }
}
