import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk';

@Component({
  selector: 'app-tooltip-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <input data-testid="before" placeholder="before-trigger" />
    <span forTooltip [(open)]="open" [openDelay]="0" [closeDelay]="0">
      <button data-testid="trigger" forTooltipTrigger>Save</button>
      @if (open()) {
        <div forTooltipContent data-testid="tooltip">Save changes</div>
      }
    </span>
    <input data-testid="after" placeholder="after-trigger" />
  `,
})
export class TooltipFixture {
  protected readonly open = signal(false);
}
