/**
 * Exercises `@typescript-eslint/no-restricted-imports`: the optional-peer ban in
 * `eslint.config.js`, which CLAUDE.md § "Optional peers must never be imported
 * by value from an entry point that consumers who lack that peer will load"
 * sets. The banned peers are read from the `peerDependenciesMeta` of the
 * library's `package.json`, so a new optional peer is banned without editing
 * the config.
 *
 * The fixtures override switches the rule off for this directory, so this
 * fixture is
 * Linted as `projects/forty-cdk/core/src/optional-peer-value-imports.ts`
 * under the real config instead. Every value import of an optional peer fires,
 * and a type-only import is left alone because TypeScript erases it.
 */

// Expected: 1× @typescript-eslint/no-restricted-imports — a value from `@angular/forms/signals`.
import { FormField } from '@angular/forms/signals';
// Expected: 1× @typescript-eslint/no-restricted-imports — a value from `@angular/forms`.
import { Validators } from '@angular/forms';
// Expected: 1× @typescript-eslint/no-restricted-imports — one value among inline types.
import { type FormValueControl, form } from '@angular/forms/signals';
// Expected: 1× @typescript-eslint/no-restricted-imports — a side-effect import.
import '@angular/forms';
// Expected: 1× @typescript-eslint/no-restricted-imports — a value re-export.
export { FormField as Field } from '@angular/forms/signals';
// Expected: 1× @typescript-eslint/no-restricted-imports — `@internationalized/date` outside `forty-cdk/internationalized-date`.
import { CalendarDate } from '@internationalized/date';

export const used = [FormField, Validators, form, CalendarDate];
export type Used = FormValueControl<string>;

// Allowed: type-only imports and re-exports, which the emit erases.
import type { FormCheckboxControl } from '@angular/forms/signals';
import { type FormUiControl } from '@angular/forms/signals';
import type { CalendarDateTime } from '@internationalized/date';
export type { DateValue } from '@internationalized/date';

export type Allowed = [FormCheckboxControl, FormUiControl, CalendarDateTime];
