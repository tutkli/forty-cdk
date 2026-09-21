import { assertNoAngularDiagnostics } from './angular-diagnostics';

/**
 * The matcher's own contract: any `NG<NNNN>` code is recorded and attributed,
 * anything else is forwarded untouched.
 *
 * Both liveness probes emit a code the guard was originally written for, so
 * neither would fail against a recorder matching those two as literals.
 */
describe('Angular diagnostic guard', () => {
  it('records a diagnostic whose code no guard was written for, and names where it came from', () => {
    console.warn('NG9999: a diagnostic no guard was written for');

    expect(() => assertNoAngularDiagnostics()).toThrowError(
      /NG9999: a diagnostic no guard was written for/,
    );
  });

  it('attributes the diagnostic to the line that emitted it, not to the draining test', () => {
    console.warn('NG9999: attributed to its emitter');

    expect(() => assertNoAngularDiagnostics()).toThrowError(/angular-diagnostics\.spec\.ts/);
  });

  it('reports every code recorded since the last drain, in one failure', () => {
    console.warn('NG9998: first code');
    console.warn('NG9999: second code');

    expect(() => assertNoAngularDiagnostics()).toThrowError(/NG9998, NG9999: 2 Angular runtime/);
    expect(() => assertNoAngularDiagnostics()).not.toThrow();
  });

  it('leaves a warning that carries no runtime code alone', () => {
    console.warn('NG123: three digits is not a runtime code');
    console.warn('a plain warning the recorder must forward');

    expect(() => assertNoAngularDiagnostics()).not.toThrow();
  });
});
