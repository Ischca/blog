# Portfolio font subsets

`YujiSyuku-Portfolio.woff` is the primary manuscript face. Yuji Syuku was
designed by Kinuta Font Factory and has the irregular, brush-written Japanese
forms used by the grimoire's ink layer.

`NotoSerifJP-Portfolio.woff` and `NotoSerifJP-Portfolio-Semibold.woff` are the
regular-weight (400) and semibold-weight (600) reference faces for small labels
and glyph fallback. All three WOFF1 subsets contain the current Japanese and
English portfolio copy where supported, complete printable ASCII, and a small
punctuation safety set. Neither Japanese family has a true italic face; the GPU
renderer may apply a subtle geometric slant where the composition calls for it.

Yuji Syuku does not contain the diagonal arrow `↗` used by the current external
link label; that character should use the Noto fallback face.

## Yuji Syuku

- Upstream: [Kinuta Font Factory — Yuji](https://github.com/Kinutafontfactory/Yuji/tree/efec977b14b57c19eb85d468edcfbbad13139e67)
- Google Fonts mirror: [google/fonts — Yuji Syuku](https://github.com/google/fonts/tree/038b637da7b3fd956a4ed93ffc607c3d5e4ce172/ofl/yujisyuku)
- Source revision: `efec977b14b57c19eb85d468edcfbbad13139e67` via Google Fonts revision `038b637da7b3fd956a4ed93ffc607c3d5e4ce172`
- Source face: `YujiSyuku-Regular.ttf`, weight 400
- License: SIL Open Font License 1.1; see `OFL-YujiSyuku.txt`

## Noto Serif JP

- Upstream: [google/fonts — Noto Serif JP](https://github.com/google/fonts/tree/038b637da7b3fd956a4ed93ffc607c3d5e4ce172/ofl/notoserifjp)
- Source revision: `038b637da7b3fd956a4ed93ffc607c3d5e4ce172`
- Source face: `NotoSerifJP[wght].ttf`, instantiated at weights 400 and 600
- License: SIL Open Font License 1.1; see `OFL-NotoSerifJP.txt`

Rebuild after copy changes with:

```sh
FONTTOOLS_PY=/path/to/python-with-fonttools ./scripts/build-font-subset.sh
```

The script verifies pinned SHA-256 hashes before generating the artifacts and
prints unsupported requested glyphs for each face.
