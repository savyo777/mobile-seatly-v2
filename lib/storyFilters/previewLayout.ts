export const DEFAULT_SNAP_PHOTO_ASPECT = 3 / 4;

type PreviewLayoutInput = {
  photoAspect: number;
  maxWidth: number;
  maxHeight: number;
  minAspect?: number;
  maxAspect?: number;
};

export type SnapPreviewLayout = {
  width: number;
  height: number;
  aspect: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function normalizePhotoAspect(photoAspect: number): number {
  if (!Number.isFinite(photoAspect) || photoAspect <= 0) {
    return DEFAULT_SNAP_PHOTO_ASPECT;
  }
  return clamp(photoAspect, 0.45, 1.8);
}

export function getSnapPreviewLayout({
  photoAspect,
  maxWidth,
  maxHeight,
  minAspect = 0.75,
  maxAspect = 1.45,
}: PreviewLayoutInput): SnapPreviewLayout {
  const safeWidth = Math.max(1, maxWidth);
  const safeHeight = Math.max(1, maxHeight);
  const aspect = clamp(normalizePhotoAspect(photoAspect), minAspect, maxAspect);
  const width = Math.round(Math.min(safeWidth, safeHeight * aspect));
  const height = Math.round(width / aspect);

  return { width, height, aspect };
}
