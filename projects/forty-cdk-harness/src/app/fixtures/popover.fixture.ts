import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForPopover,
  ForPopoverClose,
  ForPopoverContent,
  ForPopoverTrigger,
  type VetoableEvent,
} from 'forty-cdk';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-popover-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent, ForPopoverClose],
  template: `
    <input id="before" placeholder="before-trigger" />
    @if (tall) {
      <div data-testid="spacer-before" style="height: 1000px"></div>
    }
    <div
      forPopover
      [(open)]="open"
      ariaLabel="Test popover"
      (autoFocusOnOpen)="onAutoOpen($event)"
      (autoFocusOnClose)="onAutoClose($event)"
    >
      <button data-testid="trigger" forPopoverTrigger>Open popover</button>
      @if (open()) {
        <div forPopoverContent data-testid="popover">
          <button data-testid="first">First</button>
          <button data-testid="second">Second</button>
          <input data-testid="text-input" />
          <button data-testid="close-btn" forPopoverClose>Close</button>
        </div>
      }
    </div>
    @if (tall) {
      <div data-testid="spacer-after" style="height: 1000px"></div>
    }
    <input id="after" placeholder="after-trigger" />
  `,
})
export class PopoverFixture {
  protected readonly open = signal(false);

  protected readonly tall = queryFlag('tall');
  private readonly vetoOpen = queryFlag('vetoOpen');
  private readonly vetoClose = queryFlag('vetoClose');

  protected onAutoOpen(event: VetoableEvent): void {
    if (this.vetoOpen) event.preventDefault();
  }

  protected onAutoClose(event: VetoableEvent): void {
    if (this.vetoClose) event.preventDefault();
  }
}
