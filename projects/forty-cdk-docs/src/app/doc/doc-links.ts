import { Directive, inject } from '@angular/core';
import { Router } from '@angular/router';

@Directive({
  selector: '[docLinks]',
  host: {
    '(click)': 'onClick($event)',
  },
})
export class DocLinks {
  readonly #router = inject(Router);

  protected onClick(event: MouseEvent): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest('a[data-doc-route]');
    if (anchor === null) {
      return;
    }

    const route = anchor.getAttribute('data-doc-route');
    if (route === null || route === '') {
      return;
    }

    event.preventDefault();
    void this.#router.navigateByUrl(route);
  }
}
