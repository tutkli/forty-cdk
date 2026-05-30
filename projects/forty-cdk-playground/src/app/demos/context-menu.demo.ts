import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForContextMenu,
  ForContextMenuTrigger,
  ForMenuContent,
  ForMenuItem,
  ForMenuSeparator,
} from 'forty-cdk';

import { ControlSwitch } from '../ui/control-switch';
import { DemoLayout } from '../ui/demo-layout';

@Component({
  selector: 'app-context-menu-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForContextMenu,
    ForContextMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSeparator,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Context Menu"
      summary="A menu opened by right-click (or Shift+F10 / the Menu key when the region is focused), anchored to the pointer through a virtual element. It shares the menu vocabulary and keyboard model with the Dropdown Menu, dismissing on Escape, outside pointer-down and Tab. The surface is portaled to <body>."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/menu/"
    >
      <div demo class="ctx-demo">
        <div forContextMenu [(open)]="open" [dismissible]="dismissible()" [disabled]="disabled()">
          <div forContextMenuTrigger tabindex="0" class="ctx-region">
            Right-click anywhere in this area
            <span class="ctx-hint">(or focus it and press Shift+F10)</span>
          </div>
          @if (open()) {
            <div forMenuContent class="pg-menu" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (select)="onAction('Cut')">Cut</button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Copy')">Copy</button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Paste')">Paste</button>
              <hr forMenuSeparator class="pg-menu-separator" />
              <button forMenuItem class="pg-menu-item" (select)="onAction('Rename')">Rename</button>
              <button
                forMenuItem
                class="pg-menu-item pg-menu-item--danger"
                (select)="onAction('Delete')"
              >
                Delete
              </button>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="dismissible" [(checked)]="dismissible" />
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          open: <b>{{ open() }}</b
          ><br />
          last action: <b>{{ lastAction() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .ctx-demo {
      display: flex;
      justify-content: center;
      padding: 1.5rem 0;
    }

    .ctx-region {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      width: min(420px, 100%);
      min-height: 180px;
      padding: 1.5rem;
      text-align: center;
      font-weight: 600;
      color: var(--pg-text-muted);
      background: var(--pg-surface-2);
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
      user-select: none;
    }

    .ctx-hint {
      font-size: 0.8rem;
      font-weight: 400;
    }
  `,
})
export class ContextMenuDemo {
  protected readonly open = signal(false);
  protected readonly dismissible = signal(true);
  protected readonly disabled = signal(false);
  protected readonly lastAction = signal('—');

  protected onAction(label: string): void {
    this.lastAction.set(label);
  }
}
