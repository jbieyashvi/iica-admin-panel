// ---------------------------------------------------------------------------
// Banner image processing for the prototype: validate an uploaded file (type,
// size, dimensions) and produce a compressed JPEG data URL small enough to keep
// in localStorage. Production would upload the original to object storage — this
// only creates a local preview; it never contacts a server.
// ---------------------------------------------------------------------------

import {
  BANNER_ACCEPTED_MIME, BANNER_MAX_BYTES, BANNER_MIN_W, BANNER_MIN_H, BANNER_REC_W,
} from '../config/bannerLabels';

export interface ProcessedBannerImage {
  dataUrl: string;
  mimeType: string;
  size: number; // bytes of the stored (compressed) data URL payload
  width: number;
  height: number;
}

export interface ProcessResult {
  ok: boolean;
  error?: string;
  image?: ProcessedBannerImage;
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The file is not a readable image.'));
    img.src = src;
  });

// Approximate byte size of a base64 data URL payload.
export const dataUrlBytes = (dataUrl: string): number => {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.round((b64.length * 3) / 4);
};

export async function processBannerImage(file: File): Promise<ProcessResult> {
  if (!BANNER_ACCEPTED_MIME.includes(file.type as (typeof BANNER_ACCEPTED_MIME)[number])) {
    return { ok: false, error: 'Unsupported format. Use JPG, PNG or WebP (no PDF, SVG or video).' };
  }
  if (file.size > BANNER_MAX_BYTES) {
    return { ok: false, error: `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.` };
  }

  let sourceUrl: string;
  let img: HTMLImageElement;
  try {
    sourceUrl = await readAsDataUrl(file);
    img = await loadImage(sourceUrl);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  if (img.naturalWidth < BANNER_MIN_W || img.naturalHeight < BANNER_MIN_H) {
    return {
      ok: false,
      error: `Image is too small (${img.naturalWidth} × ${img.naturalHeight}). Minimum is ${BANNER_MIN_W} × ${BANNER_MIN_H} px.`,
    };
  }

  // Downscale so the stored preview stays small (cap width at the recommended
  // 1200 px). Fill white first so transparent PNGs don't flatten to black.
  const scale = Math.min(1, BANNER_REC_W / img.naturalWidth);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, error: 'Could not process the image in this browser.' };
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let dataUrl = '';
  try {
    dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return { ok: false, error: 'Could not process the image in this browser.' };
  }

  return {
    ok: true,
    image: { dataUrl, mimeType: 'image/jpeg', size: dataUrlBytes(dataUrl), width: w, height: h },
  };
}
