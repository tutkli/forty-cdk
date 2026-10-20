/**
 * Fixture for the config-level `no-restricted-syntax` bans in `eslint.config.js`.
 *
 * The fixtures override switches `no-restricted-syntax` off for this
 * directory, so this fixture is
 * Linted as `projects/forty-cdk/core/src/no-restricted-syntax.ts`
 * under the real config instead. Every configured selector fires at least once
 * here, so dropping or breaking one shows up as a short count.
 *
 * The banned decorators are declared locally: importing them from
 * `@angular/core` is what the `no-restricted-imports` fixture pins, and this
 * file must report nothing but `no-restricted-syntax`.
 */

import { Directive, inject, type InjectionToken } from '@angular/core';

declare function Input(): PropertyDecorator;
declare function Output(): PropertyDecorator;
declare function HostBinding(binding: string): PropertyDecorator;
declare function HostListener(event: string): MethodDecorator;
declare function NgModule(metadata: object): ClassDecorator;

declare const TOKEN: InjectionToken<string>;

@Directive({
  selector: '[forZzzDecorators]',
  host: {
    // Expected: 1× no-restricted-syntax — `"false"` on a truthy-only attribute.
    '[attr.aria-disabled]': 'disabled ? "true" : "false"',
    // Expected: 1× no-restricted-syntax — `'false'` on a truthy-only attribute.
    '[attr.aria-required]': "disabled ? 'true' : 'false'",
    // Expected: 1× no-restricted-syntax — a truthy-only binding with no `null` branch.
    '[attr.aria-readonly]': 'disabled',
    // Expected: 1× no-restricted-syntax — a static `type: "button"` host attribute.
    type: 'button',
  },
})
export class ForZzzDecorators {
  // Expected: 2× no-restricted-syntax — `@Input()` and `@Output()`.
  @Input() disabled = false;
  @Output() changed = undefined;

  // Expected: 2× no-restricted-syntax — `@HostBinding()` and `@HostListener()`.
  @HostBinding('class.active') active = false;
  @HostListener('click') onClick(): void {}
}

// Expected: 1× no-restricted-syntax — the `NgModule` decorator.
@NgModule({})
export class ZzzModule {}

// Expected: 1× no-restricted-syntax — a `Service` class suffix.
export class ZzzService {}

// Expected: 1× no-restricted-syntax — a `Service` suffix on a named class expression.
export const zzzTrap = class ZzzTrapService {};

// Expected: 1× no-restricted-syntax — a `Directive` suffix on the binding of a class expression.
export const ZzzTrapDirective = class {};

export async function zzzLoad(): Promise<unknown> {
  // Expected: 2× no-restricted-syntax — a dynamic `import()` of a banned package.
  await import('@angular/cdk/a11y');
  return import('zone.js');
}

export function probeInjectionContext(): string | null {
  // Expected: 1× no-restricted-syntax — `try` / `catch` around a lone `inject(…)`.
  try {
    return inject(TOKEN);
  } catch {
    return null;
  }
}

// Allowed: truthy-only bindings with a `null` falsy branch, a token `aria-haspopup`,
// an always-emit `"false"`, a class named for what it is, and a dynamic import of
// anything else.
@Directive({
  selector: '[forZzzAllowed]',
  host: {
    '[attr.aria-disabled]': 'disabled ? "true" : null',
    '[attr.aria-invalid]': "invalid() ? 'true' : null",
    '[attr.aria-busy]': 'busy() || null',
    '[attr.aria-multiselectable]':
      'mode() !== "table" && selectionMode() === "multiple" ? "true" : null',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'open() ? "true" : "false"',
    '[attr.type]': 'buttonType()',
  },
})
export class ForZzzAllowed {
  declare readonly disabled: boolean;
  declare readonly invalid: () => boolean;
  declare readonly busy: () => 'true' | null;
  declare readonly mode: () => string;
  declare readonly selectionMode: () => string;
  declare readonly open: () => boolean;
  declare readonly buttonType: () => string | null;
}

export const zzzFocusTrap = class FocusTrap {};

export const zzzLazy = (): Promise<unknown> => import('@angular/common');
