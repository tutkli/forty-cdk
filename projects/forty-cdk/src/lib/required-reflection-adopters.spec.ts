import { Component, signal, type Type, type WritableSignal } from '@angular/core';

import { ForFieldControl } from 'forty-cdk/field';
import { ForInput, ForTextarea } from 'forty-cdk/input';
import { ForNumberInput } from 'forty-cdk/number-input';
import { ForOtpInput } from 'forty-cdk/otp-input';
import { ForSearch } from 'forty-cdk/search';

import { renderHost } from '../test-utils/render';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const REFLECTS_NATIVE_DISABLED = /[^A-Za-z#.]reflectDisabled\(|\.toggleAttribute\(\s*'disabled'/;
const REFLECTS_REQUIRED = /[^A-Za-z#.]reflectRequired\(/;
const BINDS_ARIA_REQUIRED = /['"]\[?attr\.aria-required\]?['"]|['"]aria-required['"]/;
const DECLARES_REQUIRED = /\breadonly required = input\(/;
const CLASS_DECLARATION =
  /\bexport\s+(abstract\s+)?class\s+(\w+)(?:<[^>]*>)?\s+(?:extends\s+(\w+))?/;

interface DeclaredClass {
  readonly path: string;
  readonly name: string;
  readonly isAbstract: boolean;
  readonly base: string | undefined;
}

function declaredClasses(): DeclaredClass[] {
  return [...LIBRARY_CODE].flatMap(([path, source]) => {
    const match = CLASS_DECLARATION.exec(source);
    return match
      ? [{ path, name: match[2]!, isAbstract: match[1] !== undefined, base: match[3] }]
      : [];
  });
}

function classesWithRequired(classes: readonly DeclaredClass[]): Set<string> {
  const names = new Set(
    classes.filter((c) => DECLARES_REQUIRED.test(LIBRARY_CODE.get(c.path)!)).map((c) => c.name),
  );
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of classes) {
      if (c.base !== undefined && names.has(c.base) && !names.has(c.name)) {
        names.add(c.name);
        grew = true;
      }
    }
  }
  return names;
}

function reflectingClasses(): DeclaredClass[] {
  const classes = declaredClasses();
  const withRequired = classesWithRequired(classes);
  return classes.filter(
    (c) => withRequired.has(c.name) && REFLECTS_NATIVE_DISABLED.test(LIBRARY_CODE.get(c.path)!),
  );
}

function concreteHosts(): string[] {
  const classes = declaredClasses();
  const expand = (c: DeclaredClass): string[] =>
    c.isAbstract ? classes.filter((sub) => sub.base === c.name).flatMap(expand) : [c.path];
  return reflectingClasses().flatMap(expand).sort();
}

interface RequiredHost {
  readonly required: WritableSignal<boolean>;
}

@Component({
  imports: [ForFieldControl],
  template: `<input forFieldControl [required]="required()" data-testid="target" />`,
})
class FieldControlHost {
  readonly required = signal(false);
}

@Component({
  imports: [ForInput],
  template: `<input forInput [required]="required()" data-testid="target" />`,
})
class InputHost {
  readonly required = signal(false);
}

@Component({
  imports: [ForTextarea],
  template: `<textarea forTextarea [required]="required()" data-testid="target"></textarea>`,
})
class TextareaHost {
  readonly required = signal(false);
}

@Component({
  imports: [ForSearch],
  template: `<input forSearch [required]="required()" data-testid="target" />`,
})
class SearchHost {
  readonly required = signal(false);
}

@Component({
  imports: [ForNumberInput],
  template: `<input forNumberInput [required]="required()" data-testid="target" />`,
})
class NumberInputHost {
  readonly required = signal(false);
}

@Component({
  imports: [ForOtpInput],
  template: `<div forOtpInput [length]="4" [required]="required()"></div>`,
})
class OtpInputHost {
  readonly required = signal(false);
}

@Component({
  imports: [ForFieldControl],
  template: `<input forFieldControl required [required]="required()" data-testid="target" />`,
})
class StaticFieldControlHost {
  readonly required = signal(false);
}

@Component({
  imports: [ForInput],
  template: `<input forInput required [required]="required()" data-testid="target" />`,
})
class StaticInputHost {
  readonly required = signal(false);
}

@Component({
  imports: [ForTextarea],
  template: `<textarea
    forTextarea
    required
    [required]="required()"
    data-testid="target"
  ></textarea>`,
})
class StaticTextareaHost {
  readonly required = signal(false);
}

@Component({
  imports: [ForSearch],
  template: `<input forSearch required [required]="required()" data-testid="target" />`,
})
class StaticSearchHost {
  readonly required = signal(false);
}

@Component({
  imports: [ForNumberInput],
  template: `<input forNumberInput required [required]="required()" data-testid="target" />`,
})
class StaticNumberInputHost {
  readonly required = signal(false);
}

interface HostCase {
  readonly fixture: Type<RequiredHost>;
  readonly staticFixture?: Type<RequiredHost>;
  readonly target: string;
}

const HOSTS: Readonly<Record<string, HostCase>> = {
  'field/src/field-control.ts': {
    fixture: FieldControlHost,
    staticFixture: StaticFieldControlHost,
    target: '[data-testid="target"]',
  },
  'input/src/input.ts': {
    fixture: InputHost,
    staticFixture: StaticInputHost,
    target: '[data-testid="target"]',
  },
  'input/src/textarea.ts': {
    fixture: TextareaHost,
    staticFixture: StaticTextareaHost,
    target: '[data-testid="target"]',
  },
  'number-input/src/number-input.ts': {
    fixture: NumberInputHost,
    staticFixture: StaticNumberInputHost,
    target: '[data-testid="target"]',
  },
  'otp-input/src/otp-input.ts': { fixture: OtpInputHost, target: '[forOtpInput] input' },
  'search/src/search.ts': {
    fixture: SearchHost,
    staticFixture: StaticSearchHost,
    target: '[data-testid="target"]',
  },
};

async function mount(fixture: Type<RequiredHost>, target: string) {
  const r = renderHost(fixture);
  await r.flush();
  return {
    ...r,
    target: () => r.el.querySelector<HTMLInputElement | HTMLTextAreaElement>(target)!,
  };
}

describe('required reflection — native-hosted form controls', () => {
  describe('roster derived from source', () => {
    it('finds the native-hosted form controls through the scan', () => {
      expect(concreteHosts().length).toBeGreaterThanOrEqual(6);
    });

    it('has exactly one case per native-hosted form control', () => {
      expect(Object.keys(HOSTS).sort()).toEqual(concreteHosts());
    });

    it('calls reflectRequired wherever native disabled is reflected', () => {
      const missing = reflectingClasses()
        .filter((c) => !REFLECTS_REQUIRED.test(LIBRARY_CODE.get(c.path)!))
        .map((c) => c.path);
      expect(missing).toEqual([]);
    });

    it('never binds aria-required on a native-hosted form control', () => {
      const doubled = [...concreteHosts(), ...reflectingClasses().map((c) => c.path)].filter(
        (path) => BINDS_ARIA_REQUIRED.test(LIBRARY_CODE.get(path)!),
      );
      expect(doubled).toEqual([]);
    });
  });

  describe('a bound [required] reaches the native element', () => {
    it.each(Object.entries(HOSTS))('%s', async (_, { fixture, target }) => {
      const r = await mount(fixture, target);
      expect(r.target().required).toBe(false);

      r.instance.required.set(true);
      await r.flush();
      expect(r.target().required).toBe(true);
      expect(r.target().hasAttribute('aria-required')).toBe(false);

      r.instance.required.set(false);
      await r.flush();
      expect(r.target().required).toBe(false);
    });
  });

  describe('a required attribute the control did not set survives a bound false', () => {
    it.each(Object.entries(HOSTS))('%s (applied imperatively)', async (_, { fixture, target }) => {
      const r = await mount(fixture, target);
      r.target().setAttribute('required', '');

      r.instance.required.set(true);
      await r.flush();
      r.instance.required.set(false);
      await r.flush();

      expect(r.target().getAttribute('required')).toBe('');
    });

    const staticHosts = Object.entries(HOSTS).flatMap(([path, { staticFixture, target }]) =>
      staticFixture ? [[path, staticFixture, target] as const] : [],
    );

    it.each(staticHosts)('%s (static attribute)', async (_, staticFixture, target) => {
      const r = await mount(staticFixture, target);
      expect(r.target().getAttribute('required')).toBe('');

      r.instance.required.set(true);
      await r.flush();
      r.instance.required.set(false);
      await r.flush();

      expect(r.target().getAttribute('required')).toBe('');
    });
  });
});
