from probe import KNOWN_MEANINGS, doubled_ligatures, draft_profile, missing_glyphs


def fake_shape(text):
    """ثث ligates anywhere; سس ligates only at the end of the string; ے and ہ have no glyph."""
    glyphs, i = [], 0
    while i < len(text):
        if text.startswith("ثث", i):
            glyphs.append("lig_peh")
            i += 2
            continue
        if text.startswith("سس", i) and i + 2 == len(text):
            glyphs.append("lig_yeh_barree")
            i += 2
            continue
        glyphs.append(".notdef" if text[i] in "ےہ" else "g" + text[i])
        i += 1
    return glyphs


def test_finds_doubled_ligatures_with_position():
    assert doubled_ligatures(fake_shape) == [
        {"letter": "ث", "position": "any"},
        {"letter": "س", "position": "final"},
    ]


def test_finds_missing_glyphs():
    assert missing_glyphs(fake_shape) == ["ے", "ہ"]


def test_draft_profile_is_draft_and_unconfirmed():
    p = draft_profile("x-font", "X Font", "X-FONT", "X.ttf", fake_shape)
    assert p["status"] == "draft"
    assert all(s["confirmed"] is False for s in p["sequences"])
    assert p["sequences"][0] == {
        "typed": "ثث",
        "unicode": KNOWN_MEANINGS["ثث"],
        "position": "any",
        "confirmed": False,
        "note": "meaning assumed from Al Kanz; confirm before shipping",
    }
    assert p["sequences"][1]["position"] == "final"
    assert p["missingGlyphs"] == ["ے", "ہ"]
    assert p["preserve"] == ["ـــــ"]


def test_unknown_meaning_is_left_blank():
    def shape(text):
        """جج ligates anywhere; every other letter shapes to its own glyph, one per character."""
        glyphs, i = [], 0
        while i < len(text):
            if text.startswith("جج", i):
                glyphs.append("lig")
                i += 2
                continue
            glyphs.append("g" + text[i])
            i += 1
        return glyphs

    p = draft_profile("y", "Y", "Y", "Y.ttf", shape)
    seq = next(s for s in p["sequences"] if s["typed"] == "جج")
    assert seq["unicode"] == ""
    assert seq["note"] == "meaning unknown; a person must fill in unicode"
