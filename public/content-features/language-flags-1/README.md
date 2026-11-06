# Everunfold Flags

`flags.woff2` is a flag-only subset of **Twemoji Mozilla**, built from the
[poppingmoon/twemoji-colr](https://github.com/poppingmoon/twemoji-colr) release
[v0.7.0+2026.09.09](https://github.com/poppingmoon/twemoji-colr/releases/tag/v0.7.0%2B2026.09.09).
It contains the 270 flags in Everunfold's checked-in Unicode flag catalog,
including regional, subdivision and general flag sequences. The font uses
COLRv0/CPAL color layers and is served from the same origin; no runtime CDN
or system emoji font installation is required.

## Attribution and license

The visual artwork is by the [Twemoji project](https://github.com/jdecked/twemoji)
and its contributors, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
The font-building code is copyright 2016–2018 Mozilla Foundation, under
[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0).
The upstream license text is included in [LICENSE.md](LICENSE.md), with
trailing whitespace removed.

Everunfold modified the font by subsetting its glyphs and layout tables,
converting it to WOFF2, and renaming the font family to **Everunfold Flags**.
Equivalent ligature rules with optional VS16 were added for the rainbow,
transgender and pirate flags, so browser shapers that consume the variation
selector still produce the original combined glyph. The flag artwork was
not redrawn. These changes do not imply endorsement
by Mozilla, Twemoji or the upstream maintainers.

## Rebuild

The compiled asset is checked in; normal Node.js builds need no Python
dependency. To intentionally regenerate it, download the pinned release's
`TwemojiMozilla.ttf` from the URL recorded in [source.json](source.json), then
run `tools/build-language-flag-font.py /path/to/TwemojiMozilla.ttf` with
FontTools 4.68.0 and Brotli available. The script rejects a source with a
different SHA256 and regenerates the WOFF2, provenance manifest and CSS
Unicode ranges from `src/core/i18n/data/flags.json`. Format the generated CSS
with the repository's Prettier command.

`source.json` records both input checksums and the generated asset checksum.
When adding Unicode flag sequences, regenerate and verify that every
sequence shapes to one colored glyph; do not only extend the CSS range.
Custom non-flag emoji and text retain the system fallback font. This font
is scoped to language flags, never to article text or the editor.
