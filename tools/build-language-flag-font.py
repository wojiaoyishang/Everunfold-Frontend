"""Rebuild the checked-in flag subset with FontTools (development tool only)."""

from __future__ import annotations

import hashlib
import json
import sys
from copy import copy
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE_SHA256 = "1a04f7bd9bd74434797e61b48b6e00f07740dd98458d9d6f8927a039bc17688c"
SOURCE_URL = (
    "https://github.com/poppingmoon/twemoji-colr/releases/download/"
    "v0.7.0%2B2026.09.09/TwemojiMozilla.ttf"
)


def ranges(points: list[int]) -> str:
    groups: list[str] = []
    first = last = points[0]
    for point in [*points[1:], -1]:
        if point == last + 1:
            last = point
            continue
        groups.append(f"U+{first:X}" if first == last else f"U+{first:X}-{last:X}")
        first = last = point
    return ", ".join(groups)


def main() -> None:
    source = Path(sys.argv[1])
    if hashlib.sha256(source.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise SystemExit("Unexpected upstream font; review the source pin before rebuilding")
    data = ROOT / "src/core/i18n/data/flags.json"
    flags = json.loads(data.read_text())
    text = "".join(item["emoji"] for item in flags)
    points = sorted(set(map(ord, text)))
    font = TTFont(source, recalcTimestamp=False)
    if font["COLR"].version != 0:
        raise SystemExit("Expected the COLRv0 font")
    options = subset.Options()
    options.layout_features = ["*"]
    options.drop_tables += ["FFTM"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    # Some browser shapers consume VS16 before GSUB. Retain both spellings so
    # rainbow/transgender/pirate flags use the same colored ligature in either case.
    variation = font.getBestCmap()[0xFE0F]
    for lookup in font["GSUB"].table.LookupList.Lookup:
        if lookup.LookupType != 4:
            continue
        for table in lookup.SubTable:
            for ligatures in table.ligatures.values():
                for ligature in list(ligatures):
                    if variation not in ligature.Component:
                        continue
                    alias = copy(ligature)
                    alias.Component = [part for part in alias.Component if part != variation]
                    alias.CompCount = len(alias.Component) + 1
                    ligatures.append(alias)
                ligatures.sort(key=lambda item: len(item.Component), reverse=True)
    names = {
        1: "Everunfold Flags",
        2: "Regular",
        3: "Everunfold Flags; TwemojiMozilla 0.7.0+2026.09.09 subset",
        4: "Everunfold Flags",
        5: "Version 1.000; TwemojiMozilla 0.7.0+2026.09.09 subset",
        6: "EverunfoldFlags-Regular",
        13: "Twemoji artwork CC BY 4.0; font code Apache 2.0. See bundled LICENSE.md.",
        14: "https://creativecommons.org/licenses/by/4.0/",
    }
    font["name"].names = [n for n in font["name"].names if n.nameID not in names]
    for name_id, value in names.items():
        font["name"].setName(value, name_id, 3, 1, 0x409)
        font["name"].setName(value, name_id, 1, 0, 0)
    target = ROOT / "public/content-features/language-flags-1"
    target.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    output = target / "flags.woff2"
    font.save(output)
    metadata = {
        "family": "Everunfold Flags",
        "upstream_url": SOURCE_URL,
        "upstream_sha256": SOURCE_SHA256,
        "upstream_version": "0.7.0+2026.09.09",
        "unicode_data_sha256": hashlib.sha256(data.read_bytes()).hexdigest(),
        "flag_count": len(flags),
        "color_format": "COLRv0",
        "shaping": "VS16-preserving and VS16-consuming ligature spellings",
        "unicode_range": ranges(points),
        "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "bytes": output.stat().st_size,
    }
    (target / "source.json").write_text(json.dumps(metadata, indent=2) + "\n")
    css = f"""/* Twemoji CC BY 4.0; subset/credits: /content-features/language-flags-1/README.md */
@font-face {{
  font-family: "Everunfold Flags";
  src: url("/content-features/language-flags-1/flags.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  unicode-range: {metadata["unicode_range"]};
}}
:root {{
  --language-flag-font:
    "Everunfold Flags", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
}}
"""
    (ROOT / "src/themes/argon/styles/language-flags.css").write_text(css)
    print(f"Built {len(flags)} flags: {metadata['bytes']} bytes ({metadata['color_format']})")


if __name__ == "__main__":
    main()
