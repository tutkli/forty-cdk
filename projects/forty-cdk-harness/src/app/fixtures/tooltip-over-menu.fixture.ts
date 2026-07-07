import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

@Component({
  selector: 'app-tooltip-over-menu-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForTooltip,
    ForTooltipContent,
    ForTooltipTrigger,
  ],
  template: `
    <div style="display: flex; gap: 240px; align-items: flex-start; padding: 40px;">
      <div forDropdownMenu [(open)]="menuOpen" ariaLabel="Test menu">
        <button data-testid="menu-trigger" forDropdownMenuTrigger>Menu</button>
        @if (menuOpen()) {
          <div forMenuContent data-testid="menu">
            <button data-testid="menu-item" forMenuItem>One</button>
          </div>
        }
      </div>

      <span forTooltip [(open)]="tipOpen" [openDelay]="0" [closeDelay]="0">
        <button data-testid="tip-trigger" forTooltipTrigger>Info</button>
        @if (tipOpen()) {
          <div forTooltipContent data-testid="tooltip">Info tooltip</div>
        }
      </span>
    </div>
  `,
})
export class TooltipOverMenuFixture {
  protected readonly menuOpen = signal(false);
  protected readonly tipOpen = signal(false);
}
