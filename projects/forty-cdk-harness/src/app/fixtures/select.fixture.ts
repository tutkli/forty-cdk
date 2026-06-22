import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { type VetoableEvent } from 'forty-cdk/core';
import {
  ForSelect,
  ForSelectAnchor,
  ForSelectContent,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-select-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForSelect,
    ForSelectAnchor,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
  ],
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
      /* The decorated field box is deliberately wider than the inner trigger
         so anchor-vs-trigger positioning is distinguishable by width. */
      [forSelectAnchor] {
        display: inline-flex;
        align-items: center;
        width: 280px;
        padding: 0 8px;
        box-sizing: border-box;
        border: 1px solid #ccc;
      }
    `,
  ],
  template: `
    <input id="before" data-testid="before" placeholder="before-trigger" />
    @if (spacer) {
      <!-- Pushes the trigger down so item-aligned positioning has room to
           center the selected option over it without clamping to the top
           viewport padding. -->
      <div data-testid="spacer" style="height: 240px;"></div>
    }
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
      @if (anchor) {
        <div data-testid="anchor" forSelectAnchor>
          <span aria-hidden="true">🔎</span>
          <button data-testid="trigger" forSelectTrigger style="flex: 1; height: 32px;">
            <span forSelectValue></span>
          </button>
        </div>
      } @else {
        <button data-testid="trigger" forSelectTrigger style="width: 160px; height: 32px;">
          <span forSelectValue></span>
        </button>
      }
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
  // `?selected=<value>` pre-fills the selection so specs can exercise the
  // "selected-but-disabled" anchoring path (e.g. `?selected=banana`, which is
  // rendered as a `disabled` option). Empty by default.
  protected readonly value = signal<readonly string[]>(
    (() => {
      const selected = inject(ActivatedRoute).snapshot.queryParamMap.get('selected');
      return selected ? [selected] : [];
    })(),
  );
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

  // `?spacer=1` inserts vertical space above the trigger so the item-aligned
  // positioner can center a selected option over the trigger without hitting
  // the top viewport-padding clamp.
  protected readonly spacer = queryFlag('spacer');

  // `?anchor=1` wraps the trigger in a wider `[forSelectAnchor]` field box so
  // e2e specs can assert the listbox is positioned / sized against the box
  // (`--for-anchor-width` ≈ 280px) rather than the inner trigger (160px).
  protected readonly anchor = queryFlag('anchor');

  private readonly vetoOpen = queryFlag('vetoOpen');
  private readonly vetoClose = queryFlag('vetoClose');

  protected onAutoOpen(event: VetoableEvent): void {
    if (this.vetoOpen) event.preventDefault();
  }

  protected onAutoClose(event: VetoableEvent): void {
    if (this.vetoClose) event.preventDefault();
  }
}
