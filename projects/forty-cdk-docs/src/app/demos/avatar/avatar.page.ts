import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { AvatarDefaultExample } from './examples/default.example';
import { AvatarFallbackExample } from './examples/fallback.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/avatar.generated';

@Component({
  selector: 'app-avatar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, AvatarDefaultExample, AvatarFallbackExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="avatar" [doc]="doc">
      <demo-layout hero sourcePath="avatar/examples/default.example.ts">
        <app-avatar-default-example />
      </demo-layout>

      <demo-layout
        title="Failed load"
        subtitle="When the image errors, the directive flips <code>shouldShowFallback()</code> and the initials render in its place — an error shows the fallback at once, skipping the <code>fallbackDelayMs</code> wait."
        sourcePath="avatar/examples/fallback.example.ts"
      >
        <app-avatar-fallback-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class AvatarPage {
  protected readonly doc = DOC;
}
