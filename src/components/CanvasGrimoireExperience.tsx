import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { Locale, SiteContent } from "../content/site";
import {
  PhysicalInkTextRenderer,
  type PhysicalInkTextRun,
} from "./grimoire/PhysicalInkTextRenderer";

type ViewId = "home" | "work" | "career" | "products" | "contact";
type InkPoint = { x: number; y: number; width: number; time: number };
type CanvasSize = { width: number; height: number; dpr: number };
type Cast = { x: number; y: number; name: string; serial: number };
type VisualState = {
  active: number;
  chapterPhase: number;
  magicPhase: number;
  awakened: boolean;
  points: InkPoint[];
  cast: Cast;
};
type ActionSpot = {
  label: string;
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const VIEW_IDS: ViewId[] = ["home", "work", "career", "products", "contact"];
const ROMAN = ["I", "II", "III", "IV", "V"];
const INK = "#2d1c13";
const INK_SOFT = "rgba(53, 31, 20, .72)";
const INK_FAINT = "rgba(58, 34, 21, .34)";
const AWAKENED_INK = "#5b2d24";

const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/Ischca" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/shota-watanabe-16547a20b/" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/shotawatanabe" },
  { label: "X", href: "https://twitter.com/ischca_dev" },
];

const COPY = {
  ja: {
    volume: "技術者の記録 · 二〇一六—",
    title: "仕組みをつくり、\n長く生かすための書。",
    home: "序文",
    work: "依頼できる仕事",
    career: "これまでの経歴",
    products: "制作したもの",
    contact: "連絡のための余白",
    homeCopy:
      "バックエンド、データ、クラウド、そして個人でつくる道具。ここには、仕事と制作のあいだで積み重ねてきた記録を収めています。",
    maxim: "複雑さは隠さず、扱える形までほどいていく。",
    draw: "余白へ線を刻むと、伏せられたインクが目を覚ます",
    awake: "不可視の墨が現れた",
    keyboard: "章はローマ数字、または左右キーで選べます。",
    folio: "葉",
    productLink: "銘をたどる",
    correspondence: "条件が合いそうなら、テキストで声をかけてください。",
    hidden: "線は命令ではない。紙が覚えていた形を、ただ呼び戻す。",
  },
  en: {
    volume: "AN ENGINEER'S RECORD · MMXVI—",
    title: "Systems made to remain\nuseful after their making.",
    home: "Preface",
    work: "Work I take on",
    career: "Career record",
    products: "Things made",
    contact: "A margin for correspondence",
    homeCopy:
      "Backend systems, data, cloud infrastructure, and independently made tools. These leaves hold a record of the work accumulated between practice and making.",
    maxim: "Do not hide complexity. Unbind it until it can be handled.",
    draw: "Inscribe a line in the margin to wake the ink beneath it",
    awake: "The invisible ink has appeared",
    keyboard: "Choose a chapter by its Roman numeral or with the arrow keys.",
    folio: "fol.",
    productLink: "follow the mark",
    correspondence: "If the conditions fit, begin with a written note.",
    hidden: "The line is no command. It only recalls a figure the skin remembered.",
  },
} as const;

const FONT_JA = '"Ischca Yuji Syuku", "YuMincho", "Hiragino Mincho ProN", serif';
const FONT_EN = '"Ischca Yuji Syuku", "Iowan Old Style", "Baskerville", Georgia, serif';
const FONT_HAND_JA = '"Ischca Yuji Syuku", "YuMincho", "Hiragino Mincho ProN", serif';
const FONT_HAND_EN = '"Ischca Yuji Syuku", "Iowan Old Style", "Baskerville", Georgia, serif';
const FONT_REFERENCE = '"Ischca Noto Serif JP", "YuMincho", "Hiragino Mincho ProN", serif';

type InkTextCollection = {
  runs: PhysicalInkTextRun[];
  locale: Locale;
  dpr: number;
};

const INK_TEXT_COLLECTIONS = new WeakMap<CanvasRenderingContext2D, InkTextCollection>();

type MaterialLayer = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dpr: number;
  textureVersion: number;
};
type InkSurfaceLayer = MaterialLayer & {
  absorption: HTMLCanvasElement;
  relief: HTMLCanvasElement;
  grooves: HTMLCanvasElement;
  surface: HTMLCanvasElement;
};

// The skin is a material, not an animation. Baking it once keeps inscription
// latency independent from the hundreds of fibres and pores in the surface.
const MATERIAL_LAYERS = new WeakMap<HTMLCanvasElement, MaterialLayer>();
const INK_SURFACE_LAYERS = new WeakMap<HTMLCanvasElement, InkSurfaceLayer>();
let vellumTexture: HTMLImageElement | null = null;
let vellumTextureVersion = 0;
let vellumTextureRetries = 0;

function loadVellumTexture(onReady: () => void) {
  if (vellumTexture?.complete && vellumTexture.naturalWidth > 0) return onReady();
  if (vellumTexture?.complete) vellumTexture = null;
  if (vellumTexture) {
    vellumTexture.addEventListener("load", onReady, { once: true });
    return;
  }
  const image = new Image();
  vellumTexture = image;
  image.decoding = "async";
  image.addEventListener("load", () => {
    vellumTextureRetries = 0;
    vellumTextureVersion += 1;
    onReady();
  }, { once: true });
  image.addEventListener("error", () => {
    if (vellumTexture !== image) return;
    vellumTexture = null;
    if (vellumTextureRetries >= 2) return;
    vellumTextureRetries += 1;
    window.setTimeout(() => loadVellumTexture(onReady), vellumTextureRetries * 900);
  }, { once: true });
  image.src = "/textures/vellum-aged-v1.webp";
}

function hash(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(minimum: number, value: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function font(locale: Locale, size: number, weight = 400, italic = false) {
  return `${italic ? "italic " : ""}${weight} ${size}px ${locale === "ja" ? FONT_JA : FONT_EN}`;
}

function handFont(locale: Locale, size: number) {
  return `italic 400 ${size}px ${locale === "ja" ? FONT_HAND_JA : FONT_HAND_EN}`;
}

function referenceFont(size: number, weight = 400, italic = false) {
  return `${italic ? "italic " : ""}${weight} ${size}px ${FONT_REFERENCE}`;
}

function wrapLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = Number.POSITIVE_INFINITY,
) {
  // Japanese prose can contain Latin product names and therefore spaces.  A
  // whitespace-only heuristic turns the whole Japanese sentence into one
  // token and makes Canvas squeeze it into a single line.  Treat any CJK-rich
  // string as grapheme-set text so the handwritten column wraps naturally.
  const cjk = /[\u3000-\u30ff\u3400-\u9fff]/u.test(text);
  const tokens = cjk ? Array.from(text) : text.split(/(\s+)/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const token of tokens) {
    const candidate = `${line}${token}`;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line.trimEnd());
      line = token.trimStart();
      if (lines.length >= maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line.trimEnd());
  if (lines.length === maxLines && tokens.length > 0) {
    const last = lines.at(-1);
    if (last && context.measureText(text).width > maxWidth * maxLines) {
      lines[lines.length - 1] = `${last.replace(/[\s。、,.]*$/, "")}…`;
    }
  }
  return lines;
}

function drawInkLine(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    color?: string;
    align?: CanvasTextAlign;
    alpha?: number;
    maxWidth?: number;
    letterSpacing?: number;
    pressure?: number;
    absorption?: number;
    seed?: number;
    family?: "manuscript" | "reference";
  } = {},
) {
  context.save();
  context.textAlign = options.align ?? "left";
  context.textBaseline = "alphabetic";
  context.globalAlpha *= options.alpha ?? 1;
  context.fillStyle = options.color ?? INK;
  const collection = INK_TEXT_COLLECTIONS.get(context);
  if (collection) {
    const transform = context.getTransform();
    const dpr = Math.max(1, collection.dpr);
    const transformedX = (transform.a * x + transform.c * y + transform.e) / dpr;
    const transformedY = (transform.b * x + transform.d * y + transform.f) / dpr;
    const scaleX = Math.hypot(transform.a, transform.b) / dpr;
    const scaleY = Math.hypot(transform.c, transform.d) / dpr;
    const fontDescription = parseCanvasFont(context.font);
    const pigment = parseCanvasColor(String(context.fillStyle));
    collection.runs.push({
      text,
      x: transformedX,
      y: transformedY,
      size: fontDescription.size * Math.sqrt(Math.max(0.0001, scaleX * scaleY)),
      color: pigment.color,
      alpha: clamp(0, context.globalAlpha * pigment.alpha, 1),
      align: canvasTextAlign(context.textAlign, collection.locale),
      maxWidth: options.maxWidth ? options.maxWidth * scaleX : undefined,
      letterSpacing: options.letterSpacing,
      weight: fontDescription.weight,
      italic: fontDescription.italic,
      rotation: Math.atan2(transform.b, transform.a),
      pressure: options.pressure,
      absorption: options.absorption,
      seed: options.seed,
      locale: collection.locale,
      family: options.family ?? "manuscript",
      whiteSpace: "nowrap",
      overflowWrap: "normal",
    });
  } else if (options.maxWidth) context.fillText(text, x, y, options.maxWidth);
  else context.fillText(text, x, y);
  context.restore();
}

