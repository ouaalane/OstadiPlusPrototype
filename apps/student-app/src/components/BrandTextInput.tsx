import React from 'react';
import { StyleSheet, TextInput as NativeTextInput, type TextInputProps } from 'react-native';
import { brandFonts, brandFontWeight, inputTextLeading } from '../theme';
import { useI18n } from '../i18n/useI18n';
import coverage from './brandGlyphCoverage.json';

const arabicGlyphs = new Set(coverage.arabic);
const latinGlyphs = new Set(coverage.latin);

/** Same native input and props; select the supplied face by visible content. */
export const BrandTextInput = React.forwardRef<NativeTextInput, TextInputProps>(
  function BrandTextInput({ style, ...props }, ref) {
    const { lang } = useI18n();
    const flat = StyleSheet.flatten(style) ?? {};
    // Match the former locale/identifier face's line box, even while the new
    // face follows typed content. Typing Latin in an Arabic form must not resize it.
    const identifier = props.secureTextEntry ||
      ['email-address', 'phone-pad', 'number-pad'].includes(props.keyboardType ?? '');
    const leading = lang === 'fr' || identifier ? inputTextLeading.latin : inputTextLeading.arabic;
    const text = props.value || props.defaultValue || props.placeholder || '';
    const hasArabic = Array.from(text).some((character) => {
      const code = character.codePointAt(0)!;
      return arabicGlyphs.has(code) && !latinGlyphs.has(code);
    });
    return (
      <NativeTextInput
        {...props}
        ref={ref}
        style={[
          style,
          {
            fontFamily: hasArabic ? brandFonts.arabic : brandFonts.latin,
            fontWeight: brandFontWeight,
            lineHeight: flat.lineHeight ?? Math.ceil((flat.fontSize ?? 14) * leading),
          },
        ]}
      />
    );
  },
);
