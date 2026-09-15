import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { BreadcrumbsCollapsedExample } from './examples/collapsed.example';
import { BreadcrumbsDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/breadcrumbs.generated';

@Component({
  selector: 'app-breadcrumbs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, BreadcrumbsDefaultExample, BreadcrumbsCollapsedExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="breadcrumbs" [doc]="doc">
      <demo-layout hero sourcePath="breadcrumbs/examples/default.example.ts">
        <app-breadcrumbs-default-example />
      </demo-layout>

      <demo-layout
        heading="collapsing-a-long-trail"
        sourcePath="breadcrumbs/examples/collapsed.example.ts"
      >
        <app-breadcrumbs-collapsed-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class BreadcrumbsPage {
  protected readonly doc = DOC;
}
