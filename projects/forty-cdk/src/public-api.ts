/*
 * Public API surface of forty-cdk (main barrel).
 *
 * The shared internals live in the `forty-cdk/core` secondary entry point so a
 * consumer's bundler compiles them exactly once and can code-split each
 * primitive independently. This barrel re-exports every primitive plus the
 * cross-cutting public tokens; the per-primitive `forty-cdk/<primitive>` entry
 * points let bundlers pull only what a route imports.
 */

export type { VetoableEvent, VetoableNativeEvent } from 'forty-cdk/core';

export { FOR_ID_SALT, provideForIdSalt } from 'forty-cdk/core';

export { FOR_TIME_VALUE_SOURCE, type TimeValueSource } from 'forty-cdk/core';

export * from './lib/disclosure';
export * from './lib/accordion';
export * from './lib/field';
export * from './lib/fieldset';
export * from './lib/input';
export * from './lib/search';
export * from './lib/switch';
export * from './lib/checkbox';
export * from './lib/radio-group';
export * from './lib/tabs';
export * from './lib/listbox';
export * from './lib/tooltip';
export * from './lib/dialog';
export * from './lib/drawer';
export * from './lib/popover';
export * from './lib/toggle';
export * from './lib/button';
export * from './lib/menu';
export * from './lib/dropdown-menu';
export * from './lib/context-menu';
export * from './lib/menubar';
export * from './lib/select';
export * from './lib/combobox';
export * from './lib/signal-forms';
export * from './lib/slider';
export * from './lib/toast';
export * from './lib/separator';
export * from './lib/pane-resizer';
export * from './lib/aspect-ratio';
export * from './lib/progress';
export * from './lib/meter';
export * from './lib/avatar';
export * from './lib/toolbar';
export * from './lib/hover-card';
export * from './lib/navigation-menu';
export * from './lib/scroll-area';
export * from './lib/tree';
export * from './lib/number-input';
export * from './lib/otp-input';
export * from './lib/calendar';
export * from './lib/date-field';
export * from './lib/date-picker';
export * from './lib/time-field';
export * from './lib/time-picker';
export * from './lib/carousel';
export * from './lib/drag-drop';
export * from './lib/stepper';
export * from './lib/table';
export * from './lib/pagination';
export * from './lib/breadcrumbs';
export * from './lib/file-upload';
export * from './lib/breakpoints';
