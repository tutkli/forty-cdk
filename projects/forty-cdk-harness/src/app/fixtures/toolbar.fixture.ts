import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForToggleGroup,
  ForToggleGroupItem,
  ForToolbar,
  ForToolbarButton,
  ForToolbarSeparator,
} from 'forty-cdk';

/**
 * Fixture for the real-browser keyboard contract of `[forToolbar]`:
 * single-tabstop initialisation, ArrowLeft / Right cycling that skips
 * separators and disabled items, Home / End jumps, the
 * `orientation="vertical"` axis switch, and RTL inversion in horizontal
 * mode. jsdom mis-models tab cycles and `document.activeElement` for
 * mixed-child traversal (button → toggle → separator → disabled →
 * toggle-group item → button), so the skip-the-non-focusable contract
 * needs a real browser focus loop to be verified end-to-end.
 *
 * Children, in source order (data-testid in parens):
 *  1. `btn-1`           — `[forToolbarButton]`.
 *  2. `toggle`          — `[forToolbarButton]` button reflecting an
 *                         `aria-pressed` toggle state managed locally so
 *                         the fixture keeps a single source of `disabled`
 *                         on the host (combining `[forToggle]` with
 *                         `[forToolbarButton]` would double-bind
 *                         `[attr.disabled]` / `[attr.aria-disabled]`).
 *  3. `sep`             — `[forToolbarSeparator]` (NOT focusable).
 *  4. `btn-disabled`    — `[forToolbarButton] [disabled]` (registered but
 *                         skipped by navigation; the index is configurable
 *                         via `?disabled=N`).
 *  5. `tg-bold`         — `[forToggleGroupItem]` inside `[forToggleGroup]`
 *                         (registers with the parent toolbar's roving).
 *  6. `tg-italic`       — same group, second item.
 *  7. `btn-2`           — trailing `[forToolbarButton]`.
 *
 * Query params:
 *  - `?orientation=vertical` — switch the toolbar to vertical (ArrowUp /
 *    ArrowDown drive navigation; ArrowLeft / ArrowRight no-op).
 *  - `?dir=rtl` — set `dir="rtl"` on the toolbar; in horizontal mode this
 *    inverts ArrowLeft / ArrowRight.
 *  - `?disabled=N` — 0-based index of the focusable child to mark
 *    disabled. Defaults to `3` (the dedicated disabled-button slot).
 *
 * `before` / `after` `<input>` elements sit on either side of the toolbar
 * so specs can assert that the toolbar is a single Tab stop (Tab from
 * `before` lands inside; Tab from inside lands on `after`).
 */
@Component({
  selector: 'app-toolbar-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForToolbar,
    ForToolbarButton,
    ForToolbarSeparator,
    ForToggleGroup,
    ForToggleGroupItem,
  ],
  template: `
    <input data-testid="before" placeholder="before-toolbar" />
    <button data-testid="remove-active" type="button" (click)="removeBtn1()">remove</button>
    <button data-testid="disable-active" type="button" (click)="disableBtn1()">disable</button>
    <div
      data-testid="toolbar"
      forToolbar
      [orientation]="orientation"
      [dir]="dir"
      aria-label="Formatting"
    >
      @if (!btn1Removed()) {
        <button
          data-testid="btn-1"
          forToolbarButton
          [disabled]="isDisabled(0) || btn1Disabled()"
        >
          B1
        </button>
      }
      <button
        data-testid="toggle"
        forToolbarButton
        [attr.aria-pressed]="togglePressed() ? 'true' : 'false'"
        [disabled]="isDisabled(1)"
        (click)="togglePressed.set(!togglePressed())"
      >
        T
      </button>
      <span data-testid="sep" forToolbarSeparator></span>
      <button data-testid="btn-disabled" forToolbarButton [disabled]="isDisabled(3)">D</button>
      <div forToggleGroup multiple [(value)]="formatting">
        <button
          data-testid="tg-bold"
          forToggleGroupItem
          value="bold"
          [disabled]="isDisabled(4)"
        >
          Bold
        </button>
        <button
          data-testid="tg-italic"
          forToggleGroupItem
          value="italic"
          [disabled]="isDisabled(5)"
        >
          Italic
        </button>
      </div>
      <button data-testid="btn-2" forToolbarButton [disabled]="isDisabled(6)">B2</button>
    </div>
    <input data-testid="after" placeholder="after-toolbar" />
  `,
})
export class ToolbarFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly orientation: 'horizontal' | 'vertical' =
    this.#route.snapshot.queryParamMap.get('orientation') === 'vertical'
      ? 'vertical'
      : 'horizontal';

  protected readonly dir: 'ltr' | 'rtl' =
    this.#route.snapshot.queryParamMap.get('dir') === 'rtl' ? 'rtl' : 'ltr';

  protected readonly disabledIndex = computed(() => {
    const raw = this.#route.snapshot.queryParamMap.get('disabled');
    if (raw == null) return 3;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 3;
  });

  protected readonly togglePressed = signal(false);
  protected readonly formatting = signal<readonly string[]>([]);

  protected readonly btn1Removed = signal(false);
  protected readonly btn1Disabled = signal(false);

  protected isDisabled(childIndex: number): boolean {
    return this.disabledIndex() === childIndex;
  }

  protected removeBtn1(): void {
    this.btn1Removed.set(true);
  }

  protected disableBtn1(): void {
    this.btn1Disabled.set(true);
  }
}
