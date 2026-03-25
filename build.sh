#!/bin/bash
# Build script for UroStudyHub — produces obfuscated/minified version
# No Node.js required — uses Python only.
#
# Usage:
#   ./build.sh           (Python minification — no dependencies)
#   ./build.sh --full    (Babel + Terser — requires Node.js: brew install node)
#
# Output: UroStudyHub.min.html

set -e
cd "$(dirname "$0")"

SRC="UroStudyHub.html"
OUT="UroStudyHub.min.html"

if [ ! -f "$SRC" ]; then
  echo "Error: $SRC not found"
  exit 1
fi

if [ "$1" = "--full" ]; then
  if ! command -v npx &> /dev/null; then
    echo "Error: --full requires Node.js. Install with: brew install node"
    echo "Then: npm install -g @babel/cli @babel/core @babel/preset-react terser"
    exit 1
  fi

  echo "Building with full obfuscation (Babel + Terser)..."

  # Extract JSX
  sed -n '/<script type="text\/babel"/,/<\/script>/p' "$SRC" | sed '1d;$d' > /tmp/uro_build.jsx

  # Compile JSX -> JS, then minify with variable mangling
  npx babel --presets @babel/preset-react /tmp/uro_build.jsx -o /tmp/uro_compiled.js 2>/dev/null
  npx terser /tmp/uro_compiled.js --compress "passes=2" --mangle -o /tmp/uro_min.js 2>/dev/null

  # Get head (before babel script), removing babel CDN tag
  BABEL_LINE=$(grep -n '<script type="text/babel"' "$SRC" | head -1 | cut -d: -f1)
  head -n $((BABEL_LINE - 1)) "$SRC" | grep -v 'babel.*\.js' > "$OUT"

  # Insert compiled script
  echo '<script>' >> "$OUT"
  cat /tmp/uro_min.js >> "$OUT"
  echo -e '\n</script>' >> "$OUT"

  # Get tail (after closing script tag)
  BABEL_END=$((BABEL_LINE + $(tail -n +"$BABEL_LINE" "$SRC" | grep -n '</script>' | head -1 | cut -d: -f1)))
  tail -n +"$BABEL_END" "$SRC" >> "$OUT"

  rm -f /tmp/uro_build.jsx /tmp/uro_compiled.js /tmp/uro_min.js

else
  echo "Building with Python minification..."
  python3 << 'PYEOF'
import re

with open("UroStudyHub.html", "r") as f:
    html = f.read()

# Find script block
m = re.search(r'(<script type="text/babel"[^>]*>)(.*?)(</script>)', html, re.DOTALL)
if not m:
    print("Error: Could not find babel script block")
    exit(1)

jsx = m.group(2)

# Strip single-line comments (preserve URLs with ://)
jsx = re.sub(r'(?<!:)//(?!/)[^\n]*', '', jsx)

# Strip multi-line comments
jsx = re.sub(r'/\*.*?\*/', '', jsx, flags=re.DOTALL)

# Strip section header decorations
jsx = re.sub(r'[═]{3,}[^\n]*', '', jsx)

# Collapse multiple blank lines
jsx = re.sub(r'\n\s*\n\s*\n', '\n', jsx)

# Reduce indentation (halve it)
lines = jsx.split('\n')
out = []
for line in lines:
    stripped = line.lstrip()
    if stripped:
        indent = len(line) - len(stripped)
        out.append(' ' * (indent // 2) + stripped)
    elif out and out[-1] != '':
        out.append('')
jsx_min = '\n'.join(out)

# Minify CSS
css_m = re.search(r'(<style>)(.*?)(</style>)', html, re.DOTALL)
if css_m:
    css = css_m.group(2)
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
    css = re.sub(r'\s+', ' ', css)
    css = css.replace(' { ', '{').replace(' } ', '}').replace('; ', ';')
    html = html[:css_m.start(2)] + css + html[css_m.end(2):]
    m = re.search(r'(<script type="text/babel"[^>]*>)(.*?)(</script>)', html, re.DOTALL)

result = html[:m.start(2)] + '\n' + jsx_min + '\n' + html[m.end(2):]

with open("UroStudyHub.min.html", "w") as f:
    f.write(result)

orig = len(html)
mini = len(result)
print(f"Done! {orig:,} -> {mini:,} bytes ({(1 - mini/orig)*100:.0f}% smaller)")
PYEOF
fi

ORIG_SIZE=$(wc -c < "$SRC" | tr -d ' ')
MIN_SIZE=$(wc -c < "$OUT" | tr -d ' ')
echo ""
echo "Output: $OUT"
echo "  Original: $ORIG_SIZE bytes"
echo "  Minified: $MIN_SIZE bytes"
echo ""
echo "Test it: python3 -m http.server 2023"
echo "Then open: http://localhost:2023/$OUT"
