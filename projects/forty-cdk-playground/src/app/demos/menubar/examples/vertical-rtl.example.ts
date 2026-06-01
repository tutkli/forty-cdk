import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForMenuContent,
  ForMenuItem,
  ForMenuSeparator,
  ForMenubar,
  ForMenubarTrigger,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-menubar-vertical-rtl-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForMenubar,
    ForMenubarTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSeparator,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Vertical & RTL"
      subtitle="The same menubar laid out as a vertical sidebar (orientation='vertical' makes Up / Down move between triggers). Switching dir to rtl reflects dir='rtl' on the bar, swaps the cross-menu arrow keys, and floats each menu out of the opposite edge — the directive resolves the writing direction and positioning for you."
      sourcePath="projects/forty-cdk-playground/src/app/demos/menubar/examples/vertical-rtl.example.ts"
    >
      <div demo class="bar-demo">
        <div
          forMenubar
          orientation="vertical"
          [(value)]="openMenu"
          [dir]="dir()"
          ariaLabel="Workspace"
          class="pg-menubar bar-side"
        >
          <button forMenubarTrigger value="workspace" class="pg-menubar-trigger">Workspace</button>
          @if (openMenu() === 'workspace') {
            <div forMenuContent class="pg-menu" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (select)="onAction('New project')">
                New project
              </button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Import…')">Import…</button>
              <hr forMenuSeparator class="pg-menu-separator" />
              <button forMenuItem class="pg-menu-item" (select)="onAction('Settings')">
                Settings
              </button>
            </div>
          }

          <button forMenubarTrigger value="insert" class="pg-menubar-trigger">Insert</button>
          @if (openMenu() === 'insert') {
            <div forMenuContent class="pg-menu" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (select)="onAction('Image')">Image</button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Table')">Table</button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Code block')">
                Code block
              </button>
            </div>
          }

          <button forMenubarTrigger value="format" class="pg-menubar-trigger">Format</button>
          @if (openMenu() === 'format') {
            <div forMenuContent class="pg-menu" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (select)="onAction('Bold')">Bold</button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Italic')">Italic</button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Clear formatting')">
                Clear formatting
              </button>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="dir"
          hint="Writing direction resolved onto the bar. In rtl the cross-menu arrow keys swap and each menu floats from the opposite edge."
          [options]="dirOptions"
          [(value)]="dir"
        />

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
      padding: 1.5rem 0;
    }

    .bar-side {
      min-width: 160px;
    }
  `,
})
export class MenubarVerticalRtlExample {
  protected readonly dirOptions: readonly ControlOption<'ltr' | 'rtl'>[] = [
    { value: 'ltr', label: 'ltr' },
    { value: 'rtl', label: 'rtl' },
  ];

  protected readonly openMenu = signal('');
  protected readonly dir = signal<'ltr' | 'rtl'>('ltr');
  protected readonly lastAction = signal('—');

  protected onAction(label: string): void {
    this.lastAction.set(label);
  }
}
