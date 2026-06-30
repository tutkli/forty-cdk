import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { PaneResizerCollapsibleExample } from './examples/collapsible.example';
import { PaneResizerDisabledExample } from './examples/disabled.example';
import { PaneResizerResizeExample } from './examples/resize.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/pane-resizer/README.md';

@Component({
  selector: 'app-pane-resizer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    PaneResizerResizeExample,
    PaneResizerDisabledExample,
    PaneResizerCollapsibleExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="pane-resizer" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/pane-resizer/examples/resize.example.ts"
      >
        <app-pane-resizer-resize-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="<code>disabled</code> drops the resizer out of the tab order and blocks both keyboard and pointer resizing. It reflects <code>aria-disabled</code> and <code>data-disabled</code> so you can dim the divider in CSS."
        sourcePath="projects/forty-cdk-playground/src/app/demos/pane-resizer/examples/disabled.example.ts"
      >
        <app-pane-resizer-disabled-example />
      </playground-demo>

      <playground-demo
        title="Collapsible panel"
        subtitle="With <code>collapsible</code> on, <kbd>Enter</kbd> / <kbd>Space</kbd> on the focused resizer snaps the panel to its <code>min</code> and a second press restores the last expanded size — APG-optional behaviour for a resizer that backs a collapsible pane. Drag or the arrow keys still resize as usual."
        sourcePath="projects/forty-cdk-playground/src/app/demos/pane-resizer/examples/collapsible.example.ts"
      >
        <app-pane-resizer-collapsible-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class PaneResizerPage {
  protected readonly readme = readmeContent;
}
