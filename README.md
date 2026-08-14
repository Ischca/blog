# Ischca Portfolio

A bilingual, single-page portfolio for Ischca, presented as a living manuscript.

## Stack

- Astro for static output and Japanese/English routing
- React for the scroll-driven manuscript and drawing interaction
- Three.js and Troika SDF text for physically integrated ink rendering
- WebGL and Canvas 2D for parchment relief, ink absorption, and ritual effects

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
GitHub Actions to [https://ischca.github.io/blog/](https://ischca.github.io/blog/).
The workflow supplies the public origin and `/blog` base path so canonical URLs,
social previews, fonts, and textures all resolve from the GitHub Pages project URL.
