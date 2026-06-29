import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import {
  ForPopover,
  ForPopoverArrow,
  ForPopoverContent,
  ForPopoverTrigger,
} from 'forty-cdk/popover';

import { Icon } from '../ui/icon';
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
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent, ForPopoverArrow, Icon],
  template: `
    <div class="pg-doc-table-scroll">
      <table class="pg-doc-table api-table">
        <thead>
          <tr>
            <th class="api-col-prop">Property</th>
            <th class="api-col-type">Type</th>
            <th class="api-col-desc">Description</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track $index) {
            <tr>
              <td class="api-col-prop" [innerHTML]="row.property"></td>
              <td class="api-col-type">
                <div
                  forPopover
                  #pop="forPopover"
                  side="bottom"
                  align="end"
                  initialFocus="container"
                  class="api-type"
                  [ariaLabel]="'Type of ' + row.propText"
                >
                  <code class="api-type-kind">{{ row.typeKind }}</code>
                  <button
                    forPopoverTrigger
                    type="button"
                    class="api-info"
                    [attr.data-detail]="row.hasDetail"
                    [attr.aria-label]="'Show full type and description for ' + row.propText"
                  >
                    <app-icon name="information-circle" />
                  </button>

                  @if (pop.open()) {
                    <div forPopoverContent class="api-pop" animate.enter="api-pop-enter">
                      <code class="api-pop-type">{{ row.typeFull }}</code>
                      <div class="api-pop-desc" [innerHTML]="row.description"></div>
                      <span forPopoverArrow class="api-pop-arrow"></span>
                    </div>
                  }
                </div>
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
