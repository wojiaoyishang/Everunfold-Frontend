"""Render the handbook's JSON flow diagrams as deterministic SVG files."""

import argparse
import json
import re
import unicodedata
from dataclasses import dataclass
from html import escape
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
OUTPUT = SOURCE.parent / "source" / "_static" / "diagrams"
WIDTH = 760
MARGIN = 20
FONTS = "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, sans-serif"


def text_width(value: str) -> float:
    """Estimate width in em, allowing for CJK glyphs and wider Latin capitals."""
    return sum(1.0 if unicodedata.east_asian_width(char) in "WF" else 0.67 for char in value)


def wrap(value: str, limit: float) -> list[str]:
    lines = []
    for paragraph in value.splitlines():
        line = ""
        for token in re.findall(r"[A-Za-z0-9_./:-]+|.", paragraph):
            pieces = list(token) if text_width(token) > limit else [token]
            for piece in pieces:
                if line and text_width(line + piece) > limit:
                    lines.append(line.rstrip())
                    line = ""
                if line or not piece.isspace():
                    line += piece
        lines.append(line.rstrip())
    return lines


@dataclass
class Card:
    title: list[str]
    detail: list[str]

    @classmethod
    def from_spec(cls, spec: dict, width: int, numbered: bool) -> "Card":
        text_width_px = width - (72 if numbered else 36)
        return cls(
            wrap(spec["title"], text_width_px / 21),
            wrap(spec["detail"], text_width_px / 17),
        )

    @property
    def height(self) -> int:
        return 37 + 26 * len(self.title) + 24 * len(self.detail)


def label(
    x: int, y: int, lines: list[str], style: str, line_height: int, anchor: str = "start"
) -> str:
    return "".join(
        f'<text x="{x}" y="{y + i * line_height}" class="{style}" '
        f'text-anchor="{anchor}">{escape(line)}</text>'
        for i, line in enumerate(lines)
    )


def card_svg(card: Card, x: int, y: int, width: int, number: int | None) -> str:
    style = "step" if number else "branch"
    elements = [
        f'<rect x="{x}" y="{y}" width="{width}" height="{card.height}" rx="10" class="{style}"/>'
    ]
    offset = 18
    if number:
        elements.append(f'<circle cx="{x + 33}" cy="{y + 30}" r="15" class="badge"/>')
        elements.append(label(x + 33, y + 35, [str(number)], "number", 0, "middle"))
        offset = 59
    elements.append(label(x + offset, y + 36, card.title, "title", 26))
    detail_y = y + 38 + 26 * len(card.title)
    elements.append(label(x + offset, detail_y, card.detail, "detail", 24))
    return "".join(elements)


def arrow(x1: int, y1: int, x2: int, y2: int) -> str:
    return f'<path d="M {x1} {y1} L {x2} {y2}" class="arrow" marker-end="url(#head)"/>'


def render(data: dict) -> str:
    specs = data["steps"]
    branch_specs = data.get("branches", [])
    branches = {branch["from"]: branch for branch in branch_specs}
    transitions = data.get("transitions", [""] * (len(specs) - 1))
    lanes = data.get("layout") == "lanes"
    if len(specs) < 2 or len(transitions) != len(specs) - 1:
        raise ValueError("expected at least two steps and one transition per gap")
    if len(branches) != len(branch_specs) or any(not 1 <= step <= len(specs) for step in branches):
        raise ValueError("branches must reference distinct existing steps")
    if lanes and (branches or any(transitions)):
        raise ValueError("parallel lanes cannot contain arrows or branches")

    main_width = 412 if branches else WIDTH - 2 * MARGIN
    branch_x = 485
    branch_width = WIDTH - MARGIN - branch_x
    arrow_x = MARGIN + main_width // 2
    y = MARGIN
    elements = []
    for step, spec in enumerate(specs, 1):
        card = Card.from_spec(spec, main_width, numbered=True)
        elements.append(card_svg(card, MARGIN, y, main_width, step))
        bottom = y + card.height
        branch_bottom = bottom
        if step in branches:
            branch = Card.from_spec(branches[step], branch_width, numbered=False)
            branch_y = y + max(0, (card.height - branch.height) // 2)
            anchor_y = branch_y + min(card.height, branch.height) // 2
            elements.append(arrow(MARGIN + main_width + 4, anchor_y, branch_x - 7, anchor_y))
            elements.append(card_svg(branch, branch_x, branch_y, branch_width, None))
            branch_bottom = branch_y + branch.height
        if step == len(specs):
            y = max(bottom, branch_bottom)
            continue
        transition = transitions[step - 1]
        caption = wrap(transition, (main_width // 2 - 24) / 15)
        gap = 12 if lanes else max(40, 20 + 19 * len(caption))
        y = max(bottom + gap, branch_bottom + 12)
        if not lanes:
            elements.append(arrow(arrow_x, bottom + 5, arrow_x, y - 8))
            elements.append(label(arrow_x + 14, bottom + 22, caption, "transition", 19))

    height = y + MARGIN
    body = "\n".join(elements)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {height}"
     width="{WIDTH}" height="{height}">
  <defs>
    <marker id="head" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 9 5 L 0 10 Z" fill="#526a8c"/>
    </marker>
  </defs>
  <style>
    text {{font-family: {FONTS}}}
    .step {{fill: #fff; stroke: #b4c8e1; stroke-width: 1.4}}
    .branch {{fill: #fff8ed; stroke: #d6b289; stroke-width: 1.4}}
    .badge {{fill: #e1edff}}
    .number {{fill: #184485; font-size: 14px; font-weight: 700}}
    .title {{fill: #142747; font-size: 21px; font-weight: 700}}
    .detail {{fill: #344563; font-size: 17px}}
    .transition {{fill: #365b86; font-size: 15px}}
    .arrow {{fill: none; stroke: #526a8c; stroke-width: 1.6}}
  </style>
  <rect x="0.5" y="0.5" width="{WIDTH - 1}" height="{height - 1}"
        rx="15" fill="#f4f7fc" stroke="#d6e1f0"/>
{body}
</svg>
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="check published SVGs for drift")
    args = parser.parse_args()
    if not args.check:
        OUTPUT.mkdir(parents=True, exist_ok=True)
    expected = set()
    outdated = []
    for path in sorted(SOURCE.glob("*.json")):
        artwork = render(json.loads(path.read_text(encoding="utf-8")))
        target = OUTPUT / f"{path.stem}.svg"
        expected.add(target)
        if args.check:
            if not target.is_file() or target.read_text(encoding="utf-8") != artwork:
                outdated.append(target.name)
        else:
            target.write_text(artwork, encoding="utf-8", newline="\n")
    if args.check:
        outdated.extend(path.name for path in OUTPUT.glob("*.svg") if path not in expected)
    if outdated:
        parser.exit(
            1,
            f"Stale diagram assets (run docs/diagrams/render.py): {', '.join(sorted(outdated))}\n",
        )


if __name__ == "__main__":
    main()
