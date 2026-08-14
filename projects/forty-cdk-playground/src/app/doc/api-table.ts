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
  readonly detailLabel: string;
  readonly defaultValue: SafeHtml;
  readonly hasDefaultValue: boolean;
  readonly description: SafeHtml;
  readonly hasDescription: boolean;
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
            @if (hasDefault()) {
              <th class="api-col-default">{{ columns()[2] }}</th>
            }
            <th class="api-col-desc">{{ descriptionColumn() }}</th>
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
                  [triggerLabel]="row.detailLabel"
                >
                  <code popoverTriggerContent class="api-type-kind">{{ row.typeKind }}</code>
                  <ng-container ngProjectAs="[popoverPanel]">
                    <code class="api-pop-type">{{ row.typeFull }}</code>
                    @if (row.hasDefaultValue) {
                      <div class="api-pop-default">
                        <span class="api-pop-label">{{ columns()[2] }}</span>
                        <div class="api-pop-value" [innerHTML]="row.defaultValue"></div>
                      </div>
                    }
                    @if (row.hasDescription) {
                      <div class="api-pop-desc" [innerHTML]="row.description"></div>
                    }
                  </ng-container>
                </doc-table-popover>
              </td>
              @if (hasDefault()) {
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
  readonly #sanitizer = inject(DomSanitizer);

  readonly table = input.required<DocTableData>();

  protected readonly columns = computed(() => this.table().columns);

  protected readonly hasDefault = computed(() => this.columns().length === 4);

  protected readonly descriptionColumn = computed(() => this.columns().at(-1) ?? '');

  protected readonly rows = computed<readonly ApiRow[]>(() => {
    const withDefault = this.hasDefault();
    const empty = { html: '', text: '' };
    return this.table().rows.map((cells) => {
      const property = cells[0] ?? empty;
      const type = cells[1] ?? empty;
      const defaultValue = withDefault ? (cells[2] ?? empty) : empty;
      const description = (withDefault ? cells[3] : cells[2]) ?? empty;
      const typeFull = type.text.trim();
      const typeKind = typeFull.split('<')[0]!.trim() || typeFull;
      return {
        property: this.#sanitizer.bypassSecurityTrustHtml(property.html),
        propText: property.text,
        typeKind,
        typeFull,
        hasDetail: typeFull !== '' && typeKind !== typeFull,
        detailLabel: `Show full type${withDefault ? ', default' : ''} and description for ${property.text}`,
        defaultValue: this.#sanitizer.bypassSecurityTrustHtml(defaultValue.html),
        hasDefaultValue: defaultValue.text.trim() !== '',
        description: this.#sanitizer.bypassSecurityTrustHtml(description.html),
        hasDescription: description.text.trim() !== '',
      };
    });
  });
}
