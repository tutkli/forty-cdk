import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  linkedSignal,
  model,
  resource,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  ForCombobox,
  ForComboboxAnchor,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
  ForComboboxStatus,
} from 'forty-cdk/combobox';
import { ForDialog, ForDialogBackdrop } from 'forty-cdk/dialog';
import { ForVisuallyHidden } from 'forty-cdk/visually-hidden';

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
    ForDialog,
    ForDialogBackdrop,
    ForCombobox,
    ForComboboxAnchor,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxOption,
    ForComboboxStatus,
    ForVisuallyHidden,
    Icon,
  ],
  template: `
    @if (open()) {
      <div
        forDialog
        class="cmdk-wrap"
        ariaLabel="Search the documentation"
        (dismiss)="open.set(false)"
      >
        <div forDialogBackdrop class="cmdk-backdrop"></div>
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
          <div forComboboxAnchor class="cmdk-field">
            <app-icon name="magnifying-glass" class="cmdk-search-icon" />
            <input
              forComboboxInput
              class="cmdk-input"
              placeholder="Search primitives and sections…"
            />
            <kbd class="cmdk-kbd">Esc</kbd>
          </div>
          <div forComboboxContent class="cmdk-content" animate.enter="pg-pop-in">
            <div forComboboxList class="cmdk-list">
              @for (result of results(); track result.entry.path) {
                <div
                  forComboboxOption
                  #option="forComboboxOption"
                  [value]="result.entry.path"
                  [label]="result.entry.title"
                  [attr.aria-label]="result.entry.title + ', ' + result.entry.group"
                  [attr.aria-describedby]="
                    result.snippet.length > 0 ? option.id() + '-snippet' : null
                  "
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
                    <span class="cmdk-option-snippet" [id]="option.id() + '-snippet'">
                      @for (part of result.snippet; track $index) {
                        <span [class.cmdk-match]="part.match">{{ part.text }}</span>
                      }
                    </span>
                  }
                </div>
              }
            </div>
            <div forComboboxStatus #status="forComboboxStatus">
              @if (status.count() === 0) {
                <p class="cmdk-empty">No results for "{{ query() }}".</p>
              } @else {
                <span forVisuallyHidden>
                  {{ status.count() }} {{ status.count() === 1 ? 'result' : 'results' }}
                </span>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class CommandPalette {
  readonly #router = inject(Router);
  readonly #injector = inject(Injector);

  /** Whether the palette is shown. Two-way bound from the shell (Cmd/Ctrl+K). */
  readonly open = model(false);

  protected readonly query = linkedSignal<boolean, string>({
    source: this.open,
    computation: () => '',
  });
  protected readonly selected: readonly string[] = [];

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
   * renders the header's shortcut hint, and out of the prerender.
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

  protected pick(paths: readonly string[]): void {
    const path = paths.at(-1);
    this.open.set(false);
    if (path) {
      afterNextRender(
        () => {
          void this.#router.navigateByUrl(path);
        },
        { injector: this.#injector },
      );
    }
  }
}
