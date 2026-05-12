import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForTabs,
  ForTabsContent,
  ForTabsList,
  ForTabsTrigger,
} from 'forty-cdk';

/**
 * Tabs harness fixture — exercises the WAI-ARIA tablist keyboard sequence on
 * real browsers (Tab into roving stop, ArrowLeft/Right with disabled-skip,
 * Home/End, manual vs automatic activation, Tab-into-panel).
 *
 * Mounts four triggers (`a`, `b`, `c`, `d`) so disabled-skip can be exercised
 * on a middle index without losing wrap-around coverage. The active panel
 * embeds a focusable `<button>` so the Tab-into-panel spec can assert focus
 * via `expectFocused` on a real focusable child.
 *
 * Query params:
 *  - `?activation=manual` (default `auto` / `automatic`) — switches the
 *    activation mode so arrow navigation only moves focus and Space / Enter
 *    activates.
 *  - `?disabled=<value>` — disables the trigger with that `value` (e.g.
 *    `?disabled=c`). Default `b` so the canonical "ArrowRight skips" path
 *    has a disabled middle tab without the spec needing to set one.
 *  - `?orientation=vertical` — switches to a vertical tablist (ArrowDown /
 *    ArrowUp navigation, `aria-orientation="vertical"`).
 *  - `?dir=rtl` — flips ArrowLeft / ArrowRight horizontally.
 */
@Component({
  selector: 'app-tabs-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <input data-testid="before" placeholder="before-tabs" />
    <div
      forTabs
      [(value)]="active"
      [activationMode]="activationMode"
      [orientation]="orientation"
      [dir]="dir"
    >
      <div forTabsList aria-label="Settings sections">
        <button
          data-testid="trigger-a"
          type="button"
          forTabsTrigger
          value="a"
          [disabled]="disabledValue === 'a'"
        >
          A
        </button>
        <button
          data-testid="trigger-b"
          type="button"
          forTabsTrigger
          value="b"
          [disabled]="disabledValue === 'b'"
        >
          B
        </button>
        <button
          data-testid="trigger-c"
          type="button"
          forTabsTrigger
          value="c"
          [disabled]="disabledValue === 'c'"
        >
          C
        </button>
        <button
          data-testid="trigger-d"
          type="button"
          forTabsTrigger
          value="d"
          [disabled]="disabledValue === 'd'"
        >
          D
        </button>
      </div>
      <section data-testid="content-a" forTabsContent value="a">
        <button data-testid="panel-button-a" type="button">Inside A</button>
      </section>
      <section data-testid="content-b" forTabsContent value="b">
        <button data-testid="panel-button-b" type="button">Inside B</button>
      </section>
      <section data-testid="content-c" forTabsContent value="c">
        <button data-testid="panel-button-c" type="button">Inside C</button>
      </section>
      <section data-testid="content-d" forTabsContent value="d">
        <button data-testid="panel-button-d" type="button">Inside D</button>
      </section>
    </div>
    <input data-testid="after" placeholder="after-tabs" />
  `,
})
export class TabsFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly activationMode: 'automatic' | 'manual' =
    this.#route.snapshot.queryParamMap.get('activation') === 'manual' ? 'manual' : 'automatic';
  protected readonly orientation: 'horizontal' | 'vertical' =
    this.#route.snapshot.queryParamMap.get('orientation') === 'vertical'
      ? 'vertical'
      : 'horizontal';
  protected readonly dir: 'ltr' | 'rtl' =
    this.#route.snapshot.queryParamMap.get('dir') === 'rtl' ? 'rtl' : 'ltr';
  protected readonly disabledValue: string =
    this.#route.snapshot.queryParamMap.get('disabled') ?? 'b';

  // Seed the selection so the roving entry trigger is deterministic ('a') —
  // matches Radix / APG behaviour where a tablist with an explicit selection
  // owns the tab stop at that trigger. The `data-state="active"` /
  // `aria-selected="true"` start state lets the activation specs compare
  // against "before navigation".
  protected readonly active = signal('a');
}
