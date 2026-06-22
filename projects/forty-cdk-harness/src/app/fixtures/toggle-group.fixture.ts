import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';

/**
 * Fixture for the standalone `[forToggleGroup]` roving-tabindex contract
 * that jsdom can't reliably exercise: single-tabstop initialisation, arrow
 * navigation, and — the focus of this fixture — the roving tab stop
 * following focus so Shift+Tab re-entry restores the last focused item.
 *
 * Three items in DOM order: `tg-left`, `tg-center`, `tg-right` with values
 * `left`, `center`, `right`. The `before` and `after` inputs sandwich the
 * group so specs can assert single-tabstop semantics and re-entry: Tab from
 * `before` lands inside; Tab from inside lands on `after`; Shift+Tab from
 * `after` returns to whichever item last held focus.
 *
 * Query params:
 *  - `?orientation=vertical` — switch the keyboard axis to ArrowUp /
 *    ArrowDown. Default `horizontal`.
 *  - `?dir=rtl` — set `dir="rtl"` on the group for horizontal RTL inversion.
 */
@Component({
  selector: 'app-toggle-group-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForToggleGroup, ForToggleGroupItem],
  template: `
    <input data-testid="before" placeholder="before-toggle-group" />
    <div
      data-testid="group"
      forToggleGroup
      multiple
      [(value)]="value"
      [orientation]="orientation"
      [dir]="dir"
      aria-label="Formatting"
    >
      @for (item of items; track item.value) {
        <button forToggleGroupItem [value]="item.value" [attr.data-testid]="'tg-' + item.value">
          {{ item.label }}
        </button>
      }
    </div>
    <input data-testid="after" placeholder="after-toggle-group" />
  `,
})
export class ToggleGroupFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly items: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ];

  protected readonly orientation: 'horizontal' | 'vertical' =
    this.#route.snapshot.queryParamMap.get('orientation') === 'vertical'
      ? 'vertical'
      : 'horizontal';

  protected readonly dir: 'ltr' | 'rtl' =
    this.#route.snapshot.queryParamMap.get('dir') === 'rtl' ? 'rtl' : 'ltr';

  protected readonly value = signal<readonly string[]>([]);
}
