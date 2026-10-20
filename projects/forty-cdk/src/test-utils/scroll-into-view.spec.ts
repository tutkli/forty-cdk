import { withScrollIntoViewStub } from './scroll-into-view';

describe('withScrollIntoViewStub', () => {
  let inherited: PropertyDescriptor | undefined;

  beforeEach(() => {
    inherited = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  });

  afterEach(() => {
    if (inherited) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', inherited);
    } else {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('installs the stub on Element.prototype for the duration of the run', async () => {
    const element = document.createElement('div');
    await withScrollIntoViewStub((stub) => {
      expect(Element.prototype.scrollIntoView).toBe(stub);
      element.scrollIntoView({ block: 'nearest' });
      expect(stub.mock.contexts).toEqual([element]);
    });
  });

  it('restores an implementation that existed before the stub', async () => {
    function marker(): void {}
    Element.prototype.scrollIntoView = marker;

    await withScrollIntoViewStub(() => {});

    expect(Element.prototype.scrollIntoView).toBe(marker);
  });

  it('returns the prototype to absent when nothing was defined before the stub', async () => {
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;

    await withScrollIntoViewStub(() => {});

    expect(Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')).toBeUndefined();
  });

  it('restores the previous implementation when the run rejects', async () => {
    function marker(): void {}
    Element.prototype.scrollIntoView = marker;

    await expect(withScrollIntoViewStub(() => Promise.reject(new Error('boom')))).rejects.toThrow(
      'boom',
    );

    expect(Element.prototype.scrollIntoView).toBe(marker);
  });

  it('runs the given implementation with the scrolled element as this', async () => {
    const element = document.createElement('div');
    const seen: Element[] = [];
    await withScrollIntoViewStub(
      () => {
        element.scrollIntoView();
      },
      function (this: Element) {
        seen.push(this);
      },
    );
    expect(seen).toEqual([element]);
  });
});