function parseCanvasFont(value: string) {
  const size = Number(/([\d.]+)px/u.exec(value)?.[1] ?? 16);
  const numericWeight = /\b([1-9]00)\b/u.exec(value)?.[1];
  const weight = numericWeight
    ? Number(numericWeight)
    : /\bbold\b/u.test(value) ? 700 : 400;
  return {
    size,
    weight,
    italic: /\b(?:italic|oblique)\b/u.test(value),
  };
}

function parseCanvasColor(value: string) {
  const rgba = /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/iu.exec(value);
  if (!rgba) return { color: value, alpha: 1 };
  return {
    color: `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`,
    alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
  };
}

function canvasTextAlign(align: CanvasTextAlign, locale: Locale): "left" | "center" | "right" {
  if (align === "center") return "center";
  if (align === "right" || align === "end") return "right";
  if (align === "left" || align === "start") return "left";
  return locale === "ja" ? "left" : "left";
}

function drawWrapped(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options: {
    maxLines?: number;
    color?: string;
    alpha?: number;
    align?: CanvasTextAlign;
  } = {},
) {
  const lines = wrapLines(context, text, maxWidth, options.maxLines);
  lines.forEach((line, index) => {
    drawInkLine(context, line, x, y + index * lineHeight, {
      color: options.color,
      alpha: options.alpha,
      align: options.align,
      maxWidth,
    });
  });
  return y + lines.length * lineHeight;
}

function drawRoughHeading(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  size: number,
  locale: Locale,
  lineHeight = size * 1.28,
) {
  context.save();
  context.font = font(locale, size, 400);
  lines.forEach((line, lineIndex) => {
    drawInkLine(context, line, x, y + lineIndex * lineHeight, {
      alpha: 0.96,
      letterSpacing: locale === "ja" ? 0.045 : 0.012,
      pressure: 0.68,
      absorption: 0.72,
      seed: 47 + lineIndex * 31,
    });
  });
  context.restore();
}

function paperBounds(width: number, height: number) {
  const narrow = width < 700;
  const x = narrow ? 8 : clamp(18, width * 0.026, 36);
  const y = narrow ? 10 : clamp(16, height * 0.028, 28);
  return { x, y, width: width - x * 2, height: height - y * 2 };
}

function paperPath(width: number, height: number) {
  const bounds = paperBounds(width, height);
  const { x, y } = bounds;
  const right = x + bounds.width;
  const bottom = y + bounds.height;
  const path = new Path2D();
  const stepsX = Math.max(16, Math.floor(bounds.width / 54));
  const stepsY = Math.max(12, Math.floor(bounds.height / 48));
  const corner = Math.min(22, bounds.width * 0.04);

  path.moveTo(x + corner, y + (hash(1) - 0.5) * 5);
  for (let index = 1; index <= stepsX; index += 1) {
    const progress = index / stepsX;
    const px = x + corner + (bounds.width - corner * 2) * progress;
    const py = y + (hash(index + 2) - 0.5) * 7 + Math.sin(progress * 11) * 1.5;
    path.lineTo(px, py);
  }
  path.quadraticCurveTo(right + 2, y + 2, right + (hash(91) - 0.5) * 7, y + corner);
  for (let index = 1; index <= stepsY; index += 1) {
    const progress = index / stepsY;
    const px = right + (hash(index + 103) - 0.5) * 7 + Math.sin(progress * 13) * 1.2;
    const py = y + corner + (bounds.height - corner * 2) * progress;
    path.lineTo(px, py);
  }
  path.quadraticCurveTo(right - 1, bottom + 3, right - corner, bottom + (hash(191) - 0.5) * 6);
  for (let index = stepsX; index >= 0; index -= 1) {
    const progress = index / stepsX;
    const px = x + corner + (bounds.width - corner * 2) * progress;
    const py = bottom + (hash(index + 211) - 0.5) * 8 + Math.sin(progress * 17) * 1.3;
    path.lineTo(px, py);
  }
  path.quadraticCurveTo(x - 3, bottom - 1, x + (hash(301) - 0.5) * 7, bottom - corner);
  for (let index = stepsY; index >= 0; index -= 1) {
    const progress = index / stepsY;
    const px = x + (hash(index + 319) - 0.5) * 8 + Math.sin(progress * 9) * 1.4;
    const py = y + corner + (bounds.height - corner * 2) * progress;
    path.lineTo(px, py);
  }
  path.quadraticCurveTo(x - 1, y - 2, x + corner, y + (hash(401) - 0.5) * 5);
  path.closePath();
  return path;
}

function vellumTextureSource(bounds: ReturnType<typeof paperBounds>) {
  if (!vellumTexture || vellumTexture.naturalWidth <= 0) return null;
  const sourceRatio = vellumTexture.naturalWidth / vellumTexture.naturalHeight;
  const targetRatio = bounds.width / bounds.height;
  let x = 0;
  let y = 0;
  let width = vellumTexture.naturalWidth;
  let height = vellumTexture.naturalHeight;
  if (sourceRatio > targetRatio) {
    width = height * targetRatio;
    x = (vellumTexture.naturalWidth - width) * 0.5;
  } else {
    height = width / targetRatio;
    y = (vellumTexture.naturalHeight - height) * 0.5;
  }
  return { x, y, width, height };
}

function drawVellumTexture(context: CanvasRenderingContext2D, bounds: ReturnType<typeof paperBounds>) {
  const source = vellumTextureSource(bounds);
  if (!source || !vellumTexture) return false;
  context.drawImage(
    vellumTexture,
    source.x,
    source.y,
    source.width,
    source.height,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  );
  return true;
}

function vellumReliefMap(bounds: ReturnType<typeof paperBounds>) {
  const sourceCrop = vellumTextureSource(bounds);
  if (!sourceCrop || !vellumTexture) return null;
  const scale = Math.min(1, 1100 / Math.max(bounds.width, bounds.height));
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  const source = document.createElement("canvas");
  const softened = document.createElement("canvas");
  const relief = document.createElement("canvas");
  source.width = softened.width = relief.width = width;
  source.height = softened.height = relief.height = height;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  const softenedContext = softened.getContext("2d", { willReadFrequently: true });
  const reliefContext = relief.getContext("2d");
  if (!sourceContext || !softenedContext || !reliefContext) return null;

  sourceContext.filter = "grayscale(1)";
  sourceContext.drawImage(
    vellumTexture,
    sourceCrop.x,
    sourceCrop.y,
    sourceCrop.width,
    sourceCrop.height,
    0,
    0,
    width,
    height,
  );
  softenedContext.filter = `blur(${Math.max(3, 7 * scale)}px)`;
  softenedContext.drawImage(source, 0, 0);
  const sourcePixels = sourceContext.getImageData(0, 0, width, height);
  const softenedPixels = softenedContext.getImageData(0, 0, width, height);
  const output = reliefContext.createImageData(width, height);
  for (let index = 0; index < output.data.length; index += 4) {
    const luma = (
      sourcePixels.data[index] * 0.2126
      + sourcePixels.data[index + 1] * 0.7152
      + sourcePixels.data[index + 2] * 0.0722
    ) / 255;
    const low = softenedPixels.data[index] / 255;
    const localRelief = luma - low;
    const thickness = low - 0.565;
    const shade = clamp(-0.22, localRelief * 2.05 + thickness * 0.3, 0.18);
    const neutral = Math.round(clamp(50, 128 + shade * 380, 198));
    output.data[index] = neutral;
    output.data[index + 1] = neutral;
    output.data[index + 2] = neutral;
    output.data[index + 3] = 255;
  }
  reliefContext.putImageData(output, 0, 0);
  return relief;
}

function drawDesk(context: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = context.createRadialGradient(width * 0.45, height * 0.36, 20, width * 0.48, height * 0.5, Math.max(width, height));
  gradient.addColorStop(0, "#2b211b");
  gradient.addColorStop(0.55, "#18120f");
  gradient.addColorStop(1, "#090706");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.12;
  context.strokeStyle = "#8d6b4b";
  for (let index = 0; index < 34; index += 1) {
    const y = hash(index + 701) * height;
    const drift = (hash(index + 733) - 0.5) * 24;
    context.lineWidth = 0.35 + hash(index + 751) * 0.7;
    context.beginPath();
    context.moveTo(-20, y);
    context.bezierCurveTo(width * 0.28, y + drift, width * 0.7, y - drift * 0.6, width + 20, y + drift * 0.3);
    context.stroke();
  }
  context.restore();
}

