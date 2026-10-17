import {
  type CommentBucket,
  classifiedComments,
  measure,
} from '../../../../scripts/lib/comment-density.mjs';

function bucketsOf(text: string): Record<string, CommentBucket> {
  return Object.fromEntries(
    classifiedComments(text).map((comment) => [
      text.slice(comment.pos, comment.end),
      comment.bucket,
    ]),
  );
}

describe('measure-comment-density classification', () => {
  it('files the JSDoc of the first member of an exported class, interface, enum and type literal as public', () => {
    const text = [
      'export class Foo {',
      '  /** class first */',
      '  readonly a = 1;',
      '  /** class second */',
      '  readonly b = 2;',
      '}',
      'export interface Bar {',
      '  /** interface first */',
      '  c: number;',
      '}',
      'export enum Baz {',
      '  /** enum first */',
      '  D,',
      '}',
      'export type Qux = {',
      '  /** literal first */',
      '  e: number;',
      '};',
      '',
    ].join('\n');

    expect(bucketsOf(text)).toEqual({
      '/** class first */': 'publicJsdoc',
      '/** class second */': 'publicJsdoc',
      '/** interface first */': 'publicJsdoc',
      '/** enum first */': 'publicJsdoc',
      '/** literal first */': 'publicJsdoc',
    });
  });

  it('keeps the JSDoc of a first member no consumer reaches internal', () => {
    const text = [
      'class Hidden {',
      '  /** unexported owner */',
      '  a = 1;',
      '}',
      'export class Shown {',
      '  /** private first */',
      '  private b = 1;',
      '  /** protected */',
      '  protected c = 1;',
      '}',
      '',
    ].join('\n');

    expect(bucketsOf(text)).toEqual({
      '/** unexported owner */': 'internalJsdoc',
      '/** private first */': 'internalJsdoc',
      '/** protected */': 'internalJsdoc',
    });
  });

  it('files the JSDoc that opens a file by the declaration it leads', () => {
    const text = ['/** opens the file */', 'export const shown = 1;', ''].join('\n');

    expect(bucketsOf(text)).toEqual({ '/** opens the file */': 'publicJsdoc' });
  });

  it('counts every comment once, trailing ones included', () => {
    const text = [
      'export class Foo {',
      '  /**',
      '   * first',
      '   */',
      '  readonly a = 1; // trailing',
      '  // plain',
      '  readonly b = 2;',
      '}',
      '',
    ].join('\n');

    expect(classifiedComments(text)).toHaveLength(3);
    expect(measure(text).buckets).toEqual({
      publicJsdoc: 3,
      internalJsdoc: 0,
      marker: 0,
      plain: 1,
    });
  });
});
