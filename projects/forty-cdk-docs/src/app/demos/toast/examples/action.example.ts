import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ForToastManager, ForToastViewport } from 'forty-cdk/toast';

@Component({
  selector: 'app-toast-action-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForToastViewport],
  template: `
    <div class="row">
      <button type="button" class="btn btn--primary" (click)="archive()">Archive message</button>
      <button type="button" class="btn" (click)="save()">Save → Saved</button>
    </div>

    <for-toast-viewport class="action-toast-viewport" region="toast-action" />
  `,
  styles: `
    app-toast-action-example {
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

    .action-toast-viewport {
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

    .action-toast-viewport [forToast] {
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
      animation: action-toast-in 0.24s var(--pg-ease-spring) both;
    }

    .action-toast-viewport [forToast][data-variant='success'] {
      border-left-color: var(--pg-success);
    }

    .action-toast-viewport [forToastTitle] {
      font-size: 0.9rem;
      font-weight: 600;
    }

    .action-toast-viewport [forToastDescription] {
      font-size: 0.82rem;
      color: var(--pg-text-muted);
    }

    .action-toast-viewport [forToastAction] {
      align-self: flex-start;
      margin-top: 0.45rem;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.3rem 0.6rem;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      color: var(--pg-primary);
      cursor: pointer;
    }

    .action-toast-viewport [forToastAction]:hover {
      background: var(--pg-surface-2);
    }

    .action-toast-viewport [forToastClose] {
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

    .action-toast-viewport [forToastClose]:hover {
      background: var(--pg-surface-2);
      color: var(--pg-text);
    }

    @keyframes action-toast-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .action-toast-viewport [forToast] {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ToastActionExample {
  protected readonly manager = inject(ForToastManager);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.manager.dismissAll());
  }

  protected archive(): void {
    this.manager.show({
      title: 'Message archived',
      description: 'It was moved out of your inbox.',
      region: 'toast-action',
      action: {
        label: 'Undo',
        activate: () => this.manager.show({ title: 'Restored', region: 'toast-action' }),
      },
      duration: 6000,
    });
  }

  protected save(): void {
    const ref = this.manager.show({ title: 'Saving…', duration: 0, region: 'toast-action' });
    setTimeout(
      () =>
        ref.update({
          title: 'Saved',
          description: 'All changes stored.',
          variant: 'success',
          duration: 2500,
        }),
      1200,
    );
  }
}
