"""Draft a @spezutil/lud-codec profile from a font file.

Shapes every doubled Arabic letter with HarfBuzz and reports which ones the font draws as a single
glyph, and which Unicode Urdu / Lisan ud-Dawat letters it has no glyph for. The output is a DRAFT:
the font says *that* a pair ligates, never *what* it means. A person must confirm every sequence
before the profile ships.

    python probe.py FONT.ttf --id kanz-al-lulu --name "Kanz al-Lulu" --family "Kanz-al-Lulu" > drafts/kanz-al-lulu.json
"""
import argparse
import json
import sys

ARABIC_LETTERS = [chr(c) for c in range(0x0621, 0x064B) if c != 0x0640]
URDU_LUD_LETTERS = "ٹڈڑںےہھۓیکگپچژ"

# The user-confirmed Al Kanz meanings (27 Sep 2026). Used only as a *suggestion* for other fonts.
KNOWN_MEANINGS = {
    "ثث": "پ", "كك": "گ", "طط": "ٹ", "سس": "ے", "ظظ": "ه", "حح": "چ", "صص": "ڈ", "ضض": "ڑ",
}


def make_shaper(font_path):
    import uharfbuzz as hb

    font = hb.Font(hb.Face(hb.Blob.from_file_path(font_path)))

    def shape(text):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(font, buf)
        return [font.glyph_to_string(info.codepoint) for info in buf.glyph_infos]

    return shape


def doubled_ligatures(shape):
    """Letters whose doubled form shapes to one glyph fewer than expected. Medial → 'any', final-only → 'final'."""
    found = []
    for x in ARABIC_LETTERS:
        medial = len(shape("ب" + x + x + "ب")) == len(shape("ب" + x + "ب"))
        final = len(shape("ب" + x + x)) == len(shape("ب" + x))
        if medial or final:
            found.append({"letter": x, "position": "any" if medial else "final"})
    return found


def missing_glyphs(shape):
    return [c for c in URDU_LUD_LETTERS if ".notdef" in shape(c)]


def draft_profile(font_id, display_name, font_family, font_file, shape):
    sequences = []
    for lig in doubled_ligatures(shape):
        typed = lig["letter"] * 2
        known = KNOWN_MEANINGS.get(typed, "")
        sequences.append({
            "typed": typed,
            "unicode": known,
            "position": lig["position"],
            "confirmed": False,
            "note": "meaning assumed from Al Kanz; confirm before shipping"
            if known else "meaning unknown; a person must fill in unicode",
        })
    return {
        "id": font_id,
        "displayName": display_name,
        "status": "draft",
        "fontFamily": font_family,
        "fontFiles": {"ttf": font_file},
        "sequences": sequences,
        "missingGlyphs": missing_glyphs(shape),
        "preserve": ["ـــــ"],
        "fallbackFont": "Noto Naskh Arabic",
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("font")
    ap.add_argument("--id", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--family", required=True)
    args = ap.parse_args(argv)
    shape = make_shaper(args.font)
    profile = draft_profile(args.id, args.name, args.family, args.font.rsplit("/", 1)[-1], shape)
    json.dump(profile, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    print(f"brace glyphs: {shape('}')} {shape('{')} (check by eye whether they draw as noon ghunna)", file=sys.stderr)


if __name__ == "__main__":
    main()
