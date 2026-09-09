import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  linkedSignal,
  model,
  resource,
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

import type { DocIndexEntry } from '../doc/doc-model';
import { GUIDE_INDEX } from '../doc/guides';
import { buildSearchEntries, loadSearchIndex, searchEntries } from '../doc/search-index';
import { SITE_PAGE_INDEX } from '../doc/site-pages';
import { DOCS_GROUPS } from '../primitives';
import { Icon } from './icon';

const MAX_RESULTS = 50;

/** What the palette searches before the body index arrives: documents only. */
const NO_INDEX: readonly DocIndexEntry[] = [];

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
            @for (result of results(); track result.entry.path) {
              <div
                forComboboxOption
                [value]="result.entry.path"
                [label]="result.entry.title"
                class="cmdk-option"
              >
                <span class="cmdk-option-head">
                  <span class="cmdk-option-title">
                    @for (part of result.title; track $index) {
                      <span [class.cmdk-match]="part.match">{{ part.text }}</span>
                    }
                  </span>
                  <span class="cmdk-option-group">{{ result.entry.group }}</span>
                </span>
                @if (result.snippet.length > 0) {
                  <span class="cmdk-option-snippet">
                    @for (part of result.snippet; track $index) {
                      <span [class.cmdk-match]="part.match">{{ part.text }}</span>
                    }
                  </span>
                }
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

  /**
   * Stays true once the palette has been opened, so closing it does not put the
   * index back in flight and reopening does not flash the documents-only list.
   */
  readonly #requested = linkedSignal<boolean, boolean>({
    source: this.open,
    computation: (open, previous) => open || previous?.value === true,
  });

  /**
   * The body index, fetched the first time the palette opens
   * ([#1813](https://github.com/tutkli/forty-cdk/issues/1813)).
   *
   * Idle until then — a `params` of `undefined` is what keeps the loader from
   * running — which is what keeps the chunk out of every route that merely
   * renders the header's ⌘K hint, and out of the prerender.
   */
  readonly #index = resource({
    params: () => (this.#requested() ? true : undefined),
    loader: () => loadSearchIndex(),
    defaultValue: NO_INDEX,
  });

  readonly #entries = computed(() =>
    buildSearchEntries(DOCS_GROUPS, this.#index.value(), GUIDE_INDEX, SITE_PAGE_INDEX),
  );

  protected readonly results = computed(() =>
    searchEntries(this.#entries(), this.query()).slice(0, MAX_RESULTS),
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
