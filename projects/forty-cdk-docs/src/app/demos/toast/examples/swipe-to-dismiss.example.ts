import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ForToastManager, ForToastViewport } from 'forty-cdk/toast';

@Component({
  selector: 'app-toast-swipe-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForToastViewport],
  template: `
    <div class="row">
      <button type="button" class="btn btn--primary" (click)="notify()">
        Show a swipeable toast
      </button>
    </div>

    <for-toast-viewport
      class="swipe-toast-viewport"
      region="toast-swipe"
      swipeDirection="right"
      [swipeThreshold]="60"
    />
  `,
  styles: `
    app-toast-swipe-example {
      display: contents;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }

    .btn {
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

    .btn--primary,
    .btn--primary:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .btn--primary:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .swipe-toast-viewport {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 80;
      display: flex;
      flex-direction: column-reverse;
      gap: 0.6rem;
      width: min(360px, calc(100vw - 2rem));
      margin: 0;
      pointer-events: none;
    }

    .swipe-toast-viewport [forToast] {
      position: relative;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.8rem 2.4rem 0.85rem 1rem;
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-left: 4px solid var(--pg-primary);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      transform: translate3d(
        var(--for-toast-swipe-movement-x, 0px),
        var(--for-toast-swipe-movement-y, 0px),
        0
      );
      transition: transform 0.18s ease-out;
      animation: swipe-toast-in 0.24s var(--pg-ease-spring) both;
      touch-action: none;
    }

    .swipe-toast-viewport [forToast][data-swipe='move'] {
      transition: none;
    }

    .swipe-toast-viewport [forToast][data-swipe='cancel'] {
      transform: translate3d(0, 0, 0);
    }

    .swipe-toast-viewport [forToastTitle] {
      font-size: 0.9rem;
      font-weight: 600;
    }

    .swipe-toast-viewport [forToastDescription] {
      font-size: 0.82rem;
      color: var(--pg-text-muted);
    }

    .swipe-toast-viewport [forToastClose] {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      font-size: 1.05rem;
      line-height: 1;
      border: 0;
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text-muted);
      cursor: pointer;
    }

    .swipe-toast-viewport [forToastClose]:hover {
      background: var(--pg-surface-2);
      color: var(--pg-text);
    }

    @keyframes swipe-toast-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .swipe-toast-viewport [forToast] {
        animation-duration: 0.01ms;
        transition: none;
      }
    }
  `,
})
export class ToastSwipeExample {
  protected readonly manager = inject(ForToastManager);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.manager.dismissAll());
  }

  protected notify(): void {
    this.manager.show({
      variant: 'info',
      title: 'Swipe me away',
      description: 'Drag the toast to the right to dismiss it.',
      region: 'toast-swipe',
      duration: 0,
    });
  }
}
