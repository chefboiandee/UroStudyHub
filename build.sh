#!/bin/bash
# Build script for UroStudyHub — compiles JSX, minifies, and obfuscates
# Produces UroStudyHub.min.html ready for deployment (GitHub Pages, Netlify, etc.)
#
# Prerequisites (one-time):
#   npm install -g @babel/cli @babel/preset-react terser
#
# Usage:
#   chmod +x build.sh
#   ./build.sh

set -e

INPUT="UroStudyHub.html"
OUTPUT="UroStudyHub.min.html"
TEMP_JSX="/tmp/uro_extract.jsx"
TEMP_JS="/tmp/uro_compiled.js"
TEMP_MIN="/tmp/uro_minified.js"

echo "Building $OUTPUT from $INPUT..."

# 1. Extract the script content between <script type="text/babel"...> and </script>
echo "  Extracting JSX..."
sed -n '/<script type="text\/babel"/,/<\/script>/p' "$INPUT" | \
  sed '1d;$d' > "$TEMP_JSX"

# 2. Compile JSX to plain JS using Babel
echo "  Compiling JSX -> JS..."
npx babel --presets @babel/preset-react "$TEMP_JSX" -o "$TEMP_JS" 2>/dev/null

# 3. Minify and mangle with terser
echo "  Minifying..."
npx terser "$TEMP_JS" \
  --compress "passes=2,drop_console=false" \
  --mangle "toplevel=false" \
  --output "$TEMP_MIN" 2>/dev/null

# 4. Build the output HTML
echo "  Assembling $OUTPUT..."

# Get everything before the babel script tag
sed -n '1,/<script type="text\/babel"/p' "$INPUT" | \
  sed '$d' > "$OUTPUT"

# Remove the Babel standalone CDN scripts (no longer needed)
# Replace babel script tag with regular script tag + minified code
cat >> "$OUTPUT" << 'SCRIPT_OPEN'
<script type="module">
SCRIPT_OPEN

cat "$TEMP_MIN" >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "</script>" >> "$OUTPUT"

# Get everything after the closing </script> of the babel block
# Find the line number of the closing script tag after the babel block
BABEL_START=$(grep -n '<script type="text/babel"' "$INPUT" | head -1 | cut -d: -f1)
BABEL_END=$(tail -n +"$BABEL_START" "$INPUT" | grep -n '</script>' | head -1 | cut -d: -f1)
AFTER_LINE=$((BABEL_START + BABEL_END))
tail -n +"$AFTER_LINE" "$INPUT" >> "$OUTPUT"

# Remove Babel CDN script tags from the output (they're no longer needed)
# Keep React and ReactDOM CDN scripts
sed -i '' '/@babel\/standalone/d' "$OUTPUT"
sed -i '' '/babel\.min\.js/d' "$OUTPUT"

# 5. Cleanup
rm -f "$TEMP_JSX" "$TEMP_JS" "$TEMP_MIN"

# Report sizes
ORIG_SIZE=$(wc -c < "$INPUT" | tr -d ' ')
MIN_SIZE=$(wc -c < "$OUTPUT" | tr -d ' ')
RATIO=$((MIN_SIZE * 100 / ORIG_SIZE))
echo ""
echo "Done!"
echo "  Original: $(echo "$ORIG_SIZE" | awk '{printf "%'\''d", $1}') bytes"
echo "  Minified: $(echo "$MIN_SIZE" | awk '{printf "%'\''d", $1}') bytes (${RATIO}%)"
echo "  Output:   $OUTPUT"
