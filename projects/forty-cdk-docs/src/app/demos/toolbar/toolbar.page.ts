import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ToolbarDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/toolbar.generated';

@Component({
  selector: 'app-toolbar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, ToolbarDefaultExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="toolbar" [doc]="doc">
      <demo-layout hero sourcePath="toolbar/examples/default.example.ts">
        <app-toolbar-default-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class ToolbarPage {
  protected readonly doc = DOC;
}
