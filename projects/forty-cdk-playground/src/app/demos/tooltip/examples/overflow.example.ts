import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  ForTooltip,
  ForTooltipArrow,
  ForTooltipContent,
  ForTooltipTrigger,
} from 'forty-cdk/tooltip';

@Component({
  selector: 'app-tooltip-overflow-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent, ForTooltipArrow],
  template: `
    <div class="overflow-demo">
      <span forTooltip #fits="forTooltip" [showOnOverflow]="true" side="top">
        <button forTooltipTrigger type="button" class="overflow-chip">README.md</button>
        @if (fits.open()) {
          <div forTooltipContent class="overflow-tooltip" animate.enter="overflow-tooltip-pop-in">
            README.md
            <span forTooltipArrow class="overflow-tooltip-arrow"></span>
          </div>
        }
      </span>

      <span forTooltip #clipped="forTooltip" [showOnOverflow]="true" side="top">
        <button forTooltipTrigger type="button" class="overflow-chip">
          projects/forty-cdk/src/lib/file-upload/file-upload-trigger.ts
        </button>
        @if (clipped.open()) {
          <div forTooltipContent class="overflow-tooltip" animate.enter="overflow-tooltip-pop-in">
            projects/forty-cdk/src/lib/file-upload/file-upload-trigger.ts
            <span forTooltipArrow class="overflow-tooltip-arrow"></span>
          </div>
        }
      </span>

      <p class="overflow-hint">
        Hover each chip. The short label fits, so no tooltip opens; the long one is clipped, so the
        full text appears.
      </p>
    </div>
  `,
  styles: `
    app-tooltip-overflow-example {
      display: contents;
    }

    .overflow-demo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.9rem;
    }

    .overflow-chip {
      display: block;
      max-width: 170px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font: inherit;
      font-weight: 600;
      padding: 0.5rem 0.9rem;
      color: var(--pg-text);
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      cursor: default;
    }

    .overflow-hint {
      margin: 0.2rem 0 0;
      max-width: 34ch;
      text-align: center;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
    }

    .overflow-tooltip {
      --overflow-tooltip-bg: #1b1f24;
      --overflow-tooltip-fg: #ffffff;
      z-index: 70;
      max-width: 220px;
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
      font-weight: 500;
      line-height: 1.3;
      color: var(--overflow-tooltip-fg);
      background: var(--overflow-tooltip-bg);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      pointer-events: none;
    }

    [data-theme='dark'] .overflow-tooltip {
      --overflow-tooltip-bg: #e6e9ee;
      --overflow-tooltip-fg: #0e1116;
    }

    .overflow-tooltip-arrow {
      width: 9px;
      height: 9px;
      background: var(--overflow-tooltip-bg);
      transform: rotate(45deg);
      --for-arrow-offset: -4px;
    }

    .overflow-tooltip-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: overflow-tooltip-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes overflow-tooltip-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .overflow-tooltip-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class TooltipOverflowExample {}
