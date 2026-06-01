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
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../ui/control-select';
import { DemoLayout } from '../ui/demo-layout';

interface CustomToastData {
  user: string;
  body: string;
}

@Component({
  selector: 'app-toast-demo',
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
      title="Toast"
      summary="Headless notifications driven programmatically: inject ForToastManager and call show({ title, … }) from anywhere, while a single <for-toast-viewport> renders the queue and owns the F6 focus hotkey. Toasts announce via role status/alert + aria-live per variant without stealing focus, auto-dismiss after a duration that pauses on hover/focus, and can be swiped away. The default toasts here style by [forToast] attribute selectors; 'Custom + class' shows the other path — show({ class }) carries a consumer class onto the toast root and a custom template keeps the [forToastTitle]/[forToastAction]/[forToastClose] helper directives (and their aria-labelledby / close wiring) intact."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/alert/"
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
          [options]="positionOptions"
          [(value)]="positionValue"
        />
        <app-control-select
          label="swipeDirection"
          [options]="swipeOptions"
          [(value)]="swipeValue"
        />
        <app-control-select
          label="duration"
          [options]="durationOptions"
          [(value)]="durationValue"
        />
        <app-control-select
          label="maxVisible"
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
export class ToastDemo {
  protected readonly manager = inject(ForToastManager);

  protected readonly customTpl =
    viewChild.required<TemplateRef<ForToastTemplateContext<CustomToastData>>>('customTpl');

  protected readonly positionOptions: readonly ControlOption[] = [
    { value: 'bottom-right', label: 'bottom-right' },
    { value: 'top-right', label: 'top-right' },
    { value: 'bottom-center', label: 'bottom-center' },
  ];

  protected readonly swipeOptions: readonly ControlOption[] = [
    { value: 'none', label: 'none' },
    { value: 'right', label: 'right' },
    { value: 'left', label: 'left' },
    { value: 'up', label: 'up' },
    { value: 'down', label: 'down' },
  ];

  protected readonly durationOptions: readonly ControlOption[] = [
    { value: '3000', label: '3 s' },
    { value: '5000', label: '5 s' },
    { value: '0', label: 'sticky (0)' },
  ];

  protected readonly maxVisibleOptions: readonly ControlOption[] = [
    { value: '3', label: '3' },
    { value: 'inf', label: '∞' },
  ];

  protected readonly positionValue = signal('bottom-right');
  protected readonly swipeValue = signal('right');
  protected readonly durationValue = signal('5000');
  protected readonly maxVisibleValue = signal('inf');
  protected readonly lastAction = signal('—');

  protected readonly swipeDirection = computed<'left' | 'right' | 'up' | 'down' | null>(() => {
    const value = this.swipeValue();
    return value === 'left' || value === 'right' || value === 'up' || value === 'down'
      ? value
      : null;
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
