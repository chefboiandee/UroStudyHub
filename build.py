#!/usr/bin/env python3
"""
Build script for UroStudyHub — obfuscates source for distribution.

Strips comments, removes blank lines, compresses indentation, and renames
the section markers to make the code harder to navigate.

Usage:
    python3 build.py

Output: UroStudyHub.min.html (deploy to GitHub Pages, Netlify, etc.)
"""

import re
import os

INPUT = "UroStudyHub.html"
OUTPUT = "UroStudyHub.min.html"

def obfuscate_script(code):
    """Strip comments, blank lines, and compress whitespace."""
    # First pass: remove JSX comments {/* ... */} entirely (including the wrapping braces).
    # JSX rejects empty expression slots {} so we must not leave them behind.
    # This handles single-line {/* ... */} patterns which are the common case.
    code = re.sub(r'\{\s*/\*[\s\S]*?\*/\s*\}', '', code)

    lines = code.split('\n')
    result = []
    in_multiline = False

    for line in lines:
        stripped = line.rstrip()

        # Handle multi-line comments
        if in_multiline:
            end = stripped.find('*/')
            if end >= 0:
                stripped = stripped[end + 2:]
                in_multiline = False
                if not stripped.strip():
                    continue
            else:
                continue

        # Check for multi-line comment start
        ml_start = stripped.find('/*')
        while ml_start >= 0:
            ml_end = stripped.find('*/', ml_start + 2)
            if ml_end >= 0:
                stripped = stripped[:ml_start] + stripped[ml_end + 2:]
                ml_start = stripped.find('/*')
            else:
                stripped = stripped[:ml_start]
                in_multiline = True
                break

        # Skip full-line comments (// at start after whitespace)
        content = stripped.lstrip()
        if content.startswith('//'):
            continue

        # Skip blank lines
        if not content:
            continue

        # Remove section markers like ═══ SECTION NAME ═══
        content = re.sub(r'═+\s*[A-Z][A-Z\s&—:]+\s*═+', '', content)

        # Compress: remove leading whitespace entirely
        result.append(content)

    return '\n'.join(result)

def main():
    print(f"Building {OUTPUT} from {INPUT}...")

    with open(INPUT, 'r', encoding='utf-8') as f:
        html = f.read()

    # Find the babel script block
    pattern = r'(<script type="text/babel"[^>]*>)([\s\S]*?)(</script>)'
    match = re.search(pattern, html)
    if not match:
        print("ERROR: Could not find <script type=\"text/babel\"> tag")
        return

    before = html[:match.start()]
    script_tag = match.group(1)
    script_content = match.group(2)
    close_tag = match.group(3)
    after = html[match.end():]

    orig_len = len(script_content)
    print(f"  Original script: {orig_len:,} chars ({orig_len // 1024}KB)")

    # Obfuscate
    processed = obfuscate_script(script_content)
    print(f"  Obfuscated:      {len(processed):,} chars ({len(processed) // 1024}KB)")
    print(f"  Reduction:       {100 - len(processed) * 100 // orig_len}%")

    # Reassemble
    output = before + script_tag + '\n' + processed + '\n' + close_tag + after

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(output)

    orig_size = os.path.getsize(INPUT)
    min_size = os.path.getsize(OUTPUT)
    print(f"\n  {INPUT}: {orig_size:,} bytes")
    print(f"  {OUTPUT}: {min_size:,} bytes")
    print(f"\nDone! Deploy {OUTPUT} to GitHub Pages or any static host.")

if __name__ == "__main__":
    main()
