import { afterEach } from 'vitest';
import {
  type ApplicationRef,
  type ComponentRef,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core';
import {
  bootstrapApplication,
  provideClientHydration,
  withIncrementalHydration,
} from '@angular/platform-browser';
import {
  provideServerRendering,
  renderApplication,
  ɵENABLE_DOM_EMULATION,
} from '@angular/platform-server';

/**
 * A completed server render plus the client application hydrated from it.
 *
 * `serverHtml` is the markup the server produced — assert the pre-hydration
 * wiring against it. `appRef` is the live client application, already settled
 * once; drive it further with {@link settleHydration}. `instance` is the
 * hydrated root component, so a spec can fire a `hydrate when` trigger from
 * the signal that gates it.
 */
export interface HydratedRun<T> {
  readonly serverHtml: string;
  readonly appRef: ApplicationRef;
  readonly instance: T;
}

/** What {@link hydrationHarness} hands a spec. */
export interface HydrationHarness {
  /**
   * Renders `component` on the server, installs the emitted markup into the
   * live document, and bootstraps the same component on the client with
   * incremental hydration enabled.
   *
   * @param component The application root to render on both sides.
   * @param tag The root component's element selector — both renders locate
   *   their host by it.
   */
  renderThenHydrate<T>(component: Type<T>, tag: string): Promise<HydratedRun<T>>;
}

/**
 * Runs a real SSR → incremental-hydration round trip inside the Vitest / jsdom
 * suite, and restores the document afterwards.
 *
 * The point is fidelity: nothing here simulates hydration. The markup comes
 * from `@angular/platform-server`, so it carries the `ngh` annotations, the
 * dehydrated `@defer` block comments and the `<script id="ng-state">` transfer
 * state; the client half is a plain `bootstrapApplication` with
 * `provideClientHydration(withIncrementalHydration())`, so Angular claims that
 * markup and leaves `hydrate`-triggered blocks dehydrated exactly as it would
 * in a browser.
 *
 * Two details are load-bearing:
 *
 * - `ɵENABLE_DOM_EMULATION: false` keeps `platform-server` off its bundled
 *   domino DOM. Domino's adapter `Object.assign`s its own `Node` / `Element` /
 *   `HTMLElement` onto `globalThis`, which would leave the rest of the worker
 *   holding two incompatible DOM implementations. Disabled, the server render
 *   runs against jsdom's own `document` and serializes it from
 *   `documentElement.outerHTML`.
 * - The document is snapshotted at call time and restored in `afterEach`.
 *   Both renders write into the live `document`, and rule 4 of the
 *   test-isolation contract requires the spec to hand it back unchanged.
 *
 * Call it once at the top of a `describe`, then `renderThenHydrate` per test:
 *
 * ```ts
 * describe('…', () => {
 *   const harness = hydrationHarness();
 *
 *   it('…', async () => {
 *     const { serverHtml, appRef } = await harness.renderThenHydrate(Fixture, 'for-fixture');
 *   });
 * });
 * ```
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */
export function hydrationHarness(): HydrationHarness {
  const originalBody = document.body.innerHTML;
  const originalHead = document.head.innerHTML;
  let appRef: ApplicationRef | null = null;

  afterEach(() => {
    appRef?.destroy();
    appRef = null;
    document.body.innerHTML = originalBody;
    document.head.innerHTML = originalHead;
  });

  return {
    async renderThenHydrate<T>(component: Type<T>, tag: string): Promise<HydratedRun<T>> {
      document.body.innerHTML = `<${tag}></${tag}>`;

      const serverHtml = await renderApplication(
        (context) =>
          bootstrapApplication(
            component,
            {
              providers: [
                provideZonelessChangeDetection(),
                provideServerRendering(),
                provideClientHydration(withIncrementalHydration()),
              ],
            },
            context,
          ),
        {
          document: `<html><head></head><body><${tag}></${tag}></body></html>`,
          platformProviders: [{ provide: ɵENABLE_DOM_EMULATION, useValue: false }],
        },
      );

      const parsed = new DOMParser().parseFromString(serverHtml, 'text/html');
      document.head.innerHTML = parsed.head.innerHTML;
      document.body.innerHTML = parsed.body.innerHTML;

      appRef = await bootstrapApplication(component, {
        providers: [
          provideZonelessChangeDetection(),
          provideClientHydration(withIncrementalHydration()),
        ],
      });
      await settleHydration(appRef);

      const root = appRef.components[0] as ComponentRef<T>;
      return { serverHtml, appRef, instance: root.instance };
    },
  };
}

/**
 * Drain a bootstrapped application's render pipeline, including a `@defer`
 * block whose `hydrate` trigger just fired.
 *
 * The hydration counterpart of `flush(fixture)`: there is no
 * `ComponentFixture` here — the application owns its own change detection —
 * so this file is the one place a hydration spec may reach for
 * `ApplicationRef.whenStable()`. The macrotask hop lets the promise chain
 * hydration starts (dependency resolution, then the block's own creation
 * pass) complete before assertions run.
 *
 * Returns a `Promise<void>` you **must** `await`; bare calls are rejected by
 * the `forty-cdk/no-floating-flush` lint rule.
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
 *
 * @param appRef The hydrated application to settle.
 */
export async function settleHydration(appRef: ApplicationRef): Promise<void> {
  await appRef.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await appRef.whenStable();
}
