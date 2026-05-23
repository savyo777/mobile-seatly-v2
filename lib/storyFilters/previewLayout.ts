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
  // Match the inner normalizePhotoAspect() bounds (0.45-1.8) by default
  // so a 9:19.5 (~0.46) full-screen camera composite or an 18:9 ultrawide
  // shot renders at its TRUE aspect ratio instead of being squashed
  // toward a square. 2026-05-23 user-reported bug: tapping Post produced
  // a compacted square instead of the full-screen photo. Root cause was
  // these defaults clamping aspect to 0.75-1.45 — wider than the
  // photo → contentFit="cover" cropped top + bottom → captureRef
  // snapshotted that cropped view → uploaded JPEG + social share were
  // square. Callers that want a TIGHTER UI clamp can still pass
  // minAspect / maxAspect explicitly.
  minAspect = 0.45,
  maxAspect = 1.8,
}: PreviewLayoutInput): SnapPreviewLayout {
  const safeWidth = Math.max(1, maxWidth);
  const safeHeight = Math.max(1, maxHeight);
  const aspect = clamp(normalizePhotoAspect(photoAspect), minAspect, maxAspect);
  const width = Math.round(Math.min(safeWidth, safeHeight * aspect));
  const height = Math.round(width / aspect);

  return { width, height, aspect };
}
