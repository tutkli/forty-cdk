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
import {
  expect,
  test,
  type CDPSession,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';

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
 * True when the active Playwright project is one of the two `@mobile` device
 * projects (`Mobile Chrome`, `Mobile Safari`). {@link gesturePointer} reads it
 * to drive a finger instead of the mouse; a spec reads it to branch an
 * expectation that genuinely differs between touch and mouse, or to skip a
 * gesture that does not fit the mobile viewport.
 */
export function isMobileProject(testInfo: TestInfo): boolean {
  return testInfo.project.name === 'Mobile Chrome' || testInfo.project.name === 'Mobile Safari';
}

/**
 * One pointer driving a gesture: a finger on the `@mobile` projects, the mouse
 * on the desktop ones. A spec body written against it therefore runs a
 * primitive's touch branch on the mobile projects and its mouse branch on the
 * desktop ones, with no `isMobileProject` fork.
 *
 * Every {@link GesturePointer.down} asserts that the `pointerdown` reached the
 * page with {@link GesturePointer.pointerType}, so a gesture cannot fall back to
 * the other device in silence. Get one from {@link gesturePointer}.
 */
export interface GesturePointer {
  /** `'touch'` on the `@mobile` projects, `'mouse'` on the desktop ones. */
  readonly pointerType: 'mouse' | 'touch';
  /** Press at viewport `(x, y)` and assert the `pointerdown` arrived as {@link pointerType}. */
  down(x: number, y: number): Promise<void>;
  /** Move the pressed pointer to viewport `(x, y)`. */
  move(x: number, y: number): Promise<void>;
  /** Lift the pointer where it is. */
  up(): Promise<void>;
  /**
   * Close the gesture with a **flick**: a final move to `(x, y)` and the
   * release, dispatched from inside the page back-to-back in one task.
   *
   * A flick is decided on its last samples: the final move's velocity
   * (`|delta| / dt` against `FLICK_VELOCITY_PX_PER_MS`, with `dt` the
   * `event.timeStamp` gap to the move before it) and how long the release
   * trails that move (`FLICK_STALE_VELOCITY_MS`, 100ms, past which the sample
   * is discarded outright). Playwright cannot bound either gap: every input call
   * is its own protocol round trip, so under worker contention the release
   * arrives stale and the flick silently fails to register. Measured at ~1 in
   * 18 on the two-worker CI profile before this existed. The staleness cutoff
   * cannot be bought off with a larger delta — it is purely temporal.
   *
   * Dispatching the final move and the release in one page task puts the
   * second gap at ~0, so the sample can never go stale. The velocity gap still
   * spans the round trip from the previous move, which is the half a larger
   * final step buys off: 40 px clears 0.4 px/ms for up to 100 ms. In a real
   * flick the finger leaves the surface immediately after the fast movement,
   * and the round trip is an artefact of the instrument, not of the gesture.
   * Fidelity is otherwise preserved: the `pointerdown`, the pointer capture and
   * every earlier move went through the device, the pair carries the gesture's
   * own `pointerId` and `pointerType`, and the engine listens on `document`
   * with `capture: true`, so the pair reaches it by the same path. A real
   * finger or button is lifted afterwards; the engine has already closed the
   * session, so that release changes nothing.
   */
  flick(x: number, y: number): Promise<void>;
}

/**
 * The {@link GesturePointer} for the active project.
 *
 * `page.mouse` cannot drive touch: Playwright's mobile emulation leaves it
 * emitting `pointerType: 'mouse'`, and `page.touchscreen` has `tap()` and no
 * way to move. So each mobile project gets the most faithful channel its
 * engine offers:
 *
 * - **Mobile Chrome** sends CDP `Input.dispatchTouchEvent`. These are real
 *   touches: the browser hit-tests them, assigns the pointer id, grants pointer
 *   capture and runs its own `touch-action` arbitration, so a surface that lets
 *   the browser claim the pan sees the `pointercancel` a phone would send.
 * - **Mobile Safari** has no such channel, so the pointer dispatches synthetic
 *   `PointerEvent`s at the hit-tested element (see `installSyntheticTouch`).
 *   No `touch-action` arbitration runs on this path, which is why a spec
 *   guarding one can only fail on Mobile Chrome.
 */
export function gesturePointer(page: Page): GesturePointer {
  if (!isMobileProject(test.info())) {
    return mousePointer(page);
  }
  return page.context().browser()?.browserType().name() === 'chromium'
    ? cdpTouchPointer(page)
    : syntheticTouchPointer(page);
}

/** What the page recorded about the current gesture's `pointerdown`. */
interface GestureRecord {
  pointerId: number | null;
  pointerType: string | null;
}

/** The in-page side of the Mobile Safari pointer, installed by `installSyntheticTouch`. */
interface SyntheticTouch {
  down(x: number, y: number): void;
  dispatch(type: 'pointermove' | 'pointerup', x: number, y: number): void;
}

interface GestureWindow {
  __fortyGesture?: GestureRecord;
  __fortySyntheticTouch?: SyntheticTouch;
}

/** Record the `pointerType` / `pointerId` of the next `pointerdown` the page sees. */
async function recordNextPointerDown(page: Page): Promise<void> {
  await page.evaluate(() => {
    const record: GestureRecord = { pointerId: null, pointerType: null };
    (window as unknown as GestureWindow).__fortyGesture = record;
    window.addEventListener(
      'pointerdown',
      (event) => {
        record.pointerId = event.pointerId;
        record.pointerType = event.pointerType;
      },
      { capture: true, once: true },
    );
  });
}

async function expectRecordedPointerType(
  page: Page,
  pointerType: GesturePointer['pointerType'],
): Promise<void> {
  const seen = await page.evaluate(
    () => (window as unknown as GestureWindow).__fortyGesture?.pointerType ?? null,
  );
  expect(seen, `the gesture's pointerdown reached the page as ${seen ?? 'nothing'}`).toBe(
    pointerType,
  );
}

/**
 * The flick pair for a device-driven gesture: a `pointermove` then a
 * `pointerup` at `(x, y)` in one page task, carrying the `pointerId` and
 * `pointerType` its `pointerdown` was recorded with.
 */
async function dispatchFlickPair(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ x, y }) => {
      const record = (window as unknown as GestureWindow).__fortyGesture;
      if (!record || record.pointerId === null || record.pointerType === null) {
        throw new Error('flick: no pointerdown was recorded for this gesture');
      }
      const target = document.elementFromPoint(x, y) ?? document.body;
      const init = {
        pointerId: record.pointerId,
        pointerType: record.pointerType,
        isPrimary: true,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        composed: true,
      };
      target.dispatchEvent(new PointerEvent('pointermove', { ...init, button: -1, buttons: 1 }));
      target.dispatchEvent(new PointerEvent('pointerup', { ...init, button: 0, buttons: 0 }));
    },
    { x, y },
  );
}

