import { DOCUMENT } from '@angular/common';
import { afterNextRender, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { skip } from 'rxjs';

export function injectFragmentScroll(): void {
  const document = inject(DOCUMENT);
  const route = inject(ActivatedRoute);

  afterNextRender(() => {
    const hash = decodeURIComponent((document.defaultView?.location.hash ?? '').replace(/^#/, ''));
    if (!hash) {
      return;
    }
    document.getElementById(hash)?.scrollIntoView();
  });

  route.fragment.pipe(skip(1), takeUntilDestroyed()).subscribe((fragment) => {
    if (fragment) {
      document.getElementById(fragment)?.scrollIntoView();
    }
  });
}
