import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerHandle,
  type ForDrawerSnapPoint,
  ForDrawerTitle,
  ForDrawerTrigger,
} from 'forty-cdk/drawer';

@Component({
  selector: 'app-drawer-snap-points-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForDrawer, ForDrawerTrigger, ForDrawerBackdrop, ForDrawerHandle, ForDrawerTitle],
  template: `
    <button
      forDrawerTrigger
      class="snap-btn snap-btn--primary"
      [(open)]="open"
      controls="snap-drawer"
    >
      Open bottom sheet
    </button>

    @if (open()) {
      <div
        forDrawer
        id="snap-drawer"
        class="snap-drawer"
        [snapPoints]="snapPoints"
        [(activeSnapPoint)]="active"
        [fadeFromIndex]="1"
        (dismiss)="open.set(false)"
        animate.enter="snap-drawer-in"
        animate.leave="snap-drawer-out"
      >
        <div forDrawerBackdrop class="snap-drawer-backdrop"></div>
        <div forDrawerHandle class="snap-drawer-handle"></div>
        <h2 forDrawerTitle class="snap-drawer-title">Snap points</h2>
        <div class="snap-btn-row">
          <button class="snap-btn" type="button" (click)="active.set(peek)">Peek</button>
          <button class="snap-btn" type="button" (click)="active.set(half)">Half</button>
          <button class="snap-btn" type="button" (click)="active.set(full)">Full</button>
        </div>
        <div class="snap-drawer-scroll">
          @for (item of items; track item) {
            <div class="snap-row">{{ item }}</div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    app-drawer-snap-points-example {
      display: contents;
    }

    .snap-btn {
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
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        transform 0.18s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
    }

    .snap-btn:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .snap-btn:active {
      transform: scale(0.95);
    }

    .snap-btn--primary,
    .snap-btn--primary:hover {
      background: var(--ex-accent, #0e7c6b);
      border-color: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .snap-btn--primary:hover {
      background: var(--ex-accent-hover, #0a5a4d);
      border-color: var(--ex-accent-hover, #0a5a4d);
    }

    .snap-btn-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .snap-drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(10, 12, 16, 0.5);
      backdrop-filter: blur(2px);
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .snap-drawer-backdrop[data-fade-from-active] {
      opacity: 1;
    }

    .snap-drawer {
      position: fixed;
      z-index: 51;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 1.25rem;
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
      translate: var(--for-drawer-swipe-movement-x, 0px) var(--for-drawer-swipe-movement-y, 0px);
      transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
      user-select: none;
      -webkit-user-select: none;
      left: 0;
      right: 0;
      height: 72vh;
      max-height: 72vh;
      border-radius: var(--ex-radius, 22px) var(--ex-radius, 22px) 0 0;
      corner-shape: squircle;
    }

    .snap-drawer[data-active-snap-point] {
      transition:
        bottom 0.42s cubic-bezier(0.32, 0.72, 0, 1),
        translate 0.42s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .snap-drawer[data-active-snap-point][data-dragging] {
      transition: none;
    }

    .snap-drawer[data-active-snap-point='148px'] {
      bottom: calc(148px - 72vh);
    }

    .snap-drawer[data-active-snap-point='0.5'] {
      bottom: calc(72vh * -0.5);
    }

    .snap-drawer[data-active-snap-point='1'] {
      bottom: 0;
    }

    .snap-drawer-handle {
      flex: none;
      width: 42px;
      height: 5px;
      margin: 0 auto 0.3rem;
      border-radius: 999px;
      background: var(--ex-border-strong, #d0c9bc);
      cursor: grab;
      touch-action: none;
    }

    .snap-drawer-handle:active {
      cursor: grabbing;
    }

    .snap-drawer-title {
      margin: 0;
      font-size: 1.15rem;
    }

    .snap-drawer-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      user-select: text;
      -webkit-user-select: text;
    }

    .snap-row {
      flex: none;
      padding: 0.7rem 0.9rem;
      border-radius: var(--ex-radius-sm, 14px);
      background: var(--ex-surface-2, #f2eee6);
      font-size: 0.9rem;
    }

    @keyframes snap-drawer-in {
      from {
        transform: translateY(100%);
      }
    }
    @keyframes snap-drawer-out {
      to {
        transform: translateY(100%);
      }
    }

    .snap-drawer-in {
      animation: snap-drawer-in 0.42s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .snap-drawer-out {
      animation: snap-drawer-out 0.3s ease both;
    }

    @media (prefers-reduced-motion: reduce) {
      .snap-btn {
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .snap-btn:active {
        transform: none;
      }

      .snap-drawer-in,
      .snap-drawer-out {
        animation-duration: 0.01ms;
      }

      .snap-drawer[data-active-snap-point] {
        transition-duration: 0.01ms;
      }
    }
  `,
})
export class DrawerSnapPointsExample {
  protected readonly peek: ForDrawerSnapPoint = '148px';
  protected readonly half: ForDrawerSnapPoint = 0.5;
  protected readonly full: ForDrawerSnapPoint = 1;
  protected readonly snapPoints: ReadonlyArray<ForDrawerSnapPoint> = [
    this.peek,
    this.half,
    this.full,
  ];
  protected readonly items = Array.from({ length: 14 }, (_, i) => `List item ${i + 1}`);

  protected readonly open = signal(false);
  protected readonly active = signal<ForDrawerSnapPoint | null>(this.peek);
}
