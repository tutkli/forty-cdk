import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ForDrawerManager } from 'forty-cdk/drawer';

import { ConfirmDrawer, type ConfirmResult } from './confirm-drawer';

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
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-danger);
      background: var(--pg-danger);
      color: var(--pg-danger-contrast);
      cursor: pointer;
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        transform 0.18s var(--pg-ease-spring);
    }

    .prog-trigger:active {
      transform: scale(0.95);
    }

    .prog-result {
      margin: 0.75rem 0 0;
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }

    .prog-result b {
      color: var(--pg-text);
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
