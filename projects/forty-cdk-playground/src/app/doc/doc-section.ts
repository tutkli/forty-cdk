import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { DocTable } from './doc-table';
import type { DocSectionData, DocTableData } from './markdown';

type PreparedBlock =
  | { readonly kind: 'html'; readonly html: SafeHtml }
  | { readonly kind: 'table'; readonly table: DocTableData };

@Component({
  selector: 'doc-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocTable],
  template: `
    <section class="pg-doc-section" [id]="section().slug">
      <h2 class="pg-doc-h2">
        <a
          class="pg-doc-anchor"
          [href]="'#' + section().slug"
          [attr.aria-label]="section().title + ' permalink'"
          >#</a
        >
        {{ section().title }}
      </h2>
      @for (block of blocks(); track $index) {
        @if (block.kind === 'html') {
          <div class="pg-doc-prose" [innerHTML]="block.html"></div>
        } @else {
          <doc-table [table]="block.table" />
        }
      }
    </section>
  `,
})
export class DocSection {
  readonly #sanitizer = inject(DomSanitizer);

  readonly section = input.required<DocSectionData>();

  protected readonly blocks = computed<readonly PreparedBlock[]>(() =>
    this.section().blocks.map((block) =>
      block.kind === 'html'
        ? { kind: 'html', html: this.#sanitizer.bypassSecurityTrustHtml(block.html) }
        : block,
    ),
  );
}
