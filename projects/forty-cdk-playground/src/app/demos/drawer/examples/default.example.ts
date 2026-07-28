import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  type ForDrawerSide,
  ForDrawerTitle,
} from 'forty-cdk/drawer';

@Component({
  selector: 'app-drawer-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForDrawer,
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <div class="drawer-sides">
      @for (side of sides; track side) {
        <button class="drawer-btn drawer-btn--primary" type="button" (click)="openSide.set(side)">
          {{ side }}
        </button>
      }
    </div>

    @if (openSide(); as side) {
      <div
        forDrawer
        class="drawer"
        [side]="side"
        (dismiss)="openSide.set(null)"
        [animate.enter]="'drawer-in-' + side"
        [animate.leave]="'drawer-out-' + side"
      >
        <div
          forDrawerBackdrop
          class="drawer-backdrop"
          animate.enter="drawer-backdrop-in"
          animate.leave="drawer-backdrop-out"
        ></div>
        @if (vertical()) {
          <div forDrawerHandle class="drawer-handle"></div>
        }
        <h2 forDrawerTitle class="drawer-title">Drawer title</h2>
        <p forDrawerDescription class="drawer-desc">
          Swipe toward the edge, press Escape, or click the backdrop to dismiss.
        </p>
        <div class="drawer-actions">
          <button class="drawer-btn" forDrawerClose>Close</button>
        </div>
      </div>
    }
  `,
  styles: `
    app-drawer-default-example {
      display: contents;
    }

    .drawer-sides {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
    }

    .drawer-btn {
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

    .drawer-btn:hover {
      background: var(--pg-surface-2);
    }

    .drawer-btn:active {
      transform: scale(0.95);
    }

    .drawer-btn--primary,
    .drawer-btn--primary:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .drawer-btn--primary:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(10, 12, 16, 0.5);
      backdrop-filter: blur(2px);
      opacity: calc(1 - var(--for-drawer-swipe-progress, 0));
      transition: opacity 0.3s ease;
    }

    .drawer-backdrop[data-dragging] {
      transition: none;
    }

    .drawer {
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
      translate: var(--for-drawer-swipe-movement-x, 0px) var(--for-drawer-swipe-movement-y, 0px);
      transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
      user-select: none;
      -webkit-user-select: none;
    }

    .drawer[data-side='bottom'] {
      left: 0;
      right: 0;
      bottom: 0;
      max-height: 85vh;
      border-radius: var(--pg-radius) var(--pg-radius) 0 0;
    }

    .drawer[data-side='top'] {
      left: 0;
      right: 0;
      top: 0;
      max-height: 85vh;
      border-radius: 0 0 var(--pg-radius) var(--pg-radius);
    }

    .drawer[data-side='left'] {
      top: 0;
      bottom: 0;
      left: 0;
      width: min(420px, 92vw);
      border-radius: 0 var(--pg-radius) var(--pg-radius) 0;
    }

    .drawer[data-side='right'] {
      top: 0;
      bottom: 0;
      right: 0;
      width: min(420px, 92vw);
      border-radius: var(--pg-radius) 0 0 var(--pg-radius);
    }

    .drawer-handle {
      flex: none;
      width: 42px;
      height: 5px;
      margin: 0 auto 0.3rem;
      border-radius: 999px;
      background: var(--pg-border-strong);
      cursor: grab;
      touch-action: none;
    }

    .drawer-handle:active {
      cursor: grabbing;
    }

    .drawer-title {
      margin: 0;
      font-size: 1.15rem;
    }

    .drawer-desc {
      margin: 0 0 0.25rem;
      color: var(--pg-text-muted);
      font-size: 0.9rem;
    }

    .drawer-actions {
      display: flex;
      gap: 0.6rem;
      margin-top: auto;
      padding-top: 0.75rem;
    }

    @keyframes drawer-in-bottom {
      from {
        transform: translateY(100%);
      }
    }
    @keyframes drawer-out-bottom {
      to {
        transform: translateY(100%);
      }
    }
    @keyframes drawer-in-top {
      from {
        transform: translateY(-100%);
      }
    }
    @keyframes drawer-out-top {
      to {
        transform: translateY(-100%);
      }
    }
    @keyframes drawer-in-left {
      from {
        transform: translateX(-100%);
      }
    }
    @keyframes drawer-out-left {
      to {
        transform: translateX(-100%);
      }
    }
    @keyframes drawer-in-right {
      from {
        transform: translateX(100%);
      }
    }
    @keyframes drawer-out-right {
      to {
        transform: translateX(100%);
      }
    }

    .drawer-in-bottom {
      animation: drawer-in-bottom 0.42s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .drawer-out-bottom {
      animation: drawer-out-bottom 0.3s ease both;
    }
    .drawer-in-top {
      animation: drawer-in-top 0.42s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .drawer-out-top {
      animation: drawer-out-top 0.3s ease both;
    }
    .drawer-in-left {
      animation: drawer-in-left 0.42s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .drawer-out-left {
      animation: drawer-out-left 0.3s ease both;
    }
    .drawer-in-right {
      animation: drawer-in-right 0.42s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .drawer-out-right {
      animation: drawer-out-right 0.3s ease both;
    }

    @keyframes drawer-backdrop-in {
      from {
        opacity: 0;
      }
    }
    @keyframes drawer-backdrop-out {
      to {
        opacity: 0;
      }
    }

    .drawer-backdrop-in {
      animation: drawer-backdrop-in 0.18s ease both;
    }
    .drawer-backdrop-out {
      animation: drawer-backdrop-out 0.15s ease both;
    }

    @media (prefers-reduced-motion: reduce) {
      .drawer-btn {
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .drawer-btn:active {
        transform: none;
      }

      .drawer-in-bottom,
      .drawer-out-bottom,
      .drawer-in-top,
      .drawer-out-top,
      .drawer-in-left,
      .drawer-out-left,
      .drawer-in-right,
      .drawer-out-right,
      .drawer-backdrop-in,
      .drawer-backdrop-out {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DrawerDefaultExample {
  protected readonly sides: readonly ForDrawerSide[] = ['bottom', 'top', 'left', 'right'];
  protected readonly openSide = signal<ForDrawerSide | null>(null);
  protected readonly vertical = computed(() => {
    const side = this.openSide();
    return side === 'bottom' || side === 'top';
  });
}
