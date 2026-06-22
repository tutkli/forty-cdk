import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForMenuContent, ForMenuItem, ForMenuSeparator } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-menubar-example',
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
      title="Application menu bar"
      subtitle="A persistent application menu bar (role menubar). A roving tabindex keeps a single tab stop; arrows move between top-level triggers, and once one menu is open, hovering or arrowing to a sibling switches instantly. Each menu's content is portaled to <body>, so its styles live in styles.css."
      sourcePath="projects/forty-cdk-playground/src/app/demos/menubar/examples/menubar.example.ts"
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
              <button forMenuItem class="pg-menu-item" (activate)="onAction('New file')">
                New file
              </button>
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Open…')">Open…</button>
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Save')">Save</button>
              <hr forMenuSeparator class="pg-menu-separator" />
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Quit')">Quit</button>
            </div>
          }

          <button forMenubarTrigger value="edit" class="pg-menubar-trigger">Edit</button>
          @if (openMenu() === 'edit') {
            <div forMenuContent class="pg-menu" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Undo')">Undo</button>
              <button forMenuItem class="pg-menu-item" disabled>Redo</button>
              <hr forMenuSeparator class="pg-menu-separator" />
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Cut')">Cut</button>
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Copy')">Copy</button>
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Paste')">Paste</button>
            </div>
          }

          <button forMenubarTrigger value="view" class="pg-menubar-trigger">View</button>
          @if (openMenu() === 'view') {
            <div forMenuContent class="pg-menu" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Zoom in')">
                Zoom in
              </button>
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Zoom out')">
                Zoom out
              </button>
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Reset zoom')">
                Reset zoom
              </button>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="orientation"
          hint="The axis the menu bar lays out on and that arrow keys follow: horizontal uses Left/Right between triggers, vertical uses Up/Down."
          [options]="orientationOptions"
          [(value)]="orientation"
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
export class MenubarExample {
  protected readonly orientationOptions: readonly ControlOption<'horizontal' | 'vertical'>[] = [
    { value: 'horizontal', label: 'horizontal' },
    { value: 'vertical', label: 'vertical' },
  ];

  protected readonly openMenu = signal('');
  protected readonly loop = signal(true);
  protected readonly disabled = signal(false);
  protected readonly lastAction = signal('—');

  protected readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');

  protected onAction(label: string): void {
    this.lastAction.set(label);
  }
}
