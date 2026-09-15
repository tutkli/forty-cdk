import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DOC } from '../../../generated/docs/primitives/visually-hidden.generated';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { VisuallyHiddenAnnouncerExample } from './examples/announcer.example';
import { VisuallyHiddenDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';

@Component({
  selector: 'app-visually-hidden-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    VisuallyHiddenDefaultExample,
    VisuallyHiddenAnnouncerExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="visually-hidden" [doc]="doc">
      <demo-layout hero sourcePath="visually-hidden/examples/default.example.ts">
        <app-visually-hidden-default-example />
      </demo-layout>

      <demo-layout
        heading="announcing-an-event"
        sourcePath="visually-hidden/examples/announcer.example.ts"
      >
        <app-visually-hidden-announcer-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class VisuallyHiddenPage {
  protected readonly doc = DOC;
}
