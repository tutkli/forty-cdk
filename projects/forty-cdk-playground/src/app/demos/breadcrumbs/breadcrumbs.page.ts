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
      <playground-demo hero sourcePath="breadcrumbs/examples/default.example.ts">
        <app-breadcrumbs-default-example />
      </playground-demo>

      <playground-demo
        title="Collapsing a long trail"
        subtitle="The primitive renders whatever items you give it, so collapsing a deep path is a consumer decision. Here the middle is folded into an expandable ellipsis button that reveals the hidden crumbs — the trail stays a single accessible navigation landmark either way."
        sourcePath="breadcrumbs/examples/collapsed.example.ts"
      >
        <app-breadcrumbs-collapsed-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class BreadcrumbsPage {
  protected readonly doc = DOC;
}
