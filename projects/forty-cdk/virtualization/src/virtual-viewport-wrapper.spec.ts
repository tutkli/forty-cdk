import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  contentChild,
  input,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { flush } from '../../src/test-utils';

import { ForVirtualFor } from './virtual-for';
import { ForVirtualViewport } from './virtual-viewport';
import { FOR_VIRTUAL_VIEWPORT_CONTEXT } from './virtual-viewport-context';

interface Row {
  readonly label: string;
}

function makeRows(length: number): Row[] {
  return Array.from({ length }, (_, i) => ({ label: `Row ${i}` }));
}

function fakeLayout(el: HTMLElement, main = 200): void {
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: main });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: main });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: main });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: main });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: main * 200 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: main * 200 });
}

function rowEls(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-index]'));
}

async function mount<T>(host: new () => T, viewportSelector: string): Promise<ComponentFixture<T>> {
  const fixture = TestBed.createComponent(host);
  const viewport = (fixture.nativeElement as HTMLElement).querySelector(viewportSelector);
  fakeLayout(viewport as HTMLElement, 200);
  fixture.detectChanges();
  await flush(fixture);
  return fixture;
}

@Component({
  selector: 'my-virtual-list',
  imports: [ForVirtualViewport, ForVirtualFor, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forVirtualViewport
      class="my-virtual-list"
      [virtualCount]="items().length"
      [estimateSize]="estimateSize()"
      role="list"
      [attr.aria-label]="ariaLabel()"
      tabindex="0"
    >
      <div
        *forVirtualFor="let item of items(); let index = index"
        class="my-virtual-list-row"
        role="listitem"
      >
        <ng-container *ngTemplateOutlet="row(); context: { $implicit: item, index: index }" />
      </div>
    </div>
  `,
})
class MyVirtualList<T> {
  readonly items = input.required<readonly T[]>();
  readonly estimateSize = input(44);
  readonly ariaLabel = input<string | null>(null);
  readonly row = contentChild.required(TemplateRef);
}

@Component({
  imports: [MyVirtualList],
  template: `
    <my-virtual-list [items]="rows()" [estimateSize]="40" ariaLabel="Rows">
      <ng-template let-row let-i="index">
        <span class="row-label">{{ row.label }} at {{ i }}</span>
      </ng-template>
    </my-virtual-list>
  `,
})
class ComposedHost {
  readonly rows = signal<Row[]>(makeRows(1000));
}

@Component({
  selector: '[myViewport]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_VIRTUAL_VIEWPORT_CONTEXT, useExisting: ComponentSubclassViewport }],
  template: `<ng-content />`,
})
class ComponentSubclassViewport extends ForVirtualViewport {}

@Component({
  imports: [ComponentSubclassViewport, ForVirtualFor],
  template: `
    <div myViewport [virtualCount]="rows().length" [estimateSize]="40">
      <div *forVirtualFor="let row of rows()">{{ row.label }}</div>
    </div>
  `,
})
class ComponentSubclassHost {
  readonly rows = signal<Row[]>(makeRows(1000));
}

function defineDirectiveSubclass(): unknown {
  @Directive({
    selector: '[myViewport]',
    providers: [{ provide: FOR_VIRTUAL_VIEWPORT_CONTEXT, useExisting: DirectiveSubclassViewport }],
  })
  class DirectiveSubclassViewport extends ForVirtualViewport {}
  return DirectiveSubclassViewport;
}

describe('ForVirtualViewport wrapping guard (#2345)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('sizes the sizer to count * estimateSize inside a wrapper that composes the viewport', async () => {
    const fixture = await mount(ComposedHost, '[forVirtualViewport]');
    const viewport = (fixture.nativeElement as HTMLElement).querySelector(
      '[forVirtualViewport]',
    ) as HTMLElement;
    const sizer = viewport.firstElementChild as HTMLElement;

    expect(viewport.style.overflow).toBe('auto');
    expect(sizer.style.position).toBe('relative');
    expect(sizer.style.height).toBe('40000px');
  });

  it('positions the wrapper rows absolutely and stamps the consumer row template into them', async () => {
    const fixture = await mount(ComposedHost, '[forVirtualViewport]');
    const rows = rowEls(fixture);
    const second = rows.find((el) => el.getAttribute('data-index') === '1');

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.length).toBeLessThan(1000);
    expect(second?.style.position).toBe('absolute');
    expect(second?.style.transform).toBe('translateY(40px)');
    expect(second?.getAttribute('aria-setsize')).toBe('1000');
    expect(second?.getAttribute('aria-posinset')).toBe('2');
    expect(second?.querySelector('.row-label')?.textContent?.trim()).toBe('Row 1 at 1');
  });

  it('resizes the sizer when the wrapper is handed a shorter list', async () => {
    const fixture = await mount(ComposedHost, '[forVirtualViewport]');
    const sizer = (fixture.nativeElement as HTMLElement).querySelector('[forVirtualViewport]')
      ?.firstElementChild as HTMLElement;

    fixture.componentInstance.rows.set(makeRows(500));
    await flush(fixture);

    expect(sizer.style.height).toBe('20000px');
  });

  it('rejects a @Directive subclass of the viewport: a directive cannot extend a component', () => {
    expect(defineDirectiveSubclass).toThrow(/NG0903/);
  });

  it('renders no sizer through a @Component subclass, because a subclass inherits no template', async () => {
    const fixture = await mount(ComponentSubclassHost, '[myViewport]');
    const viewport = (fixture.nativeElement as HTMLElement).querySelector(
      '[myViewport]',
    ) as HTMLElement;
    const children = Array.from(viewport.children) as HTMLElement[];

    expect(children.length).toBeGreaterThan(0);
    expect(children.some((child) => child.style.position === 'relative')).toBe(false);
    expect(children.every((child) => child.hasAttribute('data-index'))).toBe(true);
  });
});
