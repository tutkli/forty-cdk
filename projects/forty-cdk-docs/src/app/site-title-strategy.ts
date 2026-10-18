import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';

const SITE_NAME = 'forty-cdk';

@Injectable()
export class SiteTitleStrategy extends TitleStrategy {
  readonly #title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    this.#title.setTitle(title === undefined ? SITE_NAME : `${title} · ${SITE_NAME}`);
  }
}
