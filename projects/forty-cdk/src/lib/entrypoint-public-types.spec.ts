import { analyze } from '../../../../scripts/lib/entrypoint-public-types.mjs';

const lines = (...source: readonly string[]) => source.join('\n');

describe('check-entrypoint-public-types unnameable-type detection', () => {
  it('reports an unexported type surfaced by an earlier overload, not only by the last one', () => {
    const emit = lines(
      "import { WritingDirection } from 'forty-cdk/core';",
      'interface LocalUnexported {',
      '  readonly dir: WritingDirection;',
      '}',
      'interface LocalTwo {',
      '  readonly size: number;',
      '}',
      'declare function injectThing(options: LocalUnexported): LocalTwo;',
      'declare function injectThing(): LocalTwo;',
      'export { injectThing };',
    );

    const { leaked, unblessed } = analyze('forty-cdk-thing.d.ts', emit);

    expect(leaked).toEqual(['LocalTwo', 'LocalUnexported']);
    expect(unblessed).toEqual([]);
  });

  it('reports an unexported type surfaced by an earlier half of a merged interface', () => {
    const emit = lines(
      'interface LocalShape {',
      '  readonly size: number;',
      '}',
      'interface ForThingContext {',
      '  readonly shape: LocalShape;',
      '}',
      'interface ForThingContext {',
      '  readonly open: boolean;',
      '}',
      'export { ForThingContext };',
    );

    expect(analyze('forty-cdk-thing.d.ts', emit).leaked).toEqual(['LocalShape']);
  });

  it('follows each declarator of a variable statement on its own', () => {
    const emit = lines(
      'interface LocalShown {',
      '  readonly size: number;',
      '}',
      'interface LocalHidden {',
      '  readonly size: number;',
      '}',
      'declare const shown: LocalShown, hidden: LocalHidden;',
      'export { shown };',
    );

    expect(analyze('forty-cdk-thing.d.ts', emit).leaked).toEqual(['LocalShown']);
  });
});
