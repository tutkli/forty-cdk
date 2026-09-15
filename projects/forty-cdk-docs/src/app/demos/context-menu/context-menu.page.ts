import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ContextMenuDefaultExample } from './examples/default.example';
import { ContextMenuRichContentExample } from './examples/rich-content.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/context-menu.generated';

@Component({
  selector: 'app-context-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, ContextMenuDefaultExample, ContextMenuRichContentExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="context-menu" [doc]="doc">
      <demo-layout hero sourcePath="context-menu/examples/default.example.ts">
        <app-context-menu-default-example />
      </demo-layout>

      <demo-layout
        heading="rich-content"
        sourcePath="context-menu/examples/rich-content.example.ts"
      >
        <app-context-menu-rich-content-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class ContextMenuPage {
  protected readonly doc = DOC;
}