function mousePointer(page: Page): GesturePointer {
  return {
    pointerType: 'mouse',
    async down(x, y) {
      await page.mouse.move(x, y);
      await recordNextPointerDown(page);
      await page.mouse.down();
      await expectRecordedPointerType(page, 'mouse');
    },
    move: (x, y) => page.mouse.move(x, y),
    up: () => page.mouse.up(),
    async flick(x, y) {
      await dispatchFlickPair(page, x, y);
      await page.mouse.up();
    },
  };
}

function cdpTouchPointer(page: Page): GesturePointer {
  let session: CDPSession | null = null;
  const touch = async (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    touchPoints: { x: number; y: number }[],
  ): Promise<void> => {
    if (!session) {
      throw new Error(`gesturePointer: ${type} with no finger down`);
    }
    await session.send('Input.dispatchTouchEvent', { type, touchPoints });
  };
  const lift = async (): Promise<void> => {
    await touch('touchEnd', []);
    await session?.detach();
    session = null;
  };
  return {
    pointerType: 'touch',
    async down(x, y) {
      session = await page.context().newCDPSession(page);
      await recordNextPointerDown(page);
      await touch('touchStart', [{ x, y }]);
      await expectRecordedPointerType(page, 'touch');
    },
    move: (x, y) => touch('touchMove', [{ x, y }]),
    up: lift,
    async flick(x, y) {
      await dispatchFlickPair(page, x, y);
      await lift();
    },
  };
}

function syntheticTouchPointer(page: Page): GesturePointer {
  let last = { x: 0, y: 0 };
  return {
    pointerType: 'touch',
    async down(x, y) {
      await installSyntheticTouch(page);
      await recordNextPointerDown(page);
      await page.evaluate(
        ({ x, y }) => (window as unknown as GestureWindow).__fortySyntheticTouch!.down(x, y),
        { x, y },
      );
      last = { x, y };
      await expectRecordedPointerType(page, 'touch');
    },
    async move(x, y) {
      await page.evaluate(
        ({ x, y }) =>
          (window as unknown as GestureWindow).__fortySyntheticTouch!.dispatch('pointermove', x, y),
        { x, y },
      );
      last = { x, y };
    },
    async up() {
      await page.evaluate(
        ({ x, y }) =>
          (window as unknown as GestureWindow).__fortySyntheticTouch!.dispatch('pointerup', x, y),
        last,
      );
    },
    async flick(x, y) {
      await page.evaluate(
        ({ x, y }) => {
          const finger = (window as unknown as GestureWindow).__fortySyntheticTouch!;
          finger.dispatch('pointermove', x, y);
          finger.dispatch('pointerup', x, y);
        },
        { x, y },
      );
    },
  };
}

