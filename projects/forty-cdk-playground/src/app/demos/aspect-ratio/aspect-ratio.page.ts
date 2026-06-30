import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { AspectRatioDefaultExample } from './examples/default.example';
import { AspectRatioSquareExample } from './examples/square.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/aspect-ratio/README.md';

@Component({
  selector: 'app-aspect-ratio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, AspectRatioDefaultExample, AspectRatioSquareExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="aspect-ratio" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/aspect-ratio/examples/default.example.ts"
      >
        <app-aspect-ratio-default-example />
      </playground-demo>

      <playground-demo
        title="Square (1 / 1)"
        subtitle="Set <code>ratio</code> to <code>1</code> to keep a box perfectly square at any width — handy for avatars, thumbnails, or uniform grid cards."
        sourcePath="projects/forty-cdk-playground/src/app/demos/aspect-ratio/examples/square.example.ts"
      >
        <app-aspect-ratio-square-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class AspectRatioPage {
  protected readonly readme = readmeContent;
}
