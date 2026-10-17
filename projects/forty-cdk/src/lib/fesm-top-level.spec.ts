import { topLevelSideEffects } from '../../../../scripts/lib/fesm-top-level.mjs';

const lines = (...source: readonly string[]) => source.join('\n');

describe('check-fesm-top-level detection', () => {
  it('accepts imports, exports, declarations and the class-metadata call', () => {
    const source = lines(
      "import * as i0 from '@angular/core';",
      "import { helper } from 'forty-cdk/core';",
      'var ForThing = class ForThing {',
      '  static ɵfac = i0.ɵɵngDeclareFactory({});',
      '};',
      'i0.ɵɵngDeclareClassMetadata({ type: ForThing });',
      "const TOKEN = new i0.InjectionToken('token');",
      'let counter = 0;',
      'function moveItemInArray(array, from, to) {}',
      'class Plain {}',
      'export { ForThing, TOKEN, moveItemInArray, Plain, helper, counter };',
    );

    expect(topLevelSideEffects(source)).toEqual([]);
  });

  it('reports the class alias assignment a self-referencing instanceof left in the drag-drop FESM, with its line', () => {
    const source = lines(
      "import * as i0 from '@angular/core';",
      'var _a;',
      'var ForDropList = class ForDropList {',
      '  #coordinator = null;',
      '  isClosed(ctx) {',
      '    return ctx instanceof _a && ctx.#coordinator !== null;',
      '  }',
      '};',
      '_a = ForDropList;',
      'i0.ɵɵngDeclareClassMetadata({ type: ForDropList });',
      'export { ForDropList };',
    );

    expect(topLevelSideEffects(source)).toEqual([{ line: 9, text: '_a = ForDropList;' }]);
  });

  it('reports every other statement a bundler must keep', () => {
    const source = lines(
      "import * as i0 from '@angular/core';",
      'window.forty = true;',
      'register();',
      'i0.ɵsetClassDebugInfo(Thing, {});',
      'if (globalThis.ngDevMode) {}',
      '(() => {})();',
    );

    expect(topLevelSideEffects(source).map(({ line }) => line)).toEqual([2, 3, 4, 5, 6]);
  });

  it('reports only the first line of a multi-line statement', () => {
    const source = lines('Object.assign(globalThis, {', '  forty: true,', '});');

    expect(topLevelSideEffects(source)).toEqual([{ line: 1, text: 'Object.assign(globalThis, {' }]);
  });
});
