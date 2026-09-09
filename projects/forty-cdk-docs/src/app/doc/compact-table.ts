import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DocTablePopover } from './doc-table-popover';
import type { RenderedPlainTable } from './doc-table';

export type { RenderedPlainTable } from './doc-table';

@Component({
  selector: 'compact-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocTablePopover],
  template: `
    <div class="pg-doc-table-scroll">
      <table class="pg-doc-table compact-table">
        <thead>
          <tr>
            @for (column of table().columns; track $index) {
              <th [class]="$index === 0 ? 'ct-label' : 'ct-detail'" [innerHTML]="column"></th>
            }
            <th class="ct-info-col" aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          @for (row of table().rows; track $index) {
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
  readonly table = input.required<RenderedPlainTable>();

  protected readonly showHeaders = computed(() => this.table().columns.length > 2);
}
