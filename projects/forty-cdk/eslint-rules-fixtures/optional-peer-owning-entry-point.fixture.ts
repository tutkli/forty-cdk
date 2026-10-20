/**
 * Exercises `@typescript-eslint/no-restricted-imports` inside the entry point
 * that owns an optional peer: `forty-cdk/internationalized-date` imports
 * `@internationalized/date` by value because its consumers construct those
 * values themselves, and every other optional peer stays banned there.
 *
 * Linted as `projects/forty-cdk/internationalized-date/src/optional-peer-owning-entry-point.ts`
 */

// Expected: 1× @typescript-eslint/no-restricted-imports — `@angular/forms` is still an optional peer here.
import { Validators } from '@angular/forms';

export const used = [Validators];

// Allowed: the owning entry point imports its own peer by value.
import { CalendarDate } from '@internationalized/date';

export const allowed = [CalendarDate];
