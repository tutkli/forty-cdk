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
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .btn:hover {
      background: var(--pg-surface-2);
    }

    .btn--danger,
    .btn--danger:hover {
      background: var(--pg-danger);
      border-color: var(--pg-danger);
      color: var(--pg-danger-contrast);
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
      background: var(--pg-surface);
      color: var(--pg-text);
      border: 1px solid var(--pg-border);
      border-left: 4px solid var(--pg-primary);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      animation: toast-in 0.24s var(--pg-ease-spring) both;
    }

    .demo-toast-viewport [forToast][data-variant='success'] {
      border-left-color: var(--pg-success);
    }

    .demo-toast-viewport [forToast][data-variant='warning'] {
      border-left-color: var(--pg-warning);
    }

    .demo-toast-viewport [forToast][data-variant='error'] {
      border-left-color: var(--pg-danger);
    }

    .demo-toast-viewport [forToastTitle] {
      font-size: 0.9rem;
      font-weight: 600;
    }

    .demo-toast-viewport [forToastDescription] {
      font-size: 0.82rem;
      color: var(--pg-text-muted);
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
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text-muted);
      cursor: pointer;
    }

    .demo-toast-viewport [forToastClose]:hover {
      background: var(--pg-surface-2);
      color: var(--pg-text);
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
