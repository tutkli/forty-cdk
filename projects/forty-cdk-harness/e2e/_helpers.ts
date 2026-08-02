/**
 * Shared E2E helpers.
 *
 * Every `page.waitForTimeout` in this module is pointer-gesture **pacing** —
 * the `stepDelayMs` gap between two moves of one drag, or the hold duration
 * of a long press — never a settle-wait on application state. Pacing is
 * exempt from the one-shot-wait → `expect.poll` rule in
 * `.claude/rules/testing.md`: the delay is the gesture's own timing, and the
 * directive's velocity maths reads it. Each one's duration comes from a
 * documented parameter, so callers control it explicitly.
 */
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

/**
 * Locator for a `[data-testid="<id>"]` element. Fixtures use `data-testid`
 * (rather than `id`) for elements bound to forty-cdk directives, because a
 * handful of those directives bind `[id]` on their host (for `aria-controls`
 * wiring) and would override a static `id="…"` attribute.
 */
export function el(page: Page, testid: string): Locator {
  return page.locator(`[data-testid="${testid}"]`);
}

/**
 * Navigate to a fixture route with optional `?key=value` query flags.
 * Fixtures use the query map to pre-configure scenarios (vetoOpen, vetoClose,
 * etc.) so specs don't have to click setup checkboxes before exercising
 * focus / keyboard behavior. Waits until the lazy fixture chunk has finished
 * loading (`domcontentloaded` plus a `networkidle` settle) — under the dev
 * server, first-time chunk fetches can take longer than the default locator
 * timeout, so we settle once at navigation rather than padding every assert.
 */
export async function gotoFixture(
  page: Page,
  path: string,
  query: Record<string, string> = {},
): Promise<void> {
  const qs = new URLSearchParams(query).toString();
  await page.goto(qs ? `/${path}?${qs}` : `/${path}`, { waitUntil: 'networkidle' });
}

/**
 * The bounding box of a locator, asserting the element is actually there.
 *
 * `locator.boundingBox()` resolves to `null` for a detached or non-rendered
 * element, and the natural-looking reaction — `if (!box) { test.skip(); }` —
 * turns exactly the regression a pointer spec exists to catch into a green
 * skip. A drag spec is the only pointer coverage its primitive has, so a
 * silent skip there reads as "reorder still works" when the handle has
 * vanished. Assert instead: `toBeVisible()` gives the readable failure and
 * carries Playwright's auto-retry, and the non-null return keeps call sites
 * free of `!`.
 *
 * Genuine environment differences (a gesture that does not fit the mobile
 * viewport, a touch-only path) belong behind
 * `test.skip(isMobileProject(testInfo), '…')`, never behind a null box.
 */
export async function boxOf(locator: Locator): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, 'element is visible but has no bounding box').not.toBeNull();
  return box!;
}

/** Press Tab `n` times. Pass `'Shift+Tab'` for backwards navigation. */
export async function tabN(page: Page, n: number, key: 'Tab' | 'Shift+Tab' = 'Tab'): Promise<void> {
  for (let i = 0; i < n; i++) await page.keyboard.press(key);
}

/**
 * Click outside any open overlay. Uses a fixed coordinate near the top-left of
 * the viewport, which is reliably in the body region surrounding our fixtures
 * (which are anchored under `<app-root>`).
 */
export async function clickOutside(page: Page): Promise<void> {
  await page.mouse.click(2, 2);
}

/**
 * True when the active Playwright project is a mobile project — used by the
 * drag helpers to branch onto a touch-driven implementation and by any
 * `@mobile`-tagged spec that needs to special-case touch behaviour. Mobile
 * project config is added in a sibling Wave 1 issue; until then this helper
 * is dormant and always returns `false` for the desktop projects.
 */
export function isMobileProject(testInfo: TestInfo): boolean {
  return testInfo.project.name === 'Mobile Chrome' || testInfo.project.name === 'Mobile Safari';
}

