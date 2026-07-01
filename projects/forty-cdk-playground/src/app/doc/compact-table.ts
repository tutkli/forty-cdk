import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { DocTablePopover } from './doc-table-popover';
import type { DocTableData } from './markdown';

interface DetailCell {
  readonly header: SafeHtml;
  readonly value: SafeHtml;
}

interface CompactRow {
  readonly label: SafeHtml;
  readonly labelText: string;
  readonly details: readonly DetailCell[];
}

@Component({
  selector: 'compact-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocTablePopover],
  template: `
    <div class="pg-doc-table-scroll">
      <table class="pg-doc-table compact-table">
        <thead>
          <tr>
            @for (column of columns(); track $index) {
              <th [class]="$index === 0 ? 'ct-label' : 'ct-detail'" [innerHTML]="column"></th>
            }
            <th class="ct-info-col" aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track $index) {
            <tr>
              <td class="ct-label" [innerHTML]="row.label"></td>
              @for (detail of row.details; track $index) {
                <td class="ct-detail" [innerHTML]="detail.value"></td>
              }
              <td class="ct-info-col">
                <doc-table-popover
                  hostClass="ct-info"
                  [ariaLabel]="row.labelText"
                  [triggerLabel]="'Show details for ' + row.labelText"
                >
                  <ng-container ngProjectAs="[popoverPanel]">
                    @for (detail of row.details; track $index) {
                      <div class="ct-pop-row">
                        @if (showHeaders()) {
                          <span class="ct-pop-header" [innerHTML]="detail.header"></span>
                        }
                        <div class="ct-pop-value" [innerHTML]="detail.value"></div>
                      </div>
                    }
                  </ng-container>
                </doc-table-popover>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CompactTable {
  readonly #sanitizer = inject(DomSanitizer);

  readonly table = input.required<DocTableData>();

  protected readonly columns = computed(() =>
    this.table().columns.map((column) => this.#sanitizer.bypassSecurityTrustHtml(column)),
  );

  protected readonly showHeaders = computed(() => this.table().columns.length > 2);

  protected readonly rows = computed<readonly CompactRow[]>(() => {
    const headers = this.table().columns;
    return this.table().rows.map((cells) => {
      const label = cells[0] ?? { html: '', text: '' };
      const details = cells.slice(1).map((cell, index) => ({
        header: this.#sanitizer.bypassSecurityTrustHtml(headers[index + 1] ?? ''),
        value: this.#sanitizer.bypassSecurityTrustHtml(cell.html),
      }));
      return {
        label: this.#sanitizer.bypassSecurityTrustHtml(label.html),
        labelText: label.text,
        details,
      };
    });
  });
}
