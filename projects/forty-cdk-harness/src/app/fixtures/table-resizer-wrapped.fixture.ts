import { ChangeDetectionStrategy, Component, Directive } from '@angular/core';
import {
  ForTable,
  ForTableColumnResizer,
  ForTableHeaderCell,
  ForTableHeaderRow,
} from 'forty-cdk/table';

@Directive({
  selector: '[appWrappedHeaderCell]',
  hostDirectives: [{ directive: ForTableHeaderCell, inputs: ['name'] }],
})
export class WrappedHeaderCell {}

@Component({
  selector: 'app-table-resizer-wrapped-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTable, ForTableHeaderRow, WrappedHeaderCell, ForTableColumnResizer],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      [appWrappedHeaderCell] {
        display: block;
        width: 240px;
        padding: 8px;
        position: relative;
        background: #f0f0f0;
        font-weight: bold;
      }
      .resize-handle {
        position: absolute;
        right: 0;
        top: 0;
        width: 8px;
        height: 100%;
        cursor: col-resize;
        background: transparent;
        border: none;
        padding: 0;
      }
    `,
  ],
  template: `
    <div data-testid="root" forTable mode="grid" ariaLabel="Wrapped header cell">
      <div forTableHeaderRow>
        <div data-testid="wrapped-cell" appWrappedHeaderCell name="name">
          Name
          <button
            class="resize-handle"
            forTableColumnResizer
            column="name"
            data-testid="wrapped-resizer"
            aria-label="Resize Name column"
          ></button>
        </div>
      </div>
    </div>
  `,
})
export class TableResizerWrappedFixture {}
