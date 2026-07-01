import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { DocTablePopover } from './doc-table-popover';
import type { DocTableData } from './markdown';

interface ApiRow {
  readonly property: SafeHtml;
  readonly propText: string;
  readonly typeKind: string;
  readonly typeFull: string;
  readonly hasDetail: boolean;
  readonly description: SafeHtml;
}

@Component({
  selector: 'api-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocTablePopover],
  template: `
    <div class="pg-doc-table-scroll">
      <table class="pg-doc-table api-table">
        <thead>
          <tr>
            <th class="api-col-prop">{{ columns()[0] }}</th>
            <th class="api-col-type">{{ columns()[1] }}</th>
            <th class="api-col-desc">{{ columns()[2] }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track $index) {
            <tr>
              <td class="api-col-prop" [innerHTML]="row.property"></td>
              <td class="api-col-type">
                <doc-table-popover
                  hostClass="api-type"
                  [ariaLabel]="'Type of ' + row.propText"
                  [detail]="row.hasDetail"
                  [triggerLabel]="'Show full type and description for ' + row.propText"
                >
                  <code popoverTriggerContent class="api-type-kind">{{ row.typeKind }}</code>
                  <ng-container ngProjectAs="[popoverPanel]">
                    <code class="api-pop-type">{{ row.typeFull }}</code>
                    <div class="api-pop-desc" [innerHTML]="row.description"></div>
                  </ng-container>
                </doc-table-popover>
              </td>
              <td class="api-col-desc" [innerHTML]="row.description"></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ApiTable {
  readonly #sanitizer = inject(DomSanitizer);

  readonly table = input.required<DocTableData>();

  protected readonly columns = computed(() => this.table().columns);

  protected readonly rows = computed<readonly ApiRow[]>(() =>
    this.table().rows.map((cells) => {
      const property = cells[0] ?? { html: '', text: '' };
      const type = cells[1] ?? { html: '', text: '' };
      const description = cells[2] ?? { html: '', text: '' };
      const typeFull = type.text.trim();
      const typeKind = typeFull.split('<')[0].trim() || typeFull;
      return {
        property: this.#sanitizer.bypassSecurityTrustHtml(property.html),
        propText: property.text,
        typeKind,
        typeFull,
        hasDetail: typeFull !== '' && typeKind !== typeFull,
        description: this.#sanitizer.bypassSecurityTrustHtml(description.html),
      };
    }),
  );
}
