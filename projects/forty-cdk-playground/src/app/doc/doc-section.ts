import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { Icon } from '../ui/icon';
import { ApiTable } from './api-table';
import { CompactTable } from './compact-table';
import { injectDocBase } from './doc-base';
import type { DocPageSection } from './doc-model';
import {
  renderApiTable,
  renderPlainTable,
  type RenderedApiTable,
  type RenderedPlainTable,
} from './doc-table';

type RenderedBlock =
  | { readonly kind: 'prose'; readonly html: SafeHtml }
  | { readonly kind: 'api'; readonly table: RenderedApiTable }
  | { readonly kind: 'plain'; readonly table: RenderedPlainTable };

@Component({
  selector: 'doc-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CompactTable, ApiTable, RouterLink, Icon],
  template: `
    <section class="pg-doc-section" [id]="section().slug">
      <h2 class="pg-doc-h2">
        {{ section().title }}
        <a
          class="pg-doc-anchor"
          [routerLink]="[]"
          [fragment]="section().slug"
          [attr.aria-label]="section().title + ' permalink'"
        >
          <app-icon name="link" />
        </a>
      </h2>
      @for (block of blocks(); track $index) {
        @switch (block.kind) {
          @case ('prose') {
            <div class="pg-doc-prose" [innerHTML]="block.html"></div>
          }
          @case ('api') {
            <api-table [table]="block.table" />
          }
          @case ('plain') {
            <compact-table [table]="block.table" />
          }
        }
      }
    </section>
  `,
})
export class DocSection {
  readonly #sanitizer = inject(DomSanitizer);
  readonly #base = injectDocBase();

  readonly section = input.required<DocPageSection>();

  protected readonly blocks = computed<readonly RenderedBlock[]>(() =>
    this.section().blocks.map((block): RenderedBlock => {
      if (block.kind === 'prose') {
        return {
          kind: 'prose',
          html: this.#sanitizer.bypassSecurityTrustHtml(this.#base(block.html)),
        };
      }
      return block.table.role === 'api'
        ? { kind: 'api', table: renderApiTable(block.table, this.#sanitizer, this.#base) }
        : { kind: 'plain', table: renderPlainTable(block.table, this.#sanitizer, this.#base) };
    }),
  );
}
