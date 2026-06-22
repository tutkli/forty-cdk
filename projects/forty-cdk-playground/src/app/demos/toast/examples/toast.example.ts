import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import {
  ForToastAction,
  ForToastClose,
  ForToastDescription,
  ForToastManager,
  type ForToastTemplateContext,
  ForToastTitle,
  ForToastViewport,
} from 'forty-cdk/toast';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';

interface CustomToastData {
  user: string;
  body: string;
}

@Component({
  selector: 'app-toast-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForToastViewport,
    ForToastTitle,
    ForToastDescription,
    ForToastAction,
    ForToastClose,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Programmatic notifications"
      subtitle="Headless notifications driven programmatically: inject ForToastManager and call show({ title, … }) from anywhere, while a single <for-toast-viewport> renders the queue and owns the F6 focus hotkey. Toasts announce via role status/alert + aria-live per variant without stealing focus, auto-dismiss after a duration that pauses on hover/focus, and can be swiped away. The default toasts here style by [forToast] attribute selectors; 'Custom + class' shows the other path — show({ class }) carries a consumer class onto the toast root and a custom template keeps the [forToastTitle]/[forToastAction]/[forToastClose] helper directives (and their aria-labelledby / close wiring) intact."
      sourcePath="projects/forty-cdk-playground/src/app/demos/toast/examples/toast.example.ts"
    >
      <div demo class="toast-demo">
        <div class="toast-triggers">
          <div class="pg-btn-row">
            <button type="button" class="pg-btn" (click)="notify('info')">Info</button>
            <button type="button" class="pg-btn" (click)="notify('success')">Success</button>
            <button type="button" class="pg-btn" (click)="notify('warning')">Warning</button>
            <button type="button" class="pg-btn pg-btn--danger" (click)="notify('error')">
              Error
            </button>
          </div>
          <div class="pg-btn-row">
            <button type="button" class="pg-btn pg-btn--primary" (click)="notifyAction()">
              With action
            </button>
            <button type="button" class="pg-btn" (click)="notifyPromise()">Saving → Saved</button>
            <button type="button" class="pg-btn" (click)="notifyCustom()">Custom + class</button>
            <button type="button" class="pg-btn" (click)="manager.dismissAll()">Dismiss all</button>
          </div>
          <p class="pg-hint">
            Toasts pin to the screen corner set by the position control. Hover or focus pauses the
            timer; drag to dismiss when a swipe direction is set.
          </p>
        </div>

        <for-toast-viewport
          class="pg-toast-viewport"
          [attr.data-position]="positionValue()"
          [swipeDirection]="swipeDirection()"
          [maxVisible]="maxVisible()"
        />

        <ng-template #customTpl let-toast let-data="data">
          <div forToastTitle class="pg-toast-custom__title">{{ data.user }}</div>
          <div forToastDescription class="pg-toast-custom__body">{{ data.body }}</div>
          <button
            forToastAction
            class="pg-toast-custom__action"
            altText="View the new comment"
            (click)="lastAction.set('Viewed comment')"
          >
            View
          </button>
          <button forToastClose class="pg-toast-custom__close" aria-label="Dismiss">×</button>
        </ng-template>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="position"
          hint="Screen corner the toast stack pins to. This is a CSS hook on the viewport — the primitive imposes no positioning, so the demo styles each corner from the data-position attribute."
          [options]="positionOptions"
          [(value)]="positionValue"
        />
        <app-control-select
          label="swipeDirection"
          hint="Direction the user can drag a toast to dismiss it. 'none' disables swipe; once set, dragging past the swipe threshold removes the toast."
          [options]="swipeOptions"
          [(value)]="swipeValue"
        />
        <app-control-select
          label="duration"
          hint="Milliseconds before a toast auto-dismisses. Hovering or focusing pauses the timer and resumes with the time left. 0 keeps the toast sticky until dismissed."
          [options]="durationOptions"
          [(value)]="durationValue"
        />
        <app-control-select
          label="maxVisible"
          hint="Maximum toasts rendered at once. Older ones collapse out of the visible stack but stay queued until dismissed. ∞ renders every live toast."
          [options]="maxVisibleOptions"
          [(value)]="maxVisibleValue"
        />

        <p class="pg-state">
          open toasts: <b>{{ manager.count() }}</b
          ><br />
          last action: <b>{{ lastAction() }}</b>
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
export class ToastExample {
  protected readonly manager = inject(ForToastManager);

  protected readonly customTpl =
    viewChild.required<TemplateRef<ForToastTemplateContext<CustomToastData>>>('customTpl');

  protected readonly positionOptions: readonly ControlOption<
    'bottom-right' | 'top-right' | 'bottom-center'
  >[] = [
    { value: 'bottom-right', label: 'bottom-right' },
    { value: 'top-right', label: 'top-right' },
    { value: 'bottom-center', label: 'bottom-center' },
  ];

  protected readonly swipeOptions: readonly ControlOption<
    'none' | 'right' | 'left' | 'up' | 'down'
  >[] = [
    { value: 'none', label: 'none' },
    { value: 'right', label: 'right' },
    { value: 'left', label: 'left' },
    { value: 'up', label: 'up' },
    { value: 'down', label: 'down' },
  ];

  protected readonly durationOptions: readonly ControlOption<'3000' | '5000' | '0'>[] = [
    { value: '3000', label: '3 s' },
    { value: '5000', label: '5 s' },
    { value: '0', label: 'sticky (0)' },
  ];

  protected readonly maxVisibleOptions: readonly ControlOption<'3' | 'inf'>[] = [
    { value: '3', label: '3' },
    { value: 'inf', label: '∞' },
  ];

  protected readonly positionValue = signal<'bottom-right' | 'top-right' | 'bottom-center'>(
    'bottom-right',
  );
  protected readonly swipeValue = signal<'none' | 'right' | 'left' | 'up' | 'down'>('right');
  protected readonly durationValue = signal<'3000' | '5000' | '0'>('5000');
  protected readonly maxVisibleValue = signal<'3' | 'inf'>('inf');
  protected readonly lastAction = signal('—');

  protected readonly swipeDirection = computed<'left' | 'right' | 'up' | 'down' | null>(() => {
    const value = this.swipeValue();
    return value === 'none' ? null : value;
  });

  protected readonly duration = computed(() => Number(this.durationValue()));

  protected readonly maxVisible = computed(() =>
    this.maxVisibleValue() === 'inf' ? Infinity : Number(this.maxVisibleValue()),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.manager.dismissAll());
  }

  protected notify(variant: 'info' | 'success' | 'warning' | 'error'): void {
    const copy = {
      info: { title: 'Heads up', description: 'A new version is available.' },
      success: { title: 'Saved', description: 'Your changes were saved.' },
      warning: { title: 'Storage almost full', description: 'You have used 90% of your quota.' },
      error: { title: 'Upload failed', description: 'The file could not be uploaded.' },
    }[variant];
    this.manager.show({ variant, duration: this.duration(), ...copy });
  }

  protected notifyAction(): void {
    this.manager.show({
      title: 'Message archived',
      description: 'It was moved out of your inbox.',
      action: { label: 'Undo', onClick: () => this.lastAction.set('Undo clicked') },
      duration: 6000,
    });
  }

  protected notifyPromise(): void {
    const ref = this.manager.show({ title: 'Saving…', duration: 0 });
    setTimeout(
      () =>
        ref.update({
          title: 'Saved',
          description: 'All changes stored.',
          variant: 'success',
          duration: 2500,
        }),
      1200,
    );
  }

  protected notifyCustom(): void {
    this.manager.show<unknown, CustomToastData>({
      template: this.customTpl(),
      data: { user: 'Ada Lovelace', body: 'commented on your pull request.' },
      class: 'pg-toast-custom',
      duration: 6000,
    });
  }
}
