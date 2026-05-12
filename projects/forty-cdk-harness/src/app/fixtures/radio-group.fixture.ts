import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForRadio, ForRadioGroup } from 'forty-cdk';

/**
 * Fixture for the WAI-ARIA Radio Group focus / keyboard contract that jsdom
 * can't reliably exercise: single-tabstop initialisation on the checked
 * option, ArrowUp / ArrowDown / ArrowLeft / ArrowRight driving focus AND
 * selection together (auto-activation), wrap-around at the ends,
 * disabled-skip during navigation, and RTL inversion in horizontal mode.
 *
 * Four radios in DOM order: `opt-0`, `opt-1`, `opt-2`, `opt-3` with values
 * `a`, `b`, `c`, `d`. The `before` and `after` inputs sandwich the group so
 * specs can assert single-tabstop semantics (one Tab in lands on the
 * checked-or-first-enabled radio; one Tab out lands on `after`, not on
 * `opt-1`).
 *
 * Query params:
 *  - `?orientation=horizontal` — flips keyboard axis (Left/Right instead of
 *    Up/Down). Default `vertical`.
 *  - `?dir=rtl` — sets the group's `dir` input for horizontal RTL inversion.
 *  - `?disabled=2` (or comma-separated `?disabled=1,2`) — disables those
 *    radios by zero-based index, so `?disabled=2` skips `opt-2`. The
 *    disabled-skip spec relies on a single mid-list disabled option.
 *  - `?checked=3` — pre-checks the radio at that zero-based index. Default
 *    is empty (no selection) so the first-enabled tabstop branch is testable.
 */
@Component({
  selector: 'app-radio-group-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForRadioGroup, ForRadio],
  template: `
    <input data-testid="before" placeholder="before-radio-group" />
    <div
      data-testid="group"
      forRadioGroup
      [(value)]="value"
      [orientation]="orientation"
      [dir]="dir"
      aria-label="Test radio group"
    >
      @for (opt of options; track opt.value; let i = $index) {
        <button
          type="button"
          forRadio
          [value]="opt.value"
          [disabled]="disabled.has(i)"
          [attr.data-testid]="'opt-' + i"
        >
          {{ opt.label }}
        </button>
      }
    </div>
    <input data-testid="after" placeholder="after-radio-group" />
  `,
})
export class RadioGroupFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly options: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Bravo' },
    { value: 'c', label: 'Charlie' },
    { value: 'd', label: 'Delta' },
  ];

  protected readonly orientation: 'horizontal' | 'vertical' =
    this.#route.snapshot.queryParamMap.get('orientation') === 'horizontal'
      ? 'horizontal'
      : 'vertical';

  protected readonly dir: 'ltr' | 'rtl' =
    this.#route.snapshot.queryParamMap.get('dir') === 'rtl' ? 'rtl' : 'ltr';

  protected readonly disabled: ReadonlySet<number> = parseIndexSet(
    this.#route.snapshot.queryParamMap.get('disabled'),
  );

  protected readonly value = signal<string>(
    parseCheckedValue(
      this.#route.snapshot.queryParamMap.get('checked'),
      this.options.map((o) => o.value),
    ),
  );
}

function parseIndexSet(raw: string | null): ReadonlySet<number> {
  if (!raw) return new Set();
  const parts = raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0);
  return new Set(parts);
}

function parseCheckedValue(raw: string | null, values: readonly string[]): string {
  if (!raw) return '';
  const idx = Number.parseInt(raw.trim(), 10);
  if (!Number.isInteger(idx) || idx < 0 || idx >= values.length) return '';
  return values[idx]!;
}
