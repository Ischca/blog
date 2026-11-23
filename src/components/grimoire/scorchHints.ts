/**
 * Gestures the vellum suggests by itself: a downward arrow when the reader has
 * not scrolled for a while, and a circle when they have not written. Both are
 * scorched into the skin with the same arithmetic as the opening scorch in
 * `PhysicalParchmentRenderer`, so a hint arrives the way the title page does.
 * They never surface as ink. The reader's own marks are ink; the book's
 * suggestions stay scorch.
 *
 * Each hint covers a small box. It is evaluated per pixel on the CPU and drawn
 * to an overlay canvas that multiplies the parchment, which is exactly what the
 * shader's scorch tint does to the paper.
 */

export type ScorchHintBox = { x: number; y: number; width: number; height: number };

export type ScorchHintMark = {
  /** The box in CSS pixels, relative to the stage. */
  box: ScorchHintBox;
  /** Device pixels per CSS pixel. */
  scale: number;
  pixelWidth: number;
  pixelHeight: number;
  sharp: Float32Array;
  soft: Float32Array;
  haze: Float32Array;
  /** The page-fixed noise that makes some fibres brown before others. */
  flow: Float32Array;
  mottle: Float32Array;
  /** When each pixel scorches within the mark: 0 first, 1 last. */
  order: Float32Array;
  image: ImageData;
};

/** How far a hint is through its scorch at one moment. */
export type ScorchHintFrame = {
  /** The leading edge, measured in `order`. It runs past 1 by `1 / gain`. */
  front: number;
  /** How sharply the scorch develops behind the front. */
  gain: number;
  /** The scorch progress the mark settles at; it stays short of the ink. */
  hold: number;
  /** While sinking, the front takes the scorch away instead of bringing it. */
  sinking: boolean;
};

/** CSS pixels per texel of the page's soft scorch copy, as in the main pipeline. */
const SOFT_TEXEL = 5;
/** The haze is a further sixfold reduction of the soft copy. */
const HAZE_STEP = 6;

function fract(value: number) {
  return value - Math.floor(value);
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const progress = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return progress * progress * (3 - 2 * progress);
}

function scorchHash(x: number, y: number) {
  let px = fract(x * 127.1);
  let py = fract(y * 311.7);
  const offset = px * (px + 19.19) + py * (py + 19.19);
  px += offset;
  py += offset;
  return fract(px * py);
}

function scorchNoise(x: number, y: number) {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  let blendX = x - cellX;
  let blendY = y - cellY;
  blendX = blendX * blendX * (3 - 2 * blendX);
  blendY = blendY * blendY * (3 - 2 * blendY);
  const top = scorchHash(cellX, cellY) * (1 - blendX) + scorchHash(cellX + 1, cellY) * blendX;
  const bottom = scorchHash(cellX, cellY + 1) * (1 - blendX) + scorchHash(cellX + 1, cellY + 1) * blendX;
  return top * (1 - blendY) + bottom * blendY;
}

function scorchFlow(x: number, y: number) {
  return scorchNoise(x, y) * 0.55
    + scorchNoise(x * 2.03 + 7.1, y * 2.03 + 7.1) * 0.3
    + scorchNoise(x * 4.07 + 3.7, y * 4.07 + 3.7) * 0.15;
}

function linearToSrgb(value: number) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

/**
 * The shader's toast, brown and char multipliers, converted to sRGB because
 * the overlay is blended in sRGB while the shader multiplies linear colour.
 */
const TINT_STEPS = 1024;
const TINT_TABLE = (() => {
  const table = new Uint8ClampedArray((TINT_STEPS + 1) * 3);
  for (let step = 0; step <= TINT_STEPS; step += 1) {
    const amount = step / TINT_STEPS;
    const toast = smoothstep(0, 0.32, amount);
    const brown = smoothstep(0.28, 0.68, amount);
    const char = smoothstep(0.66, 1, amount);
    const channel = (paper: number, toasted: number, browned: number, charred: number) => {
      let tint = paper + (toasted - paper) * toast;
      tint += (browned - tint) * brown;
      tint += (charred - tint) * char;
      return Math.round(linearToSrgb(tint) * 255);
    };
    table[step * 3] = channel(1, 0.84, 0.46, 0.12);
    table[step * 3 + 1] = channel(1, 0.64, 0.26, 0.065);
    table[step * 3 + 2] = channel(1, 0.4, 0.12, 0.035);
  }
  return table;
})();

