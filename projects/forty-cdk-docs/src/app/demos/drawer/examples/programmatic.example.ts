import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerManager,
  ForDrawerTitle,
  injectDrawerData,
} from 'forty-cdk/drawer';

interface ConfirmData {
  readonly title: string;
  readonly message: string;
}

type ConfirmResult = 'confirm' | 'cancel';

@Component({
  selector: 'app-confirm-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <div forDrawerBackdrop class="prog-drawer-backdrop" animate.enter="prog-backdrop-in"></div>
    <div forDrawerHandle class="prog-drawer-handle"></div>
    <h2 forDrawerTitle class="prog-drawer-title">{{ data?.title }}</h2>
    <p forDrawerDescription class="prog-drawer-desc">{{ data?.message }}</p>
    <div class="prog-drawer-actions">
      <button class="prog-btn" forDrawerClose [closeWith]="cancel">Cancel</button>
      <button class="prog-btn prog-btn--danger" forDrawerClose [closeWith]="confirm">Delete</button>
    </div>
  `,
  styles: `
    .prog-drawer {
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
    }

    .prog-drawer[data-side='bottom'] {
      left: 0;
      right: 0;
      bottom: 0;
      max-height: 85vh;
      border-radius: var(--ex-radius, 22px) var(--ex-radius, 22px) 0 0;
      corner-shape: squircle;
    }

    .prog-drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(10, 12, 16, 0.5);
      backdrop-filter: blur(2px);
      opacity: calc(1 - var(--for-drawer-swipe-progress, 0));
      transition: opacity 0.3s ease;
    }

    .prog-drawer-backdrop[data-dragging] {
      transition: none;
    }

    .prog-drawer-handle {
      flex: none;
      width: 42px;
      height: 5px;
      margin: 0 auto 0.3rem;
      border-radius: 999px;
      background: var(--ex-border-strong, #d0c9bc);
      cursor: grab;
      touch-action: none;
    }

    .prog-drawer-handle:active {
      cursor: grabbing;
    }

    .prog-drawer-title {
      margin: 0;
      font-size: 1.15rem;
    }

    .prog-drawer-desc {
      margin: 0 0 0.25rem;
      color: var(--ex-muted, #585d66);
      font-size: 0.9rem;
    }

    .prog-drawer-actions {
      display: flex;
      gap: 0.6rem;
      margin-top: auto;
      padding-top: 0.75rem;
    }

    .prog-btn {
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

    .prog-btn:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .prog-btn:active {
      transform: scale(0.95);
    }

    .prog-btn--danger,
    .prog-btn--danger:hover {
      background: var(--ex-danger, #b3261e);
      border-color: var(--ex-danger, #b3261e);
      color: var(--ex-danger-contrast, #ffffff);
    }

    @keyframes prog-drawer-in-bottom {
      from {
        transform: translateY(100%);
      }
    }
    @keyframes prog-drawer-out-bottom {
      to {
        transform: translateY(100%);
      }
    }

    .prog-drawer-in {
      animation: prog-drawer-in-bottom 0.42s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .prog-drawer-out {
      animation: prog-drawer-out-bottom 0.3s ease both;
    }

    @keyframes prog-backdrop-in {
      from {
        opacity: 0;
      }
    }
    @keyframes prog-backdrop-out {
      to {
        opacity: 0;
      }
    }

    .prog-backdrop-in {
      animation: prog-backdrop-in 0.18s ease both;
    }
    .prog-backdrop-out {
      animation: prog-backdrop-out 0.15s ease both;
    }

    @media (prefers-reduced-motion: reduce) {
      .prog-btn {
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .prog-btn:active {
        transform: none;
      }

      .prog-drawer-in,
      .prog-drawer-out,
      .prog-backdrop-in,
      .prog-backdrop-out {
        animation-duration: 0.01ms;
      }
    }
  `,
})
class ConfirmDrawer {
  protected readonly data = injectDrawerData<ConfirmData>();
  protected readonly cancel: ConfirmResult = 'cancel';
  protected readonly confirm: ConfirmResult = 'confirm';
}

@Component({
  selector: 'app-drawer-programmatic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="prog-trigger" type="button" (click)="askConfirm()">Delete account…</button>
    <p class="prog-result">
      last result: <b>{{ result() }}</b>
    </p>
  `,
  styles: `
    :host {
      display: contents;
    }

    .prog-trigger {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-danger, #b3261e);
      background: var(--ex-danger, #b3261e);
      color: var(--ex-danger-contrast, #ffffff);
      cursor: pointer;
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        transform 0.18s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
    }

    .prog-trigger:active {
      transform: scale(0.95);
    }

    .prog-result {
      margin: 0.75rem 0 0;
      font-family: var(--ex-font-mono, ui-monospace, monospace);
      font-size: 0.78rem;
      color: var(--ex-muted, #585d66);
    }

    .prog-result b {
      color: var(--ex-text, #17191c);
    }

    @media (prefers-reduced-motion: reduce) {
      .prog-trigger {
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .prog-trigger:active {
        transform: none;
      }
    }
  `,
})
export class DrawerProgrammaticExample {
  readonly #drawers = inject(ForDrawerManager);
  protected readonly result = signal('—');

  protected async askConfirm(): Promise<void> {
    const ref = this.#drawers.open<ConfirmDrawer, ConfirmResult>(ConfirmDrawer, {
      data: {
        title: 'Delete account?',
        message: 'This action is permanent and cannot be undone.',
      },
      side: 'bottom',
      ariaLabel: 'Delete account',
      class: 'prog-drawer',
      animateEnter: 'prog-drawer-in',
      animateLeave: 'prog-drawer-out',
      backdropAnimateLeave: 'prog-backdrop-out',
    });
    const { result } = await ref.closed;
    this.result.set(result ?? 'dismissed');
  }
}
