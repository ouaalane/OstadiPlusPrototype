import {
  pdfAssets,
  pdfAsset,
  videoAssets,
  videoAsset,
} from '@ostadiplus/shared';

export { pdfAssets, pdfAsset, videoAssets, videoAsset };

export type LibraryKind = 'video' | 'pdf';

export interface LibraryItem {
  key: string;
  kind: LibraryKind;
  title: string;
  file: string;
  poster?: string;
  durationSec: number;
  pages: number;
  sizeMb: number;
}

export const library: LibraryItem[] = [
  ...videoAssets.map((asset) => ({
    key: asset.key,
    kind: 'video' as const,
    title: asset.title,
    file: asset.file,
    poster: asset.poster,
    durationSec: asset.durationSec,
    pages: 0,
    sizeMb: asset.sizeMb,
  })),
  ...pdfAssets.map((asset) => ({
    key: asset.key,
    kind: 'pdf' as const,
    title: asset.title,
    file: asset.file,
    durationSec: 0,
    pages: asset.pages,
    sizeMb: asset.sizeMb,
  })),
];

export function libraryItemByFile(file: string): LibraryItem | undefined {
  return library.find((item) => item.file === file);
}
