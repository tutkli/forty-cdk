import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { NumberInputDefaultExample } from './examples/default.example';
import { NumberInputFormattingExample } from './examples/formatting.example';
import { NumberInputStatesExample } from './examples/states.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/number-input.generated';

@Component({
  selector: 'app-number-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    NumberInputDefaultExample,
    NumberInputStatesExample,
    NumberInputFormattingExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="number-input" [doc]="doc">
      <demo-layout hero sourcePath="number-input/examples/default.example.ts">
        <app-number-input-default-example />
      </demo-layout>

      <demo-layout heading="states" sourcePath="number-input/examples/states.example.ts">
        <app-number-input-states-example />
      </demo-layout>

      <demo-layout
        heading="formatting--precision"
        sourcePath="number-input/examples/formatting.example.ts"
      >
        <app-number-input-formatting-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class NumberInputPage {
  protected readonly doc = DOC;
}
