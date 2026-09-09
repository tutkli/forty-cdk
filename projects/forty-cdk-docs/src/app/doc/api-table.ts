import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DocTablePopover } from './doc-table-popover';
import type { RenderedApiTable } from './doc-table';

export type { RenderedApiTable } from './doc-table';

@Component({
  selector: 'api-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocTablePopover],
  template: `
    <div class="pg-doc-table-scroll">
      <table class="pg-doc-table api-table">
        <thead>
          <tr>
            <th class="api-col-prop">{{ table().property }}</th>
            <th class="api-col-type">{{ table().type }}</th>
            @if (defaultColumn(); as defaultColumn) {
              <th class="api-col-default">{{ defaultColumn }}</th>
            }
            <th class="api-col-desc">{{ table().description }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of table().rows; track $index) {
            <tr>
              <td class="api-col-prop" [innerHTML]="row.property"></td>
              <td class="api-col-type">
                <doc-table-popover
                  hostClass="api-type"
                  [ariaLabel]="'Type of ' + row.propertyText"
                  [detail]="row.hasDetail"
                  [triggerLabel]="row.detailLabel"
                >
                  <code popoverTriggerContent class="api-type-kind">{{ row.typeKind }}</code>
                  <ng-container ngProjectAs="[popoverPanel]">
                    <code class="api-pop-type">{{ row.typeFull }}</code>
                    @if (row.hasDefaultValue) {
                      <div class="api-pop-default">
                        <span class="api-pop-label">{{ defaultColumn() }}</span>
                        <div class="api-pop-value" [innerHTML]="row.defaultValue"></div>
                      </div>
                    }
                    @if (row.hasDescription) {
                      <div class="api-pop-desc" [innerHTML]="row.description"></div>
                    }
                  </ng-container>
                </doc-table-popover>
              </td>
              @if (defaultColumn()) {
                <td class="api-col-default" [innerHTML]="row.defaultValue"></td>
              }
              <td class="api-col-desc" [innerHTML]="row.description"></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ApiTable {
  readonly table = input.required<RenderedApiTable>();

  protected readonly defaultColumn = computed(() => this.table().default);
}
