import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { AspectRatioDefaultExample } from './examples/default.example';
import { AspectRatioSquareExample } from './examples/square.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/aspect-ratio.generated';

@Component({
  selector: 'app-aspect-ratio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, AspectRatioDefaultExample, AspectRatioSquareExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="aspect-ratio" [doc]="doc">
      <demo-layout hero sourcePath="aspect-ratio/examples/default.example.ts">
        <app-aspect-ratio-default-example />
      </demo-layout>

      <demo-layout heading="square-1--1" sourcePath="aspect-ratio/examples/square.example.ts">
        <app-aspect-ratio-square-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class AspectRatioPage {
  protected readonly doc = DOC;
}
