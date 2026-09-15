import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  ForPopover,
  ForPopoverAnchor,
  ForPopoverArrow,
  ForPopoverClose,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk/popover';

@Component({
  selector: 'app-popover-anchor-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForPopover,
    ForPopoverTrigger,
    ForPopoverAnchor,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
    ForPopoverClose,
    ForPopoverArrow,
  ],
  template: `
    <div forPopover #popover="forPopover" side="bottom" align="center" class="anchor-demo">
      <p class="anchor-copy">
        Your plan renews on the
        <mark forPopoverAnchor class="anchor-phrase">1st of next month</mark>
        and you can change it anytime.
      </p>

      <button forPopoverTrigger class="anchor-trigger">Billing details</button>

      @if (popover.open()) {
        <div forPopoverContent class="anchored-popover" animate.enter="anchored-popover-enter">
          <h3 forPopoverTitle class="anchored-popover-title">Next invoice</h3>
          <p forPopoverDescription class="anchored-popover-desc">
            The trigger owns aria-controls and focus, but [forPopoverAnchor] is what floating-ui
            positions against.
          </p>
          <div class="anchored-popover-actions">
            <button class="anchored-popover-close" type="button" forPopoverClose>Got it</button>
          </div>
          <span forPopoverArrow class="anchored-popover-arrow"></span>
        </div>
      }
    </div>
  `,
  styles: `
    app-popover-anchor-example {
      display: contents;
    }

    .anchor-demo {
      text-align: center;
    }

    .anchor-copy {
      max-width: 32ch;
      margin: 0 auto 1rem;
      color: var(--ex-muted, #585d66);
    }

    .anchor-phrase {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 18%, transparent);
      color: var(--ex-text, #17191c);
      padding: 0.05em 0.2em;
      border-radius: 4px;
    }

    .anchor-trigger {
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

    .anchor-trigger:hover {
      background: var(--ex-accent-hover, #0a5a4d);
      border-color: var(--ex-accent-hover, #0a5a4d);
    }

    .anchored-popover {
      z-index: 60;
      width: min(280px, calc(100vw - 1.5rem));
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

    .anchored-popover-title {
      margin: 0 0 0.35rem;
      font-size: 1rem;
    }

    .anchored-popover-desc {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ex-muted, #585d66);
    }

    .anchored-popover-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.9rem;
    }

    .anchored-popover-close {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .anchored-popover-arrow {
      width: 11px;
      height: 11px;
      background: var(--ex-surface, #ffffff);
      border-top: 1px solid var(--ex-border, #e5e0d6);
      border-left: 1px solid var(--ex-border, #e5e0d6);
      --for-floating-arrow-offset: -6px;
    }

    .anchored-popover-arrow[data-side='bottom'] {
      transform: rotate(45deg);
    }

    .anchored-popover-arrow[data-side='top'] {
      transform: rotate(225deg);
    }

    .anchored-popover-arrow[data-side='left'] {
      transform: rotate(135deg);
    }

    .anchored-popover-arrow[data-side='right'] {
      transform: rotate(-45deg);
    }

    .anchored-popover-enter {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: anchored-popover-enter 0.2s
        var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
    }

    @keyframes anchored-popover-enter {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .anchored-popover-enter {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class PopoverAnchorExample {}
