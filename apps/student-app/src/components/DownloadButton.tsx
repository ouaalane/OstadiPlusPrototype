/**
 * Small circular download affordance used by the course program and the
 * lesson player — the Udemy-style replacement for the old big download cards.
 *
 * States:
 *   idle        → outlined arrow
 *   downloading → segmented progress ring with a stop square (tap = cancel)
 *   complete    → filled accent circle with a dark check (tap = delete options)
 *   bundled     → document already ships inside the app (PDF), informational
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DownloadStatus } from '../store/StudentStore';
import { colors } from '../theme';

const SEGMENTS = 12;

function ProgressRing({ progress, size }: { progress: number; size: number }) {
  const clamped = Math.max(0, Math.min(100, progress));
  const filled = Math.round((clamped / 100) * SEGMENTS);
  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no">
      {Array.from({ length: SEGMENTS }).map((_, index) => (
        <View
          key={index}
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ rotate: `${(index * 360) / SEGMENTS}deg` }] },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: size / 2 - 1,
              width: 2,
              height: Math.max(4, size * 0.16),
              borderRadius: 1,
              backgroundColor: index < filled ? colors.brand : colors.line,
            }}
          />
        </View>
      ))}
      <View style={styles.stopWrap}>
        <View style={styles.stopSquare} />
      </View>
    </View>
  );
}

export function DownloadButton({
  status,
  progress = 0,
  onPress,
  label,
  size = 30,
  bundled = false,
  disabled = false,
  idleIcon = 'arrow-down',
}: {
  status?: DownloadStatus;
  progress?: number;
  onPress: () => void;
  label: string;
  size?: number;
  /** PDF/document bundled with the app — already readable offline. */
  bundled?: boolean;
  disabled?: boolean;
  /** Glyph shown while idle — the bulk controls use a cloud. */
  idleIcon?: keyof typeof Ionicons.glyphMap;
}) {
  const downloading = status === 'downloading';
  const complete = status === 'complete';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: downloading }}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        complete && styles.complete,
        bundled && styles.bundled,
        !complete && !bundled && !downloading && styles.idle,
      ]}
    >
      {downloading ? (
        <ProgressRing progress={progress} size={size - 6} />
      ) : (
        <Ionicons
          name={bundled ? 'cloud-done' : complete ? 'checkmark' : idleIcon}
          size={Math.round(size * (complete ? 0.56 : 0.5))}
          color={complete ? colors.ink : bundled ? colors.brand : colors.body}
          style={!complete && !bundled && idleIcon === 'arrow-down' ? { marginTop: 1 } : undefined}
          importantForAccessibility="no"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  idle: { borderWidth: 1.5, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  complete: { backgroundColor: colors.accent },
  bundled: { backgroundColor: colors.brandSoft },
  stopWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  stopSquare: { width: 6, height: 6, borderRadius: 1, backgroundColor: colors.brand },
});
