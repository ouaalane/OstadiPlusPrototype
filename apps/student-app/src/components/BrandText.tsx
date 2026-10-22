/**
 * Attributed text using ONLY the two untouched font files in the identity ZIP.
 * The Arabic subset has no Latin letters or ASCII digits. Inline font runs keep
 * those characters in the supplied Bricolage face instead of OS font fallback.
 * No View wrapper, content rewriting, input processing or navigation is added.
 */
import React from 'react';
import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';
import { brandFonts, brandFontWeight, originalTextLeading } from '../theme';
import coverage from './brandGlyphCoverage.json';

const arabicGlyphs = new Set(coverage.arabic);
const latinGlyphs = new Set(coverage.latin);

function fontRuns(text: string, defaultFamily: string) {
  const runs: { text: string; family: string }[] = [];
  for (const character of text) {
    const code = character.codePointAt(0)!;
    const arabic = arabicGlyphs.has(code);
    const latin = latinGlyphs.has(code);
    const previous = runs[runs.length - 1];
    const family = arabic && !latin
      ? brandFonts.arabic
      : latin && !arabic
        ? brandFonts.latin
        : previous?.family ?? defaultFamily;
    if (previous?.family === family) previous.text += character;
    else runs.push({ text: character, family });
  }
  return runs;
}

export const BrandText = React.forwardRef<React.ComponentRef<typeof NativeText>, TextProps>(
  function BrandText({ children, style, ...props }, ref) {
    const flat = StyleSheet.flatten(style) ?? {};
    const requestedFamily = flat.fontFamily === brandFonts.latin ? brandFonts.latin : brandFonts.arabic;
    const ratio = requestedFamily === brandFonts.latin
      ? originalTextLeading.latin
      : originalTextLeading.arabic;
    const textStyle = {
      fontFamily: requestedFamily,
      // Both archive faces are weight 700. Do not synthesize missing weights.
      fontWeight: brandFontWeight,
      // Preserve explicit line heights; restore original automatic line boxes.
      lineHeight: flat.lineHeight ?? (flat.fontSize ?? 14) * ratio,
    };
    return (
      <NativeText {...props} ref={ref} style={[style, textStyle]}>
        {React.Children.map(children, (child) => {
          if (typeof child !== 'string' && typeof child !== 'number') return child;
          const runs = fontRuns(String(child), requestedFamily);
          if (runs.length === 1 && runs[0].family === requestedFamily) return child;
          return runs.map((run, index) => (
            <NativeText key={index} style={{ fontFamily: run.family, fontWeight: brandFontWeight }}>
              {run.text}
            </NativeText>
          ));
        })}
      </NativeText>
    );
  },
);
