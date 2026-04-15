#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION=$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' manifest.json | sed -E 's/.*"([^"]+)"$/\1/')
OUT_DIR="dist"
OUT_FILE="$OUT_DIR/noteful-v${VERSION}.zip"
STAGE="$OUT_DIR/stage"

FILES=(
  manifest.json
  background.js
  shared.js
  content.js
  content.css
  popup.html
  popup.js
  popup.css
  options.html
  options.js
  options.css
  icons/icon-16.png
  icons/icon-32.png
  icons/icon-48.png
  icons/icon-128.png
)

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "missing: $f" >&2
    exit 1
  fi
done

mkdir -p "$OUT_DIR"
rm -rf "$STAGE"
mkdir -p "$STAGE"

for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$f" "$STAGE/$f"
done

rm -f "$OUT_FILE"

if command -v zip >/dev/null 2>&1; then
  (cd "$STAGE" && zip -qr "../../$OUT_FILE" .)
else
  PY=python
  command -v "$PY" >/dev/null 2>&1 || PY=python3
  "$PY" - "$STAGE" "$OUT_FILE" <<'PYEOF'
import os, sys, zipfile
stage, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(stage):
        for name in files:
            full = os.path.join(root, name)
            arc = os.path.relpath(full, stage).replace(os.sep, '/')
            z.write(full, arc)
PYEOF
fi

rm -rf "$STAGE"

echo "built: $OUT_FILE"
echo "size:  $(wc -c < "$OUT_FILE") bytes"
