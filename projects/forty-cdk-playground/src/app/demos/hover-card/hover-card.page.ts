import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { HoverCardDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/hover-card.generated';

@Component({
  selector: 'app-hover-card-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, HoverCardDefaultExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="hover-card" [doc]="doc">
      <playground-demo hero sourcePath="hover-card/examples/default.example.ts">
        <app-hover-card-default-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class HoverCardPage {
  protected readonly doc = DOC;
}
