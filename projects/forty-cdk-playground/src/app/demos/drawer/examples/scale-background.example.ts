import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import {
  ForDrawer,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerTitle,
  ForDrawerTrigger,
} from 'forty-cdk/drawer';

@Component({
  selector: 'app-drawer-scale-background-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <button
      forDrawerTrigger
      class="scale-btn scale-btn--primary"
      [(open)]="open"
      controls="scale-drawer"
    >
      Open drawer
    </button>

    @if (open()) {
      <div
        forDrawer
        id="scale-drawer"
        class="scale-drawer"
        [scaleBackground]="true"
        (dismiss)="open.set(false)"
        animate.enter="scale-drawer-in"
        animate.leave="scale-drawer-out"
      >
        <div forDrawerHandle class="scale-drawer-handle"></div>
        <h2 forDrawerTitle class="scale-drawer-title">Scaled background</h2>
        <p forDrawerDescription class="scale-drawer-desc">
          The wrapper behind receded and rounded its corners.
        </p>
        <div class="scale-drawer-actions">
          <button class="scale-btn" forDrawerClose>Close</button>
        </div>
      </div>
    }
  `,
  styles: `
    app-drawer-scale-background-example {
      display: contents;
    }

    .scale-btn {
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

    .scale-btn:hover {
      background: var(--pg-surface-2);
    }

    .scale-btn:active {
      transform: scale(0.95);
    }

    .scale-btn--primary,
    .scale-btn--primary:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .scale-btn--primary:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .scale-drawer {
      position: fixed;
      z-index: 51;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 1.25rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      box-shadow: var(--pg-shadow);
      translate: var(--for-drawer-translate, 0px 0px);
      transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
      user-select: none;
      -webkit-user-select: none;
      left: 0;
      right: 0;
      bottom: 0;
      height: 85vh;
      border-radius: var(--pg-radius);
    }

    .scale-drawer-handle {
      flex: none;
      width: 42px;
      height: 5px;
      margin: 0 auto 0.3rem;
      border-radius: 999px;
      background: var(--pg-border-strong);
      cursor: grab;
      touch-action: none;
    }

    .scale-drawer-handle:active {
      cursor: grabbing;
    }

    .scale-drawer-title {
      margin: 0;
      font-size: 1.15rem;
    }

    .scale-drawer-desc {
      margin: 0 0 0.25rem;
      color: var(--pg-text-muted);
      font-size: 0.9rem;
    }

    .scale-drawer-actions {
      display: flex;
      gap: 0.6rem;
      margin-top: auto;
      padding-top: 0.75rem;
    }

    @keyframes scale-drawer-in {
      from {
        transform: translateY(100%);
      }
    }
    @keyframes scale-drawer-out {
      to {
        transform: translateY(100%);
      }
    }

    .scale-drawer-in {
      animation: scale-drawer-in 0.42s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .scale-drawer-out {
      animation: scale-drawer-out 0.3s ease both;
    }

    @media (prefers-reduced-motion: reduce) {
      .scale-btn {
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .scale-btn:active {
        transform: none;
      }

      .scale-drawer-in,
      .scale-drawer-out {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DrawerScaleBackgroundExample {
  protected readonly open = signal(false);
}