function drawParchment(context: CanvasRenderingContext2D, width: number, height: number) {
  const path = paperPath(width, height);
  const bounds = paperBounds(width, height);

  context.save();
  context.shadowColor = "rgba(0, 0, 0, .62)";
  context.shadowBlur = width < 700 ? 18 : 36;
  context.shadowOffsetX = width < 700 ? 2 : 8;
  context.shadowOffsetY = width < 700 ? 8 : 18;
  context.fillStyle = "#b3935f";
  context.fill(path);
  context.restore();

  context.save();
  context.clip(path);
  const base = context.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height);
  base.addColorStop(0, "#f3efe5");
  base.addColorStop(0.24, "#eee8dc");
  base.addColorStop(0.57, "#f6f2e9");
  base.addColorStop(0.82, "#ece5d9");
  base.addColorStop(1, "#e5dccb");
  context.fillStyle = base;
  context.fillRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);

  if (vellumTexture?.complete && vellumTexture.naturalWidth > 0) {
    // The photograph supplies only height and fibre information.  The pale
    // vellum colour comes from the base above, so the result reads as one
    // material rather than a photo used as a page background.
    const relief = vellumReliefMap(bounds);
    if (relief) {
      context.save();
      context.globalCompositeOperation = "soft-light";
      context.globalAlpha = 0.64;
      context.drawImage(relief, bounds.x, bounds.y, bounds.width, bounds.height);
      context.restore();
    }

    context.save();
    context.globalCompositeOperation = "multiply";
    context.globalAlpha = 0.045;
    context.filter = "grayscale(1) brightness(1.55) contrast(1.55)";
    drawVellumTexture(context, bounds);
    context.restore();

  }

  const glow = context.createRadialGradient(
    bounds.x + bounds.width * 0.42,
    bounds.y + bounds.height * 0.38,
    0,
    bounds.x + bounds.width * 0.42,
    bounds.y + bounds.height * 0.38,
    Math.max(bounds.width, bounds.height) * 0.73,
  );
  glow.addColorStop(0, "rgba(255, 253, 247, .16)");
  glow.addColorStop(0.62, "rgba(116, 87, 53, .018)");
  glow.addColorStop(1, "rgba(57, 38, 23, .13)");
  context.fillStyle = glow;
  context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

  // Long animal-skin fibres, deliberately non-uniform and slightly directional.
  context.globalCompositeOperation = "multiply";
  for (let index = 0; index < 82; index += 1) {
    const px = bounds.x + hash(index + 811) * bounds.width;
    const py = bounds.y + hash(index + 829) * bounds.height;
    const length = 12 + hash(index + 853) * 105;
    const bend = (hash(index + 877) - 0.5) * 15;
    context.strokeStyle = `rgba(79, 48, 25, ${0.012 + hash(index + 887) * 0.022})`;
    context.lineWidth = 0.25 + hash(index + 907) * 0.55;
    context.beginPath();
    context.moveTo(px, py);
    context.quadraticCurveTo(px + length * 0.52, py + bend, px + length, py + bend * 0.26);
    context.stroke();
  }
  for (let index = 0; index < 190; index += 1) {
    const px = bounds.x + hash(index + 941) * bounds.width;
    const py = bounds.y + hash(index + 977) * bounds.height;
    const radius = 0.18 + hash(index + 991) * 0.75;
    context.fillStyle = `rgba(67, 38, 20, ${0.018 + hash(index + 1013) * 0.045})`;
    context.beginPath();
    context.ellipse(px, py, radius * 1.8, radius, hash(index + 1031) * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  const stainSpecs = [
    [0.11, 0.17, 0.17, 0.06],
    [0.87, 0.78, 0.21, 0.045],
    [0.57, 0.08, 0.12, 0.025],
  ] as const;
  stainSpecs.forEach(([sx, sy, radius, opacity], index) => {
    const stain = context.createRadialGradient(
      bounds.x + bounds.width * sx,
      bounds.y + bounds.height * sy,
      0,
      bounds.x + bounds.width * sx,
      bounds.y + bounds.height * sy,
      Math.max(bounds.width, bounds.height) * radius,
    );
    stain.addColorStop(0, `rgba(84, 45, 18, ${opacity})`);
    stain.addColorStop(0.45, `rgba(91, 48, 19, ${opacity * 0.42})`);
    stain.addColorStop(1, "rgba(91, 48, 19, 0)");
    context.fillStyle = stain;
    context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    if (index === 1) context.globalAlpha = 0.96;
  });

  context.globalCompositeOperation = "screen";
  context.strokeStyle = "rgba(255, 237, 174, .15)";
  context.lineWidth = 1.1;
  context.beginPath();
  context.moveTo(bounds.x + bounds.width * 0.08, bounds.y + bounds.height * 0.72);
  context.bezierCurveTo(
    bounds.x + bounds.width * 0.24,
    bounds.y + bounds.height * 0.69,
    bounds.x + bounds.width * 0.31,
    bounds.y + bounds.height * 0.75,
    bounds.x + bounds.width * 0.46,
    bounds.y + bounds.height * 0.71,
  );
  context.stroke();
  context.beginPath();
  context.moveTo(bounds.x + bounds.width * 0.73, bounds.y + bounds.height * 0.1);
  context.bezierCurveTo(
    bounds.x + bounds.width * 0.75,
    bounds.y + bounds.height * 0.32,
    bounds.x + bounds.width * 0.71,
    bounds.y + bounds.height * 0.48,
    bounds.x + bounds.width * 0.76,
    bounds.y + bounds.height * 0.66,
  );
  context.stroke();
  context.restore();

  context.save();
  context.strokeStyle = "rgba(65, 35, 17, .31)";
  context.lineWidth = 0.72;
  context.stroke(path);
  context.restore();
}

function materialLayer(canvas: HTMLCanvasElement, size: CanvasSize) {
  const cached = MATERIAL_LAYERS.get(canvas);
  if (
    cached
    && cached.width === size.width
    && cached.height === size.height
    && cached.dpr === size.dpr
    && cached.textureVersion === vellumTextureVersion
  ) return cached.canvas;

  const layer = document.createElement("canvas");
  layer.width = Math.max(1, Math.round(size.width * size.dpr));
  layer.height = Math.max(1, Math.round(size.height * size.dpr));
  const context = layer.getContext("2d");
  if (!context) return layer;
  context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  drawDesk(context, size.width, size.height);
  drawParchment(context, size.width, size.height);
  MATERIAL_LAYERS.set(canvas, { canvas: layer, ...size, textureVersion: vellumTextureVersion });
  return layer;
}

function inkSurfaceLayer(canvas: HTMLCanvasElement, size: CanvasSize) {
  const cached = INK_SURFACE_LAYERS.get(canvas);
  if (
    cached
    && cached.width === size.width
    && cached.height === size.height
    && cached.dpr === size.dpr
    && cached.textureVersion === vellumTextureVersion
  ) return cached;

  const layer = document.createElement("canvas");
  const absorption = document.createElement("canvas");
  const relief = document.createElement("canvas");
  const grooves = document.createElement("canvas");
  const surface = document.createElement("canvas");
  layer.width = absorption.width = relief.width = grooves.width = surface.width = Math.max(1, Math.round(size.width * size.dpr));
  layer.height = absorption.height = relief.height = grooves.height = surface.height = Math.max(1, Math.round(size.height * size.dpr));

  const surfaceContext = surface.getContext("2d");
  const bounds = paperBounds(size.width, size.height);
  const surfaceRelief = vellumReliefMap(bounds);
  if (surfaceContext && surfaceRelief) {
    surfaceContext.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    surfaceContext.save();
    surfaceContext.clip(paperPath(size.width, size.height));
    surfaceContext.drawImage(surfaceRelief, bounds.x, bounds.y, bounds.width, bounds.height);
    surfaceContext.restore();
  }
  const mask = absorption.getContext("2d");
  if (mask) {
    mask.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    mask.save();
    mask.clip(paperPath(size.width, size.height));

    if (vellumTexture?.complete && vellumTexture.naturalWidth > 0) {
      const reliefContext = relief.getContext("2d");
      if (reliefContext) {
        reliefContext.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
        reliefContext.save();
        reliefContext.clip(paperPath(size.width, size.height));
        reliefContext.filter = "grayscale(1) brightness(.88) contrast(1.6)";
        drawVellumTexture(reliefContext, bounds);
        reliefContext.restore();

        // High fibres resist ink.  Derive that resistance from the same
        // photographic relief used to light the parchment, once per resize.
        reliefContext.setTransform(1, 0, 0, 1, 0, 0);
        const pixels = reliefContext.getImageData(0, 0, relief.width, relief.height);
        const grooveContext = grooves.getContext("2d");
        const groovePixels = grooveContext?.createImageData(grooves.width, grooves.height);
        for (let index = 0; index < pixels.data.length; index += 4) {
          const alpha = pixels.data[index + 3];
          if (alpha === 0) continue;
          const luma = (
            pixels.data[index] * 0.2126
            + pixels.data[index + 1] * 0.7152
            + pixels.data[index + 2] * 0.0722
          ) / 255;
          const resistance = clamp(0, (luma - 0.54) / 0.36, 1);
          const deposit = clamp(0, (0.47 - luma) / 0.3, 1);
          pixels.data[index] = 0;
          pixels.data[index + 1] = 0;
          pixels.data[index + 2] = 0;
          pixels.data[index + 3] = Math.round(resistance * 38);
          if (groovePixels) {
            groovePixels.data[index] = 39;
            groovePixels.data[index + 1] = 22;
            groovePixels.data[index + 2] = 15;
            groovePixels.data[index + 3] = Math.round(deposit * 34);
          }
        }
        reliefContext.putImageData(pixels, 0, 0);
        if (grooveContext && groovePixels) grooveContext.putImageData(groovePixels, 0, 0);
        mask.setTransform(1, 0, 0, 1, 0, 0);
        mask.drawImage(relief, 0, 0);
        mask.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      }
    }

    const poreCount = Math.round(clamp(720, size.width * size.height / 520, 2100));
    for (let index = 0; index < poreCount; index += 1) {
      const x = hash(index + 1901) * size.width;
      const y = hash(index + 1933) * size.height;
      const radius = .14 + hash(index + 1973) * .68;
      mask.fillStyle = `rgba(0,0,0,${.025 + hash(index + 1997) * .11})`;
      mask.beginPath();
      mask.ellipse(x, y, radius * (1.1 + hash(index + 2017)), radius, hash(index + 2029) * Math.PI, 0, Math.PI * 2);
      mask.fill();
    }
    for (let index = 0; index < 95; index += 1) {
      const x = hash(index + 2053) * size.width;
      const y = hash(index + 2081) * size.height;
      const length = 12 + hash(index + 2099) * 82;
      mask.strokeStyle = `rgba(0,0,0,${.025 + hash(index + 2111) * .055})`;
      mask.lineWidth = .24 + hash(index + 2141) * .42;
      mask.beginPath();
      mask.moveTo(x, y);
      mask.quadraticCurveTo(x + length * .48, y + (hash(index + 2153) - .5) * 5, x + length, y + (hash(index + 2179) - .5) * 3);
      mask.stroke();
    }
    mask.restore();
  }
  const next = { canvas: layer, absorption, relief, grooves, surface, ...size, textureVersion: vellumTextureVersion };
  INK_SURFACE_LAYERS.set(canvas, next);
  return next;
}

function navPositions(width: number, height: number) {
  const narrow = width < 700;
  if (narrow) {
    return [
      { x: width * 0.105, y: height * 0.105, angle: -0.14 },
      { x: width * 0.095, y: height * 0.83, angle: 0.1 },
      { x: width * 0.895, y: height * 0.145, angle: 0.08 },
      { x: width * 0.69, y: height * 0.915, angle: -0.08 },
      { x: width * 0.91, y: height * 0.735, angle: 0.13 },
    ];
  }
  return [
    { x: width * 0.076, y: height * 0.16, angle: -0.18 },
    { x: width * 0.13, y: height * 0.82, angle: 0.1 },
    { x: width * 0.91, y: height * 0.19, angle: 0.11 },
    { x: width * 0.73, y: height * 0.91, angle: -0.08 },
    { x: width * 0.938, y: height * 0.69, angle: 0.15 },
  ];
}

function drawNavigation(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  locale: Locale,
  labels: string[],
  active: number,
  awakened: boolean,
) {
  const positions = navPositions(width, height);
  const narrow = width < 700;
  positions.forEach((position, index) => {
    context.save();
    context.translate(position.x, position.y);
    context.rotate(position.angle);
    context.font = font(locale, active === index ? (narrow ? 25 : 29) : (narrow ? 19 : 21), 400);
    drawInkLine(context, ROMAN[index], 0, 0, {
      align: "center",
      color: active === index && awakened ? AWAKENED_INK : INK,
      alpha: active === index ? 0.95 : 0.57,
    });
    context.font = `${narrow ? 8 : 9}px ${locale === "ja" ? FONT_JA : FONT_EN}`;
    const labelY = index === 3 ? -18 : 17;
    drawInkLine(context, labels[index], 0, labelY, {
      align: "center",
      alpha: active === index ? 0.62 : 0.33,
      maxWidth: narrow ? 72 : 92,
    });
    if (active === index) {
      context.strokeStyle = awakened ? "rgba(107,37,29,.48)" : "rgba(45,28,19,.45)";
      context.lineWidth = 0.85;
      context.beginPath();
      context.moveTo(-14, 7);
      context.bezierCurveTo(-6, 10, 4, 4, 16, 7);
      context.stroke();
    }
    context.restore();
  });
}

function drawFolio(context: CanvasRenderingContext2D, width: number, height: number, locale: Locale, active: number) {
  context.save();
  context.font = referenceFont(width < 700 ? 8.5 : 9.5, 400, true);
  context.rotate(-0.015);
  drawInkLine(context, `ISCHCA · ${COPY[locale].folio} ${String(active + 1).padStart(2, "0")} · JAPONIA`, width * 0.5, height * 0.065, {
    align: "center",
    alpha: 0.45,
    family: "reference",
  });
  context.restore();
}

function drawLooseRule(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  seed: number,
  alpha = 0.22,
) {
  context.save();
  context.strokeStyle = `rgba(51, 29, 18, ${alpha})`;
  context.lineWidth = 0.65;
  context.beginPath();
  context.moveTo(x, y);
  context.bezierCurveTo(
    x + width * 0.24,
    y + (hash(seed) - 0.5) * 8,
    x + width * 0.67,
    y + (hash(seed + 1) - 0.5) * 7,
    x + width,
    y + (hash(seed + 2) - 0.5) * 3,
  );
  context.stroke();
  context.restore();
}

function drawHome(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  content: SiteContent,
  locale: Locale,
) {
  const copy = COPY[locale];
  const narrow = width < 700;
  context.save();
  context.font = font(locale, narrow ? 9 : 10, 400, true);
  drawInkLine(context, copy.volume, width * (narrow ? 0.17 : 0.14), height * (narrow ? 0.15 : 0.13), { alpha: 0.58 });

  drawRoughHeading(
    context,
    copy.title.split("\n"),
    width * (narrow ? 0.15 : 0.16),
    height * (narrow ? 0.235 : 0.25),
    narrow && locale === "en" ? 22 : narrow ? 27 : clamp(34, width * 0.038, 49),
    locale,
  );

  context.font = font(locale, narrow ? 11.5 : 13.5);
  drawWrapped(
    context,
    content.hero.introduction,
    width * (narrow ? 0.19 : 0.2),
    height * (narrow ? 0.41 : 0.45),
    width * (narrow ? 0.65 : 0.39),
    narrow ? 20 : 23,
    { maxLines: narrow ? 7 : 6, color: INK_SOFT },
  );

  context.save();
  context.translate(
    width * (narrow ? 0.18 : 0.66),
    height * (narrow ? 0.63 : locale === "en" ? 0.34 : 0.285),
  );
  context.rotate(narrow ? -0.035 : 0.035);
  context.font = handFont(locale, narrow ? 13 : 15);
  drawWrapped(context, copy.maxim, 0, 0, width * (narrow ? 0.59 : 0.22), narrow ? 22 : 24, {
    maxLines: 4,
    color: "rgba(60,35,20,.67)",
  });
  drawLooseRule(context, -6, narrow ? 72 : 67, width * (narrow ? 0.53 : 0.19), 117, 0.2);
  context.restore();

  const facts = [
    [content.hero.experienceLabel, content.hero.experienceValue],
    [content.hero.focusLabel, content.hero.focusValue],
    [content.hero.communicationLabel, content.hero.communicationValue],
  ];
  const positions = narrow
    ? [
        [0.18, 0.78, -0.07],
        [0.49, 0.73, 0.025],
        [0.58, 0.84, -0.035],
      ]
    : [
        [0.6, 0.62, -0.05],
        [0.74, 0.73, 0.025],
        [0.82, 0.55, -0.025],
      ];
  facts.forEach(([label, value], index) => {
    const [px, py, angle] = positions[index];
    context.save();
    context.translate(width * px, height * py);
    context.rotate(angle);
    context.font = font(locale, narrow ? 8.5 : 9, 400, true);
    drawInkLine(context, label, 0, 0, { alpha: 0.45 });
    context.font = font(locale, narrow ? 12 : 14, 600);
    drawInkLine(context, value, 0, narrow ? 17 : 20, {
      alpha: 0.84,
      maxWidth: width * (narrow ? 0.27 : index === 2 ? 0.14 : 0.2),
    });
    context.restore();
  });
  context.restore();
}

function drawWork(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  content: SiteContent,
  locale: Locale,
) {
  const narrow = width < 700;
  const positions = narrow
    ? [
        { x: 0.14, y: 0.29, width: 0.67, angle: -0.015 },
        { x: 0.29, y: 0.51, width: 0.61, angle: 0.018 },
        { x: 0.13, y: 0.72, width: 0.68, angle: -0.01 },
      ]
    : [
        { x: 0.13, y: 0.34, width: 0.27, angle: -0.022 },
        { x: 0.4, y: 0.59, width: 0.29, angle: 0.015 },
        { x: 0.67, y: 0.31, width: 0.23, angle: -0.018 },
      ];

  context.save();
  context.font = referenceFont(narrow ? 9 : 10, 400, true);
  drawInkLine(context, "CAPUT II · OPERA", width * (narrow ? 0.16 : 0.18), height * 0.14, { alpha: 0.5, family: "reference" });
  drawRoughHeading(context, [COPY[locale].work], width * (narrow ? 0.16 : 0.18), height * (narrow ? 0.205 : 0.22), narrow ? 25 : 37, locale);

  context.save();
  context.strokeStyle = "rgba(66,39,22,.21)";
  context.setLineDash([1, 7]);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(width * positions[0].x + 8, height * positions[0].y - 22);
  context.bezierCurveTo(width * 0.27, height * 0.5, width * 0.47, height * 0.42, width * positions[1].x, height * positions[1].y - 24);
  context.bezierCurveTo(width * 0.61, height * 0.76, width * 0.69, height * 0.34, width * positions[2].x, height * positions[2].y - 20);
  context.stroke();
  context.restore();

  content.work.slice(0, 3).forEach((item, index) => {
    const position = positions[index];
    context.save();
    context.translate(width * position.x, height * position.y);
    context.rotate(position.angle);
    context.font = font(locale, narrow ? 38 : 51, 400);
    drawInkLine(context, ROMAN[index], -12, 0, { color: INK_FAINT, alpha: 0.45 });
    context.font = font(locale, narrow ? 15 : 18, 600);
    drawInkLine(context, item.title, narrow ? 20 : 27, 0, { maxWidth: width * position.width - 18, alpha: 0.92 });
    context.font = font(locale, narrow ? 10.5 : 11.5);
    const summaryY = drawWrapped(context, item.summary, narrow ? 20 : 27, narrow ? 24 : 28, width * position.width - 22, narrow ? 17 : 18, {
      maxLines: narrow ? 4 : 5,
      color: INK_SOFT,
    });
    context.font = referenceFont(narrow ? 8 : 8.7, 400, true);
    drawInkLine(context, item.stack, narrow ? 20 : 27, summaryY + 2, { alpha: 0.42, maxWidth: width * position.width - 22, family: "reference" });
    context.restore();
  });
  context.restore();
}

function drawCareer(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  content: SiteContent,
  locale: Locale,
) {
  const narrow = width < 700;
  const positions = narrow
    ? [
        [0.16, 0.28, -0.018],
        [0.43, 0.405, 0.02],
        [0.14, 0.535, -0.012],
        [0.42, 0.67, 0.017],
        [0.17, 0.80, -0.018],
      ]
    : [
        [0.15, 0.31, -0.018],
        [0.34, 0.57, 0.018],
        [0.49, 0.31, -0.012],
        [0.66, 0.58, 0.017],
        [0.75, 0.28, -0.018],
      ];

  context.save();
  context.font = referenceFont(narrow ? 9 : 10, 400, true);
  drawInkLine(context, "CAPUT III · CURSUS", width * (narrow ? 0.17 : 0.18), height * 0.14, { alpha: 0.5, family: "reference" });
  drawRoughHeading(context, [COPY[locale].career], width * (narrow ? 0.17 : 0.18), height * (narrow ? 0.205 : 0.22), narrow ? 24 : 36, locale);

  context.save();
  context.strokeStyle = "rgba(61,34,20,.27)";
  context.lineWidth = 1;
  context.beginPath();
  positions.forEach(([px, py], index) => {
    const x = width * px;
    const y = height * py - (narrow ? 16 : 24);
    if (index === 0) context.moveTo(x, y);
    else {
      const [previousX, previousY] = positions[index - 1];
      const controlX = width * ((previousX + px) / 2 + (index % 2 === 0 ? 0.08 : -0.06));
      context.quadraticCurveTo(controlX, height * ((previousY + py) / 2), x, y);
    }
  });
  context.stroke();
  context.restore();

  content.career.slice(0, 5).forEach((item, index) => {
    const [px, py, angle] = positions[index];
    context.save();
    context.translate(width * px, height * py);
    context.rotate(angle);
    context.fillStyle = index === 0 ? "rgba(94,35,25,.68)" : "rgba(47,28,18,.54)";
    context.beginPath();
    context.arc(0, narrow ? -17 : -25, index === 0 ? 3.1 : 2.2, 0, Math.PI * 2);
    context.fill();
    context.font = referenceFont(narrow ? 8 : 8.5, 400, true);
    drawInkLine(context, item.period, 0, 0, { alpha: 0.52, family: "reference" });
    context.font = font(locale, narrow ? 12.2 : 14.5, 600);
    drawInkLine(context, item.company, 0, narrow ? 17 : 20, { maxWidth: width * (narrow ? 0.47 : 0.18), alpha: 0.91 });
    context.font = referenceFont(narrow ? 8.5 : 9.2, 400, true);
    drawInkLine(context, item.role, 0, narrow ? 31 : 35, { maxWidth: width * (narrow ? 0.43 : 0.18), alpha: 0.58, family: "reference" });
    context.font = font(locale, narrow ? 8.8 : 9.5);
    drawWrapped(context, item.summary, 0, narrow ? 47 : 52, width * (narrow ? 0.44 : 0.17), narrow ? 14 : 15, {
      maxLines: narrow ? 3 : 4,
      color: INK_SOFT,
    });
    context.restore();
  });
  context.restore();
}

function actionSpots(active: number, width: number): ActionSpot[] {
  const narrow = width < 700;
  if (active === 3) {
    return [
      {
        label: "Restrict Language website",
        href: "https://ischca.github.io/restrict_lang/",
        x: narrow ? 0.19 : 0.205,
        y: narrow ? 0.48 : 0.615,
        width: narrow ? 0.27 : 0.12,
        height: 0.055,
      },
      {
        label: "Restrict Language GitHub",
        href: "https://github.com/Ischca/restrict_lang",
        x: narrow ? 0.5 : 0.335,
        y: narrow ? 0.48 : 0.615,
        width: narrow ? 0.22 : 0.095,
        height: 0.055,
      },
      {
        label: "PrismDiff website",
        href: "https://ischca.github.io/prismdiff/",
        x: narrow ? 0.31 : 0.615,
        y: narrow ? 0.78 : 0.665,
        width: narrow ? 0.27 : 0.12,
        height: 0.055,
      },
      {
        label: "PrismDiff GitHub",
        href: "https://github.com/Ischca/prismdiff",
        x: narrow ? 0.61 : 0.745,
        y: narrow ? 0.78 : 0.665,
        width: narrow ? 0.22 : 0.095,
        height: 0.055,
      },
    ];
  }
  if (active === 4) {
    const positions = narrow
      ? [
          [0.2, 0.48],
          [0.52, 0.58],
          [0.18, 0.69],
          [0.61, 0.75],
        ]
      : [
          [0.21, 0.57],
          [0.39, 0.68],
          [0.64, 0.62],
          [0.78, 0.48],
        ];
    return SOCIAL_LINKS.map((link, index) => ({
      ...link,
      x: positions[index][0],
      y: positions[index][1],
      width: narrow ? 0.26 : 0.12,
      height: 0.065,
    }));
  }
  return [];
}

function drawProducts(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  content: SiteContent,
  locale: Locale,
) {
  const narrow = width < 700;
  const centers = narrow
    ? [
        { x: 0.36, y: 0.36, radius: width * 0.21, angle: -0.022 },
        { x: 0.62, y: 0.67, radius: width * 0.22, angle: 0.025 },
      ]
    : [
        { x: 0.3, y: 0.43, radius: Math.min(width, height) * 0.205, angle: -0.022 },
        { x: 0.71, y: 0.52, radius: Math.min(width, height) * 0.22, angle: 0.025 },
      ];
  const spots = actionSpots(3, width);

  context.save();
  context.font = referenceFont(narrow ? 9 : 10, 400, true);
  drawInkLine(context, "CAPUT IV · ARTIFICIA", width * (narrow ? 0.16 : 0.18), height * 0.14, { alpha: 0.5, family: "reference" });
  drawRoughHeading(context, [COPY[locale].products], width * (narrow ? 0.16 : 0.18), height * (narrow ? 0.205 : 0.22), narrow ? 24 : 36, locale);

  content.products.slice(0, 2).forEach((product, index) => {
    const center = centers[index];
    const cx = width * center.x;
    const cy = height * center.y;
    context.save();
    context.translate(cx, cy);
    context.rotate(center.angle);
    context.strokeStyle = "rgba(55,31,18,.28)";
    context.lineWidth = 0.9;
    context.setLineDash([1, 6]);
    if (index === 0) {
      // A broken compiler genealogy: source enters at the left and forks
      // through three transformations rather than sitting in a card frame.
      context.beginPath();
      context.moveTo(-center.radius * 0.96, center.radius * 0.18);
      context.bezierCurveTo(-center.radius * 0.7, -center.radius * 0.12, -center.radius * 0.38, center.radius * 0.17, -center.radius * 0.12, 0);
      context.bezierCurveTo(center.radius * 0.14, -center.radius * 0.17, center.radius * 0.38, -center.radius * 0.45, center.radius * 0.86, -center.radius * 0.39);
      context.moveTo(-center.radius * 0.12, 0);
      context.bezierCurveTo(center.radius * 0.16, center.radius * 0.04, center.radius * 0.44, center.radius * 0.32, center.radius * 0.94, center.radius * 0.26);
      context.stroke();
      [[-0.96,0.18],[-0.12,0],[0.86,-0.39],[0.94,0.26]].forEach(([mx, my], mark) => {
        context.fillStyle = `rgba(50,28,17,${0.27 + mark * 0.035})`;
        context.beginPath();
        context.arc(center.radius * mx, center.radius * my, 1.5 + mark * 0.28, 0, Math.PI * 2);
        context.fill();
      });
    } else {
      // A refracted diff: two noisy manuscripts enter a skewed prism and only
      // a few meaningful rays leave it.
      context.beginPath();
      context.moveTo(-center.radius * 0.95, -center.radius * 0.31);
      context.bezierCurveTo(-center.radius * 0.7, -center.radius * 0.28, -center.radius * 0.52, -center.radius * 0.16, -center.radius * 0.27, -center.radius * 0.08);
      context.moveTo(-center.radius, center.radius * 0.31);
      context.bezierCurveTo(-center.radius * 0.71, center.radius * 0.3, -center.radius * 0.5, center.radius * 0.17, -center.radius * 0.27, center.radius * 0.08);
      context.moveTo(-center.radius * 0.28, -center.radius * 0.51);
      context.lineTo(center.radius * 0.3, 0);
      context.lineTo(-center.radius * 0.28, center.radius * 0.51);
      context.closePath();
      context.moveTo(center.radius * 0.3, 0);
      context.bezierCurveTo(center.radius * 0.51, -center.radius * 0.11, center.radius * 0.68, -center.radius * 0.32, center.radius * 0.96, -center.radius * 0.35);
      context.moveTo(center.radius * 0.3, 0);
      context.bezierCurveTo(center.radius * 0.57, center.radius * 0.02, center.radius * 0.72, center.radius * 0.2, center.radius * 0.91, center.radius * 0.27);
      context.stroke();
    }
    context.setLineDash([]);
    context.font = referenceFont(narrow ? 8 : 9, 400, true);
    drawInkLine(context, product.kind, 0, narrow ? -40 : -56, { align: "center", alpha: 0.5, maxWidth: center.radius * 1.45, family: "reference" });
    context.font = font(locale, narrow ? 18 : 24, 600);
    drawInkLine(context, product.name, 0, narrow ? -10 : -17, { align: "center", alpha: 0.94, maxWidth: center.radius * 1.6 });
    context.font = font(locale, narrow ? 9.5 : 11);
    drawWrapped(context, product.description, 0, narrow ? 16 : 19, center.radius * 1.42, narrow ? 15 : 18, {
      maxLines: narrow ? 5 : 5,
      color: INK_SOFT,
      align: "center",
    });
    context.restore();
  });

  context.font = referenceFont(narrow ? 9 : 10, 400, true);
  spots.forEach((spot, index) => {
    const isWebsite = index % 2 === 0;
    drawInkLine(
      context,
      isWebsite ? `${content.labels.website} ↗` : "GitHub ↗",
      width * (spot.x + spot.width / 2),
      height * (spot.y + spot.height * 0.68),
      { align: "center", alpha: 0.64, family: "reference" },
    );
  });
  context.restore();
}

function drawContact(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  content: SiteContent,
  locale: Locale,
) {
  const narrow = width < 700;
  const spots = actionSpots(4, width);
  context.save();
  context.font = referenceFont(narrow ? 9 : 10, 400, true);
  drawInkLine(context, "CAPUT V · EPISTOLAE", width * (narrow ? 0.16 : 0.18), height * 0.14, { alpha: 0.5, family: "reference" });
  drawRoughHeading(context, [COPY[locale].contact], width * (narrow ? 0.16 : 0.18), height * (narrow ? 0.205 : 0.22), narrow ? 23 : 35, locale);

  context.save();
  context.translate(width * 0.5, height * (narrow ? 0.36 : 0.4));
  context.rotate(-0.018);
  context.font = font(locale, narrow ? 12 : 15);
  drawWrapped(context, content.sections.contactTitle || COPY[locale].correspondence, 0, 0, width * (narrow ? 0.68 : 0.42), narrow ? 20 : 24, {
    maxLines: 4,
    align: "center",
    color: INK_SOFT,
  });
  context.restore();

  context.strokeStyle = "rgba(57,31,18,.22)";
  context.lineWidth = 0.8;
  context.beginPath();
  context.moveTo(width * (narrow ? 0.22 : 0.18), height * (narrow ? 0.52 : 0.6));
  context.bezierCurveTo(width * 0.36, height * 0.79, width * 0.73, height * 0.39, width * 0.84, height * (narrow ? 0.78 : 0.54));
  context.stroke();

  spots.forEach((spot, index) => {
    const angle = narrow ? (index % 2 === 0 ? -0.035 : 0.03) : (index - 1.5) * 0.025;
    context.save();
    context.translate(width * (spot.x + spot.width / 2), height * (spot.y + spot.height * 0.66));
    context.rotate(angle);
    context.font = font(locale, narrow ? 14 : 17, 600);
    drawInkLine(context, SOCIAL_LINKS[index].label, 0, 0, { align: "center", alpha: 0.9 });
    context.font = referenceFont(narrow ? 8 : 8.8, 400, true);
    drawInkLine(context, "scriptum aperire ↗", 0, narrow ? 16 : 18, { align: "center", alpha: 0.4, family: "reference" });
    context.restore();
  });
  context.restore();
}

function drawChapter(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  active: number,
  content: SiteContent,
  locale: Locale,
  phase: number,
) {
  context.save();
  context.globalAlpha = clamp(0, phase, 1);
  const drift = (1 - phase) * 3.5;
  context.translate(drift, -drift * 0.28);
  context.filter = phase < 0.98 ? `blur(${(1 - phase) * 0.8}px)` : "none";
  if (active === 1) drawWork(context, width, height, content, locale);
  else if (active === 2) drawCareer(context, width, height, content, locale);
  else if (active === 3) drawProducts(context, width, height, content, locale);
  else if (active === 4) drawContact(context, width, height, content, locale);
  else drawHome(context, width, height, content, locale);
  context.restore();
}

function drawInkStroke(context: CanvasRenderingContext2D, points: InkPoint[]) {
  if (points.length < 2) return;
  const midpoint = (left: InkPoint, right: InkPoint) => ({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 });
  context.save();
  context.globalCompositeOperation = "source-over";
  context.lineCap = "butt";
  context.lineJoin = "round";

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const before = points[Math.max(0, index - 2)];
    const from = midpoint(before, previous);
    const to = midpoint(previous, current);
    const density = 0.65 + hash(index + 1411) * 0.15;
    const grain = (hash(Math.floor(current.x * 0.13) + Math.floor(current.y * 0.17) * 31) - 0.5);

    // The core and feather stay dry here.  A single paper-fixed absorption
    // pass is applied to every letter, illustration and inscription later.
    context.strokeStyle = `rgba(45, 28, 19, ${density})`;
    context.lineWidth = Math.max(.82, current.width * .58 + grain * .16);
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.quadraticCurveTo(previous.x, previous.y, to.x, to.y);
    context.stroke();

    if (index % 2 === 0) {
      context.save();
      context.globalAlpha = .18 + hash(index + 33) * .07;
      context.strokeStyle = "#2d1c13";
      context.lineWidth = Math.max(.28, current.width * .14);
      const ox = (hash(index + 53) - .5) * 1.15;
      const oy = (hash(index + 71) - .5) * .75;
      context.beginPath();
      context.moveTo(from.x + ox, from.y + oy);
      context.quadraticCurveTo(previous.x + ox, previous.y + oy, to.x + ox, to.y + oy);
      context.stroke();
      context.restore();
    }

    if (index % 7 === 0) {
      context.fillStyle = "rgba(45,28,19,.13)";
      const radius = Math.max(.22, current.width * .1);
      context.beginPath();
      context.ellipse(
        current.x + (hash(index) - .5) * 1.8,
        current.y + (hash(index + 9) - .5) * 1.2,
        radius * 1.7,
        radius,
        hash(index + 21) * Math.PI,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
  context.restore();
}

function sigilPoints(points: InkPoint[]) {
  if (points.length <= 9) return points;
  return Array.from({ length: 9 }, (_, index) => {
    const pointIndex = Math.round(index * (points.length - 1) / 8);
    return points[pointIndex];
  });
}

function drawMagic(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cast: Cast,
  phase: number,
  locale: Locale,
  points: InkPoint[],
  parts: { geometry?: boolean; phrase?: boolean } = {},
) {
  if (phase <= 0) return;
  const drawGeometry = parts.geometry ?? true;
  const drawPhrase = parts.phrase ?? true;
  const x = cast.x * width;
  const y = cast.y * height;
  const eased = 1 - Math.pow(1 - clamp(0, phase, 1), 3);
  const vertices = sigilPoints(points);
  if (drawGeometry) {
    context.save();
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = `rgba(87, 42, 32, ${0.52 * eased})`;
    context.fillStyle = `rgba(87, 42, 32, ${0.56 * eased})`;
    context.lineWidth = 0.9;
    if (vertices.length >= 3) {
      // The seal is derived from the actual hand movement. Its geometry can
      // never be a stock, perfectly centred magic circle.
      const step = vertices.length % 2 === 0 ? 3 : 2;
      const order = vertices.length >= 7
        ? Array.from({ length: vertices.length }, (_, index) => (index * step) % vertices.length)
        : vertices.map((_, index) => index);
      context.beginPath();
      order.forEach((vertexIndex, index) => {
        const vertex = vertices[vertexIndex];
        const px = x + (vertex.x - x) * (0.84 + hash(index + cast.serial * 13) * 0.08);
        const py = y + (vertex.y - y) * (0.84 + hash(index + cast.serial * 17) * 0.08);
        if (index === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      });
      context.closePath();
      context.stroke();

      vertices.forEach((vertex, index) => {
        const px = x + (vertex.x - x) * 0.9;
        const py = y + (vertex.y - y) * 0.9;
        context.beginPath();
        context.arc(px, py, 0.7 + hash(index + cast.serial) * 1.25, 0, Math.PI * 2);
        context.fill();
      });
    }
    context.restore();

    context.save();
    context.strokeStyle = `rgba(87, 42, 32, ${0.13 * eased})`;
    context.setLineDash([1, 11]);
    context.lineWidth = 0.8;
    const anchors = [
      [width * 0.16, height * 0.2],
      [width * 0.84, height * 0.24],
      [width * 0.73, height * 0.79],
    ];
    anchors.forEach(([ax, ay], index) => {
      const origin = vertices.length > 0 ? vertices[(index * 3) % vertices.length] : { x, y };
      context.beginPath();
      context.moveTo(origin.x, origin.y);
      context.bezierCurveTo(
        origin.x + (ax - origin.x) * 0.25,
        origin.y + (index - 1) * 70,
        ax - (ax - origin.x) * 0.22,
        ay - (index - 1) * 45,
        ax,
        ay,
      );
      context.stroke();
    });
    context.restore();
  }

  if (drawPhrase) {
    context.save();
    context.font = handFont(locale, width < 700 ? 11 : 13);
    drawWrapped(context, COPY[locale].hidden, width * (width < 700 ? 0.18 : 0.58), height * (width < 700 ? 0.9 : 0.84), width * (width < 700 ? 0.48 : 0.28), width < 700 ? 17 : 20, {
      maxLines: 3,
      color: `rgba(87,42,32,${0.62 * eased})`,
    });
    context.restore();
  }
}

function paintScene(
  canvas: HTMLCanvasElement,
  size: CanvasSize,
  state: VisualState,
  content: SiteContent,
  locale: Locale,
  textRenderer: PhysicalInkTextRenderer | null,
) {
  const context = canvas.getContext("2d");
  if (!context || size.width <= 0 || size.height <= 0) return;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(materialLayer(canvas, size), 0, 0);

  const inkSurface = inkSurfaceLayer(canvas, size);
  const inkContext = inkSurface.canvas.getContext("2d");
  if (!inkContext) return;
  inkContext.setTransform(1, 0, 0, 1, 0, 0);
  inkContext.globalCompositeOperation = "source-over";
  inkContext.globalAlpha = 1;
  inkContext.filter = "none";
  inkContext.clearRect(0, 0, inkSurface.canvas.width, inkSurface.canvas.height);
  inkContext.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  inkContext.save();
  inkContext.clip(paperPath(size.width, size.height));
  const gpuText = textRenderer?.available
    ? { runs: [] as PhysicalInkTextRun[], locale, dpr: size.dpr }
    : null;
  if (gpuText) INK_TEXT_COLLECTIONS.set(inkContext, gpuText);
  drawFolio(inkContext, size.width, size.height, locale, state.active);
  drawChapter(inkContext, size.width, size.height, state.active, content, locale, state.chapterPhase);
  drawNavigation(
    inkContext,
    size.width,
    size.height,
    locale,
    [COPY[locale].home, content.navigation.work, content.navigation.career, content.navigation.products, content.navigation.contact],
    state.active,
    state.awakened,
  );
  inkContext.font = handFont(locale, size.width < 700 ? 8.5 : 10);
  drawInkLine(inkContext, COPY[locale].draw, size.width * (size.width < 700 ? 0.15 : 0.34), size.height * 0.95, {
    alpha: state.awakened ? 0.28 : 0.47,
    maxWidth: size.width * (size.width < 700 ? 0.48 : 0.34),
  });
  if (gpuText && textRenderer) {
    // Queue the awakened phrase before the GPU pass; its sigil and the user's
    // physical stroke are deliberately drawn afterwards, above static type.
    drawMagic(inkContext, size.width, size.height, state.cast, state.magicPhase, locale, state.points, {
      geometry: false,
      phrase: true,
    });
    INK_TEXT_COLLECTIONS.delete(inkContext);
    const textCanvas = textRenderer.renderFrame(gpuText.runs, size, inkSurface.surface);
    if (!textRenderer.available) {
      inkContext.restore();
      paintScene(canvas, size, state, content, locale, null);
      return;
    }
    inkContext.setTransform(1, 0, 0, 1, 0, 0);
    inkContext.drawImage(textCanvas, 0, 0);
    inkContext.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    drawInkStroke(inkContext, state.points);
    drawMagic(inkContext, size.width, size.height, state.cast, state.magicPhase, locale, state.points, {
      geometry: true,
      phrase: false,
    });
  } else {
    drawInkStroke(inkContext, state.points);
    drawMagic(inkContext, size.width, size.height, state.cast, state.magicPhase, locale, state.points);
  }
  inkContext.restore();

  // The absorption map is fixed to the skin rather than to individual glyphs.
  // Everything written here therefore skips the same pores and fibres.
  inkContext.setTransform(1, 0, 0, 1, 0, 0);
  inkContext.save();
  inkContext.globalCompositeOperation = "destination-out";
  inkContext.drawImage(inkSurface.absorption, 0, 0);
  inkContext.restore();
  inkContext.save();
  inkContext.globalCompositeOperation = "source-atop";
  inkContext.globalAlpha = 0.78;
  inkContext.drawImage(inkSurface.grooves, 0, 0);
  inkContext.restore();

  // Iron-gall ink first blooms into the skin, then leaves a sharper pigment
  // body above it.  Sharing these two passes is what makes type and gesture
  // read as marks from the same ink pot.
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.save();
  context.globalCompositeOperation = "multiply";
  context.globalAlpha = 0.085;
  context.filter = `blur(${Math.max(0.4, size.dpr * 0.34)}px)`;
  context.drawImage(inkSurface.canvas, 0, 0);
  context.restore();
  context.save();
  context.globalCompositeOperation = "multiply";
  context.globalAlpha = 0.86;
  context.drawImage(inkSurface.canvas, 0, 0);
  context.restore();

  // Re-light the finished inscription with the same relief that shaped the
  // parchment. Fibres now continue across ink instead of disappearing below
  // a perfectly clean digital glyph.
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = "soft-light";
  context.globalAlpha = 0.18;
  context.drawImage(inkSurface.surface, 0, 0);
  context.restore();
}

function gestureName(points: InkPoint[]) {
  if (points.length < 3) return "VESTIGIUM";
  const first = points[0];
  const last = points[points.length - 1];
  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;
  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  const diagonal = Math.hypot(maxX - minX, maxY - minY) || 1;
  const closure = Math.hypot(first.x - last.x, first.y - last.y) / diagonal;
  if (closure < 0.22 && points.length > 14) return "ORBIS";
  if (Math.abs(last.x - first.x) > Math.abs(last.y - first.y) * 1.6) return "LIMEN";
  if (last.y < first.y - 52) return "ASCENSUS";
  return "VESTIGIUM";
}

function ScreenReaderChapter({ active, content, locale }: { active: number; content: SiteContent; locale: Locale }) {
  const view = VIEW_IDS[active];
  const copy = COPY[locale];
  if (view === "work") {
    return (
      <>
        <h2>{copy.work}</h2>
        <p>{content.sections.workIntro}</p>
        {content.work.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.summary}</p><p>{item.stack}</p></article>)}
      </>
    );
  }
  if (view === "career") {
    return (
      <>
        <h2>{copy.career}</h2>
        <p>{content.sections.careerIntro}</p>
        {content.career.map((item) => <article key={`${item.company}-${item.period}`}><h3>{item.company}</h3><p>{item.period} — {item.role}</p><p>{item.summary}</p></article>)}
      </>
    );
  }
  if (view === "products") {
    return (
      <>
        <h2>{copy.products}</h2>
        <p>{content.sections.productsIntro}</p>
        {content.products.map((item) => <article key={item.name}><h3>{item.name}</h3><p>{item.kind}</p><p>{item.description}</p></article>)}
      </>
    );
  }
  if (view === "contact") return <><h2>{copy.contact}</h2><p>{copy.correspondence}</p></>;
  return <><h2>{copy.home}</h2><p>{copy.homeCopy}</p><p>{content.hero.introduction}</p><p>{copy.maxim}</p></>;
}

const STYLES = `
  @font-face {
    font-family: "Ischca Yuji Syuku";
    src: url("/fonts/YujiSyuku-Portfolio.woff") format("woff");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }
  @font-face {
    font-family: "Ischca Noto Serif JP";
    src: url("/fonts/NotoSerifJP-Portfolio.woff") format("woff");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }
  @font-face {
    font-family: "Ischca Noto Serif JP";
    src: url("/fonts/NotoSerifJP-Portfolio-Semibold.woff") format("woff");
    font-style: normal;
    font-weight: 600;
    font-display: swap;
  }
  .canvas-grimoire-experience {
    position: relative;
    width: 100%;
    height: clamp(720px, calc(100svh - 76px), 900px);
    min-height: 720px;
    overflow: hidden;
    isolation: isolate;
    background: #0c0907;
    color: #2d1c13;
  }
  .canvas-grimoire-surface {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: default;
  }
  .canvas-grimoire-nav,
  .canvas-grimoire-actions {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
  }
  .canvas-grimoire-hotspot,
  .canvas-grimoire-action {
    position: absolute;
    box-sizing: border-box;
    pointer-events: auto;
    border: 0;
    border-radius: 42%;
    padding: 0;
    margin: 0;
    background: transparent;
    color: transparent;
    font: inherit;
    text-decoration: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .canvas-grimoire-hotspot:focus-visible,
  .canvas-grimoire-action:focus-visible,
  .canvas-grimoire-surface:focus-visible {
    outline: 2px solid rgba(96, 40, 27, .86);
    outline-offset: 4px;
    box-shadow: 0 0 0 7px rgba(219, 190, 126, .38);
  }
  .canvas-grimoire-surface:focus:not(:focus-visible) { outline: none; }
  .canvas-grimoire-live,
  .canvas-grimoire-sr {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }
  @media (max-width: 699px) {
    .canvas-grimoire-experience {
      height: max(900px, calc(100svh - 58px));
      min-height: 900px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .canvas-grimoire-hotspot,
    .canvas-grimoire-action { scroll-behavior: auto; }
  }
`;

export function CanvasGrimoireExperience({ content, locale }: { content: SiteContent; locale: Locale }) {
  const descriptionId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLElement>(null);
  const textRendererRef = useRef<PhysicalInkTextRenderer | null>(null);
  const sizeRef = useRef<CanvasSize>({ width: 0, height: 0, dpr: 1 });
  const visualRef = useRef<VisualState>({
    active: 0,
    chapterPhase: 1,
    magicPhase: 0,
    awakened: false,
    points: [],
    cast: { x: 0.5, y: 0.5, name: "VESTIGIUM", serial: 0 },
  });
  const drawingRef = useRef(false);
  const lengthRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const paintFrameRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const [active, setActive] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [announcement, setAnnouncement] = useState<string>(COPY[locale].keyboard);

  const labels = useMemo(
    () => [COPY[locale].home, content.navigation.work, content.navigation.career, content.navigation.products, content.navigation.contact],
    [content, locale],
  );

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintScene(canvas, sizeRef.current, visualRef.current, content, locale, textRendererRef.current);
  }, [content, locale]);

  const schedulePaint = useCallback(() => {
    if (paintFrameRef.current !== null) return;
    paintFrameRef.current = requestAnimationFrame(() => {
      paintFrameRef.current = null;
      paint();
    });
  }, [paint]);

  useEffect(() => {
    let disposed = false;
    let instance: PhysicalInkTextRenderer | null = null;
    if (!PhysicalInkTextRenderer.isSupported()) return;
    void PhysicalInkTextRenderer.create({
      fontFaces: [
        { url: "/fonts/YujiSyuku-Portfolio.woff", weight: 400, family: "manuscript" },
        { url: "/fonts/NotoSerifJP-Portfolio.woff", weight: 400, family: "reference" },
        { url: "/fonts/NotoSerifJP-Portfolio-Semibold.woff", weight: 600, family: "reference" },
      ],
      maxDevicePixelRatio: 2,
      onInvalidate: schedulePaint,
    }).then((renderer) => {
      if (disposed) {
        renderer?.dispose();
        return;
      }
      instance = renderer;
      textRendererRef.current = renderer;
      schedulePaint();
    });
    return () => {
      disposed = true;
      if (textRendererRef.current === instance) textRendererRef.current = null;
      instance?.dispose();
    };
  }, [schedulePaint]);

  const cancelAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const selectChapter = useCallback((index: number) => {
    const next = (index + VIEW_IDS.length) % VIEW_IDS.length;
    if (next === visualRef.current.active) return;
    cancelAnimation();
    visualRef.current.active = next;
    visualRef.current.chapterPhase = reducedMotionRef.current ? 1 : 0;
    setActive(next);
    setAnnouncement(labels[next]);
    if (reducedMotionRef.current) {
      paint();
      return;
    }
    const started = performance.now();
    const animate = (now: number) => {
      const elapsed = clamp(0, (now - started) / 620, 1);
      visualRef.current.chapterPhase = 1 - Math.pow(1 - elapsed, 3);
      paint();
      if (elapsed < 1) animationRef.current = requestAnimationFrame(animate);
      else animationRef.current = null;
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [cancelAnimation, labels, paint]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotionRef.current = media.matches; };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const previousSize = sizeRef.current;
      if (
        previousSize.width > 0
        && previousSize.height > 0
        && (previousSize.width !== width || previousSize.height !== height)
        && visualRef.current.points.length > 0
      ) {
        const scaleX = width / previousSize.width;
        const scaleY = height / previousSize.height;
        const widthScale = Math.sqrt(scaleX * scaleY);
        visualRef.current.points = visualRef.current.points.map((point) => ({
          ...point,
          x: point.x * scaleX,
          y: point.y * scaleY,
          width: clamp(0.5, point.width * widthScale, 3.1),
        }));
      }
      sizeRef.current = { width, height, dpr };
      const physicalWidth = Math.round(width * dpr);
      const physicalHeight = Math.round(height * dpr);
      if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;
      }
      setSize((current) => current.width === width && current.height === height ? current : { width, height });
      paint();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    resize();
    return () => observer.disconnect();
  }, [paint]);

  useEffect(() => {
    let disposed = false;
    const repaint = () => { if (!disposed) paint(); };
    loadVellumTexture(repaint);
    void document.fonts.ready.then(repaint);
    document.fonts.addEventListener("loadingdone", repaint);
    return () => {
      disposed = true;
      document.fonts.removeEventListener("loadingdone", repaint);
    };
  }, [paint]);

  useEffect(() => {
    setAnnouncement(COPY[locale].keyboard);
    paint();
  }, [locale, paint]);

  useEffect(() => () => {
    cancelAnimation();
    if (paintFrameRef.current !== null) cancelAnimationFrame(paintFrameRef.current);
  }, [cancelAnimation]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const beginInk = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    cancelAnimation();
    const point = pointFromEvent(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lengthRef.current = 0;
    visualRef.current.points = [{ ...point, width: 1.12, time: event.timeStamp }];
    visualRef.current.awakened = false;
    visualRef.current.magicPhase = 0;
    paint();
  };

  const moveInk = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const point = pointFromEvent(event);
    const previous = visualRef.current.points.at(-1);
    if (!previous) return;
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    if (distance < 1.4) return;
    const elapsed = Math.max(1, event.timeStamp - previous.time);
    const velocity = distance / elapsed;
    const pressure = event.pressure > 0 ? event.pressure : 0.42;
    const direction = Math.atan2(point.y - previous.y, point.x - previous.x);
    const nibAngle = -Math.PI / 4;
    const nibContact = 0.7 + 1.35 * Math.abs(Math.sin(direction - nibAngle));
    const speed = clamp(0.76, 1.04 - velocity * 0.1, 1.04);
    const targetWidth = clamp(0.68, nibContact * speed * (0.88 + pressure * 0.22), 2.65);
    const width = previous.width * 0.54 + targetWidth * 0.46;
    visualRef.current.points.push({ ...point, width, time: event.timeStamp });
    lengthRef.current += distance;
    schedulePaint();
  };

  const finishInk = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const points = visualRef.current.points;
    if (lengthRef.current < 72 || points.length < 5) {
      paint();
      return;
    }
    const centroid = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    const cast = {
      x: centroid.x / points.length / Math.max(1, sizeRef.current.width),
      y: centroid.y / points.length / Math.max(1, sizeRef.current.height),
      name: gestureName(points),
      serial: visualRef.current.cast.serial + 1,
    };
    visualRef.current.cast = cast;
    visualRef.current.awakened = true;
    setAnnouncement(`${COPY[locale].awake}: ${cast.name}`);
    if (reducedMotionRef.current) {
      visualRef.current.magicPhase = 1;
      paint();
      return;
    }
    const started = performance.now();
    const animate = (now: number) => {
      const elapsed = clamp(0, (now - started) / 1050, 1);
      visualRef.current.magicPhase = 1 - Math.pow(1 - elapsed, 3);
      paint();
      if (elapsed < 1) animationRef.current = requestAnimationFrame(animate);
      else animationRef.current = null;
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  const handleKeys = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (/^[1-5]$/.test(event.key)) {
      event.preventDefault();
      selectChapter(Number(event.key) - 1);
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectChapter(active + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectChapter(active - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectChapter(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectChapter(VIEW_IDS.length - 1);
    }
  };

  const positions = navPositions(size.width || 1000, size.height || 760);
  const links = actionSpots(active, size.width || 1000);

  return (
    <section
      ref={wrapperRef}
      className="canvas-grimoire-experience"
      aria-label={locale === "ja" ? "Ischca のポートフォリオ羊皮紙" : "Ischca portfolio parchment"}
      onKeyDown={handleKeys}
    >
      <style>{STYLES}</style>
      <canvas
        ref={canvasRef}
        className="canvas-grimoire-surface"
        role="img"
        aria-label={`${labels[active]}. ${COPY[locale].draw}`}
        aria-describedby={descriptionId}
        tabIndex={0}
        onPointerDown={beginInk}
        onPointerMove={moveInk}
        onPointerUp={finishInk}
        onPointerCancel={finishInk}
      />

      <nav className="canvas-grimoire-nav" aria-label={locale === "ja" ? "章を選ぶ" : "Choose a chapter"}>
        {positions.map((position, index) => {
          const diameter = size.width < 700 ? 52 : 62;
          const style = {
            left: position.x - diameter / 2,
            top: position.y - diameter / 2,
            width: diameter,
            height: diameter,
            transform: `rotate(${position.angle}rad)`,
          } satisfies CSSProperties;
          return (
            <button
              type="button"
              className="canvas-grimoire-hotspot"
              style={style}
              aria-current={active === index ? "page" : undefined}
              aria-label={`${ROMAN[index]}. ${labels[index]}`}
              onClick={() => selectChapter(index)}
              key={VIEW_IDS[index]}
            >
              <span className="canvas-grimoire-sr">{labels[index]}</span>
            </button>
          );
        })}
      </nav>

      {links.length > 0 && (
        <nav className="canvas-grimoire-actions" aria-label={active === 3 ? content.navigation.products : content.navigation.contact}>
          {links.map((link) => (
            <a
              className="canvas-grimoire-action"
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
              style={{
                left: `${link.x * 100}%`,
                top: `${link.y * 100}%`,
                width: `${link.width * 100}%`,
                height: `${link.height * 100}%`,
              }}
              key={link.href}
            >
              <span className="canvas-grimoire-sr">{link.label}</span>
            </a>
          ))}
        </nav>
      )}

      <div id={descriptionId} className="canvas-grimoire-sr">
        <p>{COPY[locale].keyboard}</p>
        <p>{COPY[locale].draw}</p>
        <ScreenReaderChapter active={active} content={content} locale={locale} />
      </div>
      <div className="canvas-grimoire-live" aria-live="polite" aria-atomic="true">{announcement}</div>
    </section>
  );
}
