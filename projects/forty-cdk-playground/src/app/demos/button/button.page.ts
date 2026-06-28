import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ButtonBasicExample } from './examples/basic.example';
import { ButtonDisabledExample } from './examples/disabled.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/button/README.md';

@Component({
  selector: 'app-button-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ButtonBasicExample, ButtonDisabledExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="button" [readme]="readme">
      <app-button-basic-example />
      <app-button-disabled-example />
    </primitive-page>
  `,
})
export class ButtonPage {
  protected readonly readme = readmeContent;
}
