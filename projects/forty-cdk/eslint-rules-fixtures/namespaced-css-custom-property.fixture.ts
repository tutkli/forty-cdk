declare const el: HTMLElement;
declare const column: string;
declare const namespacer: { namespace(name: string): string };
declare function Directive(metadata: unknown): ClassDecorator;

el.style.setProperty('--for-fixture-width', '1px');

el.style.removeProperty(`--for-fixture-col-${column}-width`);

el.style.setProperty('right', 'var(--for-fixture-offset, 0px)');

export const track = `var(--for-fixture-col-${column}-width, 1fr)`;

@Directive({
  selector: '[forFixtureRawVarValue]',
  host: {
    '[style.transform]': '"translateX(var(--for-fixture-offset))"',
  },
})
export class ForFixtureRawVarValue {}

el.style.setProperty(namespacer.namespace('--for-fixture-width'), '1px');

el.style.removeProperty(namespacer.namespace(`--for-fixture-col-${column}-width`));

el.style.setProperty('right', `var(${namespacer.namespace('--for-fixture-offset')}, 0px)`);

@Directive({
  selector: '[forFixtureHostBinding]',
  host: {
    '[style.--for-fixture-width]': 'width()',
  },
})
export class ForFixtureHostBinding {
  declare readonly width: () => string;
}

export const message =
  'Column names are interpolated into the --for-fixture-col-<name>-width property';
