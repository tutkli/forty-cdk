import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  ForTooltip,
  ForTooltipArrow,
  ForTooltipContent,
  ForTooltipTrigger,
} from 'forty-cdk/tooltip';

@Component({
  selector: 'app-tooltip-hoverable-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent, ForTooltipArrow],
  template: `
    <div class="hoverable-demo">
      <span forTooltip #tip="forTooltip" [hoverableContent]="true" side="top">
        <button forTooltipTrigger type="button" class="hoverable-trigger">Build hash</button>
        @if (tip.open()) {
          <div forTooltipContent class="hoverable-tooltip" animate.enter="hoverable-tooltip-pop-in">
            9a29576f3c1e4b7a8d2f6e0b
            <span forTooltipArrow class="hoverable-tooltip-arrow"></span>
          </div>
        }
      </span>

      <p class="hoverable-hint">
        With hoverableContent the bubble keeps pointer-events, so you can move onto it to read or
        select the text without it closing.
      </p>
    </div>
  `,
  styles: `
    app-tooltip-hoverable-example {
      display: contents;
    }

    .hoverable-demo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.9rem;
    }

    .hoverable-trigger {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: default;
    }

    .hoverable-trigger:hover {
      background: var(--pg-surface-2);
    }

    .hoverable-hint {
      margin: 0.2rem 0 0;
      max-width: 34ch;
      text-align: center;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
    }

    .hoverable-tooltip {
      --hoverable-tooltip-bg: #1b1f24;
      --hoverable-tooltip-fg: #ffffff;
      z-index: 70;
      max-width: 220px;
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
      font-weight: 500;
      line-height: 1.3;
      color: var(--hoverable-tooltip-fg);
      background: var(--hoverable-tooltip-bg);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      user-select: text;
    }

    [data-theme='dark'] .hoverable-tooltip {
      --hoverable-tooltip-bg: #e6e9ee;
      --hoverable-tooltip-fg: #0e1116;
    }

    .hoverable-tooltip-arrow {
      width: 9px;
      height: 9px;
      background: var(--hoverable-tooltip-bg);
      transform: rotate(45deg);
      --for-floating-arrow-offset: -4px;
    }

    .hoverable-tooltip-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: hoverable-tooltip-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes hoverable-tooltip-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .hoverable-tooltip-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class TooltipHoverableExample {}
