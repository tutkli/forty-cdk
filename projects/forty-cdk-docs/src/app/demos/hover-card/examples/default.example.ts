import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  ForHoverCard,
  ForHoverCardArrow,
  ForHoverCardContent,
  ForHoverCardTrigger,
} from 'forty-cdk/hover-card';

@Component({
  selector: 'app-hover-card-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent, ForHoverCardArrow],
  template: `
    <p class="hovercard-lead">
      Article by
      <span forHoverCard #card="forHoverCard" side="top">
        <a forHoverCardTrigger class="hovercard-trigger" href="#ada">&#64;ada</a>
        @if (card.open()) {
          <div forHoverCardContent class="hovercard" animate.enter="hovercard-pop-in">
            <div class="hovercard-head">
              <span class="hovercard-avatar" aria-hidden="true">AL</span>
              <div class="hovercard-id">
                <strong>Ada Lovelace</strong>
                <span class="hovercard-handle">&#64;ada</span>
              </div>
            </div>
            <p class="hovercard-bio">
              Mathematician and writer — wrote the first algorithm intended for a machine.
            </p>
            <div class="hovercard-stats">
              <span><b>128</b> notes</span>
              <span><b>1.8k</b> followers</span>
            </div>
            <button class="hovercard-follow" type="button">Follow</button>
            <span forHoverCardArrow class="hovercard-arrow"></span>
          </div>
        }
      </span>
      on the analytical engine.
    </p>
  `,
  styles: `
    app-hover-card-default-example {
      display: contents;
    }

    .hovercard-lead {
      max-width: 32ch;
      margin: 0 auto;
      text-align: center;
      font-size: 1.05rem;
      line-height: 1.7;
      color: var(--ex-muted, #585d66);
    }

    .hovercard-trigger {
      font-weight: 600;
      color: var(--ex-accent, #0e7c6b);
      text-decoration: none;
    }

    .hovercard-trigger:hover {
      text-decoration: underline;
    }

    .hovercard {
      z-index: 60;
      width: min(300px, calc(100vw - 1.5rem));
      padding: 1.1rem;
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

    .hovercard-head {
      display: flex;
      align-items: center;
      gap: 0.7rem;
    }

    .hovercard-avatar {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--ex-accent-contrast, #ffffff);
      background: var(--ex-accent, #0e7c6b);
    }

    .hovercard-id {
      display: flex;
      flex-direction: column;
    }

    .hovercard-handle {
      font-size: 0.8rem;
      color: var(--ex-muted, #585d66);
    }

    .hovercard-bio {
      margin: 0.8rem 0 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--ex-muted, #585d66);
    }

    .hovercard-stats {
      display: flex;
      gap: 1.1rem;
      margin-top: 0.8rem;
      font-size: 0.8rem;
      color: var(--ex-muted, #585d66);
    }

    .hovercard-stats b {
      color: var(--ex-text, #17191c);
    }

    .hovercard-follow {
      width: 100%;
      margin-top: 0.9rem;
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

    .hovercard-follow:hover {
      background: var(--ex-accent-hover, #0a5a4d);
      border-color: var(--ex-accent-hover, #0a5a4d);
    }

    .hovercard-arrow {
      width: 11px;
      height: 11px;
      background: var(--ex-surface, #ffffff);
      border-top: 1px solid var(--ex-border, #e5e0d6);
      border-left: 1px solid var(--ex-border, #e5e0d6);
      --for-floating-arrow-offset: -6px;
    }

    .hovercard-arrow[data-side='bottom'] {
      transform: rotate(45deg);
    }

    .hovercard-arrow[data-side='top'] {
      transform: rotate(225deg);
    }

    .hovercard-arrow[data-side='left'] {
      transform: rotate(135deg);
    }

    .hovercard-arrow[data-side='right'] {
      transform: rotate(-45deg);
    }

    .hovercard-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: hovercard-pop-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
    }

    @keyframes hovercard-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .hovercard-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class HoverCardDefaultExample {}
