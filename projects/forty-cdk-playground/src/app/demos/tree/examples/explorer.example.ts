import { ChangeDetectionStrategy, Component, linkedSignal, signal } from '@angular/core';
import { ForTree } from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { type TreeNodeData, TreeNode } from './tree-node';

@Component({
  selector: 'app-tree-explorer-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForTree, TreeNode, ControlSwitch, ControlSelect],
  template: `
    <playground-demo
      title="File explorer"
      subtitle="A nested tree implementing the APG Tree View pattern. One Tab stop enters the tree, then arrows roam the visible nodes; Right expands a closed folder (or steps into it) and Left collapses it (or jumps to the parent), Home / End hit the ends, and typing matches a node by name. Enter / Space select. Toggle multiple to switch between single and APG multi-select; flip dir to mirror the expand / collapse arrows for RTL."
      sourcePath="projects/forty-cdk-playground/src/app/demos/tree/examples/explorer.example.ts"
    >
      <div demo class="tree-demo">
        <ul
          forTree
          class="pg-tree"
          [(value)]="value"
          [(expanded)]="expanded"
          [multiple]="multiple()"
          [selectionFollowsFocus]="selectionFollowsFocus()"
          [disabled]="disabled()"
          [dir]="dir()"
          [ariaLabel]="'Project files'"
        >
          @for (node of nodes; track node.id) {
            <app-tree-node [node]="node" [expandedIds]="expanded()" />
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="multiple" [(checked)]="multiple" />
        <app-control-switch
          label="selectionFollowsFocus"
          hint="Single mode only: arrow navigation also selects the focused node, not just highlights it. APG recommends caution — leave off unless the UX truly benefits."
          [(checked)]="selectionFollowsFocus"
          [disabled]="multiple()"
        />
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-select
          label="dir"
          hint="Writing direction. RTL mirrors the expand / collapse arrows (Left expands, Right collapses) and is reflected to the host dir attribute for layout."
          [options]="dirOptions"
          [(value)]="dir"
        />

        <p class="pg-hint">
          Multiple mode: Space toggles, Shift+Arrow extends, Shift+Space fills a range, Ctrl+A
          toggles all. Press * to expand every sibling at the current level.
        </p>
        <p class="pg-state">
          selected: <b>{{ value().join(', ') || '—' }}</b> expanded:
          <b>{{ expanded().join(', ') || '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tree-demo {
      display: flex;
      justify-content: center;
      width: 100%;
      padding: 1rem 0;
    }
  `,
})
export class TreeExplorerExample {
  protected readonly nodes: readonly TreeNodeData[] = [
    {
      id: 'src',
      name: 'src',
      children: [
        {
          id: 'app',
          name: 'app',
          children: [
            { id: 'app.ts', name: 'app.ts' },
            { id: 'app.html', name: 'app.html' },
            { id: 'app.css', name: 'app.css' },
          ],
        },
        { id: 'main.ts', name: 'main.ts' },
        { id: 'styles.css', name: 'styles.css' },
      ],
    },
    {
      id: 'public',
      name: 'public',
      children: [
        { id: 'favicon.ico', name: 'favicon.ico' },
        { id: 'logo.svg', name: 'logo.svg' },
      ],
    },
    { id: 'readme.md', name: 'README.md' },
    { id: 'package.json', name: 'package.json' },
  ];

  protected readonly dirOptions: readonly ControlOption<'ltr' | 'rtl'>[] = [
    { value: 'ltr', label: 'ltr' },
    { value: 'rtl', label: 'rtl' },
  ];

  protected readonly multiple = signal(false);
  protected readonly value = linkedSignal<boolean, string[]>({
    source: this.multiple,
    computation: () => [],
  });
  protected readonly expanded = signal<readonly string[]>(['src', 'app']);
  protected readonly selectionFollowsFocus = signal(false);
  protected readonly disabled = signal(false);
  protected readonly dir = signal<'ltr' | 'rtl'>('ltr');
}
