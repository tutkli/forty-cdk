import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ButtonDefaultExample } from './examples/default.example';
import { ButtonDisabledExample } from './examples/disabled.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/button.generated';

@Component({
  selector: 'app-button-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, ButtonDefaultExample, ButtonDisabledExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="button" [doc]="doc">
      <demo-layout hero sourcePath="button/examples/default.example.ts">
        <app-button-default-example />
      </demo-layout>

      <demo-layout
        heading="disabled-stays-focusable"
        sourcePath="button/examples/disabled.example.ts"
      >
        <app-button-disabled-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class ButtonPage {
  protected readonly doc = DOC;
}
