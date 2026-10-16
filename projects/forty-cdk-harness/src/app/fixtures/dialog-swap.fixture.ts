import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import {
  ForDialogClose,
  ForDialogManager,
  ForDialogRef,
  ForDialogTitle,
  type ForDialogOpenConfig,
} from 'forty-cdk/dialog';
import { queryFlag } from './_query-flag';

@Component({
  imports: [ForDialogTitle, ForDialogClose],
  template: `
    <h2 forDialogTitle>Step two</h2>
    <button data-testid="swap-step-two-close" forDialogClose>Done</button>
  `,
})
class SwapStepTwo {}

@Component({
  imports: [ForDialogTitle],
  template: `
    <h2 forDialogTitle>Step one</h2>
    <button data-testid="swap-step-one-next" (click)="next()">Next</button>
  `,
})
class SwapStepOne {
  readonly #dialogs = inject(ForDialogManager);
  readonly #ref = inject(ForDialogRef);
  readonly #closeFirst = queryFlag('closeFirst');
  readonly #config = swapConfig(queryFlag('animateLeave'));

  next(): void {
    if (this.#closeFirst) {
      this.#ref.close();
      this.#dialogs.open(SwapStepTwo, this.#config);
    } else {
      this.#dialogs.open(SwapStepTwo, this.#config);
      this.#ref.close();
    }
  }
}

function swapConfig(animateLeave: boolean): ForDialogOpenConfig {
  return animateLeave ? { class: 'swap-host', animateLeave: 'swap-leaving' } : {};
}

@Component({
  selector: 'app-dialog-swap-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .swap-host {
        opacity: 1;
        transition: opacity 200ms ease-out;
      }
      .swap-host.swap-leaving {
        opacity: 0;
      }
    `,
  ],
  template: `
    <button data-testid="open-swap-dialog" (click)="openDialog($event)">Open wizard</button>
  `,
})
export class DialogSwapFixture {
  readonly #dialogs = inject(ForDialogManager);
  readonly #config = swapConfig(queryFlag('animateLeave'));

  openDialog(event: Event): void {
    (event.currentTarget as HTMLElement).focus();
    this.#dialogs.open(SwapStepOne, this.#config);
  }
}