/**
 * Drag a surface (or its handle) by `(dx, dy)` pixels using real pointer
 * events. Works against bottom-anchored fixtures: starts the gesture at the
 * centre of `start`, arms the swipe-dismiss helper with a tiny ARM step
 * (5 px past the helper's 4-px arming distance), then applies the remaining
 * displacement in a single `pointermove`.
 *
 * The drawer integrates pointer movement cumulatively, so the resulting
 * drag offset is `|delta| − armPx` regardless of how many micro-moves
 * happen along the way. The single-shot move shape is kept here so the
 * release-time velocity sample stays deterministic: it's the big move's
 * delta divided by `stepDelayMs`. Tests that want to exercise the
 * cumulative integrator (many small moves) use {@link dragFromSteps}.
 *
 * `stepDelayMs` controls the gap between the arm step and the big move so
 * the computed velocity stays below `FLICK_VELOCITY_PX_PER_MS` (0.4 px/ms)
 * unless a test explicitly wants the fast-flick path. With the default
 * 250 ms gap, a 100-pixel total move resolves at ≈ 0.38 px/ms; tests that
 * need a non-flick result keep `dy <= 100`, and tests that want a flick
 * (or that don't care because they're crossing the offset threshold
 * anyway) use larger `dy` and accept the velocity bias.
 *
 * Pass `opts.testInfo` to enable the touch branch on mobile projects (see
 * {@link isMobileProject}). The touch path issues a `pointerdown`
 * (`pointerType: 'touch'`) on the start locator, then dispatches a
 * synthetic `pointermove` via `page.evaluate` for the big step, and finally
 * `pointerup`. Multi-step touch is intentionally simulated through
 * `dispatchEvent` rather than Playwright's `page.touchscreen` because
 * `page.touchscreen` exposes only `tap()` (touchstart + touchend with no
 * touchmove hook) and has no native multi-step API. The mouse path is the
 * default branch and is byte-equivalent to the inline implementation that
 * used to live in `drawer.e2e.ts`.
 */
export async function dragFrom(
  page: Page,
  start: Locator,
  delta: { dx: number; dy: number },
  options: {
    release?: boolean;
    stepDelayMs?: number;
    armPx?: number;
    testInfo?: TestInfo;
  } = {},
): Promise<void> {
  const box = await start.boundingBox();
  if (!box) throw new Error('dragFrom: start locator has no bounding box');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const stepDelayMs = options.stepDelayMs ?? 250;
  const armPx = options.armPx ?? 5;
  const release = options.release ?? true;

  // Direction unit vector — the arming step travels armPx pixels along
  // the same axis as the requested delta.
  const len = Math.hypot(delta.dx, delta.dy) || 1;
  const armDx = (delta.dx / len) * armPx;
  const armDy = (delta.dy / len) * armPx;

  if (options.testInfo && isMobileProject(options.testInfo)) {
    await start.dispatchEvent('pointerdown', { pointerType: 'touch' });
    await dispatchPointerMoveAt(page, startX + armDx, startY + armDy);
    await page.waitForTimeout(stepDelayMs);
    await dispatchPointerMoveAt(page, startX + delta.dx, startY + delta.dy);
    if (release) {
      await dispatchPointerUpAt(page, startX + delta.dx, startY + delta.dy);
    }
    return;
  }

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Arming step: small move past ARM_DISTANCE_PX so the swipe-dismiss
  // helper detects the direction and emits onSwipeStart.
  await page.mouse.move(startX + armDx, startY + armDy);
  await page.waitForTimeout(stepDelayMs);
  // Big move: covers the remainder of the requested displacement in a
  // single pointermove so the directive's offset == requested distance.
  await page.mouse.move(startX + delta.dx, startY + delta.dy);
  if (release) {
    await page.mouse.up();
  }
}

/**
 * Drag a surface (or its handle) using a multi-step pointer gesture: a
 * small arming step past the swipe-dismiss helper's 4-px arm distance
 * followed by `steps` equal `step` moves with `stepDelayMs` between
 * them. Used to exercise the directive's cumulative-offset integration
 * (post-#205): the arming pointermove emits with `moveTowardEdge = 0`
 * and the N subsequent moves each contribute `|step|` to the running
 * offset, so the final drag offset equals `steps * |step|`.
 *
 * Velocity at release is the last move's `|step|` divided by
 * `stepDelayMs` (the default 50 ms with a 30-px step gives 0.6 px/ms —
 * past the 0.4-px/ms `FLICK_VELOCITY_PX_PER_MS` threshold). Tests that
 * need the no-flick branch pass a larger `stepDelayMs` so per-event
 * velocity stays below the threshold.
 *
 * `opts.flickRelease` makes the flick deterministic: the FINAL step is
 * dispatched back-to-back with the previous move (its preceding
 * `stepDelayMs` wait is skipped), so the directive samples its release
 * velocity over the event-dispatch `dt` (a few ms) rather than over the
 * timed gap. Without it, a flick relies on `stepDelayMs` being an
 * accurate wall-clock gap, which it is NOT on `Mobile Safari` under
 * `--ui` / heavy load: `waitForTimeout` overshoots and WebKit coalesces
 * pointermoves, inflating `dt` so `|step| / dt` dips under the 0.4-px/ms
 * threshold and the flick silently fails. Use it on any
 * `@mobile` flick spec that must register a flick (advance / dismiss);
 * leave it off for no-flick / boundary specs. The arm step and the
 * `steps - 1` earlier moves still observe `stepDelayMs`, so the
 * cumulative offset is unchanged — only the release-velocity sample is
 * made robust.
 *
 * Pass `opts.testInfo` to enable the touch branch on mobile projects
 * (see {@link dragFrom} for the rationale and limitations of the
 * touch path).
 */
