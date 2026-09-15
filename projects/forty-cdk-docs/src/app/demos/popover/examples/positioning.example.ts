import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  ForPopover,
  ForPopoverArrow,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk/popover';

@Component({
  selector: 'app-popover-positioning-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
    ForPopoverArrow,
  ],
  template: `
    <div class="pos-frame">
      <div
        forPopover
        #popover="forPopover"
        side="right"
        align="center"
        [sideOffset]="8"
        [collisionPadding]="8"
      >
        <button forPopoverTrigger class="pos-trigger">Anchor</button>
        @if (popover.open()) {
          <div forPopoverContent class="pos-popover" animate.enter="pos-popover-enter">
            <h3 forPopoverTitle class="pos-popover-title">Positioned surface</h3>
            <p forPopoverDescription class="pos-popover-desc">
              Scroll the frame: floating-ui flips and shifts the surface to keep it in view.
            </p>
            <span forPopoverArrow class="pos-popover-arrow"></span>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    app-popover-positioning-example {
      display: contents;
    }

    .pos-frame {
      display: flex;
      align-items: center;
      justify-content: center;
      width: min(220px, 100%);
      height: 160px;
      overflow: auto;
      border: 1px dashed var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
    }

    .pos-trigger {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-accent, #0e7c6b);
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
      cursor: pointer;
    }

    .pos-popover {
      z-index: 60;
      width: min(240px, calc(100vw - 1.5rem));
      padding: 1rem 1.1rem;
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
    }

    .pos-popover-title {
      margin: 0 0 0.35rem;
      font-size: 1rem;
    }

    .pos-popover-desc {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ex-muted, #585d66);
    }

    .pos-popover-arrow {
      width: 11px;
      height: 11px;
      background: var(--ex-surface, #ffffff);
      border-top: 1px solid var(--ex-border, #e5e0d6);
      border-left: 1px solid var(--ex-border, #e5e0d6);
      --for-floating-arrow-offset: -6px;
    }

    .pos-popover-arrow[data-side='bottom'] {
      transform: rotate(45deg);
    }

    .pos-popover-arrow[data-side='top'] {
      transform: rotate(225deg);
    }

    .pos-popover-arrow[data-side='left'] {
      transform: rotate(135deg);
    }

    .pos-popover-arrow[data-side='right'] {
      transform: rotate(-45deg);
    }

    .pos-popover-enter {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: pos-popover-enter 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
    }

    @keyframes pos-popover-enter {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .pos-popover-enter {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class PopoverPositioningExample {}
