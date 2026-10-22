/** PDF zoom geometry, shared by pinch gestures and the accessible toolbar. */
export const PDF_MIN_ZOOM = 1;
export const PDF_MAX_ZOOM = 4;
export const PDF_ZOOM_STEP = 0.25;
export interface PdfTransform { scale: number; x: number; y: number }
export interface PdfFrame { width: number; height: number }
export const PDF_INITIAL_TRANSFORM: PdfTransform = { scale: 1, x: 0, y: 0 };

export function clampPdfTransform(value: PdfTransform, frame: PdfFrame): PdfTransform {
  const scale = Number.isFinite(value.scale)
    ? Math.min(PDF_MAX_ZOOM, Math.max(PDF_MIN_ZOOM, value.scale))
    : PDF_MIN_ZOOM;
  const maxX = Math.max(0, frame.width) * (scale - 1) / 2;
  const maxY = Math.max(0, frame.height) * (scale - 1) / 2;
  const x = maxX && Number.isFinite(value.x) ? Math.min(maxX, Math.max(-maxX, value.x)) : 0;
  const y = maxY && Number.isFinite(value.y) ? Math.min(maxY, Math.max(-maxY, value.y)) : 0;
  return { scale, x, y };
}

/** Focal point is relative to the page centre; translation follows two fingers. */
export function scalePdfTransform(
  start: PdfTransform,
  scale: number,
  frame: PdfFrame,
  focal = { x: 0, y: 0 },
  movement = { x: 0, y: 0 },
): PdfTransform {
  const nextScale = clampPdfTransform({ ...start, scale }, frame).scale;
  const ratio = nextScale / start.scale;
  return clampPdfTransform({
    scale: nextScale,
    x: start.x * ratio + focal.x * (1 - ratio) + movement.x,
    y: start.y * ratio + focal.y * (1 - ratio) + movement.y,
  }, frame);
}