/**
 * The `pointerId` of the Mobile Safari synthetic finger. Any id but the
 * mouse's `1` works; the wrapped capture methods intercept exactly this one.
 */
const SYNTHETIC_TOUCH_POINTER_ID = 100;

/**
 * Install the synthetic finger the Mobile Safari pointer drives, once per
 * document.
 *
 * Each event is dispatched at `document.elementFromPoint` (or at the capture
 * target, below) and carries what a touch contact carries: the coordinates, one
 * non-zero `pointerId`, `isPrimary`, `button` / `buttons`. The browser does not
 * know that pointer, so `setPointerCapture` would throw `NotFoundError` for its
 * id and every capturing engine would break on the instrument rather than on
 * itself. The three capture methods are therefore wrapped for **this id only**
 * and model the Pointer Events contract: a capture request is pending until the
 * next event of the pointer, which first fires `lostpointercapture` /
 * `gotpointercapture` and is then retargeted to the capturing element, and
 * `pointerup` releases capture implicitly. Every other id reaches the native
 * methods untouched.
 */
async function installSyntheticTouch(page: Page): Promise<void> {
  await page.evaluate((pointerId) => {
    const host = window as unknown as GestureWindow;
    if (host.__fortySyntheticTouch) {
      return;
    }
    let pressed = false;
    let captured: Element | null = null;
    let pending: Element | null = null;

    const init = (x: number, y: number): PointerEventInit => ({
      pointerId,
      pointerType: 'touch',
      isPrimary: true,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    const notActive = (): DOMException =>
      new DOMException('No active pointer with the given id is found.', 'NotFoundError');
    const processPendingCapture = (x: number, y: number): void => {
      if (captured === pending) {
        return;
      }
      if (captured) {
        const lost = captured;
        captured = null;
        lost.dispatchEvent(new PointerEvent('lostpointercapture', init(x, y)));
      }
      if (pending) {
        captured = pending;
        captured.dispatchEvent(new PointerEvent('gotpointercapture', init(x, y)));
      }
    };

    const requestCapture = (element: Element | null): void => {
      pending = element;
    };

    const proto = Element.prototype;
    const nativeSet = proto.setPointerCapture;
    const nativeRelease = proto.releasePointerCapture;
    const nativeHas = proto.hasPointerCapture;
    proto.setPointerCapture = function (this: Element, id: number): void {
      if (id !== pointerId) {
        return nativeSet.call(this, id);
      }
      if (!pressed) {
        throw notActive();
      }
      requestCapture(this);
    };
    proto.releasePointerCapture = function (this: Element, id: number): void {
      if (id !== pointerId) {
        return nativeRelease.call(this, id);
      }
      if (!pressed) {
        throw notActive();
      }
      if (pending === this) {
        requestCapture(null);
      }
    };
    proto.hasPointerCapture = function (this: Element, id: number): boolean {
      return id === pointerId ? pending === this : nativeHas.call(this, id);
    };

    host.__fortySyntheticTouch = {
      down(x, y) {
        pressed = true;
        captured = null;
        pending = null;
        const target = document.elementFromPoint(x, y) ?? document.body;
        target.dispatchEvent(
          new PointerEvent('pointerdown', { ...init(x, y), button: 0, buttons: 1 }),
        );
      },
      dispatch(type, x, y) {
        if (!pressed) {
          throw new Error(`synthetic touch: ${type} with no finger down`);
        }
        processPendingCapture(x, y);
        const target = captured ?? document.elementFromPoint(x, y) ?? document.body;
        const up = type === 'pointerup';
        target.dispatchEvent(
          new PointerEvent(type, { ...init(x, y), button: up ? 0 : -1, buttons: up ? 0 : 1 }),
        );
        if (up) {
          pending = null;
          processPendingCapture(x, y);
          pressed = false;
        }
      },
    };
  }, SYNTHETIC_TOUCH_POINTER_ID);
}

/** Centre of a locator's box, asserting the element is visible. */
async function centreOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await boxOf(locator);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Drag a surface (or its handle) by `(dx, dy)` pixels with the project's
 * {@link gesturePointer} — a finger on the `@mobile` projects, the mouse on the
 * desktop ones. Starts the gesture at the centre of `start`, arms the
 * swipe-dismiss helper with a tiny ARM step (5 px past the helper's 4-px arming
 * distance), then applies the remaining displacement in a single move.
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
 * Returns the pointer, so a caller passing `release: false` lifts it with
 * `up()` once it has read the mid-gesture state.
 */
export async function dragFrom(
  page: Page,
  start: Locator,
  delta: { dx: number; dy: number },
  options: {
    release?: boolean;
    stepDelayMs?: number;
    armPx?: number;
  } = {},
): Promise<GesturePointer> {
  const { x: startX, y: startY } = await centreOf(start);
  const stepDelayMs = options.stepDelayMs ?? 250;
  const armPx = options.armPx ?? 5;
  const release = options.release ?? true;

  // Direction unit vector — the arming step travels armPx pixels along
  // the same axis as the requested delta.
  const len = Math.hypot(delta.dx, delta.dy) || 1;
  const armDx = (delta.dx / len) * armPx;
  const armDy = (delta.dy / len) * armPx;

  const pointer = gesturePointer(page);
  await pointer.down(startX, startY);
  // Arming step: small move past ARM_DISTANCE_PX so the swipe-dismiss
  // helper detects the direction and emits onSwipeStart.
  await pointer.move(startX + armDx, startY + armDy);
  await page.waitForTimeout(stepDelayMs);
  // Big move: covers the remainder of the requested displacement in a
  // single pointermove so the directive's offset == requested distance.
  await pointer.move(startX + delta.dx, startY + delta.dy);
  if (release) {
    await pointer.up();
  }
  return pointer;
}

/**
 * Drag a surface (or its handle) using a multi-step gesture of the project's
 * {@link gesturePointer}: a small arming step past the swipe-dismiss helper's
 * 4-px arm distance followed by `steps` equal `step` moves with `stepDelayMs`
 * between them. Used to exercise the directive's cumulative-offset integration
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
 * `opts.flickRelease` makes the flick deterministic: the FINAL step and the
 * release go through {@link GesturePointer.flick}, back-to-back in one page
 * task with no `stepDelayMs` wait before them, so the directive samples its
 * release velocity over one call's round trip rather than over the timed gap,
 * and the release cannot go stale. Without it, a flick relies on
 * `stepDelayMs` being an accurate wall-clock gap, which it is NOT on
 * `Mobile Safari` under `--ui` / heavy load: `waitForTimeout` overshoots and
 * WebKit coalesces pointermoves, inflating `dt` so `|step| / dt` dips under the
 * 0.4-px/ms threshold and the flick silently fails. Use it on any `@mobile`
 * flick spec that must register a flick (advance / dismiss); leave it off for
 * no-flick / boundary specs. The arm step and the `steps - 1` earlier moves
 * still observe `stepDelayMs`, so the cumulative offset is unchanged — only the
 * release-velocity sample is made robust. With `release: false` there is no
 * release to pair the final step with, so the flag is inert.
 *
 * Returns the pointer, so a caller passing `release: false` lifts it with
 * `up()`.
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
  } = {},
): Promise<GesturePointer> {
  const { x: startX, y: startY } = await centreOf(start);
  const stepDelayMs = options.stepDelayMs ?? 50;
  const armPx = options.armPx ?? 5;
  const release = options.release ?? true;
  const flick = (options.flickRelease ?? false) && release;
  const pacedSteps = flick ? steps - 1 : steps;

  const len = Math.hypot(step.dx, step.dy) || 1;
  const armDx = (step.dx / len) * armPx;
  const armDy = (step.dy / len) * armPx;

  const pointer = gesturePointer(page);
  await pointer.down(startX, startY);
  // Arming step: directs the swipe-dismiss helper at the same axis as
  // the requested gesture.
  await pointer.move(startX + armDx, startY + armDy);

  let cx = startX + armDx;
  let cy = startY + armDy;
  for (let i = 0; i < pacedSteps; i++) {
    await page.waitForTimeout(stepDelayMs);
    cx += step.dx;
    cy += step.dy;
    await pointer.move(cx, cy);
  }
  if (flick) {
    await pointer.flick(cx + step.dx, cy + step.dy);
  } else if (release) {
    await pointer.up();
  }
  return pointer;
}

/**
 * Long-press the locator's centre: dispatches a touch `pointerdown`, waits
 * `ms`, then dispatches `pointerup` on the element at the same position.
 * Default 600 ms because Chromium and WebKit fire the synthetic
 * `contextmenu` event after roughly 500 ms of sustained touch hold, so this
 * gives a comfortable margin for ContextMenu mobile coverage.
 *
 * The press is synthetic on every project, desktop included, so the desktop
 * run guards the same touch-only long-press timer; it never moves, so it
 * exercises no pointer capture.
 */
export async function longPress(locator: Locator, ms = 600): Promise<void> {
  const { x, y } = await centreOf(locator);
  const page = locator.page();
  await locator.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: x, clientY: y });
  await page.waitForTimeout(ms);
  await page.evaluate(
    ({ x, y }) => {
      document.elementFromPoint(x, y)?.dispatchEvent(
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
 * Hold a live pointer drag inside a scroll container's bottom auto-scroll band
 * until the virtualized window has rendered past `untilIndex`, and return the
 * highest absolute index it reached.
 *
 * The budget is **progress, not iteration count**. Auto-scroll advances on a
 * `requestAnimationFrame` loop, so how many rows one paced hold covers is a
 * function of the fixture's row height and of whatever CPU the run has left: a
 * fixed cap is tuned to one fixture on one machine, and on a slower one it ends
 * the hold by *releasing the drag early*
 * ([#1689](https://github.com/tutkli/forty-cdk/issues/1689)). Holding while the
 * window is still advancing removes that cliff — the loop gives up only after
 * `stallIterations` consecutive reads that surface no new row, which is a real
 * "auto-scroll is not running" signal rather than a stopwatch.
 *
 * It then asserts that signal itself, so an exhausted hold fails naming the
 * auto-scroll. Without it the shortfall falls through to the caller's business
 * assertion, where an early release is indistinguishable from a broken
 * cross-window pin in the primitive — the expensive half of the original flake.
 *
 * `stallIterations` defaults to twelve, i.e. ~600 ms of a stationary window at
 * the default 50-ms pace. At the drag-drop defaults (16 px per frame, damped to
 * ~15 px three pixels from the edge) a 44-px row clears in roughly three frames,
 * so one iteration covers about one row and the budget is an order of magnitude
 * past the nominal gap between two rows.
 *
 * The `waitForTimeout` is gesture pacing in the sense of this module's header:
 * it is the hold's own dwell between two moves of one drag, not a settle-wait
 * on application state — the settle condition is the polled index itself.
 */
export async function holdPointerAtAutoScrollEdge(
  page: Page,
  options: {
    x: number;
    edgeY: number;
    untilIndex: number;
    readIndices: () => Promise<number[]>;
    stallIterations?: number;
    holdMs?: number;
  },
): Promise<number> {
  const { x, edgeY, untilIndex, readIndices } = options;
  const stallIterations = options.stallIterations ?? 12;
  const holdMs = options.holdMs ?? 50;

  let maxRendered = (await readIndices()).at(-1) ?? -1;
  let stalled = 0;
  for (let i = 0; maxRendered <= untilIndex && stalled < stallIterations; i++) {
    await page.mouse.move(x, i % 2 ? edgeY : edgeY - 1);
    await page.waitForTimeout(holdMs);
    const last = (await readIndices()).at(-1) ?? maxRendered;
    if (last > maxRendered) {
      maxRendered = last;
      stalled = 0;
    } else {
      stalled++;
    }
  }

  expect(
    maxRendered,
    `auto-scroll never advanced the rendered window past index ${untilIndex} ` +
      `(it stalled at ${maxRendered} for ${stallIterations} consecutive ${holdMs}ms holds)`,
  ).toBeGreaterThan(untilIndex);
  return maxRendered;
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
      () => (document.activeElement as HTMLElement | null)?.dataset['testid'] ?? null,
    );
    if (current === testid) return;
  }
  const last = await page.evaluate(
    () => (document.activeElement as HTMLElement | null)?.dataset['testid'] ?? null,
  );
  throw new Error(
    `rovingFirst: did not land on data-testid="${testid}" after ${maxAttempts} Tab presses (last focused: ${last ?? 'none'})`,
  );
}

/**
 * Focus a roving-tabindex item and wait until its group has handed it the
 * group's single tab stop. Use this — never a bare `.focus()` — before a
 * `Tab` / `Shift+Tab` that is meant to leave the group.
 *
 * Focusing an item is what *moves* the tab stop onto it: the items bind
 * `(focus)` (see `listbox-option.ts`) and the handler rewrites every sibling's
 * `tabindex` through a signal, so the new attributes land on a later,
 * asynchronous render under zoneless change detection. A `Tab` fired straight
 * after `.focus()` is therefore resolved by the browser against the *previous*
 * item's `tabindex="0"` and lands one stop short — on a sibling instead of
 * outside the group. The window is narrow locally and widens under CI worker
 * contention, which is the shape that kept the E2E gate red without ever
 * reproducing on a developer machine.
 *
 * Waiting for `tabindex="0"` gives the keypress a settled origin, and asserts
 * the roving contract — programmatic focus moves the tab stop — on the way, so
 * the wait is itself coverage rather than a delay.
 */
export async function focusRovingItem(page: Page, testid: string): Promise<void> {
  await el(page, testid).focus();
  await expectRovingFocus(page, testid);
}

/**
 * Assert that `testid` holds focus **and** owns its roving group's single tab
 * stop. Use this — never a bare {@link expectFocused} — after an arrow / `Home`
 * / `End` press whose landing a following `Tab` / `Shift+Tab` depends on.
 *
 * It is the keyboard-path half of what {@link focusRovingItem} does for a
 * programmatic `.focus()`, and it exists for the same reason: the two halves of
 * a roving move settle at different times. The browser moves DOM focus
 * synchronously, so `toBeFocused()` is satisfied while the group's `tabindex`
 * rewrite is still an unflushed zoneless render. A `Tab` fired in that window
 * is resolved against the *previous* owner's `tabindex="0"`, and the damage
 * outlives the window: `Shift+Tab` back in lands on that stale owner, whose own
 * `(focus)` handler then claims the tab stop for real — so the group settles
 * into a stable wrong state and the re-entry assertion fails for its whole
 * timeout instead of retrying its way green
 * ([#1701](https://github.com/tutkli/forty-cdk/issues/1701)).
 *
 * Asserting the rewrite is the roving contract itself — a keyboard move
 * relocates the tab stop — so the wait is coverage rather than a delay.
 */
export async function expectRovingFocus(page: Page, testid: string): Promise<void> {
  const item = el(page, testid);
  await expect(item).toBeFocused();
  await expect(item).toHaveAttribute('tabindex', '0');
}

/**
 * Assert that `testid` owns its roving group's single tab stop without holding
 * focus, where `tabbableSelector` enumerates the group's tab stops
 * (`'[role="option"][tabindex="0"]'`, `'[data-testid="toolbar"] [tabindex="0"]'`).
 * Use this — never a bare count — before a `Tab` re-entering a group whose
 * previous owner was just removed or disabled: `toHaveCount(1)` is already
 * satisfied while the stop has left the removed item but not yet reached its
 * final owner.
 */
export async function expectRovingTabStop(
  page: Page,
  testid: string,
  tabbableSelector: string,
): Promise<void> {
  await expect(el(page, testid)).toHaveAttribute('tabindex', '0');
  await expect(page.locator(tabbableSelector)).toHaveCount(1);
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
 * Read the `data-index` of the node a container's `aria-activedescendant` names,
 * in a single round trip — `null` when there is no active descendant, or when the
 * node it names is not mounted.
 *
 * Use this inside an `expect.poll` over a virtualized widget — never a locator
 * built from an id read in a previous step, which throws once that id goes stale
 * and ends the poll instead of retrying.
 */
export function activeDescendantIndex(container: Locator): Promise<string | null> {
  return container.evaluate((el) => {
    const activeId = el.getAttribute('aria-activedescendant');
    if (!activeId) return null;
    return el.ownerDocument.getElementById(activeId)?.getAttribute('data-index') ?? null;
  });
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

export async function recordFlipStamps(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const store = window as unknown as { __flipStamps: string[] };
    store.__flipStamps = [];
    new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target as HTMLElement;
        if (target.hasAttribute('data-drag-animating')) {
          store.__flipStamps.push(target.textContent?.trim() ?? '');
        }
      }
    }).observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-drag-animating'],
    });
  });
  return () =>
    page.evaluate(() => [...(window as unknown as { __flipStamps: string[] }).__flipStamps]);
}

export function afterFrames(page: Page, frames = 2): Promise<void> {
  return page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        const step = (left: number): void => {
          if (left === 0) {
            resolve();
            return;
          }
          requestAnimationFrame(() => step(left - 1));
        };
        step(count);
      }),
    frames,
  );
}
