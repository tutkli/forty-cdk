import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import {
  ForMenuCheckboxItem,
  ForMenuContent,
  ForMenuItem,
  ForMenuItemIndicator,
  ForMenuRadioGroup,
  ForMenuRadioItem,
  ForMenuSeparator,
} from 'forty-cdk/menu';

/**
 * Default item set for the base-Menu fixture. Hand-picked so typeahead has
 * - two items sharing a starting letter (`banana` / `blueberry`) where the
 *   buffer-growth test can demonstrate that `"b"` lands on the first `b` item
 *   but `"bl"` within the debounce window lands on the *second*,
 * - one item per other starting letter for the single-key prefix tests,
 * - none starting with `m` so test labels never collide with the literal
 *   `menu` selector used elsewhere in the harness.
 */
const DEFAULT_ITEMS = [
  'apple',
  'apricot',
  'banana',
  'blueberry',
  'cherry',
  'cucumber',
  'date',
  'eggplant',
] as const;

/**
 * Indices (0-based, into the parsed items list) where a `[forMenuSeparator]`
 * is inserted *after* the item. Separators are decorative — they do not
 * register with the menu's item collection, so navigation skips over them
 * automatically. Hard-coded so the fixture always has at least one separator
 * between two enabled items for the arrow-skip tests, without adding another
 * query knob.
 */
const SEPARATOR_AFTER = new Set<number>([2]);

@Component({
  selector: 'app-menu-base-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuCheckboxItem,
    ForMenuContent,
    ForMenuItem,
    ForMenuItemIndicator,
    ForMenuRadioGroup,
    ForMenuRadioItem,
    ForMenuSeparator,
  ],
  template: `
    <input data-testid="before" placeholder="before-trigger" />
    <div forDropdownMenu [(open)]="open" ariaLabel="Test menu">
      <button data-testid="trigger" forDropdownMenuTrigger>Menu</button>
      @if (open()) {
        <div forMenuContent data-testid="menu">
          @for (item of items(); track item.id; let i = $index) {
            <button [attr.data-testid]="'item-' + item.id" forMenuItem [disabled]="item.disabled">
              {{ item.label }}
            </button>
            @if (separatorAfter(i)) {
              <hr [attr.data-testid]="'sep-' + i" forMenuSeparator />
            }
          }
          @if (indicators) {
            <hr data-testid="sep-indicators" forMenuSeparator />
            <button data-testid="item-fullscreen" forMenuCheckboxItem [(checked)]="fullscreen">
              <span forMenuItemIndicator [forceMount]="true">✓</span>
              Fullscreen
            </button>
            <button data-testid="item-gridlines" forMenuCheckboxItem [(checked)]="gridlines">
              <span forMenuItemIndicator [forceMount]="true">✓</span>
              Gridlines
            </button>
            <div forMenuRadioGroup [(value)]="sortBy">
              <button data-testid="item-newest" forMenuRadioItem value="newest">
                <span forMenuItemIndicator>●</span>
                Newest
              </button>
              <button data-testid="item-oldest" forMenuRadioItem value="oldest">
                <span forMenuItemIndicator>●</span>
                Oldest
              </button>
            </div>
          }
        </div>
      }
    </div>
    <input data-testid="after" placeholder="after-trigger" />
  `,
})
export class MenuBaseFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly open = signal(false);

  protected readonly indicators = this.#route.snapshot.queryParamMap.get('indicators') === '1';

  protected readonly fullscreen = signal(true);

  protected readonly gridlines = signal(false);

  protected readonly sortBy = signal<string | null>('newest');

  protected readonly items = computed(() => {
    const raw = this.#route.snapshot.queryParamMap.get('items');
    const labels = raw && raw.length > 0 ? raw.split(',').map((s) => s.trim()) : [...DEFAULT_ITEMS];
    const disabledRaw = this.#route.snapshot.queryParamMap.get('disabled') ?? '';
    const disabledIdx = new Set(
      disabledRaw
        .split(',')
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n)),
    );
    return labels.map((label, idx) => ({
      // Lower-cased id keeps `data-testid="item-apple"` stable regardless of
      // any future label-casing change.
      id: label.toLowerCase(),
      label: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(),
      disabled: disabledIdx.has(idx),
    }));
  });

  protected separatorAfter(index: number): boolean {
    return SEPARATOR_AFTER.has(index);
  }
}
