import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  styles: [
    `
      [forSelectContent] {
        background: white;
        border: 1px solid #ccc;
        min-width: 160px;
      }
      [forSelectOption] {
        display: block;
        width: 100%;
        text-align: left;
        padding: 6px 8px;
        height: 32px;
        box-sizing: border-box;
      }
    `,
  ],
  template: `
    <input id="before" data-testid="before" placeholder="before-trigger" />
    <div
      forSelect
      [(value)]="value"
      [(open)]="open"
      [position]="position"
      [modal]="modal"
      placeholder="Pick a fruit"
      ariaLabel="Fruit picker"
      (autoFocusOnOpen)="onAutoOpen($event)"
      (autoFocusOnClose)="onAutoClose($event)"
    >
      <button data-testid="trigger" forSelectTrigger style="width: 160px; height: 32px;">
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
    <input id="after" data-testid="after" placeholder="after-trigger" />
  `,
})
export class SelectFixture {
  protected readonly value = signal<readonly string[]>([]);
  protected readonly open = signal(false);

  // `?position=item-aligned` switches the [forSelectContent] positioner to
  // the macOS-style overlay mode so e2e specs can exercise the
  // `injectItemAlignedPositioner` math against real browser layout.
  protected readonly position: 'popper' | 'item-aligned' =
    inject(ActivatedRoute).snapshot.queryParamMap.get('position') === 'item-aligned'
      ? 'item-aligned'
      : 'popper';

  // `?modal=1` routes [forSelectContent] through `_internal/modal-shell` (focus
  // trap + inert siblings + body-scroll-lock) instead of the anchored popover.
  protected readonly modal = queryFlag('modal');

  private readonly vetoOpen = queryFlag('vetoOpen');
  private readonly vetoClose = queryFlag('vetoClose');

  protected onAutoOpen(event: VetoableEvent): void {
    if (this.vetoOpen) event.preventDefault();
  }

  protected onAutoClose(event: VetoableEvent): void {
    if (this.vetoClose) event.preventDefault();
  }
}
