#!/usr/bin/env python3
"""Volitelný pomocník: načte dvojice ve složce images/ a přepíše images.js.

Použití: python update_images.py
Není potřeba nic instalovat.
"""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parent
folder = root / "images"
supported = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"}
files = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in supported]
names = {p.name.casefold() for p in files}
complete = []
for path in sorted(files, key=lambda p: p.name.casefold()):
    if re.search(r"_blurred$", path.stem, flags=re.I):
        continue
    counterpart = f"{path.stem}_blurred{path.suffix}"
    if counterpart.casefold() in names:
        complete.append(path.name)
    else:
        print(f"Přeskakuji {path.name}: chybí {counterpart}")

out = "// Vygenerováno pomocí update_images.py.\nwindow.MPI_IMAGES = " + json.dumps(complete, ensure_ascii=False, indent=2) + ";\n"
(root / "images.js").write_text(out, encoding="utf-8")
print(f"Zapsáno {len(complete)} dvojic do images.js")
