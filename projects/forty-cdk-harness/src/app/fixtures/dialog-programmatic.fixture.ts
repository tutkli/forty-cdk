import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import {
  ForDialogClose,
  ForDialogManager,
  ForDialogTitle,
  injectDialogData,
} from 'forty-cdk/dialog';

interface ProgrammaticDialogData {
  message: string;
}

@Component({
  imports: [ForDialogTitle, ForDialogClose],
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .prog-host {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        opacity: 1;
        transition: opacity 250ms ease-out;
      }
      .prog-host.prog-leaving {
        opacity: 0;
      }
      @keyframes prog-enter-kf {
        from {
          opacity: 0;
        }
      }
      .prog-host.prog-entering {
        animation: prog-enter-kf 250ms ease-out;
      }
      .prog-panel {
        position: fixed;
        inset: 0;
        margin: auto;
        width: 300px;
        height: 160px;
        padding: 24px;
        background: white;
        border-radius: 8px;
      }
    `,
  ],
  template: `
    <div class="prog-panel" data-testid="prog-dialog-panel">
      <h2 data-testid="prog-dialog-title" forDialogTitle>Programmatic Dialog</h2>
      <p data-testid="prog-dialog-message">{{ data?.message }}</p>
      <button data-testid="prog-dialog-close" forDialogClose>Close</button>
    </div>
  `,
})
class ProgrammaticDialogContent {
  protected readonly data = injectDialogData<ProgrammaticDialogData>();
}

@Component({
  selector: 'app-dialog-programmatic-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button data-testid="open-prog-dialog" (click)="openDialog()">Open programmatic dialog</button>
  `,
})
export class DialogProgrammaticFixture {
  readonly #manager = inject(ForDialogManager);

  openDialog(): void {
    this.#manager.open(ProgrammaticDialogContent, {
      data: { message: 'Hello from the manager' },
      class: 'prog-host',
      animateEnter: 'prog-entering',
      animateLeave: 'prog-leaving',
    });
  }
}
