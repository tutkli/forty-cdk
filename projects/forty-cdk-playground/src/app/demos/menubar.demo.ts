import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForMenuContent,
  ForMenuItem,
  ForMenuSeparator,
  ForMenubar,
  ForMenubarTrigger,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../ui/control-select';
import { ControlSwitch } from '../ui/control-switch';
import { DemoLayout } from '../ui/demo-layout';

@Component({
  selector: 'app-menubar-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForMenubar,
    ForMenubarTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSeparator,
    ControlSelect,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Menubar"
      summary="A persistent application menu bar (role menubar). A roving tabindex keeps a single tab stop; arrows move between top-level triggers, and once one menu is open, hovering or arrowing to a sibling switches instantly. Each menu's content is portaled to <body>, so its styles live in styles.css."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/menubar/"
    >
      <div demo class="bar-demo">
        <div
          forMenubar
          [(value)]="openMenu"
          [orientation]="orientation()"
          [loop]="loop()"
          [disabled]="disabled()"
          ariaLabel="Application"
          class="pg-menubar"
        >
          <button forMenubarTrigger value="file" class="pg-menubar-trigger">File</button>
          @if (openMenu() === 'file') {
            <div forMenuContent class="pg-menu" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (select)="onAction('New file')">
                New file
              </button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Open…')">Open…</button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Save')">Save</button>
              <hr forMenuSeparator class="pg-menu-separator" />
              <button forMenuItem class="pg-menu-item" (select)="onAction('Quit')">Quit</button>
            </div>
          }

          <button forMenubarTrigger value="edit" class="pg-menubar-trigger">Edit</button>
          @if (openMenu() === 'edit') {
            <div forMenuContent class="pg-menu" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (select)="onAction('Undo')">Undo</button>
              <button forMenuItem class="pg-menu-item" disabled>Redo</button>
              <hr forMenuSeparator class="pg-menu-separator" />
              <button forMenuItem class="pg-menu-item" (select)="onAction('Cut')">Cut</button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Copy')">Copy</button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Paste')">Paste</button>
            </div>
          }

          <button forMenubarTrigger value="view" class="pg-menubar-trigger">View</button>
          @if (openMenu() === 'view') {
            <div forMenuContent class="pg-menu" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (select)="onAction('Zoom in')">
                Zoom in
              </button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Zoom out')">
                Zoom out
              </button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Reset zoom')">
                Reset zoom
              </button>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="orientation"
          [options]="orientationOptions"
          [(value)]="orientationValue"
        />
        <app-control-switch label="loop" [(checked)]="loop" />
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          open menu: <b>{{ openMenu() || 'none' }}</b
          ><br />
          last action: <b>{{ lastAction() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .bar-demo {
      display: flex;
      justify-content: center;
      padding: 2.5rem 0;
    }
  `,
})
export class MenubarDemo {
  protected readonly orientationOptions: readonly ControlOption[] = [
    { value: 'horizontal', label: 'horizontal' },
    { value: 'vertical', label: 'vertical' },
  ];

  protected readonly openMenu = signal('');
  protected readonly loop = signal(true);
  protected readonly disabled = signal(false);
  protected readonly lastAction = signal('—');

  protected readonly orientationValue = signal('horizontal');
  protected readonly orientation = computed<'horizontal' | 'vertical'>(() =>
    this.orientationValue() === 'vertical' ? 'vertical' : 'horizontal',
  );

  protected onAction(label: string): void {
    this.lastAction.set(label);
  }
}
