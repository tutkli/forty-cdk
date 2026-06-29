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
      color: var(--pg-text-muted);
    }

    .hovercard-trigger {
      font-weight: 600;
      color: var(--pg-primary);
      text-decoration: none;
    }

    .hovercard-trigger:hover {
      text-decoration: underline;
    }

    .hovercard {
      z-index: 60;
      width: min(300px, calc(100vw - 1.5rem));
      padding: 1.1rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
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
      color: var(--pg-primary-contrast);
      background: var(--pg-primary);
    }

    .hovercard-id {
      display: flex;
      flex-direction: column;
    }

    .hovercard-handle {
      font-size: 0.8rem;
      color: var(--pg-text-muted);
    }

    .hovercard-bio {
      margin: 0.8rem 0 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--pg-text-muted);
    }

    .hovercard-stats {
      display: flex;
      gap: 1.1rem;
      margin-top: 0.8rem;
      font-size: 0.8rem;
      color: var(--pg-text-muted);
    }

    .hovercard-stats b {
      color: var(--pg-text);
    }

    .hovercard-follow {
      width: 100%;
      margin-top: 0.9rem;
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

    .hovercard-follow:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .hovercard-arrow {
      width: 11px;
      height: 11px;
      background: var(--pg-surface);
      border-top: 1px solid var(--pg-border);
      border-left: 1px solid var(--pg-border);
      --for-arrow-offset: -6px;
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
      transform-origin: var(--for-content-transform-origin, center);
      animation: hovercard-pop-in 0.2s var(--pg-ease-spring) both;
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
