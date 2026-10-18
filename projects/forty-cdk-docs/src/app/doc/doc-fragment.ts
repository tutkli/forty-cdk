import { DOCUMENT } from '@angular/common';
import { afterNextRender, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  type Navigation,
  NavigationSkipped,
  NavigationSkippedCode,
  Router,
} from '@angular/router';
import { filter, skip } from 'rxjs';

/**
 * Takes the reader to the URL's fragment whenever a navigation names one: on
 * arrival, on a fragment change within the page, and on a link whose URL is
 * already the current one, which the router otherwise skips.
 *
 * A navigation the reader asked for also moves focus to the target, so the next
 * Tab continues from the section rather than from the link that led there. The
 * first load of the site and history traversal only scroll.
 */
export function injectFragmentScroll(): void {
  const document = inject(DOCUMENT);
  const router = inject(Router);
  const route = inject(ActivatedRoute);
  const arrival = router.currentNavigation();

  const goTo = (fragment: string, focus: boolean): void => {
    const target = document.getElementById(fragment);
    if (target === null) {
      return;
    }
    target.scrollIntoView();
    if (!focus) {
      return;
    }
    if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.setAttribute('data-fragment-target', '');
    }
    target.focus({ preventScroll: true });
  };

  const askedFor = (navigation: Navigation | null): boolean =>
    navigation !== null && navigation.trigger !== 'popstate';

  afterNextRender(() => {
    const hash = decodeURIComponent((document.defaultView?.location.hash ?? '').replace(/^#/, ''));
    if (hash) {
      goTo(hash, askedFor(arrival) && arrival?.previousNavigation !== null);
    }
  });

  route.fragment.pipe(skip(1), takeUntilDestroyed()).subscribe((fragment) => {
    if (fragment) {
      goTo(fragment, askedFor(router.currentNavigation()));
    }
  });

  router.events
    .pipe(
      filter(
        (event): event is NavigationSkipped =>
          event instanceof NavigationSkipped &&
          event.code === NavigationSkippedCode.IgnoredSameUrlNavigation,
      ),
      takeUntilDestroyed(),
    )
    .subscribe((event) => {
      const fragment = router.parseUrl(event.url).fragment;
      if (fragment) {
        goTo(fragment, true);
      }
    });
}