function alphaOf(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return new Float32Array(canvas.width * canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const alpha = new Float32Array(canvas.width * canvas.height);
  for (let index = 0; index < alpha.length; index += 1) alpha[index] = pixels[index * 4 + 3] / 255;
  return alpha;
}

function resampled(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  if (context) {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/**
 * Prepares a hint for scorching.
 *
 * `draw` paints the mark in CSS pixels with the box's top-left at the origin.
 * `orderAt` says, for a CSS point inside the box, when that point scorches.
 */
export function buildScorchHintMark(
  box: ScorchHintBox,
  scale: number,
  pageHeight: number,
  draw: (context: CanvasRenderingContext2D) => void,
  orderAt: (x: number, y: number) => number,
): ScorchHintMark | null {
  const pixelWidth = Math.max(1, Math.round(box.width * scale));
  const pixelHeight = Math.max(1, Math.round(box.height * scale));
  const sharpCanvas = document.createElement("canvas");
  sharpCanvas.width = pixelWidth;
  sharpCanvas.height = pixelHeight;
  const sharpContext = sharpCanvas.getContext("2d", { willReadFrequently: true });
  if (!sharpContext) return null;
  sharpContext.setTransform(scale, 0, 0, scale, 0, 0);
  sharpContext.strokeStyle = "#000";
  sharpContext.fillStyle = "#000";
  sharpContext.lineCap = "round";
  sharpContext.lineJoin = "round";
  draw(sharpContext);

  // The same chain of reductions the page's scorch sources go through, so the
  // stain spreads exactly as far around a hint as around the title.
  const softSmall = resampled(sharpCanvas, box.width / SOFT_TEXEL, box.height / SOFT_TEXEL);
  const hazeStep = resampled(softSmall, softSmall.width / HAZE_STEP, softSmall.height / HAZE_STEP);
  const hazeSmall = resampled(hazeStep, softSmall.width, softSmall.height);

  const pixelCount = pixelWidth * pixelHeight;
  const flow = new Float32Array(pixelCount);
  const mottle = new Float32Array(pixelCount);
  const order = new Float32Array(pixelCount);
  // Both noises vary over tens of CSS pixels, so one sample per CSS pixel is
  // plenty; each device pixel takes the sample of the CSS pixel it lies in.
  const cssWidth = Math.ceil(box.width);
  const cssHeight = Math.ceil(box.height);
  const flowCss = new Float32Array(cssWidth * cssHeight);
  const mottleCss = new Float32Array(cssWidth * cssHeight);
  const orderCss = new Float32Array(cssWidth * cssHeight);
  for (let y = 0; y < cssHeight; y += 1) {
    for (let x = 0; x < cssWidth; x += 1) {
      const pageX = (box.x + x + 0.5) / pageHeight;
      const pageY = 1 - (box.y + y + 0.5) / pageHeight;
      const index = y * cssWidth + x;
      flowCss[index] = scorchFlow(pageX * 7, pageY * 7);
      mottleCss[index] = 0.7 + 0.6 * scorchFlow(pageX * 26, pageY * 26);
      orderCss[index] = Math.max(0, Math.min(1, orderAt(x + 0.5, y + 0.5)));
    }
  }
  for (let y = 0; y < pixelHeight; y += 1) {
    const cssY = Math.min(cssHeight - 1, Math.floor(y / scale));
    for (let x = 0; x < pixelWidth; x += 1) {
      const cssIndex = cssY * cssWidth + Math.min(cssWidth - 1, Math.floor(x / scale));
      const index = y * pixelWidth + x;
      flow[index] = flowCss[cssIndex];
      mottle[index] = mottleCss[cssIndex];
      order[index] = orderCss[cssIndex];
    }
  }

  const image = sharpContext.createImageData(pixelWidth, pixelHeight);
  return {
    box,
    scale,
    pixelWidth,
    pixelHeight,
    sharp: alphaOf(sharpCanvas),
    soft: alphaOf(resampled(softSmall, pixelWidth, pixelHeight)),
    haze: alphaOf(resampled(hazeSmall, pixelWidth, pixelHeight)),
    flow,
    mottle,
    order,
    image,
  };
}

/** Writes one frame of a hint's scorch into `context`, which must be in device pixels. */
export function renderScorchHintMark(context: CanvasRenderingContext2D, mark: ScorchHintMark, frame: ScorchHintFrame) {
  const { sharp, soft, haze, flow, mottle, order, image } = mark;
  const pixels = image.data;
  const { front, gain, hold, sinking } = frame;
  for (let index = 0; index < sharp.length; index += 1) {
    const offset = index * 4;
    const developed = Math.max(0, Math.min(1, (front - order[index]) * gain));
    const local = hold * (sinking ? 1 - developed : developed);
    const age = local - 0.05 - (flow[index] - 0.5) * 0.11;
    const hazeCoverage = Math.min(1, haze[index] * 2.2);
    if (age <= 0 || (hazeCoverage < 0.003 && sharp[index] <= 0)) {
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = 255;
      continue;
    }
    const focus = 1 - (1 - smoothstep(0, 0.9, age)) ** 2.6;
    const softCoverage = soft[index];
    const coverage = softCoverage + (hazeCoverage - softCoverage) * smoothstep(0.3, 0.85, 1 - focus);
    const stain = coverage ** 0.7 * smoothstep(0, 0.06, age);
    const toasted = stain * mottle[index] * (0.42 + 0.46 * focus) * (1 - smoothstep(0.55, 0.92, age));
    const charred = sharp[index] * smoothstep(0.18, 0.7, focus);
    const step = Math.round(Math.max(0, Math.min(1, toasted + charred)) * TINT_STEPS) * 3;
    pixels[offset] = TINT_TABLE[step];
    pixels[offset + 1] = TINT_TABLE[step + 1];
    pixels[offset + 2] = TINT_TABLE[step + 2];
    pixels[offset + 3] = 255;
  }
  context.putImageData(image, Math.round(mark.box.x * mark.scale), Math.round(mark.box.y * mark.scale));
}

/** Removes a hint's box from the overlay. */
export function clearScorchHintMark(context: CanvasRenderingContext2D, mark: ScorchHintMark) {
  context.clearRect(
    Math.round(mark.box.x * mark.scale),
    Math.round(mark.box.y * mark.scale),
    mark.pixelWidth,
    mark.pixelHeight,
  );
}

/** A quill-drawn arrow pointing down the page: shaft first, then the barbs. */
export function scrollArrowMark(
  centerX: number,
  tipY: number,
  length: number,
  scale: number,
  pageHeight: number,
): ScorchHintMark | null {
  const margin = 26;
  const halfWidth = length * 0.36 + margin;
  const box = {
    x: centerX - halfWidth,
    y: tipY - length - margin,
    width: halfWidth * 2,
    height: length + margin * 2,
  };
  const originX = centerX - box.x;
  const topY = tipY - length - box.y;
  const tip = { x: originX, y: topY + length };
  const barb = length * 0.31;
  return buildScorchHintMark(box, scale, pageHeight, (context) => {
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(originX + 0.7, topY);
    context.bezierCurveTo(
      originX - 1.1, topY + length * 0.36,
      originX + 1.2, topY + length * 0.68,
      tip.x, tip.y,
    );
    context.stroke();
    context.lineWidth = 1.7;
    context.beginPath();
    context.moveTo(tip.x - barb * 0.86, tip.y - barb * 0.98);
    context.quadraticCurveTo(tip.x - barb * 0.32, tip.y - barb * 0.34, tip.x, tip.y);
    context.quadraticCurveTo(tip.x + barb * 0.3, tip.y - barb * 0.38, tip.x + barb * 0.8, tip.y - barb * 1.02);
    context.stroke();
  }, (_x, y) => (y - topY) / (length * 1.08));
}

/**
 * A hand-drawn circle with the nib's touch-down at its start and a barb at its
 * end. It begins near eleven o'clock moving right, which on a touch screen is
 * also the direction that draws instead of scrolling.
 */
export function drawCircleMark(
  centerX: number,
  centerY: number,
  radius: number,
  scale: number,
  pageHeight: number,
): ScorchHintMark | null {
  const margin = 34;
  const box = {
    x: centerX - radius - margin,
    y: centerY - radius - margin,
    width: (radius + margin) * 2,
    height: (radius + margin) * 2,
  };
  const originX = centerX - box.x;
  const originY = centerY - box.y;
  const start = -Math.PI * 0.62;
  const sweep = Math.PI * 2 * 0.92;
  const pointAt = (angle: number) => {
    const wobble = 1 + Math.sin(angle * 3 + 0.8) * 0.022 + Math.sin(angle * 5 + 2.1) * 0.012;
    return {
      x: originX + Math.cos(angle) * radius * wobble,
      y: originY + Math.sin(angle) * radius * wobble * 0.965,
    };
  };
  return buildScorchHintMark(box, scale, pageHeight, (context) => {
    const steps = Math.max(48, Math.round(radius * 1.4));
    const nibAngle = -Math.PI / 4;
    let previous = pointAt(start);
    for (let step = 1; step <= steps; step += 1) {
      const angle = start + sweep * step / steps;
      const point = pointAt(angle);
      const direction = Math.atan2(point.y - previous.y, point.x - previous.x);
      context.lineWidth = 0.75 + 0.8 * Math.abs(Math.sin(direction - nibAngle));
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      previous = point;
    }
    // Where the nib would touch down.
    const origin = pointAt(start);
    context.beginPath();
    context.arc(origin.x, origin.y, 2.1, 0, Math.PI * 2);
    context.fill();
    // A barb at the end shows which way the circle runs.
    const end = pointAt(start + sweep);
    const before = pointAt(start + sweep - 0.06);
    const heading = Math.atan2(end.y - before.y, end.x - before.x);
    const barb = Math.max(6, radius * 0.11);
    context.lineWidth = 1.15;
    context.beginPath();
    context.moveTo(end.x - Math.cos(heading - 0.55) * barb, end.y - Math.sin(heading - 0.55) * barb);
    context.lineTo(end.x, end.y);
    context.lineTo(end.x - Math.cos(heading + 0.55) * barb, end.y - Math.sin(heading + 0.55) * barb);
    context.stroke();
  }, (x, y) => {
    const angle = Math.atan2(y - originY, x - originX);
    let travelled = angle - start;
    while (travelled < 0) travelled += Math.PI * 2;
    while (travelled >= Math.PI * 2) travelled -= Math.PI * 2;
    if (travelled <= sweep) return travelled / sweep;
    // The gap between the end and the start: the half nearer the start belongs
    // to the touch-down, so the dot does not arrive in two halves.
    return travelled > sweep + (Math.PI * 2 - sweep) * 0.5 ? 0 : 1;
  });
}
