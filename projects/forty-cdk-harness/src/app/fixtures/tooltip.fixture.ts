import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

@Component({
  selector: 'app-tooltip-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <input data-testid="before" placeholder="before-trigger" />
    <span
      forTooltip
      #main="forTooltip"
      [(open)]="open"
      [openDelay]="0"
      [closeDelay]="0"
      [hoverableContent]="false"
    >
      <button data-testid="trigger" forTooltipTrigger>Save</button>
      @if (open()) {
        <div forTooltipContent data-testid="tooltip">Save changes</div>
      }
    </span>
    <input data-testid="after" placeholder="after-trigger" />

    <button data-testid="imp-show" type="button" (click)="main.show()">show</button>
    <button data-testid="imp-hide" type="button" (click)="main.hide()">hide</button>

    <!-- showOnOverflow: a truncated trigger shows; a non-truncated one is suppressed. -->
    <span
      forTooltip
      #ovf="forTooltip"
      [(open)]="overflowOpen"
      [openDelay]="0"
      [closeDelay]="0"
      showOnOverflow
    >
      <button
        data-testid="overflow-trigger"
        forTooltipTrigger
        style="display:inline-block;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
      >
        A very long label that does not fit
      </button>
      @if (overflowOpen()) {
        <div forTooltipContent data-testid="overflow-tooltip">
          A very long label that does not fit
        </div>
      }
    </span>

    <span
      forTooltip
      #fit2="forTooltip"
      [(open)]="fitOpen"
      [openDelay]="0"
      [closeDelay]="0"
      showOnOverflow
    >
      <button
        data-testid="fit-trigger"
        forTooltipTrigger
        style="display:inline-block;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
      >
        Fits
      </button>
      @if (fitOpen()) {
        <div forTooltipContent data-testid="fit-tooltip">Fits</div>
      }
    </span>

    <button data-testid="show-overflow" type="button" (click)="ovf.show()">show overflow</button>
    <button data-testid="show-fit" type="button" (click)="fit2.show()">show fit</button>

    <!-- hoverableContent: moving the pointer into the content keeps it open. -->
    <span forTooltip [(open)]="hoverOpen" [openDelay]="0" [closeDelay]="200" hoverableContent>
      <button data-testid="hoverable-trigger" forTooltipTrigger>Hoverable</button>
      @if (hoverOpen()) {
        <div forTooltipContent data-testid="hoverable-tooltip" style="padding:24px;">
          Hoverable content
        </div>
      }
    </span>

    <div
      data-testid="scroll-list"
      style="height:96px;width:220px;overflow-y:auto;border:1px solid #ccc;"
    >
      @for (row of rows; track row) {
        <div
          forTooltip
          #tip="forTooltip"
          [openDelay]="0"
          [closeDelay]="0"
          [hoverableContent]="false"
          style="padding:8px;"
        >
          <button [attr.data-testid]="'row-trigger-' + row" forTooltipTrigger>Row {{ row }}</button>
          @if (tip.open()) {
            <div forTooltipContent [attr.data-testid]="'row-tooltip-' + row">Tooltip {{ row }}</div>
          }
        </div>
      }
    </div>
  `,
})
export class TooltipFixture {
  protected readonly open = signal(false);
  protected readonly overflowOpen = signal(false);
  protected readonly fitOpen = signal(false);
  protected readonly hoverOpen = signal(false);
  protected readonly rows = Array.from({ length: 20 }, (_, i) => i);
}
