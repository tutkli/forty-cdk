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

export * from 'forty-cdk/disclosure';
export * from 'forty-cdk/accordion';
export * from 'forty-cdk/field';
export * from 'forty-cdk/fieldset';
export * from 'forty-cdk/input';
export * from 'forty-cdk/search';
export * from 'forty-cdk/switch';
export * from 'forty-cdk/checkbox';
export * from 'forty-cdk/radio-group';
export * from 'forty-cdk/tabs';
export * from 'forty-cdk/listbox';
export * from 'forty-cdk/tooltip';
export * from 'forty-cdk/dialog';
export * from 'forty-cdk/drawer';
export * from 'forty-cdk/popover';
export * from 'forty-cdk/toggle';
export * from 'forty-cdk/button';
export * from 'forty-cdk/menu';
export * from 'forty-cdk/dropdown-menu';
export * from 'forty-cdk/context-menu';
export * from 'forty-cdk/menubar';
export * from 'forty-cdk/select';
export * from 'forty-cdk/combobox';
export * from './lib/signal-forms';
export * from 'forty-cdk/slider';
export * from 'forty-cdk/toast';
export * from 'forty-cdk/separator';
export * from 'forty-cdk/pane-resizer';
export * from 'forty-cdk/aspect-ratio';
export * from 'forty-cdk/progress';
export * from 'forty-cdk/meter';
export * from 'forty-cdk/avatar';
export * from 'forty-cdk/toolbar';
export * from 'forty-cdk/hover-card';
export * from 'forty-cdk/navigation-menu';
export * from 'forty-cdk/scroll-area';
export * from './lib/tree';
export * from 'forty-cdk/number-input';
export * from 'forty-cdk/otp-input';
export * from './lib/calendar';
export * from './lib/date-field';
export * from './lib/date-picker';
export * from './lib/time-field';
export * from './lib/time-picker';
export * from './lib/carousel';
export * from './lib/drag-drop';
export * from './lib/stepper';
export * from './lib/table';
export * from 'forty-cdk/pagination';
export * from 'forty-cdk/breadcrumbs';
export * from 'forty-cdk/file-upload';
export * from 'forty-cdk/breakpoints';
