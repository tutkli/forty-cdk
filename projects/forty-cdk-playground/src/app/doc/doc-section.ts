import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { Icon } from '../ui/icon';
import { ApiTable } from './api-table';
import { CompactTable } from './compact-table';
import { type DocSectionData, type DocTableData, stripText } from './markdown';

function columnLabel(column: string | undefined): string {
  return stripText(column ?? '').toLowerCase();
}

function isApiTable(table: DocTableData): boolean {
  const { columns } = table;
  if (columnLabel(columns[1]) !== 'type') {
    return false;
  }
  return columns.length === 3 || (columns.length === 4 && columnLabel(columns[2]) === 'default');
}

type PreparedBlock =
  | { readonly kind: 'html'; readonly html: SafeHtml }
  | { readonly kind: 'table'; readonly table: DocTableData; readonly isApi: boolean };

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
        @if (block.kind === 'html') {
          <div class="pg-doc-prose" [innerHTML]="block.html"></div>
        } @else if (block.isApi) {
          <api-table [table]="block.table" />
        } @else {
          <compact-table [table]="block.table" />
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
        : { kind: 'table', table: block.table, isApi: isApiTable(block.table) },
    ),
  );
}
