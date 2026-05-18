import { FORMAT_SPECS } from '../DAMConstants';

export interface ImageDimensions {
  width: number;
  height: number;
  resolution: string;
  formatSpec: string;
}

const KNOWN_SIZES: Record<string, string> = {
  '3000x3000': '3000×3000',
  '1920x1080': '1920×1080',
  '1080x1080': '1080×1080',
  '1080x1350': '1080×1350',
  '1080x1920': '1080×1920',
};

const RATIO_MAP: [number, string][] = [
  [1, '1:1'],
  [16 / 9, '16:9'],
  [9 / 16, '9:16'],
  [4 / 5, '1080×1350'],   // 1080x1350 ≈ 4:5
];

function matchFormatSpec(w: number, h: number): string {
  const key = `${w}x${h}`;
  if (KNOWN_SIZES[key]) return KNOWN_SIZES[key];

  const ratio = w / h;
  let best = '';
  let bestDiff = Infinity;
  for (const [r, spec] of RATIO_MAP) {
    const diff = Math.abs(ratio - r);
    if (diff < bestDiff && diff < 0.05) {
      bestDiff = diff;
      best = spec;
    }
  }
  return best;
}

export function detectImageDimensionsFromFile(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({
        width: w,
        height: h,
        resolution: `${w}×${h}`,
        formatSpec: matchFormatSpec(w, h),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export function detectImageDimensionsFromUrl(imageUrl: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        resolution: `${img.naturalWidth}×${img.naturalHeight}`,
        formatSpec: matchFormatSpec(img.naturalWidth, img.naturalHeight),
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
