import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxEmpty,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';

import { buildSearchEntries, filterSearchEntries } from '../doc/search-index';
import { README_SECTIONS } from '../doc/search-index.generated';
import { PLAYGROUND_GROUPS } from '../primitives';
import { Icon } from './icon';

const MAX_RESULTS = 50;

@Component({
  selector: 'command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    ForComboboxEmpty,
    Icon,
  ],
  template: `
    @if (open()) {
      <div class="cmdk-backdrop"></div>
      <div class="cmdk-wrap">
        <div
          forCombobox
          class="cmdk"
          [(query)]="query"
          [value]="selected"
          (valueChange)="pick($event)"
          [(open)]="open"
          [autoHighlight]="true"
          ariaLabel="Search the documentation"
        >
          <div class="cmdk-field">
            <app-icon name="magnifying-glass" class="cmdk-search-icon" />
            <input
              #input
              forComboboxInput
              class="cmdk-input"
              placeholder="Search primitives and sections…"
            />
            <kbd class="cmdk-kbd">Esc</kbd>
          </div>
          <div forComboboxContent class="cmdk-content" animate.enter="pg-pop-in">
            @for (entry of filtered(); track entry.path) {
              <div forComboboxOption [value]="entry.path" [label]="entry.title" class="cmdk-option">
                <span class="cmdk-option-title">{{ entry.title }}</span>
                <span class="cmdk-option-group">{{ entry.group }}</span>
              </div>
            }
            <div forComboboxEmpty class="cmdk-empty">No results for "{{ query() }}".</div>
          </div>
        </div>
      </div>
    }
  `,
})
export class CommandPalette {
  readonly #router = inject(Router);
  readonly #document = inject(DOCUMENT);

  /** Whether the palette is shown. Two-way bound from the shell (Cmd/Ctrl+K). */
  readonly open = model(false);

  protected readonly query = signal('');
  protected readonly selected: readonly string[] = [];

  protected readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('input');
  readonly #entries = buildSearchEntries(PLAYGROUND_GROUPS, README_SECTIONS);

  protected readonly filtered = computed(() =>
    filterSearchEntries(this.#entries, this.query()).slice(0, MAX_RESULTS),
  );

  #wasOpen = false;
  #returnFocus: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const open = this.open();
      const input = this.inputEl();
      if (open && !this.#wasOpen) {
        this.#returnFocus = this.#document.activeElement as HTMLElement | null;
        this.query.set('');
      }
      if (open && input) {
        input.nativeElement.focus();
      }
      if (!open && this.#wasOpen) {
        this.#returnFocus?.focus();
        this.#returnFocus = null;
      }
      this.#wasOpen = open;
    });
  }

  protected pick(paths: readonly string[]): void {
    const path = paths.at(-1);
    if (path) {
      void this.#router.navigateByUrl(path);
    }
    this.open.set(false);
  }
}
