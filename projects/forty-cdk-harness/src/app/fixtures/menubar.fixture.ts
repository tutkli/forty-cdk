import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { VetoableEvent } from 'forty-cdk/core';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import { queryFlag } from './_query-flag';

/**
 * Three-trigger menubar fixture (File / Edit / View). Each menu has four
 * items with one disabled by default (index 1 — `item-2`). The
 * `?disabled=<csv>` query param overrides the disabled indices per menu, so
 * specs can tune which items participate in keyboard navigation without
 * editing the fixture.
 */
@Component({
  selector: 'app-menubar-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  template: `
    <input data-testid="before" placeholder="before-menubar" />
    <div
      forMenubar
      [(value)]="open"
      [orientation]="orientation()"
      [dismissible]="dismissible()"
      aria-label="Main"
      (autoFocusOnOpen)="onAutoOpen($event)"
      (autoFocusOnClose)="onAutoClose($event)"
    >
      @for (menu of menus; track menu.value) {
        <button [attr.data-testid]="'trigger-' + menu.value" forMenubarTrigger [value]="menu.value">
          {{ menu.label }}
        </button>
        @if (open() === menu.value) {
          <div [attr.data-testid]="'menu-' + menu.value" forMenuContent>
            @for (item of menu.items; track item.id; let i = $index) {
              <button
                [attr.data-testid]="'item-' + menu.value + '-' + (i + 1)"
                forMenuItem
                [disabled]="disabledSet().has(i)"
              >
                {{ item.label }}
              </button>
            }
          </div>
        }
      }
    </div>
    <input data-testid="after" placeholder="after-menubar" />
  `,
})
export class MenubarFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly open = signal<string | null>(null);

  readonly #vetoOpen = queryFlag('vetoOpen');
  readonly #vetoClose = queryFlag('vetoClose');

  protected onAutoOpen(event: VetoableEvent): void {
    if (this.#vetoOpen) event.preventDefault();
  }

  protected onAutoClose(event: VetoableEvent): void {
    if (this.#vetoClose) event.preventDefault();
  }

  /**
   * `?dismissible=false` flips off Escape / outside-interaction dismissal so
   * the E2E suite can assert a non-dismissible menubar menu stays open.
   */
  protected readonly dismissible = computed(
    () => this.#route.snapshot.queryParamMap.get('dismissible') !== 'false',
  );

  /**
   * `?orientation=vertical` renders a vertical menubar so the E2E suite can
   * assert the orientation-aware keyboard model (Up/Down navigate triggers,
   * ArrowRight opens).
   */
  protected readonly orientation = computed<'horizontal' | 'vertical'>(() =>
    this.#route.snapshot.queryParamMap.get('orientation') === 'vertical'
      ? 'vertical'
      : 'horizontal',
  );

  protected readonly menus = [
    {
      value: 'file',
      label: 'File',
      items: [
        { id: 'new', label: 'New' },
        { id: 'open', label: 'Open' },
        { id: 'save', label: 'Save' },
        { id: 'quit', label: 'Quit' },
      ],
    },
    {
      value: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo' },
        { id: 'redo', label: 'Redo' },
        { id: 'cut', label: 'Cut' },
        { id: 'paste', label: 'Paste' },
      ],
    },
    {
      value: 'view',
      label: 'View',
      items: [
        { id: 'zoom-in', label: 'Zoom in' },
        { id: 'zoom-out', label: 'Zoom out' },
        { id: 'reset-zoom', label: 'Reset zoom' },
        { id: 'fullscreen', label: 'Fullscreen' },
      ],
    },
  ] as const;

  protected readonly disabledSet = computed(() => {
    const raw = this.#route.snapshot.queryParamMap.get('disabled');
    if (raw === null) {
      // Default: second item disabled in every menu so specs can assert
      // ArrowDown skips it (mirrors the dropdown-menu fixture's `item-2`).
      return new Set<number>([1]);
    }
    const set = new Set<number>();
    for (const token of raw.split(',')) {
      const n = Number(token.trim());
      if (Number.isInteger(n) && n >= 0) set.add(n);
    }
    return set;
  });
}
