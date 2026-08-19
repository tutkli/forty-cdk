import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import angularTs from 'shiki/langs/angular-ts.mjs';
import bash from 'shiki/langs/bash.mjs';
import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import githubLight from 'shiki/themes/github-light.mjs';

import { resolveFenceLanguage } from './doc-model.mjs';

const highlighter = createHighlighterCoreSync({
  themes: [githubLight, githubDark],
  langs: [angularTs, html, css, bash, markdown],
  engine: createJavaScriptRegexEngine({ forgiving: true }),
});

/**
 * One code sample as the two themes the site ships render it.
 *
 * `defaultColor: false` emits both palettes as custom properties on each span
 * rather than one set of colours, which is what lets a page switch theme
 * without re-highlighting anything — the same contract
 * `scripts/gen-example-sources.mjs` publishes its example sources under.
 *
 * @throws {Error} when the fence's language is not one the site publishes. The
 * compiler rejects those while it still knows the line they were written on, so
 * reaching this is a renderer running over a document that never compiled.
 */
export function highlightCode(code, lang) {
  const resolved = resolveFenceLanguage(lang);
  if (resolved === null) {
    throw new Error(`[gen-doc-model] no grammar is loaded for a ${JSON.stringify(lang)} fence`);
  }
  return highlighter.codeToHtml(code, {
    lang: resolved,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });
}
