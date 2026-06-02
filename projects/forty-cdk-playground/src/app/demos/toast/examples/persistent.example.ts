import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ForToastManager, type ForToastRef } from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-toast-persistent-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ControlSwitch],
  template: `
    <playground-demo
      title="Persistent toasts"
      subtitle="duration: 0 makes a toast sticky — it never auto-dismisses, so it stays until something closes it. The closable flag decides whether the user can. A sticky-but-closable toast keeps its close button and Escape; a forced-action toast (closable: false) drops both — the only exit is its own action, which closes with reason 'action' regardless of closable. Use the latter for decisions the user must acknowledge."
      sourcePath="projects/forty-cdk-playground/src/app/demos/toast/examples/persistent.example.ts"
    >
      <div demo class="toast-demo">
        <div class="toast-triggers">
          <div class="pg-btn-row">
            <button type="button" class="pg-btn pg-btn--primary" (click)="notifySticky()">
              Sticky + closable
            </button>
            <button type="button" class="pg-btn" (click)="notifyForcedAction()">
              Forced action
            </button>
            <button type="button" class="pg-btn" (click)="manager.dismissAll()">Dismiss all</button>
          </div>
          <p class="pg-hint">
            The sticky toast waits for the close button or Escape. The forced-action toast has no
            close button and ignores Escape — only its Acknowledge button removes it. Toasts render
            in the single shared viewport above.
          </p>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="closable"
          hint="Applies to the next 'Sticky + closable' toast you open. When off, the toast renders no close button and Escape is ignored — duration 0 then means the toast is dismissable only programmatically."
          [(checked)]="closable"
        />

        <p class="pg-state">
          open toasts: <b>{{ manager.count() }}</b
          ><br />
          last outcome: <b>{{ lastOutcome() }}</b>
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
export class ToastPersistentExample {
  protected readonly manager = inject(ForToastManager);

  protected readonly closable = signal(true);
  protected readonly lastOutcome = signal('—');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.manager.dismissAll());
  }

  protected notifySticky(): void {
    const ref: ForToastRef = this.manager.show({
      variant: 'info',
      title: 'Update ready',
      description: 'Restart to apply version 2.4.0 whenever you are ready.',
      duration: 0,
      closable: this.closable(),
    });
    ref.closed.then(({ reason }) => this.lastOutcome.set(`sticky closed (${reason})`));
  }

  protected notifyForcedAction(): void {
    const ref: ForToastRef = this.manager.show({
      variant: 'warning',
      title: 'Session expiring',
      description: 'You will be signed out unless you keep the session alive.',
      duration: 0,
      closable: false,
      action: {
        label: 'Acknowledge',
        onClick: () => this.lastOutcome.set('acknowledged'),
      },
    });
    ref.closed.then(({ reason }) => this.lastOutcome.set(`forced closed (${reason})`));
  }
}
