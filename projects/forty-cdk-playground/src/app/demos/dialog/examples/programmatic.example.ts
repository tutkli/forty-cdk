import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ForDialogManager } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
import { type ConfirmData, ConfirmDialog, type ConfirmResult } from './confirm-dialog';

@Component({
  selector: 'app-dialog-programmatic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout],
  template: `
    <playground-demo
      title="Programmatic (ForDialogManager)"
      subtitle="Open a component imperatively and await its result. The manager mounts it under the same [forDialog] engine, so every piece works identically; [forDialogClose] [closeWith] propagates straight to ForDialogRef.close(value). Here as a non-dismissible alertdialog."
      sourcePath="projects/forty-cdk-playground/src/app/demos/dialog/examples/programmatic.example.ts"
    >
      <div demo class="pg-center">
        <button class="pg-btn pg-btn--danger" type="button" (click)="askToDelete()">
          Delete account…
        </button>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          last result: <b>{{ confirmResult() }}</b
          ><br />open dialogs: <b>{{ dialogs.openCount() }}</b>
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
export class DialogProgrammaticExample {
  protected readonly dialogs = inject(ForDialogManager);
  protected readonly confirmResult = signal('—');

  protected async askToDelete(): Promise<void> {
    const ref = this.dialogs.open<ConfirmDialog, ConfirmResult, ConfirmData>(ConfirmDialog, {
      data: {
        title: 'Delete account?',
        message: 'This action is permanent and cannot be undone.',
      },
      alert: true,
      dismissible: false,
    });
    const result = await ref.closed;
    this.confirmResult.set(result ?? 'dismissed');
  }
}
