import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ForToastManager, ForToastViewport } from 'forty-cdk/toast';

type Variant = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-toast-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForToastViewport],
  template: `
    <div class="row">
      <button type="button" class="btn" (click)="notify('info')">Info</button>
      <button type="button" class="btn" (click)="notify('success')">Success</button>
      <button type="button" class="btn" (click)="notify('warning')">Warning</button>
      <button type="button" class="btn btn--danger" (click)="notify('error')">Error</button>
    </div>

    <for-toast-viewport
      class="demo-toast-viewport"
      region="toast-variants"
      [stackShift]="{ duration: 220, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' }"
    />
  `,
  styles: `
    app-toast-default-example {
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
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .btn:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .btn--danger,
    .btn--danger:hover {
      background: var(--ex-danger, #b3261e);
      border-color: var(--ex-danger, #b3261e);
      color: var(--ex-danger-contrast, #ffffff);
    }

    .demo-toast-viewport {
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

    .demo-toast-viewport [forToast] {
      position: relative;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.8rem 2.4rem 0.85rem 1rem;
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-left: 4px solid var(--ex-accent, #0e7c6b);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
      animation: toast-in 0.24s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
    }

    .demo-toast-viewport [forToast][data-variant='success'] {
      border-left-color: var(--ex-success, #1f7a4d);
    }

    .demo-toast-viewport [forToast][data-variant='warning'] {
      border-left-color: var(--ex-warning, #a5651a);
    }

    .demo-toast-viewport [forToast][data-variant='error'] {
      border-left-color: var(--ex-danger, #b3261e);
    }

    .demo-toast-viewport [forToastTitle] {
      font-size: 0.9rem;
      font-weight: 600;
    }

    .demo-toast-viewport [forToastDescription] {
      font-size: 0.82rem;
      color: var(--ex-muted, #585d66);
    }

    .demo-toast-viewport [forToastClose] {
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
      border-radius: var(--ex-radius-sm, 14px);
      background: transparent;
      color: var(--ex-muted, #585d66);
      cursor: pointer;
    }

    .demo-toast-viewport [forToastClose]:hover {
      background: var(--ex-surface-2, #f2eee6);
      color: var(--ex-text, #17191c);
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .demo-toast-viewport [forToast] {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ToastDefaultExample {
  protected readonly manager = inject(ForToastManager);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.manager.dismissAll());
  }

  protected notify(variant: Variant): void {
    const copy = {
      info: { title: 'Heads up', description: 'A new version is available.' },
      success: { title: 'Saved', description: 'Your changes were saved.' },
      warning: { title: 'Storage almost full', description: 'You have used 90% of your quota.' },
      error: { title: 'Upload failed', description: 'The file could not be uploaded.' },
    }[variant];
    this.manager.show({ variant, duration: 5000, region: 'toast-variants', ...copy });
  }
}