export async function dragFromSteps(
  page: Page,
  start: Locator,
  step: { dx: number; dy: number },
  steps: number,
  options: {
    release?: boolean;
    stepDelayMs?: number;
    armPx?: number;
    flickRelease?: boolean;
    testInfo?: TestInfo;
  } = {},
): Promise<void> {
  const box = await start.boundingBox();
  if (!box) throw new Error('dragFromSteps: start locator has no bounding box');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const stepDelayMs = options.stepDelayMs ?? 50;
  const armPx = options.armPx ?? 5;
  const release = options.release ?? true;
  const flickRelease = options.flickRelease ?? false;
  // Skip the timed wait before the final step when a deterministic flick
  // is requested, so its release-velocity dt is the event-dispatch gap.
  const isLastStep = (i: number): boolean => i === steps - 1;
  const waitBeforeStep = (i: number): boolean => !(flickRelease && isLastStep(i));

  const len = Math.hypot(step.dx, step.dy) || 1;
  const armDx = (step.dx / len) * armPx;
  const armDy = (step.dy / len) * armPx;

  if (options.testInfo && isMobileProject(options.testInfo)) {
    await start.dispatchEvent('pointerdown', { pointerType: 'touch' });
    await dispatchPointerMoveAt(page, startX + armDx, startY + armDy);

    let cx = startX + armDx;
    let cy = startY + armDy;
    for (let i = 0; i < steps; i++) {
      if (waitBeforeStep(i)) await page.waitForTimeout(stepDelayMs);
      cx += step.dx;
      cy += step.dy;
      await dispatchPointerMoveAt(page, cx, cy);
    }
    if (release) {
      await dispatchPointerUpAt(page, cx, cy);
    }
    return;
  }

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Arming step: directs the swipe-dismiss helper at the same axis as
  // the requested gesture.
  await page.mouse.move(startX + armDx, startY + armDy);

  let cx = startX + armDx;
  let cy = startY + armDy;
  for (let i = 0; i < steps; i++) {
    if (waitBeforeStep(i)) await page.waitForTimeout(stepDelayMs);
    cx += step.dx;
    cy += step.dy;
    await page.mouse.move(cx, cy);
  }
  if (release) {
    await page.mouse.up();
  }
}

/**
 * Synthetic touch `pointermove` at viewport coordinates `(x, y)`. Used by
 * the touch branch of {@link dragFrom} / {@link dragFromSteps} because
 * `page.touchscreen` has no multi-step API — `tap()` is touchstart +
 * touchend with no `touchmove` hook between them. The event is dispatched
 * on whatever element `document.elementFromPoint` resolves at `(x, y)` so
 * the directive's pointer listener (which is attached to the surface, not
 * `document`) receives it via bubbling.
 */
async function dispatchPointerMoveAt(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      target?.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          bubbles: true,
        }),
      );
    },
    { x, y },
  );
}

/**
 * Synthetic touch `pointerup` at viewport coordinates `(x, y)`. Same
 * rationale as {@link dispatchPointerMoveAt}: `page.touchscreen` cannot
 * complete a multi-step touch gesture, so we close the gesture out via
 * `dispatchEvent` on the element under the final pointer position.
 */
async function dispatchPointerUpAt(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      target?.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          bubbles: true,
        }),
      );
    },
    { x, y },
  );
}

/**
 * Long-press the locator's centre: dispatches a touch `pointerdown`, waits
 * `ms`, then dispatches `pointerup` on the element at the same position.
 * Default 600 ms because Chromium and WebKit fire the synthetic
 * `contextmenu` event after roughly 500 ms of sustained touch hold, so this
 * gives a comfortable margin for ContextMenu mobile coverage.
 */
export async function longPress(locator: Locator, ms = 600): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('longPress: locator has no bounding box');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const page = locator.page();
  await locator.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: x, clientY: y });
  await page.waitForTimeout(ms);
  await dispatchPointerUpAt(page, x, y);
}

