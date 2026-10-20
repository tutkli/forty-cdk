import { type Mock, vi } from 'vitest';

type ScrollIntoView = Element['scrollIntoView'];

export async function withScrollIntoViewStub<T>(
  run: (stub: Mock<ScrollIntoView>) => Promise<T> | T,
  impl?: (this: Element, arg?: boolean | ScrollIntoViewOptions) => void,
): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  const stub = vi.fn<ScrollIntoView>(impl);
  Element.prototype.scrollIntoView = stub;
  try {
    return await run(stub);
  } finally {
    if (original) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', original);
    } else {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  }
}
