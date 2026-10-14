import manifest from './media-manifest.json';

/**
 * The bundled media library.
 *
 * `media-manifest.json` is produced by `npm run media`, which renders the
 * slides, encodes the videos, prints the PDFs and then records the *real*
 * duration / size / page count of every file. Nothing in the manifest may be
 * hand-edited — the generator owns it.
 */

export interface VideoAsset {
  key: string;
  title: string;
  file: string;
  poster: string;
  durationSec: number;
  sizeMb: number;
}

export interface PdfAsset {
  key: string;
  title: string;
  file: string;
  pages: number;
  sizeMb: number;
}

type VideoEntry = Omit<VideoAsset, 'key'>;
type PdfEntry = Omit<PdfAsset, 'key'>;

export const videoAssets: VideoAsset[] = Object.entries(
  manifest.videos as Record<string, VideoEntry>,
).map(([key, value]) => ({ key, ...value }));

export const pdfAssets: PdfAsset[] = Object.entries(
  manifest.pdfs as Record<string, PdfEntry>,
).map(([key, value]) => ({ key, ...value }));

export const generatedAt: string = manifest.generatedAt;

export function videoAsset(key: string): VideoAsset | undefined {
  return videoAssets.find((asset) => asset.key === key);
}

export function pdfAsset(key: string): PdfAsset | undefined {
  return pdfAssets.find((asset) => asset.key === key);
}
