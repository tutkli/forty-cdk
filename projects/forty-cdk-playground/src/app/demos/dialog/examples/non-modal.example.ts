import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import { ForDialog, ForDialogClose, type VetoableEvent } from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-dialog-non-modal-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForDialog, ForDialogClose, ControlSwitch],
  template: `
    <playground-demo
      title="Non-modal & keep focus"
      subtitle="modal=false drops the focus trap, scroll lock and inert siblings. autoFocusOnOpen vetoes the initial focus move so the search field keeps focus while you type; autoFocusOnClose returns focus to it on close. The panel has no visible title, so ariaLabel names it."
      sourcePath="projects/forty-cdk-playground/src/app/demos/dialog/examples/non-modal.example.ts"
    >
      <div demo class="pg-search-demo">
        <input
          #search
          type="search"
          class="pg-input"
          placeholder="Search fruit…"
          aria-label="Search fruit"
          [value]="query()"
          (input)="onQuery($event)"
        />
        <p class="pg-hint">Type to open the results — focus never leaves this field.</p>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="autoFocusOnOpen keeps focus"
          hint="When on, the autoFocusOnOpen callback vetoes the dialog's initial focus move so the search field keeps focus as the results panel opens, instead of focus jumping into the panel."
          [(checked)]="keepFocus"
        />

        <p class="pg-state">
          query: <b>{{ query() || '—' }}</b
          ><br />panel: <b>{{ searchOpen() ? 'open' : 'closed' }}</b>
        </p>
      </div>
    </playground-demo>

    @if (searchOpen()) {
      <div
        forDialog
        class="pg-dialog pg-dialog--top"
        [modal]="false"
        [dismissible]="false"
        ariaLabel="Search results"
        [autoFocusOnOpen]="keepSearchFocused"
        [autoFocusOnClose]="refocusSearch"
        (dismiss)="searchOpen.set(false)"
        animate.enter="pg-panel-in"
      >
        <div class="pg-result-list">
          @for (item of results(); track item) {
            <div class="pg-row">{{ item }}</div>
          } @empty {
            <p class="pg-hint">No matches for "{{ query() }}".</p>
          }
        </div>
        <div class="pg-dialog-actions">
          <button class="pg-btn" forDialogClose>Close</button>
        </div>
      </div>
    }
  `,
  styles: `
    .pg-search-demo {
      width: min(360px, 100%);
    }

    .pg-search-demo .pg-hint {
      margin: 0.7rem 0 0;
    }
  `,
})
export class DialogNonModalExample {
  protected readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  protected readonly searchOpen = signal(false);
  protected readonly query = signal('');
  protected readonly keepFocus = signal(true);
  readonly #fruits: readonly string[] = [
    'Apple',
    'Apricot',
    'Banana',
    'Blackberry',
    'Blueberry',
    'Cherry',
    'Grape',
    'Mango',
    'Orange',
    'Peach',
    'Pear',
    'Pineapple',
  ];
  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q === '' ? this.#fruits : this.#fruits.filter((f) => f.toLowerCase().includes(q));
  });

  protected onQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.searchOpen.set(value.trim().length > 0);
  }

  protected readonly keepSearchFocused = (event: VetoableEvent): void => {
    if (this.keepFocus()) {
      event.preventDefault();
      this.search()?.nativeElement.focus();
    }
  };

  protected readonly refocusSearch = (): void => {
    this.search()?.nativeElement.focus();
  };
}
