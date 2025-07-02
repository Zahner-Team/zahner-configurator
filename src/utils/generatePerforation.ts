import type { PanelSize } from "../store/useUI";
import { CanvasTexture, LinearFilter } from "three";

export default function generatePerforation(
  panel: PanelSize,
  seed = 1,
  dotDiameterMinPx: number,
  dotDiameterMaxPx: number,
  strideInches: number,
  scalePxPerInch: number,
  patternImage?: HTMLImageElement,
  blurPx = 0,
  invert = false
): CanvasTexture {
  const w = Math.round(panel.w * scalePxPerInch);
  const h = Math.round(panel.h * scalePxPerInch);

  // Create main canvas
  const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h }) as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;

  // Fill white background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);

  // If a pattern image is provided, draw it first (for sampling)
  let patternData: Uint8ClampedArray | null = null;
  if (patternImage) {
    const pC = document.createElement("canvas");
    pC.width = w;
    pC.height = h;
    const pCtx = pC.getContext("2d")!;
    if (blurPx > 0) pCtx.filter = `blur(${blurPx}px)`;
    pCtx.drawImage(patternImage, 0, 0, w, h);
    patternData = pCtx.getImageData(0, 0, w, h).data;
  }

  // RNG setup
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };

  ctx.fillStyle = "black";
  const stridePx = strideInches * scalePxPerInch;

  // Draw holes: sample brightness if patternData exists
  for (let y = stridePx / 2; y < h; y += stridePx) {
    for (let x = stridePx / 2; x < w; x += stridePx) {
      let radius: number;
      if (patternData) {
        // get pixel RGBA at floor(x),floor(y)
        const idx = (Math.floor(y) * w + Math.floor(x)) * 4;
        const r = patternData[idx] / 255;
        const g = patternData[idx + 1] / 255;
        const b = patternData[idx + 2] / 255;
        const brightness = (r + g + b) / 3;
        // map brightness → radius
        const t = invert ? brightness : 1 - brightness;
        radius = dotDiameterMinPx + t * (dotDiameterMaxPx - dotDiameterMinPx);
      } else {
        if (rand() > 0.5) continue;
        radius = dotDiameterMinPx + rand() * (dotDiameterMaxPx - dotDiameterMinPx);
      }
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}
