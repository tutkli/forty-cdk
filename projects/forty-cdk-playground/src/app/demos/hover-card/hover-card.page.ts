import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { HoverCardExample } from './examples/hover-card.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/hover-card/README.md';

@Component({
  selector: 'app-hover-card-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, HoverCardExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="hover-card" [readme]="readme">
      <app-hover-card-example />
    </primitive-page>
  `,
})
export class HoverCardPage {
  protected readonly readme = readmeContent;
}
