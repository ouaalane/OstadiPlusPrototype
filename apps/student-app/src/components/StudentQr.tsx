import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// Prototype illustration only, not a scannable QR encoder. Keep the same
// student identifier on the welcome screen and the existing student card.
const GRID = 21; // modules per side (QR v1 size)
const FINDER = 7;

/** Deterministic 0/1 matrix seeded from the student's unique ID. */
function buildMatrix(seedStr: string): number[][] {
  // xorshift PRNG seeded from the string
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rnd = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h |= 0;
    return (h >>> 0) / 4294967296;
  };

  const m: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(0));

  const inFinder = (r: number, c: number) =>
    (r < FINDER && c < FINDER) ||
    (r < FINDER && c >= GRID - FINDER) ||
    (r >= GRID - FINDER && c < FINDER);

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (inFinder(r, c)) continue;
      m[r][c] = rnd() > 0.5 ? 1 : 0;
    }
  }

  // Finder patterns (7x7 ring + 3x3 core) at three corners.
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < FINDER; r++) {
      for (let c = 0; c < FINDER; c++) {
        const edge = r === 0 || r === FINDER - 1 || c === 0 || c === FINDER - 1;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[r0 + r][c0 + c] = edge || core ? 1 : 0;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, GRID - FINDER);
  drawFinder(GRID - FINDER, 0);

  // Timing patterns.
  for (let i = 8; i < GRID - 8; i++) {
    m[6][i] = i % 2 === 0 ? 1 : 0;
    m[i][6] = i % 2 === 0 ? 1 : 0;
  }
  return m;
}

export default function StudentQr({ code, cellSize = 10 }: { code: string; cellSize?: number }) {
  const matrix = useMemo(() => buildMatrix(code), [code]);
  return (
    <View testID="student-qr" style={styles.grid} accessible={false}>
      {matrix.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cell, c) => <View key={c} style={{ width: cellSize, height: cellSize, backgroundColor: cell ? colors.ink : colors.transparent }} />)}
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({ grid: { gap: 0 }, row: { flexDirection: 'row' } });
