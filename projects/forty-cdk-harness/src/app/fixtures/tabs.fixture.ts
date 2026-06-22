import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';

interface Tab {
  value: string;
  disabled: boolean;
  rich: boolean;
}

/**
 * Tabs harness fixture — exercises the WAI-ARIA tablist keyboard sequence on
 * real browsers (Tab into roving stop, ArrowLeft/Right with disabled-skip,
 * Home/End, manual vs automatic activation, Tab-into-panel).
 *
 * Mounts four triggers (`a`, `b`, `c`, `d`) so disabled-skip can be exercised
 * on a middle index without losing wrap-around coverage. Panels `a`–`c` embed
 * a focusable `<button>`, so per the WAI-ARIA Tabs APG they are NOT themselves
 * tab stops — Tab out of the tablist lands directly on the panel's focusable
 * child. Panel `d` is text-only, so it carries `tabindex="0"` and is reachable
 * by Tab itself; this lets the Tab-into-panel spec assert both branches of the
 * conditional-tabindex rule.
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
    <button data-testid="remove-active" type="button" (click)="removeA()">remove</button>
    <button data-testid="disable-active" type="button" (click)="disableA()">disable</button>
    <div
      forTabs
      [(value)]="active"
      [activationMode]="activationMode"
      [orientation]="orientation"
      [dir]="dir"
    >
      <div forTabsList aria-label="Settings sections">
        @for (tab of tabs(); track tab.value) {
          <button
            [attr.data-testid]="'trigger-' + tab.value"
            type="button"
            forTabsTrigger
            [value]="tab.value"
            [disabled]="tab.disabled"
          >
            {{ tab.value }}
          </button>
        }
      </div>
      @for (tab of tabs(); track tab.value) {
        <section
          [attr.data-testid]="'content-' + tab.value"
          forTabsContent
          [value]="tab.value"
          [hidden]="active() !== tab.value"
        >
          @if (tab.rich) {
            <button [attr.data-testid]="'panel-button-' + tab.value" type="button">
              Inside {{ tab.value }}
            </button>
          } @else {
            Inside {{ tab.value }} (text only)
          }
        </section>
      }
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
  // per the APG, a tablist with an explicit selection
  // owns the tab stop at that trigger. The `data-state="active"` /
  // `aria-selected="true"` start state lets the activation specs compare
  // against "before navigation".
  protected readonly active = signal<string | null>('a');

  protected readonly tabs = signal<readonly Tab[]>([
    { value: 'a', disabled: this.disabledValue === 'a', rich: true },
    { value: 'b', disabled: this.disabledValue === 'b', rich: true },
    { value: 'c', disabled: this.disabledValue === 'c', rich: true },
    { value: 'd', disabled: this.disabledValue === 'd', rich: false },
  ]);

  protected removeA(): void {
    this.tabs.update((list) => list.filter((t) => t.value !== 'a'));
  }

  protected disableA(): void {
    this.tabs.update((list) => list.map((t) => (t.value === 'a' ? { ...t, disabled: true } : t)));
  }
}
