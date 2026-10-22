# Exact uploaded font files — current source of truth

This supersedes the previous complete-family/metric-adaptation approach. The user explicitly requested the actual uploaded files, not other versions of the same families.

Only these untouched binaries are loaded:

- `BricolageGrotesque-Bold.ttf` — SHA-256 `a737b146fe0d77ffe8a86e3cd16700dd431d3b1e420d4fd80e142cd68a1cb50d`
- `NotoSansArabic-Brand.ttf` — SHA-256 `ad97e64c928d63aaf35a4cc94fcad3a30853cd8f1c3d7a349ac5e62bb78434fe`

Both supplied faces have OS/2 weight 700. No 400/500/600 weights are synthesized or downloaded. Existing semantic weight requests map to the single available face. The Arabic subset lacks ASCII digits and Latin letters; read-only mixed-script text is attributed with the supplied Bricolage font for those glyphs, inside the existing text container. Functional Ionicons and unsupported emoji remain platform/icon content.

No font names, outlines, advance widths or vertical metrics in these files are edited. Existing explicit component line heights are retained; original automatic line-box ratios are expressed as text style only, because editing the font binaries would violate the exact-file requirement. Different glyph widths can affect wrapping.

All mobile editable TextInputs now use BrandTextInput. Latin letters, ASCII numbers and Latin placeholders select the exact Bricolage face, including in the Arabic UI; Arabic content selects the exact Noto companion. Original input line boxes are retained using the archive metrics so changing scripts does not resize the field. Native TextInput does not support per-range font families: a mixed-script editable value can still use platform fallback for glyphs missing from its selected face. No values, callbacks, refs, keyboards or validation are rewritten. Dashboard CSS places Bricolage first, with Noto as the Arabic fallback.

The OFL files are copied byte-for-byte, including their original line endings. Removed generated/static complete-family variants must not be reintroduced without a new user instruction.
