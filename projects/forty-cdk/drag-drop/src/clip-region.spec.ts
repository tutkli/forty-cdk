import { findClippingAncestors } from './clip-region';

describe('findClippingAncestors', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  function build(html: string): HTMLElement {
    root.innerHTML = html;
    return root.querySelector<HTMLElement>('#host')!;
  }

  function ids(host: HTMLElement): string[] {
    return findClippingAncestors(host, window).map(
      ({ el, x, y }) => `${el.id}:${x ? 'x' : ''}${y ? 'y' : ''}`,
    );
  }

  it('collects every ancestor that clips, nearest first, with the axes it clips', () => {
    const host = build(`
      <div id="outer" style="overflow-x: hidden">
        <div id="plain">
          <div id="panel" style="overflow-x: auto; overflow-y: auto">
            <ul id="host"></ul>
          </div>
        </div>
      </div>
    `);
    expect(ids(host)).toEqual(['panel:xy', 'outer:x']);
  });

  it('does not count the host own overflow, nor body and html', () => {
    document.body.style.overflowY = 'hidden';
    try {
      const host = build(`<ul id="host" style="overflow-y: auto"></ul>`);
      expect(ids(host)).toEqual([]);
    } finally {
      document.body.style.overflowY = '';
    }
  });

  it('treats overflow clip as clipping', () => {
    const host = build(`<div id="panel" style="overflow-y: clip"><ul id="host"></ul></div>`);
    expect(ids(host)).toEqual(['panel:y']);
  });

  it('skips the static ancestors below an absolutely positioned host containing block', () => {
    const host = build(`
      <div id="block" style="position: relative; overflow-y: hidden">
        <div id="static" style="overflow-y: hidden">
          <ul id="host" style="position: absolute"></ul>
        </div>
      </div>
    `);
    expect(ids(host)).toEqual(['block:y']);
  });

  it('resumes clipping above the containing block of an absolutely positioned host', () => {
    const host = build(`
      <div id="outer" style="overflow-y: auto">
        <div id="block" style="position: relative">
          <div id="static" style="overflow-y: hidden">
            <ul id="host" style="position: absolute"></ul>
          </div>
        </div>
      </div>
    `);
    expect(ids(host)).toEqual(['outer:y']);
  });

  it('collects nothing above a fixed-position host', () => {
    const host = build(`
      <div id="panel" style="overflow-y: hidden">
        <ul id="host" style="position: fixed"></ul>
      </div>
    `);
    expect(ids(host)).toEqual([]);
  });

  it('stops at a fixed-position ancestor after counting it', () => {
    const host = build(`
      <div id="outer" style="overflow-y: hidden">
        <div id="dialog" style="position: fixed; overflow-y: auto">
          <ul id="host"></ul>
        </div>
      </div>
    `);
    expect(ids(host)).toEqual(['dialog:y']);
  });

  it('walks across an open shadow boundary', () => {
    const shadowHost = build(
      `<div id="panel" style="overflow-y: auto"><div id="host"></div></div>`,
    );
    const shadow = shadowHost.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<div id="inner" style="overflow-x: hidden"><ul id="list"></ul></div>`;
    const list = shadow.querySelector<HTMLElement>('#list')!;
    expect(ids(list)).toEqual(['inner:x', 'panel:y']);
  });
});
