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
      <playground-demo hero sourcePath="visually-hidden/examples/default.example.ts">
        <app-visually-hidden-default-example />
      </playground-demo>

      <playground-demo
        title="Announcing an event"
        subtitle="An event with no visible text of its own goes through <code>LiveAnnouncer</code> instead — there is no element to hide, so there is nothing for <code>[forVisuallyHidden]</code> to mark. The two politeness levels are independent regions, so an <code>assertive</code> message never cancels a <code>polite</code> one in flight."
        sourcePath="visually-hidden/examples/announcer.example.ts"
      >
        <app-visually-hidden-announcer-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class VisuallyHiddenPage {
  protected readonly doc = DOC;
}
