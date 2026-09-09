import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import {
  ForTooltip,
  ForTooltipArrow,
  ForTooltipContent,
  ForTooltipTrigger,
} from 'forty-cdk/tooltip';

import { Icon } from './icon';

@Component({
  selector: 'app-info-tip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent, ForTooltipArrow, Icon],
  template: `
    <span
      forTooltip
      class="info-tip"
      [(open)]="open"
      side="top"
      align="center"
      [openDelay]="150"
      [closeDelay]="0"
    >
      <button forTooltipTrigger type="button" class="info-tip-trigger" aria-label="More info">
        <app-icon name="information-circle" />
      </button>
      @if (open()) {
        <div forTooltipContent class="pg-tooltip" animate.enter="pg-pop-in">
          {{ text() }}
          <span forTooltipArrow class="pg-tooltip-arrow"></span>
        </div>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .info-tip {
      display: inline-flex;
      line-height: 0;
    }

    .info-tip-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--pg-text-muted);
      cursor: help;
      transition: color 0.15s ease;
    }

    .info-tip-trigger app-icon {
      width: 15px;
      height: 15px;
    }

    .info-tip-trigger:hover,
    .info-tip-trigger:focus-visible {
      color: var(--pg-text);
    }
  `,
})
export class InfoTip {
  readonly text = input.required<string>();
  protected readonly open = signal(false);
}
