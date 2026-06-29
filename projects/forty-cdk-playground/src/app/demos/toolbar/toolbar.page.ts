import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ToolbarDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/toolbar/README.md';

@Component({
  selector: 'app-toolbar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, ToolbarDefaultExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="toolbar" [readme]="readme">
      <playground-demo
        title="Grouped controls"
        subtitle="A container for grouped controls that shares one tab stop. Tab in, then move across every button, toggle and link with the arrow keys, Home and End — nested ToggleGroups join the same roving sequence automatically."
        sourcePath="projects/forty-cdk-playground/src/app/demos/toolbar/examples/default.example.ts"
      >
        <app-toolbar-default-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ToolbarPage {
  protected readonly readme = readmeContent;
}
