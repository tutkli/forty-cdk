import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarkdownComponent, injectContent } from '@analogjs/content';

interface DocFrontmatter {
  title?: string;
  description?: string;
}

@Component({
  imports: [AsyncPipe, MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (post$ | async; as post) {
      <article class="prose">
        <analog-markdown [content]="asString(post.content)" />
      </article>
    }
  `,
})
export default class GettingStartedPage {
  readonly post$ = injectContent<DocFrontmatter>({
    customFilename: 'docs/getting-started',
  });

  protected asString(content: string | object | undefined): string {
    return typeof content === 'string' ? content : '';
  }
}
