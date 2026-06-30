import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerTitle,
  ForDrawerTrigger,
  provideForDrawerDefaults,
} from 'forty-cdk/drawer';

@Component({
  selector: 'app-drawer-nested-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [provideForDrawerDefaults({ nestedTranslateYpx: 16 })],
  imports: [
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <button
      forDrawerTrigger
      class="nested-btn nested-btn--primary"
      [(open)]="open"
      controls="nested-parent"
    >
      Open parent drawer
    </button>

    @if (open()) {
      <div
        forDrawer
        id="nested-parent"
        class="nested-drawer"
        (dismiss)="open.set(false)"
        animate.enter="nested-drawer-in"
        animate.leave="nested-drawer-out"
      >
        <div
          forDrawerBackdrop
          class="nested-drawer-backdrop"
          animate.enter="nested-backdrop-in"
          animate.leave="nested-backdrop-out"
        ></div>
        <div forDrawerHandle class="nested-drawer-handle"></div>
        <h2 forDrawerTitle class="nested-drawer-title">Parent drawer</h2>
        <p forDrawerDescription class="nested-drawer-desc">
          Open a nested drawer — the parent recedes and Escape closes the topmost first.
        </p>
        <div class="nested-drawer-actions">
          <button
            class="nested-btn nested-btn--primary"
            type="button"
            (click)="childOpen.set(true)"
          >
            Open nested
          </button>
          <button class="nested-btn" forDrawerClose>Close</button>
        </div>

        @if (childOpen()) {
          <div
            forDrawer
            id="nested-child"
            class="nested-drawer"
            (dismiss)="childOpen.set(false)"
            animate.enter="nested-drawer-in"
            animate.leave="nested-drawer-out"
          >
            <div forDrawerHandle class="nested-drawer-handle"></div>
            <h2 forDrawerTitle class="nested-drawer-title">Nested drawer</h2>
            <p forDrawerDescription class="nested-drawer-desc">
              data-depth="1". Escape closes me first, then the parent.
            </p>
            <div class="nested-drawer-actions">
              <button class="nested-btn" forDrawerClose>Close</button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    app-drawer-nested-example {
      display: contents;
    }

    .nested-btn {
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

    .nested-btn:hover {
      background: var(--pg-surface-2);
    }

    .nested-btn:active {
      transform: scale(0.95);
    }

    .nested-btn--primary,
    .nested-btn--primary:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .nested-btn--primary:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .nested-drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(10, 12, 16, 0.5);
      backdrop-filter: blur(2px);
      opacity: calc(1 - var(--for-drawer-drag-progress, 0));
      transition: opacity 0.3s ease;
    }

    .nested-drawer-backdrop[data-dragging] {
      transition: none;
    }

    .nested-drawer {
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
      max-height: 85vh;
      border-radius: var(--pg-radius) var(--pg-radius) 0 0;
    }

    .nested-drawer::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: rgba(10, 12, 16, 0.45);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s ease;
    }

    .nested-drawer[data-state-nested]::after {
      opacity: 1;
    }

    .nested-drawer-handle {
      flex: none;
      width: 42px;
      height: 5px;
      margin: 0 auto 0.3rem;
      border-radius: 999px;
      background: var(--pg-border-strong);
      cursor: grab;
      touch-action: none;
    }

    .nested-drawer-handle:active {
      cursor: grabbing;
    }

    .nested-drawer-title {
      margin: 0;
      font-size: 1.15rem;
    }

    .nested-drawer-desc {
      margin: 0 0 0.25rem;
      color: var(--pg-text-muted);
      font-size: 0.9rem;
    }

    .nested-drawer-actions {
      display: flex;
      gap: 0.6rem;
      margin-top: auto;
      padding-top: 0.75rem;
    }

    @keyframes nested-drawer-in {
      from {
        transform: translateY(100%);
      }
    }
    @keyframes nested-drawer-out {
      to {
        transform: translateY(100%);
      }
    }

    .nested-drawer-in {
      animation: nested-drawer-in 0.42s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .nested-drawer-out {
      animation: nested-drawer-out 0.3s ease both;
    }

    @keyframes nested-backdrop-in {
      from {
        opacity: 0;
      }
    }
    @keyframes nested-backdrop-out {
      to {
        opacity: 0;
      }
    }

    .nested-backdrop-in {
      animation: nested-backdrop-in 0.18s ease both;
    }
    .nested-backdrop-out {
      animation: nested-backdrop-out 0.15s ease both;
    }

    @media (prefers-reduced-motion: reduce) {
      .nested-btn {
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .nested-btn:active {
        transform: none;
      }

      .nested-drawer-in,
      .nested-drawer-out,
      .nested-backdrop-in,
      .nested-backdrop-out {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DrawerNestedExample {
  protected readonly open = signal(false);
  protected readonly childOpen = signal(false);
}
