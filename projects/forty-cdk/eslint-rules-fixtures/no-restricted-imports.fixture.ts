/**
 * Fixture for the config-level `no-restricted-imports` bans in `eslint.config.js`.
 *
 * The fixtures override switches `no-restricted-imports` off for this
 * directory, so this fixture is
 * Linted as `projects/forty-cdk/core/src/no-restricted-imports.ts`
 * under the real config instead. Each banned path and pattern fires once, and
 * each banned `@angular/core` name fires however it is imported.
 */

// Expected: 1× no-restricted-imports — `@angular/cdk`.
import '@angular/cdk';
// Expected: 1× no-restricted-imports — the `@angular/cdk/*` pattern.
import '@angular/cdk/a11y';
// Expected: 1× no-restricted-imports — `@angular/material`.
import '@angular/material';
// Expected: 1× no-restricted-imports — the `@angular/material/*` pattern.
import '@angular/material/button';
// Expected: 1× no-restricted-imports — `@angular/aria`.
import '@angular/aria';
// Expected: 1× no-restricted-imports — the `@angular/aria/*` pattern.
import '@angular/aria/menu';
// Expected: 2× no-restricted-imports — `zone.js`, as a path and as a pattern.
import 'zone.js';
// Expected: 2× no-restricted-imports — `zone.js/testing`, as a path and as a pattern.
import 'zone.js/testing';
// Expected: 1× no-restricted-imports — the `zone.js/*` pattern.
import 'zone.js/plugins/zone-error';

// Expected: 2× no-restricted-imports — the `Input` / `Output` decorators, aliased or not.
import { Input as In, Output } from '@angular/core';
// Expected: 2× no-restricted-imports — the `HostBinding` / `HostListener` decorators.
import { HostBinding, HostListener as Listen } from '@angular/core';
// Expected: 1× no-restricted-imports — `NgModule`, aliased.
import { NgModule as Module } from '@angular/core';
// Expected: 1× no-restricted-imports — `NgZone`, as a type.
import type { NgZone } from '@angular/core';
// Expected: 4× no-restricted-imports — a namespace import reaches every banned name.
import * as ng from '@angular/core';
// Expected: 1× no-restricted-imports — a re-export.
export { NgZone as Zone } from '@angular/core';

// Expected: 2× no-restricted-imports — `ControlValueAccessor` / `NG_VALUE_ACCESSOR`, even as types.
import type { ControlValueAccessor, NG_VALUE_ACCESSOR as Accessor } from '@angular/forms';

export const used = [In, Output, HostBinding, Listen, Module, ng];
export type Used = [NgZone, ControlValueAccessor, typeof Accessor];

// Allowed: the framework itself, and the signal APIs whose names differ only in case.
import '@angular/core';
import { inject, input, output, type OutputRef } from '@angular/core';

export const allowed = [inject, input, output] as const;
export type Allowed = OutputRef<unknown>;
