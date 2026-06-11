import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem } from 'forty-cdk';

@Component({
  selector: 'app-context-menu-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <input data-testid="before" placeholder="before-region" />
    <div forContextMenu [(open)]="open" ariaLabel="Context menu">
      <div
        data-testid="region"
        forContextMenuTrigger
        tabindex="0"
        style="width: 240px; height: 80px; background: #eef; border: 1px solid #99c; padding: 8px;"
      >
        Right-click here
        <!-- Focusable descendant for the keyboard-activator "anchor at focused
             descendant" e2e cases. Sits inside the trigger with its own
             explicit dimensions so the anchor rect (60x24) is comfortably
             distinct from the trigger's (240x80). -->
        <button data-testid="inner-btn" type="button" style="width: 60px; height: 24px;">
          Inner
        </button>
      </div>
      @if (open()) {
        <div forMenuContent data-testid="menu">
          <button data-testid="item-1" forMenuItem>Item one</button>
          <button data-testid="item-2" forMenuItem disabled>Item two (disabled)</button>
          <button data-testid="item-3" forMenuItem>Item three</button>
        </div>
      }
    </div>
    <input data-testid="after" placeholder="after-region" />

    <!-- Second instance whose trigger declares NO tabindex: it relies on the
         directive's host-bound default (tabindex="-1") so the return-focus
         e2e proves the out-of-the-box behaviour with zero consumer setup. -->
    <div forContextMenu [(open)]="openDefault" ariaLabel="Context menu (default tabindex)">
      <div
        data-testid="region-default"
        forContextMenuTrigger
        style="width: 240px; height: 80px; background: #efe; border: 1px solid #9c9; padding: 8px;"
      >
        Right-click here (default tabindex)
      </div>
      @if (openDefault()) {
        <div forMenuContent data-testid="menu-default">
          <button data-testid="default-item-1" forMenuItem>Item one</button>
          <button data-testid="default-item-2" forMenuItem>Item two</button>
        </div>
      }
    </div>
  `,
})
export class ContextMenuFixture {
  protected readonly open = signal(false);
  protected readonly openDefault = signal(false);
}
