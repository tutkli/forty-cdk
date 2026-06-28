import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SeparatorExample } from './examples/separator.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/separator/README.md';

@Component({
  selector: 'app-separator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, SeparatorExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="separator" [readme]="readme">
      <app-separator-example />
    </primitive-page>
  `,
})
export class SeparatorPage {
  protected readonly readme = readmeContent;
}
