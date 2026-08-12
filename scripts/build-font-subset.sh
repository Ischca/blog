#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/public/fonts"
OUTPUT_MANUSCRIPT_FONT="$OUTPUT_DIR/YujiSyuku-Portfolio.woff"
OUTPUT_NOTO_REGULAR_FONT="$OUTPUT_DIR/NotoSerifJP-Portfolio.woff"
OUTPUT_NOTO_SEMIBOLD_FONT="$OUTPUT_DIR/NotoSerifJP-Portfolio-Semibold.woff"

# Pin the upstream revision so rebuilding the portfolio cannot silently change
# the shipped glyph outlines.
GOOGLE_FONTS_REVISION="038b637da7b3fd956a4ed93ffc607c3d5e4ce172"
NOTO_FONT_URL="https://raw.githubusercontent.com/google/fonts/$GOOGLE_FONTS_REVISION/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf"
NOTO_FONT_SHA256="2fd527ba12b6a44ec30d796d633360da0aeba6c5d4af1304ce12bb4dc15a7dfc"
NOTO_LICENSE_URL="https://raw.githubusercontent.com/google/fonts/$GOOGLE_FONTS_REVISION/ofl/notoserifjp/OFL.txt"
NOTO_LICENSE_SHA256="5e0da210fb04058a8c0087985d2d456b931c2579811a49655721d3cf0c36b6d6"
YUJI_FONT_URL="https://raw.githubusercontent.com/google/fonts/$GOOGLE_FONTS_REVISION/ofl/yujisyuku/YujiSyuku-Regular.ttf"
YUJI_FONT_SHA256="82728ebafc8c97391e2dab633414a806f344b8e4e2227d307179f07b548fca61"
YUJI_LICENSE_URL="https://raw.githubusercontent.com/google/fonts/$GOOGLE_FONTS_REVISION/ofl/yujisyuku/OFL.txt"
YUJI_LICENSE_SHA256="ef7c85c72ae94381c8bc4832ae4e6fbabdeafa2bb8a31313cd75dce95a690256"

FONTTOOLS_PY="${FONTTOOLS_PY:-python3}"

if ! "$FONTTOOLS_PY" -c "import fontTools" >/dev/null 2>&1; then
  echo "fontTools is required. Set FONTTOOLS_PY to a Python executable that provides it." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ischca-font-subset.XXXXXX")"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

SOURCE_NOTO_FONT="$TMP_DIR/NotoSerifJP-wght.ttf"
SOURCE_NOTO_LICENSE="$TMP_DIR/OFL-NotoSerifJP.txt"
SOURCE_YUJI_FONT="$TMP_DIR/YujiSyuku-Regular.ttf"
SOURCE_YUJI_LICENSE="$TMP_DIR/OFL-YujiSyuku.txt"
STATIC_NOTO_REGULAR_FONT="$TMP_DIR/NotoSerifJP-400.ttf"
STATIC_NOTO_SEMIBOLD_FONT="$TMP_DIR/NotoSerifJP-600.ttf"
CHARACTERS_FILE="$TMP_DIR/characters.txt"
SUBSET_MANUSCRIPT_FONT="$TMP_DIR/YujiSyuku-Portfolio.woff"
SUBSET_NOTO_REGULAR_FONT="$TMP_DIR/NotoSerifJP-Portfolio.woff"
SUBSET_NOTO_SEMIBOLD_FONT="$TMP_DIR/NotoSerifJP-Portfolio-Semibold.woff"

curl -L --fail --silent --show-error "$NOTO_FONT_URL" -o "$SOURCE_NOTO_FONT"
curl -L --fail --silent --show-error "$NOTO_LICENSE_URL" -o "$SOURCE_NOTO_LICENSE"
curl -L --fail --silent --show-error "$YUJI_FONT_URL" -o "$SOURCE_YUJI_FONT"
curl -L --fail --silent --show-error "$YUJI_LICENSE_URL" -o "$SOURCE_YUJI_LICENSE"

verify_sha256() {
  local expected="$1"
  local file="$2"
  local actual
  actual="$(shasum -a 256 "$file" | awk '{print $1}')"
  if [[ "$actual" != "$expected" ]]; then
    echo "SHA-256 mismatch for $file: expected $expected, got $actual" >&2
    exit 1
  fi
}

verify_sha256 "$NOTO_FONT_SHA256" "$SOURCE_NOTO_FONT"
verify_sha256 "$NOTO_LICENSE_SHA256" "$SOURCE_NOTO_LICENSE"
verify_sha256 "$YUJI_FONT_SHA256" "$SOURCE_YUJI_FONT"
verify_sha256 "$YUJI_LICENSE_SHA256" "$SOURCE_YUJI_LICENSE"

