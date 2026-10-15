import { pressWithMouse } from 'forty-cdk/testing';

import { CheckboxSelectAllExample } from '../../../forty-cdk-docs/src/app/demos/checkbox/examples/select-all.example';
import { renderHost } from '../test-utils/render';

describe('checkbox docs Tri-state ("select all") example', () => {
  function mount() {
    const { queryAll, flush } = renderHost(CheckboxSelectAllExample);
    const [parent, mozzarella, mushrooms, pepperoni] = queryAll('[forCheckbox]');
    return { parent: parent!, children: [mozzarella!, mushrooms!, pepperoni!], flush };
  }

  it('reflects every child state on the parent aria-checked', async () => {
    const {
      parent,
      children: [mozzarella, mushrooms, pepperoni],
      flush,
    } = mount();
    await flush();
    expect(parent.getAttribute('aria-checked')).toBe('mixed');

    pressWithMouse(mushrooms!);
    pressWithMouse(pepperoni!);
    await flush();
    expect(parent.getAttribute('aria-checked')).toBe('true');

    pressWithMouse(mozzarella!);
    pressWithMouse(mushrooms!);
    pressWithMouse(pepperoni!);
    await flush();
    expect(parent.getAttribute('aria-checked')).toBe('false');

    pressWithMouse(pepperoni!);
    await flush();
    expect(parent.getAttribute('aria-checked')).toBe('mixed');
  });

  it('keeps the children in step after the parent selects or clears them all', async () => {
    const { parent, children, flush } = mount();
    await flush();

    pressWithMouse(parent);
    await flush();
    expect(children.map((child) => child.getAttribute('aria-checked'))).toEqual([
      'true',
      'true',
      'true',
    ]);

    pressWithMouse(children[0]!);
    await flush();
    expect(parent.getAttribute('aria-checked')).toBe('mixed');
  });
});
