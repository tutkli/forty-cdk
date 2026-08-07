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
      color: var(--pg-text-muted);
    }

    .anchor-phrase {
      background: color-mix(in srgb, var(--pg-primary) 18%, transparent);
      color: var(--pg-text);
      padding: 0.05em 0.2em;
      border-radius: 4px;
    }

    .anchor-trigger {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-primary);
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      cursor: pointer;
    }

    .anchor-trigger:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .anchored-popover {
      z-index: 60;
      width: min(280px, calc(100vw - 1.5rem));
      padding: 1rem 1.1rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
    }

    .anchored-popover-title {
      margin: 0 0 0.35rem;
      font-size: 1rem;
    }

    .anchored-popover-desc {
      margin: 0;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
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
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .anchored-popover-arrow {
      width: 11px;
      height: 11px;
      background: var(--pg-surface);
      border-top: 1px solid var(--pg-border);
      border-left: 1px solid var(--pg-border);
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
      animation: anchored-popover-enter 0.2s var(--pg-ease-spring) both;
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
