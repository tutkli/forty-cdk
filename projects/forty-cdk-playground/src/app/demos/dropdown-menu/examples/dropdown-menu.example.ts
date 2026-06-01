import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForDropdownMenu,
  ForDropdownMenuTrigger,
  ForMenuContent,
  ForMenuItem,
  ForMenuSeparator,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-dropdown-menu-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSeparator,
    ControlSelect,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Button-triggered menu"
      subtitle="A button-triggered menu positioned by floating-ui, with full keyboard support: arrows move between items, typeahead jumps to a label, Home/End reach the ends. It dismisses on Escape, outside pointer-down and Tab, returning focus to the trigger. The surface is portaled to <body>, so its styles live in styles.css."
      sourcePath="projects/forty-cdk-playground/src/app/demos/dropdown-menu/examples/dropdown-menu.example.ts"
    >
      <div demo class="menu-demo">
        <div
          forDropdownMenu
          [(open)]="open"
          [side]="side()"
          [align]="align()"
          [sideOffset]="sideOffset()"
          [loop]="loop()"
          [dismissible]="dismissible()"
          [disabled]="disabled()"
        >
          <button forDropdownMenuTrigger class="pg-btn pg-btn--primary">Actions</button>
          @if (open()) {
            <div forMenuContent class="pg-menu" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (select)="onAction('New tab')">
                New tab
              </button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('New window')">
                New window
              </button>
              <hr forMenuSeparator class="pg-menu-separator" />
              <button forMenuItem class="pg-menu-item" (select)="onAction('Downloads')">
                Downloads
              </button>
              <button forMenuItem class="pg-menu-item" (select)="onAction('Bookmarks')">
                Bookmarks
              </button>
              <button forMenuItem class="pg-menu-item" disabled>Sync (signed out)</button>
              <hr forMenuSeparator class="pg-menu-separator" />
              <button
                forMenuItem
                class="pg-menu-item pg-menu-item--danger"
                (select)="onAction('Clear browsing data')"
              >
                Clear browsing data
              </button>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select label="side" [options]="sideOptions" [(value)]="side" />
        <app-control-select label="align" [options]="alignOptions" [(value)]="align" />
        <app-control-select label="sideOffset" [options]="offsetOptions" [(value)]="offsetValue" />
        <app-control-switch label="loop" [(checked)]="loop" />
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
    .menu-demo {
      display: flex;
      justify-content: center;
      padding: 2.5rem 0;
    }
  `,
})
export class DropdownMenuExample {
  protected readonly sideOptions: readonly ControlOption<'top' | 'right' | 'bottom' | 'left'>[] = [
    { value: 'top', label: 'top' },
    { value: 'right', label: 'right' },
    { value: 'bottom', label: 'bottom' },
    { value: 'left', label: 'left' },
  ];

  protected readonly alignOptions: readonly ControlOption<'start' | 'center' | 'end'>[] = [
    { value: 'start', label: 'start' },
    { value: 'center', label: 'center' },
    { value: 'end', label: 'end' },
  ];

  protected readonly offsetOptions: readonly ControlOption[] = [
    { value: '4', label: '4 px' },
    { value: '8', label: '8 px' },
    { value: '16', label: '16 px' },
  ];

  protected readonly open = signal(false);
  protected readonly loop = signal(true);
  protected readonly dismissible = signal(true);
  protected readonly disabled = signal(false);
  protected readonly lastAction = signal('—');

  protected readonly side = signal<'top' | 'right' | 'bottom' | 'left'>('bottom');
  protected readonly align = signal<'start' | 'center' | 'end'>('start');

  protected readonly offsetValue = signal('4');
  protected readonly sideOffset = computed(() => Number(this.offsetValue()));

  protected onAction(label: string): void {
    this.lastAction.set(label);
  }
}
