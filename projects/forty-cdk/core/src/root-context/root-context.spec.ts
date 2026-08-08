import { assertRootContext } from './root-context';

const ASSERTION = {
  entryPoint: 'accordion',
  token: 'FOR_ACCORDION_CONTEXT',
  root: '[forAccordion]',
  piece: 'ForAccordionTrigger',
};

describe('assertRootContext', () => {
  it('passes a context whose probe resolves to a function', () => {
    expect(() =>
      assertRootContext({ ...ASSERTION, probe: () => (): void => undefined }),
    ).not.toThrow();
  });

  it('rejects a context missing the probed member', () => {
    expect(() => assertRootContext({ ...ASSERTION, probe: () => undefined })).toThrow(
      /\[forty-cdk\/accordion\] FORCDK-CORE-007: ForAccordionTrigger resolved a FOR_ACCORDION_CONTEXT provider that is not the \[forAccordion\] root/,
    );
  });

  it('names the provider shape the consumer must write', () => {
    expect(() => assertRootContext({ ...ASSERTION, probe: () => undefined })).toThrow(
      /\{ provide: FOR_ACCORDION_CONTEXT, useExisting: MyRoot \}, where MyRoot is \[forAccordion\] or a subclass of it/,
    );
  });

  it('rejects a context whose probed member is not callable', () => {
    expect(() => assertRootContext({ ...ASSERTION, probe: () => 'registerTrigger' })).toThrow(
      /\[forty-cdk\/accordion\]/,
    );
  });

  it('reports its own error when the probe throws, not the read that failed', () => {
    expect(() =>
      assertRootContext({
        ...ASSERTION,
        probe: () => {
          throw new TypeError("Cannot read properties of undefined (reading 'setInitialFocus')");
        },
      }),
    ).toThrow(/\[forty-cdk\/accordion\] FORCDK-CORE-007: ForAccordionTrigger resolved a/);
  });

  it('probes nothing once `ngDevMode` is cleared, as a production build does', () => {
    vi.stubGlobal('ngDevMode', false);
    const probe = vi.fn(() => undefined);

    expect(() => assertRootContext({ ...ASSERTION, probe })).not.toThrow();
    expect(probe).not.toHaveBeenCalled();
  });
});
