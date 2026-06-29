import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { SeparatorDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/separator/README.md';

@Component({
  selector: 'app-separator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, SeparatorDefaultExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="separator" [readme]="readme">
      <playground-demo
        title="Dividers"
        subtitle="A static divider between groups of content or controls. Horizontal by default; set orientation='vertical' for an inline divider. Mark it decorative to drop the separator role when it carries no structural meaning."
        sourcePath="projects/forty-cdk-playground/src/app/demos/separator/examples/default.example.ts"
      >
        <app-separator-default-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class SeparatorPage {
  protected readonly readme = readmeContent;
}
