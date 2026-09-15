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
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .tooltip-trigger:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .tooltip-trigger svg {
      display: block;
      width: 18px;
      height: 18px;
    }

    .tooltip-hint {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ex-muted, #585d66);
    }

    .tooltip-bubble {
      z-index: 70;
      max-width: 220px;
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
      font-weight: 500;
      line-height: 1.3;
      color: var(--ex-inverse-text, #ffffff);
      background: var(--ex-inverse-bg, #1b1f24);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
      pointer-events: none;
    }

    .tooltip-bubble-arrow {
      width: 9px;
      height: 9px;
      background: var(--ex-inverse-bg, #1b1f24);
      transform: rotate(45deg);
      --for-floating-arrow-offset: -4px;
    }

    .tooltip-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: tooltip-pop-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
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
