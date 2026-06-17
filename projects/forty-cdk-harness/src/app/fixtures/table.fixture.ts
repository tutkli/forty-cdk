import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk';

@Component({
  selector: 'app-table-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTable, ForTableHeaderRow, ForTableRow, ForTableHeaderCell, ForTableCell],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .scroll-container {
        height: 200px;
        overflow-y: auto;
        border: 1px solid #ccc;
      }
      [forTableHeaderRow] {
        display: grid;
        grid-template-columns: 200px 200px 200px;
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f0f0f0;
        font-weight: bold;
        border-bottom: 2px solid #ccc;
      }
      [forTableRow] {
        display: grid;
        grid-template-columns: 200px 200px 200px;
      }
      [forTableHeaderCell],
      [forTableCell] {
        padding: 8px;
      }
      [forTableCell] {
        border-bottom: 1px solid #eee;
      }
    `,
  ],
  template: `
    <div class="scroll-container" data-testid="scroll-container">
      <div data-testid="root" forTable mode="grid" ariaLabel="Team members">
        <div data-testid="header-row" forTableHeaderRow>
          <div data-testid="header-name" forTableHeaderCell name="name" sticky>Name</div>
          <div data-testid="header-role" forTableHeaderCell name="role">Role</div>
          <div data-testid="header-dept" forTableHeaderCell name="dept">Department</div>
        </div>
        @for (row of rows; track row.id) {
          <div forTableRow>
            <div forTableCell name="name">{{ row.name }}</div>
            <div forTableCell name="role">{{ row.role }}</div>
            <div forTableCell name="dept">{{ row.dept }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TableFixture {
  protected readonly rows = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    name: `Person ${i + 1}`,
    role: i % 2 === 0 ? 'Engineer' : 'Designer',
    dept: i % 3 === 0 ? 'Product' : i % 3 === 1 ? 'Engineering' : 'Design',
  }));
}
