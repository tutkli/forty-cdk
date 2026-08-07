import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  ForPopover,
  ForPopoverArrow,
  ForPopoverClose,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk/popover';

@Component({
  selector: 'app-popover-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
    ForPopoverClose,
    ForPopoverArrow,
  ],
  template: `
    <div forPopover #popover="forPopover" side="bottom" align="center">
      <button forPopoverTrigger class="popover-trigger">Display settings</button>

      @if (popover.open()) {
        <div forPopoverContent class="popover" animate.enter="popover-enter">
          <h3 forPopoverTitle class="popover-title">Display</h3>
          <p forPopoverDescription class="popover-desc">
            A non-modal panel anchored to its trigger. Escape, pointer-down outside or focus outside
            dismisses it and returns focus to the trigger.
          </p>
          <div class="popover-actions">
            <button class="popover-close" type="button" forPopoverClose>Done</button>
          </div>
          <span forPopoverArrow class="popover-arrow"></span>
        </div>
      }
    </div>
  `,
  styles: `
    app-popover-default-example {
      display: contents;
    }

    .popover-trigger {
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

    .popover-trigger:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .popover {
      z-index: 60;
      width: min(280px, calc(100vw - 1.5rem));
      padding: 1rem 1.1rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
    }

    .popover-title {
      margin: 0 0 0.35rem;
      font-size: 1rem;
    }

    .popover-desc {
      margin: 0;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
    }

    .popover-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.9rem;
    }

    .popover-close {
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

    .popover-arrow {
      width: 11px;
      height: 11px;
      background: var(--pg-surface);
      border-top: 1px solid var(--pg-border);
      border-left: 1px solid var(--pg-border);
      --for-floating-arrow-offset: -6px;
    }

    .popover-arrow[data-side='bottom'] {
      transform: rotate(45deg);
    }

    .popover-arrow[data-side='top'] {
      transform: rotate(225deg);
    }

    .popover-arrow[data-side='left'] {
      transform: rotate(135deg);
    }

    .popover-arrow[data-side='right'] {
      transform: rotate(-45deg);
    }

    .popover-enter {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: popover-enter 0.2s var(--pg-ease-spring) both;
    }

    @keyframes popover-enter {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .popover-enter {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class PopoverDefaultExample {}
