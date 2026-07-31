import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForContextMenuTrigger } from 'forty-cdk/context-menu';
import { ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForMenu, ForMenuContent, ForMenuItem } from 'forty-cdk/menu';

@Component({
  selector: 'app-menu-shared-openers-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForMenu, ForDropdownMenuTrigger, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <input data-testid="before" placeholder="before-table" />

    <table style="width: 420px; border-collapse: collapse;">
      <tbody>
        <tr
          forMenu
          #row="forMenu"
          [(open)]="open"
          ariaLabel="Row actions"
          (escapeKeyDown)="escapes.set(escapes() + 1)"
        >
          <td
            data-testid="region"
            [forContextMenuTrigger]="row"
            style="width: 320px; height: 60px; background: #eef; border: 1px solid #99c; padding: 8px;"
          >
            Ada Lovelace
          </td>
          <td style="border: 1px solid #99c; text-align: center;">
            <button
              data-testid="kebab"
              [forDropdownMenuTrigger]="row"
              [menuPositioning]="{ sideOffset: 4 }"
              style="width: 32px; height: 32px;"
            >
              ⋮
            </button>
          </td>

          @if (open()) {
            <div forMenuContent data-testid="menu">
              <button data-testid="item-edit" forMenuItem (activate)="last.set('edit')">
                Edit
              </button>
              <button data-testid="item-remove" forMenuItem (activate)="last.set('remove')">
                Delete
              </button>
            </div>
          }
        </tr>
      </tbody>
    </table>

    <p data-testid="last">{{ last() ?? 'none' }}</p>
    <p data-testid="escapes">{{ escapes() }}</p>
    <input data-testid="after" placeholder="after-table" />
  `,
})
export class MenuSharedOpenersFixture {
  protected readonly open = signal(false);
  protected readonly last = signal<string | null>(null);
  protected readonly escapes = signal(0);
}
