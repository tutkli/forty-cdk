import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  ForTooltip,
  ForTooltipArrow,
  ForTooltipContent,
  ForTooltipTrigger,
} from 'forty-cdk/tooltip';

@Component({
  selector: 'app-tooltip-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent, ForTooltipArrow],
  template: `
    <div class="tooltip-demo">
      <span forTooltip #tip="forTooltip" side="top" [openDelay]="200">
        <button forTooltipTrigger type="button" class="tooltip-trigger" aria-label="More info">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.853l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          </svg>
        </button>

        @if (tip.open()) {
          <div forTooltipContent class="tooltip-bubble" animate.enter="tooltip-pop-in">
            Appears on hover or focus
            <span forTooltipArrow class="tooltip-bubble-arrow"></span>
          </div>
        }
      </span>

      <p class="tooltip-hint">Hover the button, or Tab to it — focus opens the tooltip too.</p>
    </div>
  `,
  styles: `
    app-tooltip-default-example {
      display: contents;
    }

    .tooltip-demo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.1rem;
    }

    .tooltip-trigger {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      padding: 0.5rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .tooltip-trigger:hover {
      background: var(--pg-surface-2);
    }

    .tooltip-trigger svg {
      display: block;
      width: 18px;
      height: 18px;
    }

    .tooltip-hint {
      margin: 0;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
    }

    .tooltip-bubble {
      --tooltip-bg: #1b1f24;
      --tooltip-fg: #ffffff;
      z-index: 70;
      max-width: 220px;
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
      font-weight: 500;
      line-height: 1.3;
      color: var(--tooltip-fg);
      background: var(--tooltip-bg);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      pointer-events: none;
    }

    [data-theme='dark'] .tooltip-bubble {
      --tooltip-bg: #e6e9ee;
      --tooltip-fg: #0e1116;
    }

    .tooltip-bubble-arrow {
      width: 9px;
      height: 9px;
      background: var(--tooltip-bg);
      transform: rotate(45deg);
      --for-arrow-offset: -4px;
    }

    .tooltip-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: tooltip-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes tooltip-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .tooltip-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class TooltipDefaultExample {}
