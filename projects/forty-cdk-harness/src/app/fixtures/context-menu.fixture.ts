import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForContextMenu,
  ForContextMenuTrigger,
  ForMenuContent,
  ForMenuItem,
} from 'forty-cdk';

@Component({
  selector: 'app-context-menu-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <input id="before" placeholder="before-region" />
    <div forContextMenu [(open)]="open" ariaLabel="Context menu">
      <div
        data-testid="region"
        forContextMenuTrigger
        tabindex="0"
        style="width: 240px; height: 80px; background: #eef; border: 1px solid #99c; padding: 8px;"
      >
        Right-click here
      </div>
      @if (open()) {
        <div forMenuContent data-testid="menu">
          <button data-testid="item-1" forMenuItem>Item one</button>
          <button data-testid="item-2" forMenuItem disabled>Item two (disabled)</button>
          <button data-testid="item-3" forMenuItem>Item three</button>
        </div>
      }
    </div>
    <input id="after" placeholder="after-region" />
  `,
})
export class ContextMenuFixture {
  protected readonly open = signal(false);
}
