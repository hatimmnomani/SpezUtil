# lud-font-probe

Drafts a `@spezutil/lud-codec` profile from a font file using HarfBuzz.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python probe.py FONT.ttf --id <id> --name "<Name>" --family "<css family>" > drafts/<id>.json
.venv/bin/python -m pytest -q
```

The output is a **draft**: `status: "draft"`, every sequence `confirmed: false`, and `unicode` is empty
where the meaning is unknown (the profile validator rejects that, on purpose). A person who types in
that font confirms each meaning; only then does it move to `packages/lud-codec/profiles/` with a corpus.
No font files are committed by this tool.
