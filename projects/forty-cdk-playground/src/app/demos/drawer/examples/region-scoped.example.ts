import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerTitle,
  ForDrawerTrigger,
} from 'forty-cdk/drawer';

@Component({
  selector: 'app-drawer-region-scoped-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerBackdrop,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <div class="region" #region>
      <div class="region-content">
        <h4 class="region-heading">Project board</h4>
        <p class="region-text">
          This card is the drawer's <code>container</code>. Open the panel — it slides in over this
          region only, focus stays trapped inside the card, and the page around it keeps working.
        </p>
        <button
          forDrawerTrigger
          class="region-btn region-btn--primary"
          [(open)]="open"
          controls="region-drawer"
        >
          Open panel
        </button>
      </div>

      @if (open()) {
        <div
          forDrawer
          id="region-drawer"
          class="region-drawer"
          side="right"
          [modal]="true"
          [container]="region"
          [swipeToDismiss]="false"
          (dismiss)="open.set(false)"
          animate.enter="region-drawer-in"
          animate.leave="region-drawer-out"
        >
          <div
            forDrawerBackdrop
            class="region-drawer-backdrop"
            animate.enter="region-backdrop-in"
            animate.leave="region-backdrop-out"
          ></div>
          <h2 forDrawerTitle class="region-drawer-title">Filters</h2>
          <p forDrawerDescription class="region-drawer-desc">
            Scoped to this card. Press Escape or click the dimmed area to dismiss.
          </p>
          <div class="region-fields">
            <label class="region-field">
              <input type="checkbox" checked />
              Active projects
            </label>
            <label class="region-field">
              <input type="checkbox" />
              Archived
            </label>
            <label class="region-field">
              <input type="checkbox" />
              Shared with me
            </label>
          </div>
          <div class="region-drawer-actions">
            <button class="region-btn" forDrawerClose>Done</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    app-drawer-region-scoped-example {
      display: contents;
    }

    .region {
      position: relative;
      overflow: clip !important;
      box-sizing: border-box;
      width: min(520px, 100%);
      min-height: 300px;
      box-shadow: inset 0 0 0 1px var(--pg-border);
      border-radius: var(--pg-radius);
      background: var(--pg-surface-2);
    }

    .region-content {
      padding: 1.5rem;
    }

    .region-heading {
      margin: 0 0 0.4rem;
      font-size: 1.05rem;
    }

    .region-text {
      margin: 0 0 1rem;
      max-width: 38ch;
      color: var(--pg-text-muted);
      font-size: 0.9rem;
    }

    .region-text code {
      padding: 0.05rem 0.3rem;
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      font-size: 0.85em;
    }

    .region-fields {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin: 0.25rem 0;
    }

    .region-field {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .region-btn {
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
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        transform 0.18s var(--pg-ease-spring);
    }

    .region-btn:hover {
      background: var(--pg-surface-2);
    }

    .region-btn:active {
      transform: scale(0.95);
    }

    .region-btn--primary,
    .region-btn--primary:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .region-btn--primary:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .region-drawer {
      z-index: 51;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 1.25rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      user-select: none;
      -webkit-user-select: none;
    }

    .region .region-drawer[data-side='right'] {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      width: min(280px, 80%);
      border-radius: 0;
      box-shadow: -8px 0 24px rgba(10, 12, 16, 0.18);
    }

    .region .region-drawer-backdrop {
      position: absolute;
      inset: 0;
      z-index: 50;
      background: rgba(10, 12, 16, 0.5);
      backdrop-filter: blur(2px);
    }

    .region-drawer-title {
      margin: 0;
      font-size: 1.15rem;
    }

    .region-drawer-desc {
      margin: 0 0 0.25rem;
      color: var(--pg-text-muted);
      font-size: 0.9rem;
    }

    .region-drawer-actions {
      display: flex;
      gap: 0.6rem;
      margin-top: auto;
      padding-top: 0.75rem;
    }

    @keyframes region-drawer-in {
      from {
        transform: translateX(100%);
      }
    }
    @keyframes region-drawer-out {
      to {
        transform: translateX(100%);
      }
    }

    .region-drawer-in {
      animation: region-drawer-in 0.42s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .region-drawer-out {
      animation: region-drawer-out 0.3s ease both;
    }

    @keyframes region-backdrop-in {
      from {
        opacity: 0;
      }
    }
    @keyframes region-backdrop-out {
      to {
        opacity: 0;
      }
    }

    .region-backdrop-in {
      animation: region-backdrop-in 0.18s ease both;
    }
    .region-backdrop-out {
      animation: region-backdrop-out 0.15s ease both;
    }

    @media (prefers-reduced-motion: reduce) {
      .region-btn {
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .region-btn:active {
        transform: none;
      }

      .region-drawer-in,
      .region-drawer-out,
      .region-backdrop-in,
      .region-backdrop-out {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DrawerRegionScopedExample {
  protected readonly open = signal(false);
}
