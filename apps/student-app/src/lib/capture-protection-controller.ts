/** Platform-independent lifetime policy. No screen may disable protection. */
export type CaptureProtectionState = {
  phase: 'checking' | 'protected' | 'unsupported' | 'unavailable' | 'error';
  foreground: boolean;
  captured: boolean;
};
export interface ProtectionClient {
  ensureProtection(): Promise<{ captured: boolean }>;
  subscribe(listener: (captured: boolean) => void): () => void;
}
export function createCaptureProtectionController(
  platform: string,
  getClient: () => ProtectionClient | null,
  initiallyActive = true,
) {
  let state: CaptureProtectionState = {
    phase: platform === 'web' ? 'unsupported' : 'checking',
    foreground: initiallyActive,
    captured: false,
  };
  const listeners = new Set<() => void>();
  let client: ProtectionClient | null = null;
  let removeCaptureListener: (() => void) | undefined;
  let generation = 0;
  let captureRevision = 0;
  let active = initiallyActive;
  let running = false;
  let queue = Promise.resolve();
  const update = (patch: Partial<CaptureProtectionState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const ensure = () => {
    const token = ++generation;
    update({ foreground: false });
    queue = queue.then(async () => {
      if (!running || token !== generation || !active) return;
      const revision = captureRevision;
      try {
        const result = await client!.ensureProtection();
        if (!running || token !== generation || !active) return;
        update({
          phase: 'protected',
          foreground: true,
          ...(revision === captureRevision
            ? { captured: result.captured }
            : {}),
        });
      } catch (error) {
        if (!running || token !== generation) return;
        console.warn(
          '[capture] protection not confirmed; content stays covered',
          String(error),
        );
        update({ phase: 'error', foreground: false });
      }
    });
    return queue;
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      running = true;
      if (platform === 'web') return Promise.resolve();
      try {
        client = getClient();
        if (!client) {
          update({ phase: 'unavailable', foreground: false });
          return Promise.resolve();
        }
        removeCaptureListener?.();
        removeCaptureListener = client.subscribe((captured) => {
          if (!running) return;
          captureRevision++;
          update({ captured });
        });
        return ensure();
      } catch (error) {
        console.warn('[capture] native protection unavailable', String(error));
        update({ phase: 'error', foreground: false });
        return Promise.resolve();
      }
    },
    setActive(value: boolean) {
      active = value;
      if (platform === 'web') return Promise.resolve();
      if (!value) {
        ++generation;
        update({ foreground: false });
        return Promise.resolve();
      }
      return client ? ensure() : Promise.resolve();
    },
    retry() {
      if (!active) return Promise.resolve();
      return client ? ensure() : this.start();
    },
    stop() {
      running = false;
      ++generation;
      removeCaptureListener?.();
      removeCaptureListener = undefined;
      // Do not allow capture on navigation, background or React unmount.
      // The app-wide policy lasts until its native process/module is destroyed.
    },
  };
}
