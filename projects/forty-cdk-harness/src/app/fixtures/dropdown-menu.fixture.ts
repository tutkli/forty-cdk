import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type VetoableEvent } from 'forty-cdk/core';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-dropdown-menu-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <input id="before" placeholder="before-trigger" />
    <div
      forDropdownMenu
      [(open)]="open"
      ariaLabel="Test menu"
      (autoFocusOnOpen)="onAutoOpen($event)"
      (autoFocusOnClose)="onAutoClose($event)"
    >
      <button data-testid="trigger" forDropdownMenuTrigger>Menu</button>
      @if (open()) {
        <div forMenuContent data-testid="menu">
          <button data-testid="item-1" forMenuItem>One</button>
          <button data-testid="item-2" forMenuItem disabled>Two (disabled)</button>
          <button data-testid="item-3" forMenuItem>Three</button>
          <button data-testid="item-4" forMenuItem>Four</button>
        </div>
      }
    </div>
    <input id="after" data-testid="after" placeholder="after-trigger" />
  `,
})
export class DropdownMenuFixture {
  protected readonly open = signal(false);

  private readonly vetoOpen = queryFlag('vetoOpen');
  private readonly vetoClose = queryFlag('vetoClose');

  protected onAutoOpen(event: VetoableEvent): void {
    if (this.vetoOpen) event.preventDefault();
  }

  protected onAutoClose(event: VetoableEvent): void {
    if (this.vetoClose) event.preventDefault();
  }
}