/**
 * Press `Tab` until `document.activeElement` exposes a matching
 * `data-testid`. Throws after `maxAttempts` presses (default 20) with a
 * diagnostic message including the last-focused testid, so a regression
 * surfaces as a clear failure rather than a Playwright timeout. Used by
 * roving-tabindex specs that need a deterministic "land on the first
 * focusable item in this primitive" step.
 */
export async function rovingFirst(page: Page, testid: string, maxAttempts = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await page.keyboard.press('Tab');
    const current = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset.testid ?? null,
    );
    if (current === testid) return;
  }
  const last = await page.evaluate(
    () => (document.activeElement as HTMLElement | null)?.dataset.testid ?? null,
  );
  throw new Error(
    `rovingFirst: did not land on data-testid="${testid}" after ${maxAttempts} Tab presses (last focused: ${last ?? 'none'})`,
  );
}

/**
 * Thin wrapper around `expect(locator).toBeFocused()` so specs can write
 * `await expectFocused(el(page, 'first'))` rather than the longer form. The
 * caller awaits the returned promise; this function does not await
 * internally so the assertion participates in Playwright's auto-retry the
 * same way it would inline.
 */
export function expectFocused(locator: Locator): Promise<void> {
  return expect(locator).toBeFocused();
}

/**
 * Assert that the element carrying `data-testid="<testid>"` holds focus,
 * resolving through open shadow roots.
 *
 * `document.activeElement` — and therefore `toBeFocused()` — reports the shadow
 * **host** while focus sits inside a web component, so a spec covering the
 * library's composed-tree focus posture (#1586) cannot tell "focus is on the
 * widget's first button" from "focus is on its second". Polls, so it retries
 * like a locator assertion instead of reading once.
 */
export function expectDeepFocused(page: Page, testid: string): Promise<void> {
  return expect
    .poll(() =>
      page.evaluate(() => {
        let active: Element | null = document.activeElement;
        while (active?.shadowRoot?.activeElement) {
          active = active.shadowRoot.activeElement;
        }
        return active?.getAttribute('data-testid') ?? null;
      }),
    )
    .toBe(testid);
}

/**
 * Drive an IME composition sequence on `input` entirely from script. Playwright
 * has no real IME engine, so these mirror what the browser emits during a
 * `compositionstart → insertCompositionText → compositionend` cycle — the path
 * CJK input methods and many Android soft keyboards take — to exercise a
 * directive's composition guard against real browser focus / caret semantics.
 * jsdom emits no composition events at all, so this can only be covered here.
 *
 * The three phases are separate so a spec can assert the mid-composition state
 * (no value rewrite, no inline completion) before committing on
 * `compositionend`. `input` must already be focused: both `ForOtpInput` and
 * `ForComboboxInput` skip their unfocused value-sync effect only while focused,
 * so an unfocused input would have the composing text clobbered back to the
 * model before the assertions run.
 */
export async function imeStart(input: Locator): Promise<void> {
  await input.evaluate((el) =>
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })),
  );
}

/**
 * Mid-composition update: point the input's visible value + caret at the
 * composing text and fire an `input` event carrying `isComposing: true` and
 * `inputType: 'insertCompositionText'` (what Android soft keyboards send), with
 * no real keystroke since there is no IME engine to produce one.
 */
export async function imeUpdate(
  input: Locator,
  value: string,
  caret = value.length,
): Promise<void> {
  await input.evaluate(
    (el, { value, caret }) => {
      const i = el as HTMLInputElement;
      i.value = value;
      i.setSelectionRange(caret, caret);
      i.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          isComposing: true,
          inputType: 'insertCompositionText',
          data: value,
        }),
      );
    },
    { value, caret },
  );
}

/** Commit the composition: fire `compositionend` carrying the final `data`. */
export async function imeEnd(input: Locator, data: string): Promise<void> {
  await input.evaluate(
    (el, data) => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data })),
    data,
  );
}

/** Read an input's current `.value` regardless of visibility. */
export function inputValue(input: Locator): Promise<string> {
  return input.evaluate((el) => (el as HTMLInputElement).value);
}

/** Read an input's `[selectionStart, selectionEnd]` caret / selection range. */
export function selectionRange(input: Locator): Promise<[number, number]> {
  return input.evaluate((el) => {
    const i = el as HTMLInputElement;
    return [i.selectionStart ?? -1, i.selectionEnd ?? -1];
  });
}
