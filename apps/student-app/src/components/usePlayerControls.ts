import { useCallback, useEffect, useState } from 'react';

export const PLAYER_CONTROLS_IDLE_MS = 4000;

/** Keep controls available while paused, loading, seeking or recovering. */
export function usePlayerControls({
  playing,
  loading,
  dragging,
  hasError,
  fullscreen,
}: {
  playing: boolean;
  loading: boolean;
  dragging: boolean;
  hasError: boolean;
  fullscreen: boolean;
}) {
  const [requested, setRequested] = useState(true);
  const [interaction, setInteraction] = useState(0);
  const heldOpen = !playing || loading || dragging || hasError;
  const controlsVisible = heldOpen || requested;

  const revealControls = useCallback(() => {
    setRequested(true);
    setInteraction((value) => value + 1);
  }, []);
  const toggleControls = useCallback(() => {
    setRequested((value) => heldOpen || !value);
    setInteraction((value) => value + 1);
  }, [heldOpen]);

  useEffect(() => {
    if (heldOpen || !requested) return;
    const timer = setTimeout(
      () => setRequested(false),
      PLAYER_CONTROLS_IDLE_MS,
    );
    return () => clearTimeout(timer);
    // Rotation and each control interaction give a fresh idle window.
  }, [heldOpen, requested, interaction, fullscreen]);

  return { controlsVisible, revealControls, toggleControls };
}
