import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';
import {
  ForToolbar,
  ForToolbarButton,
  ForToolbarLink,
  ForToolbarSeparator,
} from 'forty-cdk/toolbar';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-toolbar-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForToolbar,
    ForToolbarButton,
    ForToolbarLink,
    ForToolbarSeparator,
    ForToggleGroup,
    ForToggleGroupItem,
    ControlSelect,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Grouped controls"
      subtitle="A container for grouped controls that shares one tab stop. Tab in, then move across every button, toggle and link with the arrow keys, Home and End — nested ToggleGroups join the same roving sequence automatically."
      sourcePath="projects/forty-cdk-playground/src/app/demos/toolbar/examples/toolbar.example.ts"
    >
      <div demo class="tb-demo">
        <div
          forToolbar
          class="tlb"
          aria-label="Text formatting"
          [orientation]="orientation()"
          [loop]="loop()"
          [disabled]="disabled()"
        >
          <button forToolbarButton class="tlb-btn" (click)="action.set('undo')">Undo</button>
          <button forToolbarButton class="tlb-btn" (click)="action.set('redo')">Redo</button>

          <span forToolbarSeparator class="tlb-sep"></span>

          <div forToggleGroup class="tlb-grp" multiple [(value)]="style" aria-label="Text style">
            <button forToggleGroupItem class="tlb-btn tlb-icon" value="bold" aria-label="Bold">
              B
            </button>
            <button forToggleGroupItem class="tlb-btn tlb-icon" value="italic" aria-label="Italic">
              I
            </button>
            <button
              forToggleGroupItem
              class="tlb-btn tlb-icon"
              value="underline"
              aria-label="Underline"
            >
              U
            </button>
          </div>

          <span forToolbarSeparator class="tlb-sep"></span>

          <div forToggleGroup class="tlb-grp" [(value)]="align" aria-label="Alignment">
            <button
              forToggleGroupItem
              class="tlb-btn tlb-icon"
              value="left"
              aria-label="Align left"
            >
              L
            </button>
            <button
              forToggleGroupItem
              class="tlb-btn tlb-icon"
              value="center"
              aria-label="Align center"
            >
              C
            </button>
            <button
              forToggleGroupItem
              class="tlb-btn tlb-icon"
              value="right"
              aria-label="Align right"
            >
              R
            </button>
          </div>

          <span forToolbarSeparator class="tlb-sep"></span>

          <a
            forToolbarLink
            class="tlb-link"
            href="https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Docs
          </a>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="orientation"
          hint="Sets the axis the arrow keys follow: horizontal uses Left/Right, vertical uses Up/Down. Also reflected on data-orientation so you can flip the layout in CSS."
          [options]="orientationOptions"
          [(value)]="orientation"
        />
        <app-control-switch label="loop" [(checked)]="loop" />
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          style: <b>{{ style().length ? style().join(', ') : 'none' }}</b
          ><br />
          align: <b>{{ align().length ? align()[0] : 'none' }}</b
          ><br />
          last action: <b>{{ action() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tlb {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.35rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
    }

    .tlb[data-orientation='vertical'] {
      flex-direction: column;
      align-items: stretch;
    }

    .tlb[data-disabled] {
      opacity: 0.6;
    }

    .tlb-grp {
      display: inline-flex;
      gap: 0.15rem;
    }

    .tlb[data-orientation='vertical'] .tlb-grp {
      flex-direction: column;
    }

    .tlb-btn {
      font: inherit;
      font-weight: 600;
      padding: 0.4rem 0.7rem;
      color: var(--pg-text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
    }

    .tlb-icon {
      width: 36px;
      padding: 0.4rem 0;
      text-align: center;
    }

    .tlb-btn:hover {
      background: var(--pg-surface-2);
    }

    .tlb-btn[data-state='checked'] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .tlb-btn:disabled,
    .tlb-btn[data-disabled] {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .tlb-sep {
      align-self: stretch;
      width: 1px;
      margin: 0 0.2rem;
      background: var(--pg-border-strong);
    }

    .tlb[data-orientation='vertical'] .tlb-sep {
      width: auto;
      height: 1px;
      margin: 0.2rem 0;
    }

    .tlb-link {
      display: inline-flex;
      align-items: center;
      padding: 0.4rem 0.7rem;
      font-weight: 600;
      color: var(--pg-primary);
      text-decoration: none;
      border-radius: var(--pg-radius-sm);
    }

    .tlb-link:hover {
      text-decoration: underline;
    }

    .tlb-link[aria-disabled='true'] {
      opacity: 0.45;
      pointer-events: none;
    }

    .tlb-btn:focus-visible,
    .tlb-link:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: 2px;
    }
  `,
})
export class ToolbarExample {
  protected readonly orientationOptions: readonly ControlOption<'horizontal' | 'vertical'>[] = [
    { value: 'horizontal', label: 'horizontal' },
    { value: 'vertical', label: 'vertical' },
  ];

  protected readonly style = signal<readonly string[]>(['bold']);
  protected readonly align = signal<readonly string[]>(['left']);
  protected readonly action = signal('—');
  protected readonly loop = signal(true);
  protected readonly disabled = signal(false);

  protected readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
}
