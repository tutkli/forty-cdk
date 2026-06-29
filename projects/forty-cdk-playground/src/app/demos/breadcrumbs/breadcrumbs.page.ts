import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { BreadcrumbsCollapsedExample } from './examples/collapsed.example';
import { BreadcrumbsDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/breadcrumbs/README.md';

@Component({
  selector: 'app-breadcrumbs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, BreadcrumbsDefaultExample, BreadcrumbsCollapsedExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="breadcrumbs" [readme]="readme">
      <playground-demo
        title="A breadcrumb trail"
        subtitle="A labelled navigation landmark wrapping a set of links. The last crumb carries current, which reflects aria-current='page' so assistive tech announces it as the current location; the separators are aria-hidden, so screen readers skip them."
        sourcePath="projects/forty-cdk-playground/src/app/demos/breadcrumbs/examples/default.example.ts"
      >
        <app-breadcrumbs-default-example />
      </playground-demo>

      <playground-demo
        title="Collapsing a long trail"
        subtitle="The primitive renders whatever items you give it, so collapsing a deep path is a consumer decision. Here the middle is folded into an expandable ellipsis button that reveals the hidden crumbs — the trail stays a single accessible navigation landmark either way."
        sourcePath="projects/forty-cdk-playground/src/app/demos/breadcrumbs/examples/collapsed.example.ts"
      >
        <app-breadcrumbs-collapsed-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class BreadcrumbsPage {
  protected readonly readme = readmeContent;
}