# Collect every current Japanese/English codepoint from the content and canvas
# renderer, then add a deliberately small punctuation safety set. ASCII is
# included in full so code, URLs, and future short labels keep rendering.
"$FONTTOOLS_PY" - "$CHARACTERS_FILE" \
  "$PROJECT_ROOT/src/content/site.ts" \
  "$PROJECT_ROOT/src/components/CanvasGrimoireExperience.tsx" <<'PY'
from pathlib import Path
import sys

output = Path(sys.argv[1])
sources = [Path(value) for value in sys.argv[2:]]

characters = {chr(codepoint) for codepoint in range(0x20, 0x7F)}
characters.update(
    "\u00A0·×–—‘’“”…•←↑→↓↖↗↘↙"
    "\u3000、。・ー「」『』【】（）［］〈〉《》〔〕！？"
    "○●◇◆□■△▲▽▼※〒〆々〻〜～\uFFFD"
)

for source in sources:
    characters.update(source.read_text(encoding="utf-8"))

# Newlines and source-code indentation are not glyphs. Keep ordinary and
# ideographic spaces, which are intentionally included above.
characters = {
    character
    for character in characters
    if not character.isspace() or character in {" ", "\u00A0", "\u3000"}
}

output.write_text("".join(sorted(characters, key=ord)), encoding="utf-8")
print(f"Collected {len(characters)} Unicode codepoints")
PY

# Yuji Syuku is the grimoire's manuscript face. Noto Serif JP remains available
# in two weights for small labels and as a fallback for glyphs Yuji does not
# include. Neither Japanese family has a true italic face; any very slight
# manuscript slant is applied geometrically by the GPU renderer.
"$FONTTOOLS_PY" -m fontTools.varLib.instancer \
  "$SOURCE_NOTO_FONT" wght=400 --static --update-name-table --no-recalc-timestamp -o "$STATIC_NOTO_REGULAR_FONT"

"$FONTTOOLS_PY" -m fontTools.varLib.instancer \
  "$SOURCE_NOTO_FONT" wght=600 --static --update-name-table --no-recalc-timestamp -o "$STATIC_NOTO_SEMIBOLD_FONT"

subset_face() {
  local input_font="$1"
  local output_font="$2"

  "$FONTTOOLS_PY" -m fontTools.subset "$input_font" \
    --text-file="$CHARACTERS_FILE" \
    --output-file="$output_font" \
    --flavor=woff \
    --layout-features='*' \
    --layout-scripts='*' \
    --name-IDs='*' \
    --name-legacy \
    --name-languages='*' \
    --notdef-glyph \
    --notdef-outline \
    --recommended-glyphs \
    --symbol-cmap \
    --legacy-cmap \
    --no-hinting \
    --drop-tables+=DSIG
}

subset_face "$SOURCE_YUJI_FONT" "$SUBSET_MANUSCRIPT_FONT"
subset_face "$STATIC_NOTO_REGULAR_FONT" "$SUBSET_NOTO_REGULAR_FONT"
subset_face "$STATIC_NOTO_SEMIBOLD_FONT" "$SUBSET_NOTO_SEMIBOLD_FONT"

mkdir -p "$OUTPUT_DIR"
install -m 0644 "$SUBSET_MANUSCRIPT_FONT" "$OUTPUT_MANUSCRIPT_FONT"
install -m 0644 "$SUBSET_NOTO_REGULAR_FONT" "$OUTPUT_NOTO_REGULAR_FONT"
install -m 0644 "$SUBSET_NOTO_SEMIBOLD_FONT" "$OUTPUT_NOTO_SEMIBOLD_FONT"
install -m 0644 "$SOURCE_NOTO_LICENSE" "$OUTPUT_DIR/OFL-NotoSerifJP.txt"
install -m 0644 "$SOURCE_YUJI_LICENSE" "$OUTPUT_DIR/OFL-YujiSyuku.txt"

"$FONTTOOLS_PY" - \
  "$OUTPUT_MANUSCRIPT_FONT" \
  "$OUTPUT_NOTO_REGULAR_FONT" \
  "$OUTPUT_NOTO_SEMIBOLD_FONT" \
  "$CHARACTERS_FILE" <<'PY'
from fontTools.ttLib import TTFont
from pathlib import Path
import sys

characters = set(Path(sys.argv[-1]).read_text(encoding="utf-8"))

for value in sys.argv[1:-1]:
    path = Path(value)
    font = TTFont(path)
    glyph_count = len(font.getGlyphOrder())
    codepoints = {
        codepoint
        for table in font["cmap"].tables
        if table.isUnicode()
        for codepoint in table.cmap
    }
    unicode_count = len(codepoints)
    weight = font["OS/2"].usWeightClass
    missing = "".join(sorted((c for c in characters if ord(c) not in codepoints), key=ord))
    print(
        f"Wrote {path} ({path.stat().st_size} bytes, weight {weight}, "
        f"{glyph_count} glyphs, {unicode_count} Unicode mappings, "
        f"missing requested {missing!r})"
    )
PY
