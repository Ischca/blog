# Ischca Portfolio

A bilingual portfolio for Ischca in two editions:

- `/ja/` and `/en/` — the interactive manuscript ("grimoire"). Its folios are the
  title page with the catalogue of products, the products, services,
  experience, and contact.
- `/ja/profile/` and `/en/profile/` — the full HTML edition with every product,
  skill, case study, and role. It loads instantly, prints cleanly, and is the
  page search engines and readers in a hurry should land on.

## Content

All portfolio facts live in `src/content/site.ts`, which both editions read:
products, skills with where they were used, selected work, career, and the
public profile links. Update `CONTENT_UPDATED` in the same file when the content
changes. The grimoire keeps only its interface copy in the component.

Fonts are subset to the characters the site uses. After changing copy, rebuild
them (see `public/fonts/README.md`):

```sh
FONTTOOLS_PY=/path/to/python-with-fonttools ./scripts/build-font-subset.sh
```

## Stack

- Astro for static output and Japanese/English routing
- React for the scroll-driven manuscript and drawing interaction
- Three.js and Troika SDF text for physically integrated ink rendering
- WebGL and Canvas 2D for parchment relief, ink absorption, and ritual effects;
  lines whose SDF glyphs are still being generated are written with Canvas 2D,
  so a first visit never shows an empty folio

## Local development

```sh
pnpm install
pnpm dev
```

Open `/ja/` or `/en/`. The root page chooses a language from the browser locale.
Scroll to move through the manuscript. Drawing a circle on the parchment begins
the optional sigil interaction; all portfolio information remains available
without completing it. Completing the traced octagram turns the folio over into
`VERSO`, an interactive exploded view of the actual surface, relief, ink, SDF
type, scroll state, gesture trace, and source structure. Drag the space to orbit,
drag an individual layer to move it, and use `RETURN TO SURFACE` to reassemble
the manuscript.

## Checks

```sh
pnpm check
pnpm build
```

The production output is written to `dist/`. Pushes to `master` are deployed by
GitHub Actions to [https://ischca.dev/](https://ischca.dev/) through GitHub Pages.
The workflow supplies the public origin and root base path so canonical URLs,
social previews, fonts, and textures all resolve from the custom domain.
