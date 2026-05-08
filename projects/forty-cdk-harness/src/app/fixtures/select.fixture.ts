import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForSelect,
  ForSelectContent,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
  type VetoableEvent,
} from 'forty-cdk';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-select-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSelect, ForSelectTrigger, ForSelectValue, ForSelectContent, ForSelectOption],
  template: `
    <input id="before" placeholder="before-trigger" />
    <div
      forSelect
      [(value)]="value"
      [(open)]="open"
      placeholder="Pick a fruit"
      ariaLabel="Fruit picker"
      (autoFocusOnOpen)="onAutoOpen($event)"
      (autoFocusOnClose)="onAutoClose($event)"
    >
      <button data-testid="trigger" forSelectTrigger>
        <span forSelectValue></span>
      </button>
      @if (open()) {
        <div forSelectContent data-testid="content">
          <button data-testid="opt-apple" forSelectOption value="apple">Apple</button>
          <button data-testid="opt-banana" forSelectOption value="banana" disabled>Banana</button>
          <button data-testid="opt-cherry" forSelectOption value="cherry">Cherry</button>
          <button data-testid="opt-date" forSelectOption value="date">Date</button>
        </div>
      }
    </div>
    <input id="after" placeholder="after-trigger" />
  `,
})
export class SelectFixture {
  protected readonly value = signal<readonly string[]>([]);
  protected readonly open = signal(false);

  private readonly vetoOpen = queryFlag('vetoOpen');
  private readonly vetoClose = queryFlag('vetoClose');

  protected onAutoOpen(event: VetoableEvent): void {
    if (this.vetoOpen) event.preventDefault();
  }

  protected onAutoClose(event: VetoableEvent): void {
    if (this.vetoClose) event.preventDefault();
  }
}
