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

  it('accepts a variable declaration whose initializer a bundler can drop', () => {
    const source = lines(
      "import { InjectionToken } from '@angular/core';",
      'var _a;',
      "const TOKEN = new InjectionToken('token', { factory: () => 1 });",
      'const CACHE = new Map();',
      'const SEEN = new Set(), OWNERS = new WeakMap(), HELD = new WeakSet();',
      "const NAMES = { day: 2, label: 'Day', nested: [TOKEN, -1, `x`, null, true] };",
      'const SELECTOR = `${NAMES}, [role]`;',
      "const BRAND = Symbol('forty-cdk:brand');",
      'const read = (value) => value;',
      'const ForThing = class ForThing {};',
      'const handler = function () {};',
      "const KEYS = /* @__PURE__ */ new Set(['Home', 'End']);",
      "const JOINED = /* @__PURE__ */ [...Object.keys(NAMES)].join(',');",
      'const DERIVED = /* @__PURE__ */ derive(/* @__PURE__ */ Object.keys(NAMES));',
    );

    expect(topLevelSideEffects(source)).toEqual([]);
  });

  it('reports a top-level new Date(), the shape that kept five reference dates in every bundle importing forty-cdk/core', () => {
    const source = lines(
      "import * as i0 from '@angular/core';",
      'const REFERENCE_DATE = new Date(2000, 1, 1);',
      'export { REFERENCE_DATE };',
    );

    expect(topLevelSideEffects(source)).toEqual([
      { line: 2, text: 'const REFERENCE_DATE = new Date(2000, 1, 1);' },
    ]);
  });

  it('reports every other initializer a bundler must keep', () => {
    const source = lines(
      "const PATTERN = new RegExp('a', 'g');",
      'const ASCII = Array.from({ length: 95 }, (_, i) => i);',
      'const NAMES = new Set(Object.keys(SOURCE));',
      'const SEEDED = new Map([[1, 2]]);',
      'const UNIQUE = [...new Set(LIST)];',
      'const SPREAD = { ...SOURCE };',
      'const READ = i0.ɵɵdefineInjectable;',
      'const NAMED = Symbol(name);',
      'const LISTED = [register()];',
      'const ok = 1, bad = register();',
      'const KEPT_ARGUMENT = /* @__PURE__ */ new Set(Object.keys(SOURCE));',
      'const UNANNOTATED = [...Object.keys(SOURCE)].join(",");',
      'const NEXT = ++counter;',
    );

    expect(topLevelSideEffects(source).map(({ line }) => line)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
  });

  it('reports only the first line of a multi-line statement', () => {
    const source = lines('Object.assign(globalThis, {', '  forty: true,', '});');

    expect(topLevelSideEffects(source)).toEqual([{ line: 1, text: 'Object.assign(globalThis, {' }]);
  });
});
