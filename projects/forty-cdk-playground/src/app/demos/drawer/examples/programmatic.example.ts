import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ForDrawerManager } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
import { ConfirmDrawer, type ConfirmResult } from './confirm-drawer';

@Component({
  selector: 'app-drawer-programmatic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout],
  template: `
    <playground-demo
      title="Programmatic (ForDrawerManager)"
      subtitle="Open an arbitrary component imperatively and await its result. The manager mounts the component under the same [forDrawer] engine, so every piece and input works identically; [forDrawerClose] [closeWith] propagates straight through to ForDrawerRef.close(value)."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/programmatic.example.ts"
    >
      <div demo class="pg-center">
        <button class="pg-btn pg-btn--danger" type="button" (click)="askConfirm()">
          Delete account…
        </button>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          last result: <b>{{ confirmResult() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .pg-center {
      display: flex;
      justify-content: center;
    }
  `,
})
export class DrawerProgrammaticExample {
  readonly #drawers = inject(ForDrawerManager);
  protected readonly confirmResult = signal('—');

  protected async askConfirm(): Promise<void> {
    const ref = this.#drawers.open<ConfirmDrawer, ConfirmResult>(ConfirmDrawer, {
      data: {
        title: 'Delete account?',
        message: 'This action is permanent and cannot be undone.',
      },
      side: 'bottom',
      ariaLabel: 'Delete account',
    });
    const result = await ref.closed;
    this.confirmResult.set(result ?? 'dismissed');
  }
}
