---
title: Testing
group: utilities
archetype: [headless-utility]
---

# Testing

Spec helpers for code built on forty-cdk, imported from `forty-cdk/testing`: events dispatched the way a browser dispatches them, stubs for the browser APIs jsdom lacks, and real dialog and drawer refs for a component mounted outside its manager.

The library's own suite drives its primitives with these same helpers, so they change when the primitives do and your specs never hold a private copy that drifts. The entry point imports no test runner, so it works under whichever one your project uses, and every stub it installs hands back the callback that removes it.

```ts
import { pressKey, pressWithMouse, provideForDialogTesting } from 'forty-cdk/testing';
```

## API

### Events

| Export                            | What it dispatches, that a bare `dispatchEvent` or `.click()` does not                                                                                                                                                                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pressKey(target, key, options?)` | A `keydown` (or `keyup`) that bubbles and is **cancelable**, and returns it. A bare `new KeyboardEvent('keydown', { key })` is not cancelable, so a handler's `preventDefault()` does nothing and `event.defaultPrevented` reads `false` even when the primitive claimed the key. `options` takes any other `KeyboardEventInit` member. |
| `pressWithMouse(target)`          | `pointerdown`, `mousedown`, the focus move a browser makes, `pointerup`, `mouseup`, then `click`. `.click()` sends only the `click`, and a dismissible overlay decides an outside press on `pointerdown`: clicking outside an open popover with `.click()` never closes it, and focus never moves.                                      |
| `pointerEvent(type, init?)`       | Builds, without dispatching, a real `PointerEvent` that bubbles, is cancelable and carries `pointerId: 1`. A `new Event(type)` cast to `PointerEvent` reads `buttons`, `isPrimary` and `pointerType` as `undefined`, so a handler gating on `buttons === 0` takes the wrong branch.                                                     |

`pressWithMouse` moves focus as the browser does: the nearest focusable ancestor of the pressed element takes it, the focused element blurs when there is none, and nothing moves when a `mousedown` listener prevented the default.

<!-- snippet: fragment -->

```ts
it('closes the popover on a press outside it', async () => {
  pressWithMouse(fixture.nativeElement.querySelector('[forPopoverTrigger]'));
  await fixture.whenStable();

  pressWithMouse(document.body);
  await fixture.whenStable();

  expect(document.querySelector('[forPopoverContent]')).toBeNull();
});

it('claims ArrowDown on the trigger', () => {
  const event = pressKey(trigger, 'ArrowDown');

  expect(event.defaultPrevented).toBe(true);
});
```

### Browser APIs jsdom lacks

| Export                                 | What it installs                                                                                                                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `installObserverPolyfills()`           | Inert `ResizeObserver` and `IntersectionObserver` constructors where none is usable. The anchored overlays, the scroll area and the navigation menu construct one as they mount, so without it they fail with `ResizeObserver is not defined`. |
| `withReducedMotion()`                  | A `matchMedia` under which `prefers-reduced-motion: reduce` matches and every other query does not. jsdom has no `matchMedia`, so a primitive gating its motion on the preference never sees it set.                                           |
| `withFlippableReducedMotion(initial?)` | The same, starting at `initial` (default `true`), whose `set(matches)` notifies the `change` listeners registered on the query, as the browser does when the user changes the setting. `restore()` removes it.                                 |

Each returns its own teardown, and none registers a hook for you, so a failing test cannot leave a stub behind for the next one. A constructor or `matchMedia` already present is left as it was and put back on restore.

<!-- snippet: fragment -->

```ts
let restoreObservers: () => void;
beforeAll(() => (restoreObservers = installObserverPolyfills()));
afterAll(() => restoreObservers());

let restoreMotion: () => void;
beforeEach(() => (restoreMotion = withReducedMotion()));
afterEach(() => restoreMotion());
```

### Dialog and drawer content

A component opened with `ForDialogManager.open()` injects `ForDialogRef`, and the dialog pieces in its template resolve `FOR_DIALOG_CONTEXT`. Mounted on its own in a spec it has neither, and the ref's constructor is not yours to call. These provide both.

| Export                              | What it provides                                                                                                                                                                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createForDialogRef<R>()`           | A real `ForDialogRef<R>` that no manager rendered. `close(result)` resolves `closed` with `{ reason: 'programmatic', result }`, flips `isClosed()` and sets `result()`; a second call is a no-op.                                                                                 |
| `provideForDialogTesting(options?)` | `ForDialogRef`, `FOR_DIALOG_DATA` and a working `FOR_DIALOG_CONTEXT`. `[forDialogTitle]` and `[forDialogDescription]` register into its `labelledBy()` / `describedBy()`, and `[forDialogClose]` or a backdrop click closes the ref with that reason and the `[closeWith]` value. |
| `createForDrawerRef<R>()`           | The same for `ForDrawerRef<R>`, whose `activeSnapPoint()` starts at `null` and follows `setActiveSnapPoint()`.                                                                                                                                                                    |
| `provideForDrawerTesting(options?)` | The same for `ForDrawerRef`, `FOR_DRAWER_DATA` and `FOR_DRAWER_CONTEXT`, whose `activeSnapPoint()` is the ref's.                                                                                                                                                                  |

`options` takes `ref`, the ref to provide instead of a fresh one, and `data`, the payload `injectDialogData()` / `injectDrawerData()` returns (`null` without one, as `open()` without `data`). The context reports the manager's defaults: dismissible, modal, not an alert, at depth `0`, and for a drawer the `bottom` side with no gesture in flight. Closing the ref unmounts nothing, since no manager rendered the component.

<!-- snippet: fragment -->

```ts
TestBed.configureTestingModule({
  providers: [provideForDialogTesting({ data: { name: 'report.pdf' } })],
});
const fixture = TestBed.createComponent(ConfirmDeleteDialog);
const ref = TestBed.inject(ForDialogRef);
await fixture.whenStable();

fixture.nativeElement.querySelector('[forDialogClose]').click();

await expect(ref.closed).resolves.toEqual({ reason: 'closeButton', result: true });
```
