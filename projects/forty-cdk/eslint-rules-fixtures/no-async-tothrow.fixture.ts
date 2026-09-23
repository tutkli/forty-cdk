/**
 * Fixture for `forty-cdk/no-async-tothrow`.
 *
 * `toThrow` / `toThrowError` invoke their callback and catch only a
 * synchronous throw. An `async` callback never throws — it returns a rejected
 * Promise — so `expect(async () => …).not.toThrow()` passes whatever the body
 * does, and the body keeps running after the test has returned. See CLAUDE.md >
 * Testing notes > Test isolation — non-negotiables > rule 12.
 *
 * This file exists to prove the rule fires; the four `async` callbacks in
 * `bad` are intentional violations, covering both callback forms, both
 * matchers, and both the plain and the `.not` chain. The shapes in `good` are
 * correct and must NOT be flagged: a synchronous callback, `rejects` on a
 * Promise or on an `async` callback, and awaiting the body directly. The two
 * in `undetected` are the limits the rule states rather than chases — an async
 * function passed by reference needs type information, and a non-`async`
 * callback returning a Promise still catches a synchronous throw — so they
 * must NOT be flagged either.
 */

interface ThrowMatchers<R> {
  toThrow(expected?: unknown): R;
  toThrowError(expected?: unknown): R;
}

declare function expect(actual: unknown): ThrowMatchers<void> & {
  not: ThrowMatchers<void>;
  rejects: ThrowMatchers<Promise<void>>;
};
declare function work(): Promise<void>;
declare function fail(): never;

export async function bad(): Promise<void> {
  expect(async () => {
    await work();
  }).not.toThrow();

  expect(async () => work()).toThrowError('boom');

  expect(async function () {
    await work();
  }).not.toThrowError();

  expect(async function () {
    await work();
  }).toThrow(/boom/);
}

export async function good(): Promise<void> {
  expect(() => fail()).toThrow('boom');
  expect(() => undefined).not.toThrowError();

  await expect(work()).rejects.toThrow('boom');
  await expect(async () => {
    await work();
  }).rejects.toThrowError('boom');

  await work();
}

export function undetected(): void {
  expect(work).not.toThrow();
  expect(() => work()).not.toThrow();
}
