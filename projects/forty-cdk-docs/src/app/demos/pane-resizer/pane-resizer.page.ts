import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { PaneResizerCollapsibleExample } from './examples/collapsible.example';
import { PaneResizerStatesExample } from './examples/states.example';
import { PaneResizerResizeExample } from './examples/resize.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/pane-resizer.generated';

@Component({
  selector: 'app-pane-resizer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    PaneResizerResizeExample,
    PaneResizerStatesExample,
    PaneResizerCollapsibleExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="pane-resizer" [doc]="doc">
      <demo-layout hero sourcePath="pane-resizer/examples/resize.example.ts">
        <app-pane-resizer-resize-example />
      </demo-layout>

      <demo-layout
        title="States"
        subtitle="One class and one directive, two states. <code>disabled</code> drops the resizer out of the tab order and blocks both keyboard and pointer resizing; it reflects <code>aria-disabled</code> and <code>data-disabled</code>, so the dimmed divider and the live one come from the same stylesheet."
        sourcePath="pane-resizer/examples/states.example.ts"
      >
        <app-pane-resizer-states-example />
      </demo-layout>

      <demo-layout
        title="Collapsible panel"
        subtitle="With <code>collapsible</code> on, <kbd>Enter</kbd> / <kbd>Space</kbd> on the focused resizer snaps the panel to its <code>min</code> and a second press restores the last expanded size — APG-optional behaviour for a resizer that backs a collapsible pane. Drag or the arrow keys still resize as usual."
        sourcePath="pane-resizer/examples/collapsible.example.ts"
      >
        <app-pane-resizer-collapsible-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class PaneResizerPage {
  protected readonly doc = DOC;
}
