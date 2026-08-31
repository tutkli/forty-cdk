import {
  pageProblems,
  pageSymbolOf,
  routesModule,
} from '../../../../../scripts/docs/doc-routes.mjs';
import { GUIDES } from './guides.generated';
import { compile } from './testing/compile';
import { GENERATED_ROUTES, PRIMITIVE_DOCS } from './testing/doc-corpus';

/**
 * The route generator ([#1811](https://github.com/tutkli/forty-cdk/issues/1811)).
 *
 * Two halves, stated separately. The emitter's rules are stated over slugs and
 * page sources the case writes itself, the way the coverage gate next door
 * states its own; the shipped table is then held to being exactly what those
 * rules produce for the corpus the library actually publishes.
 *
 * The pages themselves are not read here, for the reason `doc-corpus.ts`
 * records, and the rule needs no second home: `pnpm gen:doc-model` refuses to
 * emit a route for a page that is missing or misnamed, so the file this case
 * compares against does not exist unless every page passed.
 */

/** A floor rather than a count: adding a primitive is not a test failure. */
const PRIMITIVE_FLOOR = 40;

describe('the component a generated route names', () => {
  it('is derived from the slug, capitalising each hyphenated word', () => {
    expect(pageSymbolOf('accordion')).toBe('AccordionPage');
    expect(pageSymbolOf('otp-input')).toBe('OtpInputPage');
    expect(pageSymbolOf('visually-hidden')).toBe('VisuallyHiddenPage');
  });
});

describe('the emitted route table', () => {
  it('loads a primitive page through a literal specifier, which is what lets it split', () => {
    const source = routesModule({ primitiveSlugs: ['otp-input'], guideSlugs: [] });

    expect(source).toContain("path: 'otp-input',");
    expect(source).toContain(
      "import('../app/demos/otp-input/otp-input.page').then((m) => m.OtpInputPage)",
    );
  });

  it('routes every guide through the one guide page, handing it its slug as route data', () => {
    const source = routesModule({
      primitiveSlugs: [],
      guideSlugs: ['styling', 'date-adapters'],
    });

    expect(source).toContain("path: 'guides/styling',");
    expect(source).toContain("data: { slug: 'date-adapters' },");
    expect(source.match(/m\.GuidePage/g)).toHaveLength(2);
  });

  it('types the table as Routes, so a route the router would reject fails typecheck', () => {
    const source = routesModule({ primitiveSlugs: ['accordion'], guideSlugs: [] });

    expect(source).toContain("import type { Routes } from '@angular/router';");
    expect(source).toContain('export const DOC_ROUTES: Routes = [');
  });
});

describe('the page a generated route loads', () => {
  const page = (slug: string, symbol: string) => ({
    slug,
    source: `export class ${symbol} {}\n`,
  });

  it('is refused when its demo directory holds no page module, addressed by the path', () => {
    const [problem] = pageProblems([{ slug: 'time-picker', source: null }]);

    expect(problem?.path).toBe(
      'projects/forty-cdk-playground/src/app/demos/time-picker/time-picker.page.ts',
    );
    expect(problem?.message).toContain('ships no page component to render it');
    expect(problem?.message).toContain('write TimePickerPage here');
  });

  it('is refused when the page exports a differently-named class, naming what it found', () => {
    const [problem] = pageProblems([page('time-picker', 'TimePickerDemo')]);

    expect(problem?.message).toContain('imports "TimePickerPage"');
    expect(problem?.message).toContain('this module exports "TimePickerDemo"');
  });

  it('passes once the page exports the component the route names', () => {
    expect(pageProblems([page('time-picker', 'TimePickerPage')])).toEqual([]);
  });
});

describe('the site as it stands', () => {
  /**
   * A string equality rather than a set comparison, and the stronger claim for
   * it: the emitter and the shipped file agree on which documents get a route,
   * in what order, and through which specifier. A generator that stopped writing
   * the file, or wrote it from one half of the corpus, fails here — and so does
   * an emitter changed without the tree being regenerated.
   */
  it('ships the route table the emitter produces for the published corpus', () => {
    const published = PRIMITIVE_DOCS.map(compile).filter(
      (document) => document.meta?.group !== 'none',
    );

    expect(published.length).toBeGreaterThan(PRIMITIVE_FLOOR);
    expect(GENERATED_ROUTES).toBe(
      routesModule({
        primitiveSlugs: published.map((document) => document.slug),
        guideSlugs: GUIDES.map((guide) => guide.slug),
      }),
    );
  });
});
