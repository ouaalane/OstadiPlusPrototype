# Brand font provenance

The supplied identity names Noto Sans Arabic and Bricolage Grotesque. The original Arabic brand file was a subset without Latin letters/ASCII digits and was internally weight 700 despite its Regular style name. The previous rebrand mixed this subset with IBM Plex Arabic and Inter.

The user authorized choosing suitable typography in this review. Complete versions of the **same two families** were fetched from the official Google Fonts repository. No third typeface was introduced. Real weight-axis instances 400, 500, 600 and 700 are bundled, width 100; Bricolage optical size 14 is used consistently for UI text. Expo aliases are unique per face to avoid OS weight substitution.

Only vertical line-box metadata (hhea and OS/2 ascent/descent/lineGap) is matched to the corresponding pre-rebrand font, scaled by units/em. This prevents the much taller Noto defaults from changing default text row heights. Glyph outlines, shaping tables and horizontal advances remain from the chosen brand family. Component font sizes, line heights, widths, spacing and geometry are unchanged. Different typeface glyph widths can still affect wrapping; native typography needs device QA.

Static generation used fontTools.varLib.instancer; no font verification was bypassed. Both upstream OFL licenses are included. The original NotoSansArabic-Brand.ttf remains as source reference and is not loaded at runtime.

## Upstream sources

- https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/NotoSansArabic%5Bwdth,wght%5D.ttf
  SHA-256: `63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e`
- https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz,wdth,wght%5D.ttf
  SHA-256: `413e7357809ddd12fd80a96a8a396de0e401638d4acd3cb3e37532f0472ac682`

## Shipped static instances

- `BricolageGrotesque-Bold.ttf` — SHA-256 `bf821d661ab69ca34051691cade0a6fdabfc60ab296868f2c84824121ebb15c5`
- `BricolageGrotesque-Medium.ttf` — SHA-256 `0540c2a66c702ad5bbf2b981ceb4c16b328a9d571e993dd90055e06cac1e1dff`
- `BricolageGrotesque-Regular.ttf` — SHA-256 `cacf67c07bacd82eefb9db355cbf69b09c3a201c311170947d812491962a170c`
- `BricolageGrotesque-SemiBold.ttf` — SHA-256 `4457976a552fc4a327b8bd2f247eb2d389aeb32b51b84df43b7ae321bbf90979`
- `NotoSansArabic-Bold.ttf` — SHA-256 `de7cb7bca3235b1be6aa5e076521200310e96490b7bdcb437c51de1b2d4464ed`
- `NotoSansArabic-Medium.ttf` — SHA-256 `50b3bb117335c3214073fbcdec07a90fa2b613bdbd2e1f9d601ad0543b9fbcb2`
- `NotoSansArabic-Regular.ttf` — SHA-256 `abc2482bfbd04f54d1abe621c60e3d0f6f8cf69a01288cb65c42e54418fe4c92`
- `NotoSansArabic-SemiBold.ttf` — SHA-256 `06c9a843720b33c6915512badc6d33ee0e2a33882e6b31522f959f545e33a14c`
