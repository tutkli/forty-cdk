import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

@Component({
  selector: 'app-popover-with-tooltip-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForPopover,
    ForPopoverContent,
    ForPopoverTrigger,
    ForTooltip,
    ForTooltipContent,
    ForTooltipTrigger,
  ],
  template: `
    <input id="before" placeholder="before" />
    <div forPopover [(open)]="popoverOpen" ariaLabel="Settings">
      <span forTooltip [(open)]="tipOpen" [openDelay]="0" [closeDelay]="0">
        <button data-testid="trigger" forPopoverTrigger forTooltipTrigger>Settings</button>
        @if (tipOpen()) {
          <div forTooltipContent data-testid="tooltip">Settings</div>
        }
      </span>
      @if (popoverOpen()) {
        <div forPopoverContent data-testid="popover">
          <button data-testid="first">First</button>
        </div>
      }
    </div>
    <input id="after" placeholder="after" />
  `,
})
export class PopoverWithTooltipFixture {
  protected readonly popoverOpen = signal(false);
  protected readonly tipOpen = signal(false);
}
