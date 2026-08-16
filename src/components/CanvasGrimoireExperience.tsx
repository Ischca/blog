import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { Locale, SiteContent } from "../content/site";
import {
  PhysicalInkTextRenderer,
  type PhysicalInkTextRun,
} from "./grimoire/PhysicalInkTextRenderer";
import { PhysicalParchmentRenderer } from "./grimoire/PhysicalParchmentRenderer";
import {
  VersoExplodedView,
  type VersoPhase,
  type VersoTracePoint,
} from "./grimoire/VersoExplodedView";

type ViewId = "home" | "work" | "career" | "products" | "contact";
type InkPoint = { x: number; y: number; width: number; time: number };
type CanvasSize = { width: number; height: number; dpr: number };
type Cast = { x: number; y: number; name: string; serial: number };
type PalimpsestState = { from: number; to: number; progress: number };
type Octagram = { x: number; y: number; radius: number; rotation: number; serial: number };
type RitualState = {
  stage: "idle" | "summoned" | "unsealed";
  sigil: Octagram | null;
  mechanismPhase: number;
  guideOpacity: number;
};
type VisualState = {
  active: number;
  chapterPhase: number;
  palimpsest: PalimpsestState;
  magicPhase: number;
  awakened: boolean;
  points: InkPoint[];
  ritualStrokes: InkPoint[][];
  cast: Cast;
  ritual: RitualState;
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
const AWAKENED_INK = "#5b2d24";
const PUBLIC_BASE = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const assetUrl = (path: string) => `${PUBLIC_BASE}${path.replace(/^\/+/, "")}`;

const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/Ischca" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/shota-watanabe-16547a20b/" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/shotawatanabe" },
  { label: "X", href: "https://x.com/ischca" },
];

const COPY = {
  ja: {
    volume: "ISCHCA · SOFTWARE ENGINEER",
    title: "システムをつくり、\n長く運用できる状態にする。",
    home: "プロフィール",
    work: "対応できる仕事",
    career: "経歴",
    products: "プロダクト",
    contact: "お問い合わせ",
    workTitle: "対応できる仕事",
    careerTitle: "経歴",
    productsTitle: "プロダクト",
    contactTitle: "お問い合わせ",
    homeCopy:
      "バックエンド、データ、クラウドを中心に、既存システムの改善と個人プロダクトの開発に取り組むソフトウェアエンジニアです。",
    maxim: "複雑なシステムを読み解き、保守しやすい形へ整えます。",
    commissionIntro: "既存システムを読み解き、サービスを止めずに改善する仕事を中心に対応しています。",
    careerIntro: "これまでの所属、役割、担当内容を、新しいものから順に掲載しています。",
    productsIntro: "仕様策定から実装・運用まで、継続的に開発している個人プロダクトです。",
    fit: "向いている案件",
    scope: "対応範囲",
    outcome: "成果物",
    tools: "主な技術",
    purpose: "概要",
    letterOpening: "ご相談・ご依頼は、LinkedInまたはUpworkからテキストでご連絡ください。",
    signature: "— Ischca",
    scroll: "スクロールして各セクションを見る",
    circleReady: "円が完成しました。指やマウスを離し、錆色の星の線をすべてなぞると次の演出が始まります。",
    mechanismOpen: "八芒星が完成し、技術レイヤーが開き始めました。",
    traceStar: "一筆書きでなくても構いません。錆色の線をすべてなぞる",
    harmlessMechanism: "ポートフォリオの情報は、この操作をしなくてもすべて閲覧できます。",
    draw: "余白をドラッグすると、インクが反応します",
    awake: "インクが反応しました",
    keyboard: "各セクションはローマ数字、または左右キーで選べます。",
    folio: "SECTION",
    productLink: "リンクを開く",
    correspondence: "ご相談・ご依頼はテキストでご連絡ください。",
    hidden: "すべてのプロフィール情報は、操作の成否に関係なく表示されています。",
  },
  en: {
    volume: "ISCHCA · SOFTWARE ENGINEER",
    title: "Software Engineering\nfor Systems That Last",
    home: "Profile",
    work: "Services",
    career: "Experience",
    products: "Products",
    contact: "Contact",
    workTitle: "Services",
    careerTitle: "Experience",
    productsTitle: "Products",
    contactTitle: "Contact",
    homeCopy:
      "I am a software engineer focused on backend, data, and cloud systems, working on both existing products and independently developed tools.",
    maxim: "I make complex systems easier to understand, maintain, and improve.",
    commissionIntro: "I mainly work on understanding and improving existing systems without disrupting ongoing delivery.",
    careerIntro: "My roles, responsibilities, and technical work are listed in reverse chronological order.",
    productsIntro: "Independent products that I continue to design, build, and maintain from specification through daily use.",
    fit: "best suited for",
    scope: "scope",
    outcome: "deliverables",
    tools: "technologies",
    purpose: "overview",
    letterOpening: "For project inquiries, contact me in writing through LinkedIn or Upwork.",
    signature: "— Ischca",
    scroll: "Scroll through the profile sections",
    circleReady: "The circle is complete. Release the pointer, then trace every rust-colored line of the star to continue.",
    mechanismOpen: "The octagram is complete. The technical layer is opening.",
    traceStar: "Release the pointer if needed, and trace every rust-colored line",
    harmlessMechanism: "All portfolio information is available without completing this interaction.",
    draw: "Drag across the margin to activate the ink",
    awake: "The ink responds",
    keyboard: "Use the Roman numerals or arrow keys to move between sections.",
    folio: "SECTION",
    productLink: "open link",
    correspondence: "For project inquiries, contact me in writing.",
    hidden: "All profile information remains visible regardless of this interaction.",
  },
} as const;

const FONT_JA = '"Ischca Yuji Syuku", "YuMincho", "Hiragino Mincho ProN", serif';
const FONT_EN = '"Ischca IM Fell English", "Iowan Old Style", "Baskerville", Georgia, serif';
const FONT_HAND_JA = '"Ischca Yuji Syuku", "YuMincho", "Hiragino Mincho ProN", serif';
const FONT_HAND_EN = '"Ischca Fondamento", "Apple Chancery", cursive';
const FONT_REFERENCE = '"Ischca IM Fell English SC", "Iowan Old Style", "Baskerville", Georgia, serif';

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
  albedo: HTMLCanvasElement;
  absorption: HTMLCanvasElement;
  capillary: HTMLCanvasElement[];
  relief: HTMLCanvasElement;
  grooves: HTMLCanvasElement;
  surface: HTMLCanvasElement;
  glyph: HTMLCanvasElement;
};

// The skin is a material, not an animation. Baking it once keeps inscription
// latency independent from the hundreds of fibres and pores in the surface.
const MATERIAL_LAYERS = new WeakMap<HTMLCanvasElement, MaterialLayer>();
const DESK_LAYERS = new WeakMap<HTMLCanvasElement, MaterialLayer>();
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
  image.src = assetUrl("textures/vellum-aged-v1.webp");
}

function hash(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function valueNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const at = (px: number, py: number) => hash(seed + px * 127.1 + py * 311.7);
  const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
  const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

function clamp(minimum: number, value: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const progress = clamp(0, (value - edge0) / Math.max(0.0001, edge1 - edge0), 1);
  return progress * progress * (3 - 2 * progress);
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
  maxWidth?: number,
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
      maxWidth,
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

function drawParchmentAlbedo(context: CanvasRenderingContext2D, width: number, height: number) {
  const path = paperPath(width, height);
  const bounds = paperBounds(width, height);
  context.save();
  context.clip(path);

  // Keep directional light out of the albedo. The Three.js surface shader is
  // the only place where a lamp is applied, so paper and ink cannot disagree.
  const base = context.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height);
  base.addColorStop(0, "#f4f0e7");
  base.addColorStop(0.28, "#eee8dc");
  base.addColorStop(0.58, "#f6f2e9");
  base.addColorStop(0.84, "#ebe3d6");
  base.addColorStop(1, "#e3d9c8");
  context.fillStyle = base;
  context.fillRect(bounds.x - 8, bounds.y - 8, bounds.width + 16, bounds.height + 16);

  // Uneven skin thickness changes colour slowly, independently of the fixed
  // light that will later reveal its height.
  for (let index = 0; index < 14; index += 1) {
    const x = bounds.x + hash(index + 5101) * bounds.width;
    const y = bounds.y + hash(index + 5129) * bounds.height;
    const radius = (0.08 + hash(index + 5153) * 0.2) * Math.max(bounds.width, bounds.height);
    const warm = hash(index + 5171) > 0.48;
    const cloud = context.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, warm ? "rgba(151,112,69,.035)" : "rgba(105,112,102,.024)");
    cloud.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = cloud;
    context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  context.globalCompositeOperation = "multiply";
  for (let index = 0; index < 110; index += 1) {
    const x = bounds.x + hash(index + 5219) * bounds.width;
    const y = bounds.y + hash(index + 5237) * bounds.height;
    const length = 10 + hash(index + 5261) * 92;
    context.strokeStyle = `rgba(84,57,35,${0.008 + hash(index + 5279) * 0.018})`;
    context.lineWidth = 0.22 + hash(index + 5303) * 0.5;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(
      x + length * 0.48,
      y + (hash(index + 5323) - 0.5) * 9,
      x + length,
      y + (hash(index + 5347) - 0.5) * 5,
    );
    context.stroke();
  }

  // Oxidation is material colour, not a fake all-around burn shadow.
  context.strokeStyle = "rgba(84,56,34,.075)";
  context.lineWidth = width < 700 ? 10 : 16;
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

function deskLayer(canvas: HTMLCanvasElement, size: CanvasSize) {
  const cached = DESK_LAYERS.get(canvas);
  if (
    cached
    && cached.width === size.width
    && cached.height === size.height
    && cached.dpr === size.dpr
  ) return cached.canvas;

  const layer = document.createElement("canvas");
  layer.width = Math.max(1, Math.round(size.width * size.dpr));
  layer.height = Math.max(1, Math.round(size.height * size.dpr));
  const context = layer.getContext("2d");
  if (!context) return layer;
  context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  drawDesk(context, size.width, size.height);
  DESK_LAYERS.set(canvas, { canvas: layer, ...size, textureVersion: 0 });
  return layer;
}

function buildCapillaryMasks(width: number, height: number, paperAbsorption: HTMLCanvasElement) {
  const levels = 24;
  const scale = Math.min(0.36, 420 / Math.max(1, width), 300 / Math.max(1, height));
  const fieldWidth = Math.max(96, Math.round(width * scale));
  const fieldHeight = Math.max(96, Math.round(height * scale));
  const sample = document.createElement("canvas");
  sample.width = fieldWidth;
  sample.height = fieldHeight;
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  const absorptionAlpha = new Uint8ClampedArray(fieldWidth * fieldHeight);
  if (sampleContext) {
    sampleContext.drawImage(paperAbsorption, 0, 0, fieldWidth, fieldHeight);
    const pixels = sampleContext.getImageData(0, 0, fieldWidth, fieldHeight).data;
    for (let index = 0; index < absorptionAlpha.length; index += 1) {
      absorptionAlpha[index] = pixels[index * 4 + 3];
    }
  }

  const field = new Float32Array(fieldWidth * fieldHeight);
  for (let y = 0; y < fieldHeight; y += 1) {
    for (let x = 0; x < fieldWidth; x += 1) {
      const index = y * fieldWidth + x;
      const macro = valueNoise(x / 24, y / 24, 1801);
      const meso = valueNoise(x / 8.5, y / 11.5, 1877);
      const fibre = 0.5 + Math.sin(x * 0.19 + y * 0.045 + valueNoise(x / 38, y / 29, 1931) * 4.2) * 0.5;
      const paperPore = absorptionAlpha[index] / 255;
      field[index] = clamp(0.035, 0.07 + macro * 0.57 + meso * 0.22 + fibre * 0.18 - paperPore * 0.31, 0.965);
    }
  }

  return Array.from({ length: levels }, (_, level) => {
    const mask = document.createElement("canvas");
    mask.width = fieldWidth;
    mask.height = fieldHeight;
    const context = mask.getContext("2d");
    if (!context) return mask;
    const image = context.createImageData(fieldWidth, fieldHeight);
    const strength = level / (levels - 1);
    for (let index = 0; index < field.length; index += 1) {
      const coverage = smoothstep(field[index] - 0.075, field[index] + 0.075, strength);
      image.data[index * 4 + 3] = Math.round(coverage * 255);
    }
    context.putImageData(image, 0, 0);
    return mask;
  });
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
  const albedo = document.createElement("canvas");
  const absorption = document.createElement("canvas");
  const relief = document.createElement("canvas");
  const grooves = document.createElement("canvas");
  const surface = document.createElement("canvas");
  const glyph = document.createElement("canvas");
  layer.width = albedo.width = absorption.width = relief.width = grooves.width = surface.width = glyph.width = Math.max(1, Math.round(size.width * size.dpr));
  layer.height = albedo.height = absorption.height = relief.height = grooves.height = surface.height = glyph.height = Math.max(1, Math.round(size.height * size.dpr));

  const albedoContext = albedo.getContext("2d");
  const surfaceContext = surface.getContext("2d");
  const bounds = paperBounds(size.width, size.height);
  const surfaceRelief = vellumReliefMap(bounds);
  if (albedoContext) {
    albedoContext.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    drawParchmentAlbedo(albedoContext, size.width, size.height);
  }
  if (surfaceContext) {
    surfaceContext.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    surfaceContext.save();
    surfaceContext.clip(paperPath(size.width, size.height));
    surfaceContext.fillStyle = "rgb(128,128,128)";
    surfaceContext.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    if (surfaceRelief) {
      surfaceContext.globalAlpha = size.width < 700 ? 0.16 : 0.24;
      surfaceContext.filter = `blur(${size.width < 700 ? 0.7 : 1}px)`;
      surfaceContext.drawImage(surfaceRelief, bounds.x, bounds.y, bounds.width, bounds.height);
      surfaceContext.filter = "none";
      surfaceContext.globalAlpha = 1;
    }

    // Broad stretched-skin undulations and a few raised folds live in the
    // actual height field. They displace the mesh; fine photographic fibres
    // above remain fragment-level normals.
    for (let index = 0; index < 8; index += 1) {
      const x = bounds.x + hash(index + 6101) * bounds.width;
      const y = bounds.y + hash(index + 6131) * bounds.height;
      const radius = (0.12 + hash(index + 6151) * 0.22) * Math.max(bounds.width, bounds.height);
      const heightValue = 112 + Math.round(hash(index + 6173) * 34);
      const hill = surfaceContext.createRadialGradient(x, y, 0, x, y, radius);
      hill.addColorStop(0, `rgba(${heightValue},${heightValue},${heightValue},.2)`);
      hill.addColorStop(1, "rgba(128,128,128,0)");
      surfaceContext.fillStyle = hill;
      surfaceContext.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
    const folds = [
      [0.06, 0.71, 0.47, 0.7, 0.78, 0.76],
      [0.7, 0.08, 0.76, 0.4, 0.72, 0.69],
      [0.19, 0.18, 0.46, 0.25, 0.63, 0.2],
    ] as const;
    surfaceContext.save();
    surfaceContext.globalCompositeOperation = "screen";
    surfaceContext.filter = `blur(${size.width < 700 ? 5 : 8}px)`;
    surfaceContext.strokeStyle = "rgba(211,211,211,.26)";
    surfaceContext.lineCap = "round";
    surfaceContext.lineWidth = size.width < 700 ? 12 : 18;
    folds.forEach(([sx, sy, cx, cy, ex, ey]) => {
      surfaceContext.beginPath();
      surfaceContext.moveTo(bounds.x + bounds.width * sx, bounds.y + bounds.height * sy);
      surfaceContext.quadraticCurveTo(
        bounds.x + bounds.width * cx,
        bounds.y + bounds.height * cy,
        bounds.x + bounds.width * ex,
        bounds.y + bounds.height * ey,
      );
      surfaceContext.stroke();
    });
    surfaceContext.restore();
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
  const capillary = buildCapillaryMasks(size.width, size.height, absorption);
  const next = { canvas: layer, albedo, absorption, capillary, relief, grooves, surface, glyph, ...size, textureVersion: vellumTextureVersion };
  INK_SURFACE_LAYERS.set(canvas, next);
  return next;
}

function drawFolio(context: CanvasRenderingContext2D, width: number, height: number, locale: Locale, active: number) {
  context.save();
  context.font = referenceFont(width < 700 ? 8.5 : 9.5, 400, true);
  context.rotate(-0.015);
  drawInkLine(context, `ISCHCA · ${COPY[locale].folio} ${String(active + 1).padStart(2, "0")} · PORTFOLIO`, width * 0.5, height * 0.065, {
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

function drawQuillBracket(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  side: 1 | -1,
  seed: number,
  alpha = 0.25,
) {
  const reach = side * (9 + hash(seed) * 6);
  context.save();
  context.strokeStyle = `rgba(55, 31, 18, ${alpha})`;
  context.lineWidth = 0.72;
  context.beginPath();
  context.moveTo(x + reach * 0.35, y);
  context.bezierCurveTo(x, y + height * 0.08, x + reach, y + height * 0.18, x + reach * 0.25, y + height * 0.42);
  context.bezierCurveTo(x - reach * 0.16, y + height * 0.5, x + reach, y + height * 0.71, x + reach * 0.28, y + height);
  context.stroke();
  context.restore();
}

function drawLedgerField(
  context: CanvasRenderingContext2D,
  locale: Locale,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  options: { narrow?: boolean; maxLines?: number; alpha?: number } = {},
) {
  const narrow = options.narrow ?? false;
  context.font = referenceFont(narrow ? 7.2 : 7.9, 400, true);
  drawInkLine(context, label.toLocaleUpperCase(), x, y, { alpha: 0.4, family: "reference", letterSpacing: 0.04 });
  context.font = font(locale, narrow ? 8.8 : 9.6);
  return drawWrapped(context, value, x, y + (narrow ? 13 : 15), width, narrow ? 13.5 : 15, {
    maxLines: options.maxLines ?? 2,
    color: INK_SOFT,
    alpha: options.alpha ?? 0.9,
  });
}

function drawArchivistSeal(
  context: CanvasRenderingContext2D,
  locale: Locale,
  x: number,
  y: number,
  radius: number,
  mark: string,
  emphasis = false,
) {
  context.save();
  context.translate(x, y);
  context.rotate(-0.08);
  context.strokeStyle = emphasis ? "rgba(102, 42, 31, .52)" : "rgba(55, 31, 18, .3)";
  context.lineWidth = emphasis ? 1.1 : 0.72;
  context.beginPath();
  context.ellipse(0, 0, radius, radius * 0.91, 0.06, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.ellipse(0.8, -0.5, radius * 0.73, radius * 0.66, -0.04, 0, Math.PI * 2);
  context.stroke();
  context.font = font(locale, radius * 0.72);
  drawInkLine(context, mark, 0, radius * 0.23, {
    align: "center",
    color: emphasis ? AWAKENED_INK : INK,
    alpha: emphasis ? 0.66 : 0.44,
  });
  context.restore();
}

function drawFleuron(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  seed: number,
  alpha = 0.3,
) {
  const half = width * 0.5;
  const rise = 5 + hash(seed) * 4;
  context.save();
  context.translate(x, y);
  context.strokeStyle = `rgba(50, 28, 18, ${alpha})`;
  context.fillStyle = `rgba(50, 28, 18, ${alpha * 0.58})`;
  context.lineWidth = 0.72;
  [-1, 1].forEach((side) => {
    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(side * half * 0.18, -rise, side * half * 0.54, rise * 0.85, side * half, 0);
    context.stroke();
    for (let leaf = 1; leaf <= 3; leaf += 1) {
      const lx = side * half * (0.2 + leaf * 0.17);
      const ly = (leaf % 2 === 0 ? 1 : -1) * rise * 0.27;
      context.beginPath();
      context.ellipse(lx, ly, 4 + hash(seed + leaf) * 2.5, 1.5 + hash(seed + leaf + 8), side * 0.38, 0, Math.PI * 2);
      context.fill();
    }
  });
  context.beginPath();
  context.arc(0, 0, 2.1, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawPrinterMark(
  context: CanvasRenderingContext2D,
  locale: Locale,
  x: number,
  y: number,
  radius: number,
) {
  context.save();
  context.translate(x, y);
  context.rotate(-0.018);
  context.strokeStyle = "rgba(48, 27, 17, .38)";
  context.fillStyle = "rgba(48, 27, 17, .2)";
  context.lineWidth = 0.78;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(0, -radius * 0.78);
  context.lineTo(radius * 0.72, radius * 0.48);
  context.lineTo(-radius * 0.72, radius * 0.48);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.arc(0, radius * 0.03, radius * 0.32, 0, Math.PI * 2);
  context.stroke();
  context.font = font(locale, radius * 0.54);
  drawInkLine(context, "I", 0, radius * 0.18, { align: "center", alpha: 0.52, pressure: 0.8 });
  context.restore();
}

function drawDecoratedInitial(
  context: CanvasRenderingContext2D,
  locale: Locale,
  letter: string,
  x: number,
  y: number,
  size: number,
) {
  context.save();
  context.translate(x, y);
  context.rotate(-0.012);
  context.strokeStyle = "rgba(93, 39, 29, .45)";
  context.lineWidth = 0.8;
  context.beginPath();
  context.rect(-size * 0.08, -size * 0.76, size * 0.78, size * 0.9);
  context.stroke();
  context.font = font(locale, size);
  drawInkLine(context, letter, size * 0.3, 0, {
    align: "center",
    color: AWAKENED_INK,
    alpha: 0.8,
    pressure: 0.9,
    absorption: 0.82,
  });
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
  const center = width * 0.5;
  context.font = referenceFont(narrow ? 8.2 : 9.5, 400, true);
  drawInkLine(context, copy.volume, center, height * (narrow ? 0.145 : 0.13), {
    align: "center",
    alpha: 0.5,
    family: "reference",
    letterSpacing: 0.045,
  });
  drawFleuron(context, center, height * (narrow ? 0.18 : 0.175), width * (narrow ? 0.3 : 0.2), 19, 0.31);

  const titleSize = narrow ? 25 : clamp(38, width * 0.04, 52);
  const titleLines = copy.title.split("\n");
  context.font = font(locale, titleSize);
  titleLines.forEach((line, index) => {
    drawInkLine(context, line, center, height * (narrow ? 0.27 : 0.285) + index * titleSize * 1.22, {
      align: "center",
      alpha: 0.95,
      pressure: 0.74,
      absorption: 0.77,
      letterSpacing: 0.018,
      maxWidth: width * (narrow ? 0.72 : 0.62),
    });
  });
  drawFleuron(context, center, height * (narrow ? 0.37 : 0.42), width * (narrow ? 0.42 : 0.28), 73, 0.25);

  context.font = font(locale, narrow ? 10.4 : 12.5);
  const prefaceEnd = drawWrapped(
    context,
    copy.homeCopy,
    center,
    height * (narrow ? 0.43 : 0.48),
    width * (narrow ? 0.63 : 0.43),
    narrow ? 18 : 21,
    { maxLines: narrow ? 5 : 4, color: INK_SOFT, align: "center" },
  );
  context.font = font(locale, narrow ? 8.9 : 10.3);
  drawWrapped(
    context,
    content.hero.introduction,
    center,
    prefaceEnd + (narrow ? 13 : 16),
    width * (narrow ? 0.58 : 0.38),
    narrow ? 15.5 : 17.5,
    { maxLines: narrow ? 7 : 5, color: "rgba(53,31,20,.61)", align: "center" },
  );

  drawPrinterMark(context, locale, center, height * (narrow ? 0.69 : 0.72), narrow ? 31 : 38);
  context.font = handFont(locale, narrow ? 10.5 : 13);
  drawWrapped(context, copy.maxim, center, height * (narrow ? 0.755 : 0.79), width * (narrow ? 0.58 : 0.38), narrow ? 18 : 21, {
    maxLines: 3,
    color: "rgba(60,35,20,.6)",
    align: "center",
  });

  drawFleuron(context, center, height * (narrow ? 0.84 : 0.865), width * (narrow ? 0.34 : 0.2), 131, 0.2);
  context.font = referenceFont(narrow ? 6.9 : 7.7, 400, true);
  const imprint = locale === "ja"
    ? `${content.hero.experienceLabel}: ${content.hero.experienceValue}  ·  ${content.hero.focusValue}  ·  ${content.hero.communicationValue}`
    : `${content.hero.experienceValue} EXPERIENCE  ·  ${content.hero.focusValue}  ·  ${content.hero.communicationValue}`;
  drawInkLine(context, imprint, center, height * (narrow ? 0.88 : 0.9), {
    align: "center",
    alpha: 0.39,
    maxWidth: width * (narrow ? 0.68 : 0.52),
    family: "reference",
    letterSpacing: 0.025,
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
  const copy = COPY[locale];
  const positions = narrow
    ? [
        { x: 0.17, y: 0.31, width: 0.68, angle: -0.012 },
        { x: 0.22, y: 0.53, width: 0.65, angle: 0.014 },
        { x: 0.15, y: 0.75, width: 0.7, angle: -0.009 },
      ]
    : [
        { x: 0.15, y: 0.35, width: 0.32, angle: -0.018 },
        { x: 0.56, y: 0.35, width: 0.31, angle: 0.012 },
        { x: 0.27, y: 0.68, width: 0.43, angle: -0.013 },
      ];

  context.save();
  context.font = referenceFont(narrow ? 9 : 10, 400, true);
  drawInkLine(context, `02 · ${copy.work.toLocaleUpperCase()}`, width * (narrow ? 0.16 : 0.13), height * 0.14, {
    alpha: 0.44,
    family: "reference",
  });
  const workHeading = [copy.workTitle];
  drawRoughHeading(
    context,
    workHeading,
    width * (narrow ? 0.16 : 0.145),
    height * (narrow ? 0.205 : 0.19),
    narrow ? 23 : 33,
    locale,
    narrow ? 29 : 35,
  );
  const introX = width * (narrow ? 0.25 : 0.65);
  const introY = height * (narrow ? 0.255 : 0.16);
  drawDecoratedInitial(context, locale, copy.commissionIntro.slice(0, 1), introX - (narrow ? 26 : 35), introY + (narrow ? 15 : 19), narrow ? 28 : 38);
  context.font = font(locale, narrow ? 8.8 : 10.2);
  drawWrapped(
    context,
    copy.commissionIntro.slice(1),
    introX,
    introY,
    width * (narrow ? 0.57 : 0.21),
    narrow ? 14.5 : 17,
    { maxLines: narrow ? 3 : 5, color: "rgba(53,31,20,.57)" },
  );

  content.work.slice(0, 3).forEach((item, index) => {
    const position = positions[index];
    context.save();
    context.translate(width * position.x, height * position.y);
    context.rotate(position.angle);
    const inset = narrow ? 17 : 24;
    const entryWidth = width * position.width - inset;
    drawQuillBracket(context, -15, -10, narrow ? 164 : index === 0 ? 225 : 184, 1, 283 + index * 29, index === 0 ? 0.3 : 0.22);
    context.font = referenceFont(narrow ? 8 : 8.7, 400, true);
    drawInkLine(context, `AREA ${ROMAN[index]}`, inset, -9, { alpha: 0.38, family: "reference" });
    context.font = font(locale, narrow ? 13.2 : index === 0 ? 18.5 : 16.5, 400);
    drawInkLine(context, item.title, inset, narrow ? 12 : 14, { maxWidth: entryWidth, alpha: 0.92, pressure: 0.72 });
    drawLooseRule(context, inset, narrow ? 21 : 25, entryWidth * (index === 0 ? 0.93 : 0.84), 293 + index * 17, 0.16);
    context.font = font(locale, narrow ? 8.9 : 10.2);
    const summaryY = drawWrapped(context, item.summary, inset, narrow ? 39 : 45, entryWidth, narrow ? 13.8 : 16, {
      maxLines: narrow ? 2 : index === 0 ? 4 : 3,
      color: INK_SOFT,
    });
    let cursor = drawLedgerField(context, locale, copy.fit, item.fit, inset, summaryY + 3, entryWidth, {
      narrow,
      maxLines: narrow ? 2 : 2,
    });
    cursor = drawLedgerField(context, locale, copy.scope, item.scope, inset, cursor + 1, entryWidth, {
      narrow,
      maxLines: 1,
    });
    cursor = drawLedgerField(context, locale, copy.outcome, item.outcome, inset, cursor + 1, entryWidth, {
      narrow,
      maxLines: narrow ? 1 : 2,
    });
    context.font = referenceFont(narrow ? 7.1 : 7.8, 400, true);
    drawInkLine(context, `${copy.tools.toLocaleUpperCase()} · ${item.stack}`, inset, cursor + (narrow ? 2 : 4), {
      alpha: 0.38,
      maxWidth: entryWidth,
      family: "reference",
    });
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
  const copy = COPY[locale];
  const positions = narrow
    ? [
        { x: 0.15, y: 0.29, width: 0.58, angle: -0.013, side: -1 },
        { x: 0.3, y: 0.42, width: 0.57, angle: 0.012, side: 1 },
        { x: 0.14, y: 0.55, width: 0.59, angle: -0.01, side: -1 },
        { x: 0.29, y: 0.68, width: 0.58, angle: 0.012, side: 1 },
        { x: 0.16, y: 0.78, width: 0.6, angle: -0.012, side: -1 },
      ]
    : [
        { x: 0.12, y: 0.3, width: 0.31, angle: -0.012, side: -1 },
        { x: 0.55, y: 0.425, width: 0.32, angle: 0.012, side: 1 },
        { x: 0.14, y: 0.55, width: 0.3, angle: -0.01, side: -1 },
        { x: 0.54, y: 0.675, width: 0.32, angle: 0.011, side: 1 },
        { x: 0.16, y: 0.77, width: 0.33, angle: -0.013, side: -1 },
      ];

  context.save();
  context.font = referenceFont(narrow ? 9 : 10, 400, true);
  drawInkLine(context, `03 · ${copy.career.toLocaleUpperCase()}`, width * (narrow ? 0.16 : 0.13), height * 0.14, { alpha: 0.44, family: "reference" });
  drawRoughHeading(context, [copy.careerTitle], width * (narrow ? 0.16 : 0.14), height * (narrow ? 0.205 : 0.215), narrow ? 23 : 35, locale);
  const careerIntroX = width * (narrow ? 0.29 : 0.59);
  const careerIntroY = height * (narrow ? 0.245 : 0.16);
  drawDecoratedInitial(context, locale, copy.careerIntro.slice(0, 1), careerIntroX - (narrow ? 26 : 34), careerIntroY + (narrow ? 15 : 18), narrow ? 28 : 37);
  context.font = font(locale, narrow ? 8.5 : 10);
  drawWrapped(context, copy.careerIntro.slice(1), careerIntroX, careerIntroY, width * (narrow ? 0.55 : 0.25), narrow ? 14 : 16.5, {
    maxLines: narrow ? 3 : 4,
    color: "rgba(53,31,20,.57)",
  });

  context.save();
  context.strokeStyle = "rgba(61,34,20,.24)";
  context.lineWidth = 0.9;
  context.beginPath();
  positions.forEach((position, index) => {
    const stemX = width * (narrow ? 0.5 + (index % 2 === 0 ? -0.035 : 0.035) : 0.49 + (index % 2 === 0 ? -0.02 : 0.025));
    const stemY = height * position.y - (narrow ? 14 : 11);
    if (index === 0) context.moveTo(stemX, stemY - (narrow ? 14 : 9));
    else context.bezierCurveTo(stemX + (index % 2 === 0 ? -18 : 18), stemY - 38, stemX + (index % 2 === 0 ? 12 : -12), stemY - 20, stemX, stemY);
  });
  context.stroke();
  context.restore();

  content.career.slice(0, 5).forEach((item, index) => {
    const position = positions[index];
    const stemX = width * (narrow ? 0.5 + (index % 2 === 0 ? -0.035 : 0.035) : 0.49 + (index % 2 === 0 ? -0.02 : 0.025));
    const stemY = height * position.y - (narrow ? 14 : 11);
    const entryX = width * position.x;
    const branchEnd = position.side < 0 ? entryX + width * position.width + 5 : entryX - 7;
    context.save();
    context.strokeStyle = "rgba(61,34,20,.2)";
    context.lineWidth = 0.65;
    context.beginPath();
    context.moveTo(stemX, stemY);
    context.quadraticCurveTo((stemX + branchEnd) / 2, stemY + (index % 2 ? 8 : -7), branchEnd, stemY + 4);
    context.stroke();
    context.fillStyle = index === 0 ? "rgba(102,42,31,.63)" : "rgba(50,29,18,.48)";
    context.beginPath();
    context.arc(stemX, stemY, index === 0 ? 3 : 2, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.save();
    context.translate(entryX, height * position.y);
    context.rotate(position.angle);
    const entryWidth = width * position.width;
    context.font = referenceFont(narrow ? 7.6 : 8.2, 400, true);
    drawInkLine(context, item.period, 0, 0, { alpha: 0.48, family: "reference" });
    context.font = font(locale, narrow ? 12.2 : 14.2);
    drawInkLine(context, item.company, 0, narrow ? 17 : 19, { maxWidth: entryWidth, alpha: 0.91, pressure: 0.7 });
    context.font = referenceFont(narrow ? 7.7 : 8.4, 400, true);
    drawInkLine(context, item.role, entryWidth, narrow ? 30 : 32, {
      align: "right",
      maxWidth: entryWidth,
      alpha: 0.5,
      family: "reference",
    });
    context.font = font(locale, narrow ? 8.6 : 9.3);
    const summaryEnd = drawWrapped(context, item.summary, 0, narrow ? 45 : 48, entryWidth, narrow ? 13.4 : 14.5, {
      maxLines: 2,
      color: INK_SOFT,
    });
    if (!narrow) {
      context.font = font(locale, 8.2);
      drawWrapped(context, item.details[0], 8, summaryEnd + 1, entryWidth - 8, 13, {
        maxLines: 1,
        color: "rgba(53,31,20,.53)",
      });
    }
    context.font = referenceFont(narrow ? 6.8 : 7.2, 400, true);
    drawInkLine(context, item.stack, 0, summaryEnd + (narrow ? 3 : 18), {
      maxWidth: entryWidth,
      alpha: 0.31,
      family: "reference",
    });
    context.restore();
  });
  if (!narrow) drawArchivistSeal(context, locale, width * 0.79, height * 0.79, 30, locale === "ja" ? "現" : "NOW", true);
  context.restore();
}

function actionSpots(active: number, width: number): ActionSpot[] {
  const narrow = width < 700;
  if (active === 3) {
    return [
      {
        label: "Restrict Language website",
        href: "https://ischca.github.io/restrict_lang/",
        x: narrow ? 0.18 : 0.68,
        y: narrow ? 0.54 : 0.31,
        width: narrow ? 0.27 : 0.12,
        height: 0.055,
      },
      {
        label: "Restrict Language GitHub",
        href: "https://github.com/Ischca/restrict_lang",
        x: narrow ? 0.5 : 0.72,
        y: narrow ? 0.54 : 0.39,
        width: narrow ? 0.22 : 0.095,
        height: 0.055,
      },
      {
        label: "PrismDiff website",
        href: "https://ischca.github.io/prismdiff/",
        x: narrow ? 0.31 : 0.12,
        y: narrow ? 0.82 : 0.67,
        width: narrow ? 0.27 : 0.12,
        height: 0.055,
      },
      {
        label: "PrismDiff GitHub",
        href: "https://github.com/Ischca/prismdiff",
        x: narrow ? 0.61 : 0.16,
        y: narrow ? 0.82 : 0.75,
        width: narrow ? 0.22 : 0.095,
        height: 0.055,
      },
    ];
  }
  if (active === 4) {
    const positions = narrow
      ? [
          [0.18, 0.62],
          [0.53, 0.68],
          [0.2, 0.76],
          [0.57, 0.82],
        ]
      : [
          [0.17, 0.68],
          [0.36, 0.76],
          [0.62, 0.72],
          [0.79, 0.64],
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
  const copy = COPY[locale];
  const layouts = narrow
    ? [
        { x: 0.16, y: 0.31, width: 0.62, diagramX: 0.72, diagramY: 0.37, radius: width * 0.13, angle: -0.018 },
        { x: 0.29, y: 0.63, width: 0.57, diagramX: 0.2, diagramY: 0.7, radius: width * 0.13, angle: 0.02 },
      ]
    : [
        { x: 0.34, y: 0.31, width: 0.29, diagramX: 0.22, diagramY: 0.41, radius: Math.min(width, height) * 0.14, angle: -0.018 },
        { x: 0.52, y: 0.59, width: 0.31, diagramX: 0.75, diagramY: 0.65, radius: Math.min(width, height) * 0.145, angle: 0.02 },
      ];
  const spots = actionSpots(3, width);

  context.save();
  context.font = referenceFont(narrow ? 9 : 10, 400, true);
  drawInkLine(context, `04 · ${copy.products.toLocaleUpperCase()}`, width * (narrow ? 0.16 : 0.6), height * 0.14, { alpha: 0.44, family: "reference" });
  const productsHeading = [copy.productsTitle];
  drawRoughHeading(
    context,
    productsHeading,
    width * (narrow ? 0.16 : 0.57),
    height * (narrow ? 0.205 : 0.19),
    narrow ? 22.5 : 32,
    locale,
    narrow ? 28 : 36,
    width * (narrow ? 0.68 : 0.34),
  );
  const productsIntroX = width * (narrow ? 0.26 : 0.14);
  const productsIntroY = height * (narrow ? 0.245 : 0.16);
  drawDecoratedInitial(context, locale, copy.productsIntro.slice(0, 1), productsIntroX - (narrow ? 26 : 34), productsIntroY + (narrow ? 15 : 19), narrow ? 28 : 38);
  context.font = font(locale, narrow ? 8.6 : 10.1);
  drawWrapped(context, copy.productsIntro.slice(1), productsIntroX, productsIntroY, width * (narrow ? 0.57 : 0.27), narrow ? 14 : 17, {
    maxLines: narrow ? 3 : 4,
    color: "rgba(53,31,20,.57)",
  });

  content.products.slice(0, 2).forEach((product, index) => {
    const layout = layouts[index];
    const cx = width * layout.diagramX;
    const cy = height * layout.diagramY;
    context.save();
    context.translate(cx, cy);
    context.rotate(layout.angle);
    context.strokeStyle = "rgba(55,31,18,.22)";
    context.lineWidth = 0.82;
    context.setLineDash([1, 5]);
    if (index === 0) {
      context.beginPath();
      context.moveTo(-layout.radius, layout.radius * 0.21);
      context.bezierCurveTo(-layout.radius * 0.65, -layout.radius * 0.22, -layout.radius * 0.35, layout.radius * 0.17, -layout.radius * 0.1, 0);
      context.bezierCurveTo(layout.radius * 0.16, -layout.radius * 0.2, layout.radius * 0.41, -layout.radius * 0.52, layout.radius * 0.93, -layout.radius * 0.39);
      context.moveTo(-layout.radius * 0.1, 0);
      context.bezierCurveTo(layout.radius * 0.14, layout.radius * 0.04, layout.radius * 0.46, layout.radius * 0.35, layout.radius, layout.radius * 0.26);
      context.stroke();
      [[-0.96,0.18],[-0.12,0],[0.86,-0.39],[0.94,0.26]].forEach(([mx, my], mark) => {
        context.fillStyle = `rgba(50,28,17,${0.27 + mark * 0.035})`;
        context.beginPath();
        context.arc(layout.radius * mx, layout.radius * my, 1.3 + mark * 0.24, 0, Math.PI * 2);
        context.fill();
      });
    } else {
      context.beginPath();
      context.moveTo(-layout.radius * 0.95, -layout.radius * 0.31);
      context.bezierCurveTo(-layout.radius * 0.7, -layout.radius * 0.28, -layout.radius * 0.52, -layout.radius * 0.16, -layout.radius * 0.27, -layout.radius * 0.08);
      context.moveTo(-layout.radius, layout.radius * 0.31);
      context.bezierCurveTo(-layout.radius * 0.71, layout.radius * 0.3, -layout.radius * 0.5, layout.radius * 0.17, -layout.radius * 0.27, layout.radius * 0.08);
      context.moveTo(-layout.radius * 0.28, -layout.radius * 0.51);
      context.lineTo(layout.radius * 0.3, 0);
      context.lineTo(-layout.radius * 0.28, layout.radius * 0.51);
      context.closePath();
      context.moveTo(layout.radius * 0.3, 0);
      context.bezierCurveTo(layout.radius * 0.51, -layout.radius * 0.11, layout.radius * 0.68, -layout.radius * 0.32, layout.radius * 0.96, -layout.radius * 0.35);
      context.moveTo(layout.radius * 0.3, 0);
      context.bezierCurveTo(layout.radius * 0.57, layout.radius * 0.02, layout.radius * 0.72, layout.radius * 0.2, layout.radius * 0.91, layout.radius * 0.27);
      context.stroke();
    }
    context.setLineDash([]);
    context.restore();

    context.save();
    context.translate(width * layout.x, height * layout.y);
    context.rotate(layout.angle);
    const textWidth = width * layout.width;
    context.font = referenceFont(narrow ? 7.5 : 8.2, 400, true);
    drawInkLine(context, `PRODUCT ${index === 0 ? "A" : "B"} · ${product.kind}`, 0, 0, { alpha: 0.43, maxWidth: textWidth, family: "reference" });
    context.font = font(locale, narrow ? 17 : 23);
    drawInkLine(context, product.name, 0, narrow ? 22 : 27, { alpha: 0.94, maxWidth: textWidth, pressure: 0.74 });
    context.font = font(locale, narrow ? 8.9 : 10.2);
    const descriptionEnd = drawWrapped(context, product.description, 0, narrow ? 43 : 52, textWidth, narrow ? 14.5 : 16.5, {
      maxLines: narrow ? 3 : 4,
      color: INK_SOFT,
    });
    context.font = referenceFont(narrow ? 7 : 7.7, 400, true);
    drawInkLine(context, copy.purpose.toLocaleUpperCase(), 0, descriptionEnd + 3, { alpha: 0.38, family: "reference" });
    context.font = font(locale, narrow ? 8.4 : 9.2);
    const purposeEnd = drawWrapped(context, product.purpose, 0, descriptionEnd + (narrow ? 16 : 18), textWidth, narrow ? 13.5 : 15, {
      maxLines: 2,
      color: "rgba(53,31,20,.58)",
    });
    context.font = referenceFont(narrow ? 6.8 : 7.4, 400, true);
    drawInkLine(context, product.stack, 0, purposeEnd + 2, { alpha: 0.34, maxWidth: textWidth, family: "reference" });
    context.restore();
  });

  context.font = referenceFont(narrow ? 9 : 10, 400, true);
  spots.forEach((spot, index) => {
    const isWebsite = index % 2 === 0;
    drawInkLine(
      context,
      isWebsite ? content.labels.website : "GitHub",
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
  const copy = COPY[locale];
  const spots = actionSpots(4, width);
  context.save();
  context.font = referenceFont(narrow ? 9 : 10, 400, true);
  drawInkLine(context, `05 · ${copy.contact.toLocaleUpperCase()}`, width * (narrow ? 0.16 : 0.13), height * 0.14, { alpha: 0.44, family: "reference" });
  drawRoughHeading(context, [copy.contactTitle], width * (narrow ? 0.16 : 0.145), height * (narrow ? 0.205 : 0.215), narrow ? 23 : 35, locale);

  context.save();
  context.translate(width * (narrow ? 0.21 : 0.23), height * (narrow ? 0.34 : 0.36));
  context.rotate(-0.012);
  drawDecoratedInitial(context, locale, copy.letterOpening.slice(0, 1), narrow ? -28 : -38, narrow ? 17 : 21, narrow ? 30 : 42);
  context.font = font(locale, narrow ? 11.5 : 14);
  const openingEnd = drawWrapped(context, copy.letterOpening.slice(1), 0, 0, width * (narrow ? 0.63 : 0.47), narrow ? 20 : 23, {
    maxLines: narrow ? 4 : 3,
    color: INK_SOFT,
  });
  context.font = font(locale, narrow ? 9.2 : 10.5);
  drawWrapped(
    context,
    `${content.hero.focusValue} · ${content.hero.communicationValue}`,
    width * (narrow ? 0.07 : 0.08),
    openingEnd + (narrow ? 16 : 21),
    width * (narrow ? 0.55 : 0.37),
    narrow ? 16 : 18,
    { maxLines: 3, color: "rgba(53,31,20,.55)" },
  );
  context.font = handFont(locale, narrow ? 15 : 19);
  drawInkLine(context, copy.signature, width * (narrow ? 0.38 : 0.39), openingEnd + (narrow ? 78 : 82), {
    alpha: 0.74,
    align: "center",
  });
  context.restore();

  drawArchivistSeal(context, locale, width * (narrow ? 0.73 : 0.75), height * (narrow ? 0.46 : 0.43), narrow ? 38 : 55, "I", true);
  context.font = referenceFont(narrow ? 7.2 : 8, 400, true);
  drawInkLine(context, "PROFILES & CONTACT", width * (narrow ? 0.17 : 0.14), height * (narrow ? 0.57 : 0.61), {
    alpha: 0.34,
    family: "reference",
  });

  spots.forEach((spot, index) => {
    const angle = narrow ? (index % 2 === 0 ? -0.035 : 0.03) : (index - 1.5) * 0.025;
    const centerX = width * (spot.x + spot.width / 2);
    const centerY = height * (spot.y + spot.height * 0.5);
    drawArchivistSeal(context, locale, centerX, centerY, narrow ? 23 : 27, ["GH", "in", "U", "X"][index]);
    context.save();
    context.translate(centerX, centerY + (narrow ? 35 : 41));
    context.rotate(angle);
    context.font = font(locale, narrow ? 11.5 : 14);
    drawInkLine(context, SOCIAL_LINKS[index].label, 0, 0, { align: "center", alpha: 0.9 });
    context.font = referenceFont(narrow ? 6.8 : 7.5, 400, true);
    drawInkLine(context, locale === "ja" ? "リンクを開く" : "open link", 0, narrow ? 14 : 16, { align: "center", alpha: 0.35, family: "reference" });
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

function drawPalimpsestChapter(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: VisualState,
  content: SiteContent,
  locale: Locale,
) {
  const transition = state.palimpsest;
  if (transition.from === transition.to || transition.progress <= 0.001) {
    drawChapter(context, width, height, state.active, content, locale, state.chapterPhase);
    return;
  }

  const progress = clamp(0, transition.progress, 1);
  // The page does not slide or crossfade. The old pigment is first taken back
  // into the fibres; only after a quiet interval does the next hand bleed out.
  const oldInk = 1 - smoothstep(0.04, 0.45, progress);
  const newInk = smoothstep(0.55, 0.98, progress);

  drawChapter(context, width, height, transition.from, content, locale, oldInk);
  drawChapter(context, width, height, transition.to, content, locale, newInk);
}

function absorbPalimpsestInk(
  context: CanvasRenderingContext2D,
  progress: number,
  paperAbsorption: CanvasImageSource,
  capillaryMasks: readonly CanvasImageSource[],
) {
  const phase = clamp(0, progress, 1);
  const strength = phase < 0.5
    ? smoothstep(0.02, 0.48, phase)
    : 1 - smoothstep(0.52, 0.98, phase);
  if (strength <= 0.01) return;

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = "destination-out";

  // Reuse the paper-fixed resistance map so the same pores repeatedly drink
  // the ink instead of showing an unrelated screen-space dissolve pattern.
  context.globalAlpha = strength * 0.62;
  context.drawImage(paperAbsorption, 0, 0, context.canvas.width, context.canvas.height);
  const maskPosition = strength * Math.max(0, capillaryMasks.length - 1);
  const lowerIndex = Math.floor(maskPosition);
  const upperIndex = Math.min(capillaryMasks.length - 1, lowerIndex + 1);
  const interpolation = maskPosition - lowerIndex;
  const lowerMask = capillaryMasks[lowerIndex];
  const upperMask = capillaryMasks[upperIndex];
  if (lowerMask) {
    context.globalAlpha = 0.96 * (1 - interpolation);
    context.drawImage(lowerMask, 0, 0, context.canvas.width, context.canvas.height);
  }
  if (upperMask && upperIndex !== lowerIndex && interpolation > 0.001) {
    context.globalAlpha = 0.96 * interpolation;
    context.drawImage(upperMask, 0, 0, context.canvas.width, context.canvas.height);
  }
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

function normalizedAngleDelta(from: number, to: number) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function circleFromGesture(points: InkPoint[], width: number, height: number, serial: number): Octagram | null {
  if (points.length < 18) return null;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let pathLength = 0;
  points.forEach((point, index) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    if (index > 0) pathLength += Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y);
  });
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const minimumSpan = Math.min(spanX, spanY);
  const maximumSpan = Math.max(spanX, spanY);
  if (minimumSpan < 54 || maximumSpan > Math.min(width, height) * 0.62) return null;
  if (minimumSpan / Math.max(1, maximumSpan) < 0.62) return null;

  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const radii = points.map((point) => Math.hypot(point.x - centerX, point.y - centerY));
  const radius = radii.reduce((sum, value) => sum + value, 0) / radii.length;
  const radialVariance = Math.sqrt(radii.reduce((sum, value) => sum + (value - radius) ** 2, 0) / radii.length) / Math.max(1, radius);
  const closure = Math.hypot(points[0].x - points.at(-1)!.x, points[0].y - points.at(-1)!.y) / Math.max(1, radius * 2);
  if (radialVariance > 0.34 || closure > 0.34 || pathLength < radius * 4.15) return null;

  let signedSweep = 0;
  let reversedSweep = 0;
  let lastAngle = Math.atan2(points[0].y - centerY, points[0].x - centerX);
  for (let index = 1; index < points.length; index += 1) {
    const angle = Math.atan2(points[index].y - centerY, points[index].x - centerX);
    const delta = normalizedAngleDelta(lastAngle, angle);
    signedSweep += delta;
    reversedSweep += Math.abs(delta);
    lastAngle = angle;
  }
  if (Math.abs(signedSweep) < Math.PI * 1.45 || Math.abs(signedSweep) / Math.max(0.001, reversedSweep) < 0.55) return null;

  return {
    x: centerX / Math.max(1, width),
    y: centerY / Math.max(1, height),
    radius: clamp(0.055, radius / Math.max(1, Math.min(width, height)), 0.23),
    rotation: Math.atan2(points[0].y - centerY, points[0].x - centerX) - Math.PI * 0.5,
    serial,
  };
}

function octagramVertices(sigil: Octagram, width: number, height: number) {
  const centerX = sigil.x * width;
  const centerY = sigil.y * height;
  const radius = sigil.radius * Math.min(width, height);
  return Array.from({ length: 8 }, (_, index) => {
    const irregularity = 0.975 + hash(sigil.serial * 41 + index * 17) * 0.05;
    const pointRadius = radius * irregularity;
    const angle = sigil.rotation - Math.PI * 0.5 + index * Math.PI / 4;
    return {
      x: centerX + Math.cos(angle) * pointRadius,
      y: centerY + Math.sin(angle) * pointRadius,
    };
  });
}

function crossedOctagramOrder(vertexCount: number) {
  return Array.from({ length: vertexCount }, (_, index) => (index * 3) % vertexCount);
}

function pointSegmentProjection(point: InkPoint, start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const position = lengthSquared <= 0.0001
    ? 0
    : clamp(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 1);
  return {
    position,
    distance: Math.hypot(point.x - (start.x + dx * position), point.y - (start.y + dy * position)),
  };
}

function gesturesTraceOctagram(strokes: InkPoint[][], sigil: Octagram, width: number, height: number) {
  if (strokes.reduce((sum, stroke) => sum + stroke.length, 0) < 12) return false;
  const vertices = octagramVertices(sigil, width, height);
  const order = crossedOctagramOrder(vertices.length);
  const radius = sigil.radius * Math.min(width, height);
  const tolerance = clamp(6, radius * 0.09, 11);
  const binsPerSegment = 6;
  const coverage = order.map(() => new Set<number>());
  let nearLength = 0;
  let totalLength = 0;
  const expectedLength = order.reduce((sum, vertexIndex, index) => {
    const start = vertices[vertexIndex];
    const end = vertices[order[(index + 1) % order.length]];
    return sum + Math.hypot(end.x - start.x, end.y - start.y);
  }, 0);
  strokes.forEach((stroke) => {
    for (let pointIndex = 1; pointIndex < stroke.length; pointIndex += 1) {
      const point = stroke[pointIndex];
      const previous = stroke[pointIndex - 1];
      const stepLength = Math.hypot(point.x - previous.x, point.y - previous.y);
      totalLength += stepLength;
      let nearest = Number.POSITIVE_INFINITY;
      let nearestSegment = -1;
      let nearestPosition = 0;
      order.forEach((vertexIndex, index) => {
        const start = vertices[vertexIndex];
        const end = vertices[order[(index + 1) % order.length]];
        const projection = pointSegmentProjection(point, start, end);
        if (projection.distance < nearest) {
          nearest = projection.distance;
          nearestSegment = index;
          nearestPosition = projection.position;
        }
      });
      if (nearest <= tolerance) {
        nearLength += stepLength;
        coverage[nearestSegment]?.add(Math.min(binsPerSegment - 1, Math.floor(nearestPosition * binsPerSegment)));
      }
    }
  });
  const substantiallyTraced = coverage.filter((bins) => bins.size >= 4).length;
  const totalCoverage = coverage.reduce((sum, bins) => sum + bins.size, 0) / (coverage.length * binsPerSegment);
  return (
    totalLength > expectedLength * 0.76
    && nearLength / Math.max(1, totalLength) > 0.84
    && substantiallyTraced === coverage.length
    && totalCoverage > 0.72
  );
}

type HintLightSampler = {
  size: number;
  height: HTMLCanvasElement;
  ink: HTMLCanvasElement;
  output: HTMLCanvasElement;
  heightContext: CanvasRenderingContext2D;
  inkContext: CanvasRenderingContext2D;
  outputContext: CanvasRenderingContext2D;
  outputPixels: ImageData;
};

const HINT_LIGHT_SAMPLERS = new WeakMap<HTMLCanvasElement, HintLightSampler>();

function hintLightSampler(target: HTMLCanvasElement) {
  const cached = HINT_LIGHT_SAMPLERS.get(target);
  if (cached) return cached;
  const sampleSize = 58;
  const height = document.createElement("canvas");
  const ink = document.createElement("canvas");
  const output = document.createElement("canvas");
  height.width = height.height = ink.width = ink.height = output.width = output.height = sampleSize;
  const heightContext = height.getContext("2d", { willReadFrequently: true });
  const inkContext = ink.getContext("2d", { willReadFrequently: true });
  const outputContext = output.getContext("2d");
  if (!heightContext || !inkContext || !outputContext) return null;
  const sampler = {
    size: sampleSize,
    height,
    ink,
    output,
    heightContext,
    inkContext,
    outputContext,
    outputPixels: outputContext.createImageData(sampleSize, sampleSize),
  };
  HINT_LIGHT_SAMPLERS.set(target, sampler);
  return sampler;
}

function drawPhysicalHintLight(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  head: { x: number; y: number },
  radius: number,
  material: InkSurfaceLayer | null,
  intensity = 1,
) {
  if (!material) return;
  const sampler = hintLightSampler(context.canvas);
  if (!sampler) return;
  const patchRadius = clamp(24, radius * 0.34, 44);
  const sourceScaleX = material.surface.width / Math.max(1, width);
  const sourceScaleY = material.surface.height / Math.max(1, height);
  const sourceX = (head.x - patchRadius) * sourceScaleX;
  const sourceY = (head.y - patchRadius) * sourceScaleY;
  const sourceWidth = patchRadius * 2 * sourceScaleX;
  const sourceHeight = patchRadius * 2 * sourceScaleY;

  sampler.heightContext.setTransform(1, 0, 0, 1, 0, 0);
  sampler.heightContext.clearRect(0, 0, sampler.size, sampler.size);
  sampler.heightContext.drawImage(
    material.surface,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sampler.size,
    sampler.size,
  );
  sampler.inkContext.setTransform(1, 0, 0, 1, 0, 0);
  sampler.inkContext.clearRect(0, 0, sampler.size, sampler.size);
  sampler.inkContext.drawImage(
    material.canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sampler.size,
    sampler.size,
  );

  const heightPixels = sampler.heightContext.getImageData(0, 0, sampler.size, sampler.size).data;
  const inkPixels = sampler.inkContext.getImageData(0, 0, sampler.size, sampler.size).data;
  const output = sampler.outputPixels.data;
  const midpoint = (sampler.size - 1) * 0.5;
  const readHeight = (x: number, y: number, fallback: number) => {
    const clampedX = Math.max(0, Math.min(sampler.size - 1, x));
    const clampedY = Math.max(0, Math.min(sampler.size - 1, y));
    const index = (clampedY * sampler.size + clampedX) * 4;
    return heightPixels[index + 3] < 8 ? fallback : heightPixels[index] / 255;
  };

  for (let y = 0; y < sampler.size; y += 1) {
    for (let x = 0; x < sampler.size; x += 1) {
      const index = (y * sampler.size + x) * 4;
      const paperAlpha = heightPixels[index + 3] / 255;
      const normalizedX = (x - midpoint) / midpoint;
      const normalizedY = (y - midpoint) / midpoint;
      const radialDistance = Math.hypot(normalizedX, normalizedY);
      if (paperAlpha < 0.025 || radialDistance >= 1) {
        output[index + 3] = 0;
        continue;
      }

      const centerHeight = heightPixels[index] / 255;
      const gradientX = (readHeight(x - 1, y, centerHeight) - readHeight(x + 1, y, centerHeight)) * 7.4;
      const gradientY = (readHeight(x, y - 1, centerHeight) - readHeight(x, y + 1, centerHeight)) * 7.4;
      const normalLength = Math.hypot(gradientX, gradientY, 1);
      const normalX = gradientX / normalLength;
      const normalY = gradientY / normalLength;
      const normalZ = 1 / normalLength;
      const lightX = -normalizedX * 0.78;
      const lightY = -normalizedY * 0.78;
      const lightLength = Math.hypot(lightX, lightY, 1.16);
      const diffuse = Math.max(0, (
        normalX * lightX
        + normalY * lightY
        + normalZ * 1.16
      ) / lightLength);
      const attenuation = (1 - radialDistance * radialDistance) ** 2;
      const localSlope = Math.hypot(gradientX, gradientY);
      const microOcclusion = clamp(0.68, 1 - localSlope * 0.085, 1);
      const pigment = inkPixels[index + 3] / 255;
      const pigmentAbsorption = 1 - pigment * 0.78;
      const thinSkin = clamp(0, (0.52 - centerHeight) * 2.6, 1);
      const illuminated = (
        0.105
        + Math.max(0, diffuse - 0.48) * 0.56
        + thinSkin * 0.075
      ) * attenuation * microOcclusion * pigmentAbsorption * paperAlpha * intensity;
      const occluded = Math.max(0, 0.67 - diffuse) * attenuation * paperAlpha * intensity;

      if (occluded > illuminated * 0.78) {
        output[index] = 62;
        output[index + 1] = 31;
        output[index + 2] = 27;
        output[index + 3] = Math.round(clamp(0, occluded * 0.16, 0.09) * 255);
      } else {
        output[index] = Math.round(248 - thinSkin * 16);
        output[index + 1] = Math.round(209 - thinSkin * 9);
        output[index + 2] = Math.round(132 + thinSkin * 25);
        output[index + 3] = Math.round(clamp(0, illuminated * 0.46, 0.24) * 255);
      }
    }
  }

  sampler.outputContext.putImageData(sampler.outputPixels, 0, 0);
  context.save();
  context.globalCompositeOperation = "source-over";
  context.imageSmoothingEnabled = true;
  context.filter = "blur(.32px)";
  context.drawImage(
    sampler.output,
    head.x - patchRadius,
    head.y - patchRadius,
    patchRadius * 2,
    patchRadius * 2,
  );
  context.restore();
}

function drawRitualCompletionBurst(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  sigil: Octagram,
  phase: number,
  kind: "summon" | "unseal",
  material: InkSurfaceLayer | null,
) {
  const progress = clamp(0, phase, 1);
  const strength = kind === "unseal" ? 1.72 : 1;
  const x = sigil.x * width;
  const y = sigil.y * height;
  const sealRadius = sigil.radius * Math.min(width, height);
  const attack = smoothstep(0, kind === "unseal" ? 0.055 : 0.08, progress);
  const decay = 1 - smoothstep(kind === "unseal" ? 0.22 : 0.18, 1, progress);
  const envelope = attack * decay;
  const expansion = 1 - Math.pow(1 - progress, 3);
  drawPhysicalHintLight(
    context,
    width,
    height,
    { x, y },
    sealRadius * (kind === "unseal" ? 1.04 : 0.72),
    material,
    envelope * strength * 1.42,
  );
  if (envelope <= 0.001) return;

  const vertices = octagramVertices(sigil, width, height);
  const order = crossedOctagramOrder(vertices.length);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.lineJoin = "round";

  const glowRadius = sealRadius * (0.18 + expansion * (kind === "unseal" ? 1.02 : 0.7));
  const glow = context.createRadialGradient(x, y, 0, x, y, glowRadius);
  glow.addColorStop(0, `rgba(255,249,218,${envelope * (kind === "unseal" ? 0.72 : 0.48)})`);
  glow.addColorStop(0.22, `rgba(235,181,99,${envelope * 0.34})`);
  glow.addColorStop(0.58, `rgba(139,78,118,${envelope * (kind === "unseal" ? 0.2 : 0.11)})`);
  glow.addColorStop(1, "rgba(92,58,86,0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, glowRadius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = `rgba(255,222,151,${envelope * (kind === "unseal" ? 0.62 : 0.38)})`;
  context.shadowColor = kind === "unseal" ? "rgba(190,105,66,.72)" : "rgba(158,83,60,.48)";
  context.shadowBlur = kind === "unseal" ? 11 : 7;
  context.lineWidth = kind === "unseal" ? 1.3 : 0.86;
  context.beginPath();
  order.forEach((vertexIndex, index) => {
    const vertex = vertices[vertexIndex];
    if (index === 0) context.moveTo(vertex.x, vertex.y);
    else context.lineTo(vertex.x, vertex.y);
  });
  context.closePath();
  context.stroke();

  const waveCount = kind === "unseal" ? 2 : 1;
  for (let wave = 0; wave < waveCount; wave += 1) {
    const delayed = clamp(0, (progress - wave * 0.12) / (1 - wave * 0.12), 1);
    const waveEnvelope = Math.sin(delayed * Math.PI) ** 1.35;
    if (waveEnvelope <= 0.002) continue;
    const waveRadius = sealRadius * (0.42 + delayed * (kind === "unseal" ? 1.45 : 0.88));
    context.save();
    context.translate(x, y);
    context.rotate(sigil.rotation * 0.22 + wave * 0.67 + delayed * 0.34);
    context.scale(1, 0.78 + wave * 0.08);
    context.strokeStyle = `rgba(230,184,116,${waveEnvelope * envelope * (kind === "unseal" ? 0.4 : 0.24)})`;
    context.shadowColor = "rgba(130,78,127,.44)";
    context.shadowBlur = 7;
    context.lineWidth = 0.58 + wave * 0.18;
    context.beginPath();
    context.arc(0, 0, waveRadius, -0.46 + wave * 0.39, Math.PI * (1.66 + wave * 0.13));
    context.stroke();
    context.restore();
  }

  const particleCount = kind === "unseal" ? 68 : 26;
  for (let index = 0; index < particleCount; index += 1) {
    const birth = hash(index * 37 + sigil.serial * 101 + (kind === "unseal" ? 503 : 211)) * 0.2;
    const life = clamp(0, (progress - birth) / Math.max(0.001, 1 - birth), 1);
    if (life <= 0 || life >= 1) continue;
    const angle = hash(index * 61 + sigil.serial * 17) * Math.PI * 2 + sigil.rotation * 0.17;
    const speed = sealRadius * (0.42 + hash(index * 43 + 17) * (kind === "unseal" ? 1.4 : 0.82));
    const distance = speed * (1 - Math.pow(1 - life, 2));
    const previousDistance = Math.max(0, distance - (1.6 + hash(index * 29 + 71) * 4.8) * strength);
    const curl = Math.sin(life * Math.PI * (1.4 + hash(index + 89))) * (hash(index + 131) - 0.5) * sealRadius * 0.24;
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    const gravity = life * life * sealRadius * (0.03 + hash(index + 191) * 0.12);
    const endX = x + Math.cos(angle) * distance + tangentX * curl;
    const endY = y + Math.sin(angle) * distance + tangentY * curl + gravity;
    const startX = x + Math.cos(angle) * previousDistance + tangentX * curl * 0.82;
    const startY = y + Math.sin(angle) * previousDistance + tangentY * curl * 0.82 + gravity * 0.84;
    const particleAlpha = Math.sin(life * Math.PI) ** 1.7 * (kind === "unseal" ? 0.66 : 0.42);
    const violet = index % 5 === 1 || index % 7 === 3;
    context.strokeStyle = violet
      ? `rgba(190,163,211,${particleAlpha * 0.66})`
      : `rgba(246,191,99,${particleAlpha})`;
    context.shadowColor = violet ? "rgba(119,84,148,.48)" : "rgba(184,90,47,.58)";
    context.shadowBlur = kind === "unseal" ? 5 : 3;
    context.lineWidth = 0.34 + hash(index * 13 + 5) * (kind === "unseal" ? 0.8 : 0.5);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  }

  if (kind === "unseal") {
    vertices.forEach((vertex, index) => {
      const vertexPhase = clamp(0, (progress - index * 0.018) / 0.45, 1);
      const flare = Math.sin(vertexPhase * Math.PI);
      if (flare <= 0.002) return;
      const flareRadius = 1.5 + flare * 5.4;
      const vertexGlow = context.createRadialGradient(vertex.x, vertex.y, 0, vertex.x, vertex.y, flareRadius);
      vertexGlow.addColorStop(0, `rgba(255,244,194,${flare * 0.72})`);
      vertexGlow.addColorStop(1, "rgba(178,91,70,0)");
      context.fillStyle = vertexGlow;
      context.beginPath();
      context.arc(vertex.x, vertex.y, flareRadius, 0, Math.PI * 2);
      context.fill();
    });
  }
  context.restore();
}

function drawTracingHint(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  sigil: Octagram,
  phase: number,
  material: InkSurfaceLayer | null,
) {
  const vertices = octagramVertices(sigil, width, height);
  const order = crossedOctagramOrder(vertices.length);
  const segments = order.map((vertexIndex, index) => {
    const start = vertices[vertexIndex];
    const end = vertices[order[(index + 1) % order.length]];
    return { start, end, length: Math.hypot(end.x - start.x, end.y - start.y) };
  });
  const pointAt = (segment: typeof segments[number], progress: number) => {
    const position = clamp(0, progress, 1);
    return {
      x: segment.start.x + (segment.end.x - segment.start.x) * position,
      y: segment.start.y + (segment.end.y - segment.start.y) * position,
    };
  };

  // Each chord is kindled independently. This teaches the shape without
  // implying that the player must complete it as a single continuous stroke.
  const segmentPosition = clamp(0, phase, 0.999999) * segments.length;
  const segmentIndex = Math.floor(segmentPosition);
  const segment = segments[segmentIndex] ?? segments[0];
  if (!segment) return;
  const headProgress = segmentPosition - Math.floor(segmentPosition);
  const radius = sigil.radius * Math.min(width, height);
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const segmentLength = Math.max(0.001, Math.hypot(dx, dy));
  const normalX = -dy / segmentLength;
  const normalY = dx / segmentLength;
  const head = pointAt(segment, headProgress);
  const spellTime = phase * 12;
  const seedPhase = sigil.serial * 0.731;
  const flux = clamp(0, (
    0.53
    + Math.sin(spellTime * 1.17 + seedPhase) * 0.22
    + Math.sin(spellTime * 3.71 + seedPhase * 1.9) * 0.13
    + Math.sin(spellTime * 8.23 + seedPhase * 0.47) * 0.065
  ), 1);
  const driftX = (
    Math.sin(spellTime * 0.91 + seedPhase) * 0.54
    + Math.sin(spellTime * 3.19 + 1.7) * 0.18
  );
  const driftY = (
    Math.cos(spellTime * 1.07 + seedPhase * 0.73) * 0.48
    + Math.sin(spellTime * 4.03 + 0.4) * 0.16
  );
  const luminousHead = { x: head.x + driftX, y: head.y + driftY };
  drawPhysicalHintLight(context, width, height, luminousHead, radius, material, 0.88 + flux * 0.24);

  // The incision survives only a short distance behind the light. As it ages,
  // its crisp core vanishes first while a broader, weaker rust bloom remains,
  // as though the displaced pigment were being pulled into the skin.
  const trailSpan = 1.55;
  const grooveBuckets = Array.from({ length: 4 }, () => new Path2D());
  const grooveLife = [1, 0.68, 0.37, 0.13] as const;
  const trailStart = Math.max(0, segmentPosition - trailSpan);
  segments.forEach((engraved, index) => {
    const visibleStart = Math.max(0, trailStart - index);
    const visibleEnd = Math.min(1, segmentPosition - index);
    if (visibleEnd <= visibleStart) return;
    const pieces = Math.max(1, Math.ceil((visibleEnd - visibleStart) * 10));
    for (let piece = 0; piece < pieces; piece += 1) {
      const fromProgress = visibleStart + (visibleEnd - visibleStart) * piece / pieces;
      const toProgress = visibleStart + (visibleEnd - visibleStart) * (piece + 1) / pieces;
      const pathPosition = index + (fromProgress + toProgress) * 0.5;
      const age = clamp(0, (segmentPosition - pathPosition) / trailSpan, 0.9999);
      const bucket = Math.min(grooveBuckets.length - 1, Math.floor(age * grooveBuckets.length));
      const from = pointAt(engraved, fromProgress);
      const to = pointAt(engraved, toProgress);
      grooveBuckets[bucket].moveTo(from.x, from.y);
      grooveBuckets[bucket].lineTo(to.x, to.y);
    }
  });
  const strokeGroove = (
    color: string,
    widthAtHead: number,
    offsetX: number,
    offsetY: number,
    blurAtHead = 0,
    broadensWithAge = 0,
  ) => {
    grooveBuckets.forEach((path, bucket) => {
      context.save();
      context.translate(offsetX, offsetY);
      context.globalAlpha *= grooveLife[bucket];
      context.strokeStyle = color;
      context.lineWidth = widthAtHead + bucket * broadensWithAge;
      context.filter = blurAtHead + bucket * 0.42 > 0
        ? `blur(${blurAtHead + bucket * 0.42}px)`
        : "none";
      context.stroke(path);
      context.restore();
    });
  };
  context.save();
  context.clip(paperPath(width, height));
  context.globalCompositeOperation = "source-over";
  context.lineCap = "round";
  context.lineJoin = "round";

  strokeGroove("rgba(142,58,38,.13)", 2.8, 0, 0, 1.05, 0.72);
  strokeGroove("rgba(61,29,23,.34)", 1.18, 0.58, 0.76, 0, 0.18);
  strokeGroove("rgba(255,235,190,.16)", 0.52, -0.46, -0.62);
  strokeGroove("rgba(69,32,24,.42)", 0.7, 0, 0, 0, 0.12);

  if (headProgress > 0.012) {
    const freshStart = pointAt(segment, Math.max(0, headProgress - 0.2));
    const freshInk = context.createLinearGradient(freshStart.x, freshStart.y, head.x, head.y);
    freshInk.addColorStop(0, "rgba(117,47,33,0)");
    freshInk.addColorStop(0.55, "rgba(151,65,40,.18)");
    freshInk.addColorStop(1, "rgba(234,164,83,.54)");
    context.globalCompositeOperation = "lighter";
    context.filter = "blur(.42px)";
    context.strokeStyle = freshInk;
    context.shadowColor = "rgba(147,66,42,.38)";
    context.shadowBlur = 4.5;
    context.lineWidth = 1.06;
    context.beginPath();
    context.moveTo(freshStart.x, freshStart.y);
    context.lineTo(head.x, head.y);
    context.stroke();
  }
  context.restore();

  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.lineJoin = "round";

  // A faint spell-thread wakes beneath the moving point. It is thin enough to
  // indicate the exact chord rather than becoming a second decorative line.
  if (headProgress > 0.015) {
    const filamentStart = pointAt(segment, Math.max(0, headProgress - 0.3));
    const filament = context.createLinearGradient(filamentStart.x, filamentStart.y, head.x, head.y);
    filament.addColorStop(0, "rgba(118,55,45,0)");
    filament.addColorStop(0.52, "rgba(142,69,48,.06)");
    filament.addColorStop(0.86, "rgba(205,133,72,.18)");
    filament.addColorStop(1, "rgba(255,226,158,.42)");
    context.strokeStyle = filament;
    context.shadowColor = "rgba(125,70,106,.28)";
    context.shadowBlur = 5;
    context.lineWidth = 0.72;
    context.beginPath();
    context.moveTo(filamentStart.x, filamentStart.y);
    context.lineTo(head.x, head.y);
    context.stroke();
  }

  // The copper wake remains on the ruled line; only the dust motes below are
  // allowed to drift away from it. This keeps the tracing hint mechanically
  // honest while making it feel enchanted rather than electrically lit.
  for (let index = 15; index >= 1; index -= 1) {
    const tail = index / 15;
    const fromProgress = headProgress - 0.34 * tail;
    const toProgress = headProgress - 0.34 * (index - 1) / 15;
    if (toProgress <= 0) continue;
    const from = pointAt(segment, fromProgress);
    const to = pointAt(segment, toProgress);
    const alpha = (1 - tail) ** 1.45;
    context.strokeStyle = `rgba(225, 157, 79, ${alpha * 0.34})`;
    context.shadowColor = `rgba(145, 63, 46, ${alpha * 0.62})`;
    context.shadowBlur = 2 + alpha * 8;
    context.lineWidth = 0.6 + alpha * 1.35;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  const glowRadius = clamp(8, radius * 0.095, 14) * (0.9 + flux * 0.16);

  // The corona is a superposition of drifting, anisotropic volumes. None of
  // them retains a closed silhouette, so the light breathes like a small
  // phenomenon rather than translating as a pre-drawn icon.
  const lobes = [
    { tint: [255, 231, 170], alpha: 0.32, stretch: 1.24, squash: 0.66, speed: 0.41 },
    { tint: [194, 166, 211], alpha: 0.15, stretch: 0.86, squash: 0.52, speed: -0.57 },
    { tint: [224, 142, 80], alpha: 0.2, stretch: 1.06, squash: 0.43, speed: 0.73 },
  ] as const;
  lobes.forEach((lobe, index) => {
    const lobePhase = spellTime * lobe.speed + seedPhase + index * 2.13;
    const offset = 0.65 + index * 0.42;
    const lobeX = luminousHead.x + Math.cos(lobePhase * 1.31) * offset;
    const lobeY = luminousHead.y + Math.sin(lobePhase * 0.87) * offset;
    const breathing = 0.87 + flux * 0.16 + Math.sin(lobePhase * 2.37) * 0.055;
    context.save();
    context.translate(lobeX, lobeY);
    context.rotate(lobePhase * 0.29);
    context.scale(lobe.stretch * breathing, lobe.squash / Math.max(0.72, breathing));
    const lobeGlow = context.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    const [red, green, blue] = lobe.tint;
    lobeGlow.addColorStop(0, `rgba(${red},${green},${blue},${lobe.alpha * (0.7 + flux * 0.3)})`);
    lobeGlow.addColorStop(0.38, `rgba(${red},${green},${blue},${lobe.alpha * 0.45})`);
    lobeGlow.addColorStop(1, `rgba(${red},${green},${blue},0)`);
    context.fillStyle = lobeGlow;
    context.beginPath();
    context.arc(0, 0, glowRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });

  const coreGlow = context.createRadialGradient(
    luminousHead.x,
    luminousHead.y,
    0,
    luminousHead.x,
    luminousHead.y,
    glowRadius * 0.72,
  );
  coreGlow.addColorStop(0, `rgba(255,249,218,${0.76 + flux * 0.2})`);
  coreGlow.addColorStop(0.2, `rgba(242,203,125,${0.4 + flux * 0.18})`);
  coreGlow.addColorStop(0.62, "rgba(142,75,75,.13)");
  coreGlow.addColorStop(1, "rgba(94,66,112,0)");
  context.fillStyle = coreGlow;
  context.beginPath();
  context.arc(luminousHead.x, luminousHead.y, glowRadius * 0.72, 0, Math.PI * 2);
  context.fill();

  // Open, unequally timed filaments continuously shed and reform around the
  // core. Their curves have no rotational symmetry and never close into a
  // recognisable emblem.
  for (let wisp = 0; wisp < 4; wisp += 1) {
    const wispPhase = spellTime * (0.46 + wisp * 0.073) + seedPhase * (1 + wisp * 0.21) + wisp * 1.91;
    const startRadius = 1.1 + wisp * 0.38;
    const reach = 4.2 + wisp * 1.05 + Math.sin(wispPhase * 1.77) * 1.25;
    const startX = luminousHead.x + Math.cos(wispPhase) * startRadius;
    const startY = luminousHead.y + Math.sin(wispPhase) * startRadius;
    const endAngle = wispPhase + 0.74 + Math.sin(wispPhase * 0.69) * 0.42;
    const endX = luminousHead.x + Math.cos(endAngle) * reach;
    const endY = luminousHead.y + Math.sin(endAngle) * reach;
    const controlX = luminousHead.x + Math.cos(wispPhase + 1.18) * reach * 0.72;
    const controlY = luminousHead.y + Math.sin(wispPhase + 1.18) * reach * 0.72;
    context.strokeStyle = wisp % 3 === 1
      ? `rgba(192,166,210,${0.12 + flux * 0.12})`
      : `rgba(245,203,132,${0.16 + flux * 0.15})`;
    context.shadowColor = wisp % 3 === 1 ? "rgba(118,86,142,.42)" : "rgba(180,98,49,.42)";
    context.shadowBlur = 3 + flux * 3;
    context.lineWidth = 0.28 + (1 - wisp / 4) * 0.24;
    context.beginPath();
    context.moveTo(startX, startY);
    context.quadraticCurveTo(controlX, controlY, endX, endY);
    context.stroke();
  }

  // Dust spirals around the line with deterministic motion so it feels alive
  // without the harsh random flicker of an electrical particle effect.
  for (let mote = 0; mote < 7; mote += 1) {
    const age = (headProgress * 11.5 + mote * 0.137 + sigil.serial * 0.071) % 1;
    const behind = 0.035 + age * 0.2;
    const base = pointAt(segment, headProgress - behind);
    const side = Math.sin(spellTime * (1.22 + mote * 0.047) + mote * 2.19 + seedPhase) * (1.4 + age * 4.2);
    const lift = Math.cos(spellTime * 0.73 + mote * 1.73 + seedPhase * 0.4) * 0.9;
    const moteX = base.x + normalX * side + dx / segmentLength * lift;
    const moteY = base.y + normalY * side + dy / segmentLength * lift;
    const moteAlpha = Math.sin(age * Math.PI) * 0.52;
    context.fillStyle = mote % 3 === 0
      ? `rgba(187,161,206,${moteAlpha * 0.52})`
      : `rgba(242,190,105,${moteAlpha})`;
    context.shadowColor = mote % 3 === 0 ? "rgba(132,99,154,.48)" : "rgba(185,99,49,.52)";
    context.shadowBlur = 3.5;
    context.beginPath();
    context.arc(moteX, moteY, 0.32 + (1 - age) * 0.55, 0, Math.PI * 2);
    context.fill();
  }

  const arrival = smoothstep(0.78, 1, headProgress);
  const arrivalPulse = Math.sin(arrival * Math.PI);
  if (arrivalPulse > 0.01) {
    context.strokeStyle = `rgba(214,169,116,${arrivalPulse * 0.34})`;
    context.shadowColor = "rgba(126,77,126,.42)";
    context.shadowBlur = 5;
    context.lineWidth = 0.55;
    context.beginPath();
    context.arc(segment.end.x, segment.end.y, 2.6 + arrival * 6.4, 0, Math.PI * 2);
    context.stroke();
  }

  context.shadowColor = `rgba(255,221,153,${0.48 + flux * 0.34})`;
  context.shadowBlur = 2.8 + flux * 3.2;
  context.fillStyle = `rgba(255,249,221,${0.84 + flux * 0.14})`;
  context.beginPath();
  context.arc(luminousHead.x, luminousHead.y, 0.72 + flux * 0.58, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawOccultMechanism(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  sigil: Octagram,
  phase: number,
) {
  if (phase <= 0) return;
  const eased = 1 - Math.pow(1 - clamp(0, phase, 1), 4);
  const x = sigil.x * width;
  const y = sigil.y * height;
  const radius = sigil.radius * Math.min(width, height);
  const rust = `rgba(111, 48, 36, ${0.48 * eased})`;
  context.save();
  context.globalCompositeOperation = "source-over";
  context.strokeStyle = rust;
  context.fillStyle = `rgba(111, 48, 36, ${0.32 * eased})`;
  context.shadowColor = `rgba(137, 58, 36, ${0.34 * eased})`;
  context.shadowBlur = 5 + eased * 11;
  context.lineWidth = 0.72;

  [1.2, 1.47, 1.76].forEach((scale, index) => {
    context.save();
    context.translate(x, y);
    context.rotate((index % 2 === 0 ? 1 : -1) * eased * (0.52 + index * 0.31) + sigil.rotation * 0.2);
    context.setLineDash(index === 1 ? [2, 7, 1, 5] : index === 2 ? [1, 11] : []);
    context.beginPath();
    context.ellipse(0, 0, radius * scale, radius * scale * (0.84 + index * 0.035), index * 0.19, 0, Math.PI * 2);
    context.stroke();
    const teeth = 8 + index * 4;
    for (let tooth = 0; tooth < teeth; tooth += 1) {
      const angle = tooth / teeth * Math.PI * 2;
      const orbitX = Math.cos(angle) * radius * scale;
      const orbitY = Math.sin(angle) * radius * scale * (0.84 + index * 0.035);
      context.beginPath();
      context.arc(orbitX, orbitY, tooth % 3 === 0 ? 1.35 : 0.62, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  });

  const pageAnchors = [
    { x: width * 0.15, y: height * 0.21 },
    { x: width * 0.84, y: height * 0.25 },
    { x: width * 0.82, y: height * 0.78 },
    { x: width * 0.17, y: height * 0.81 },
  ];
  context.shadowBlur = 3 + eased * 6;
  pageAnchors.forEach((anchor, index) => {
    const angle = sigil.rotation + index * Math.PI * 0.5 + eased * (index % 2 ? -0.22 : 0.22);
    const startX = x + Math.cos(angle) * radius * 1.76;
    const startY = y + Math.sin(angle) * radius * 1.46;
    context.beginPath();
    context.moveTo(startX, startY);
    context.bezierCurveTo(
      startX + (anchor.x - startX) * 0.33,
      startY + (index % 2 ? -1 : 1) * 36 * eased,
      anchor.x - (anchor.x - startX) * 0.22,
      anchor.y + (index % 2 ? 1 : -1) * 26 * eased,
      anchor.x,
      anchor.y,
    );
    context.stroke();
    context.save();
    context.translate(anchor.x, anchor.y);
    context.rotate(angle * 0.3);
    context.beginPath();
    context.arc(0, 0, 7 + eased * 5, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(-5, 0);
    context.lineTo(5, 0);
    context.moveTo(0, -5);
    context.lineTo(0, 5);
    context.stroke();
    context.restore();
  });
  context.restore();
}

function drawMagic(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cast: Cast,
  phase: number,
  locale: Locale,
  points: InkPoint[],
  ritual: RitualState,
  parts: { geometry?: boolean; phrase?: boolean } = {},
) {
  if (phase <= 0) return;
  const drawGeometry = parts.geometry ?? true;
  const drawPhrase = parts.phrase ?? true;
  const x = (ritual.sigil?.x ?? cast.x) * width;
  const y = (ritual.sigil?.y ?? cast.y) * height;
  const eased = 1 - Math.pow(1 - clamp(0, phase, 1), 3);
  const ritualVertices = ritual.sigil ? octagramVertices(ritual.sigil, width, height) : null;
  const vertices = ritualVertices ?? sigilPoints(points);
  if (drawGeometry) {
    const guideOpacity = ritual.sigil && ritual.stage === "summoned" ? ritual.guideOpacity : 1;
    const sealOpacity = ritual.sigil && ritual.stage === "summoned" ? 0.62 : 0.7;
    context.save();
    context.globalAlpha *= guideOpacity;
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = `rgba(111, 48, 36, ${sealOpacity * eased})`;
    context.fillStyle = `rgba(111, 48, 36, ${0.64 * eased})`;
    context.shadowColor = `rgba(145, 58, 37, ${(ritual.sigil && ritual.stage === "summoned" ? 0.25 : 0.48) * eased})`;
    context.shadowBlur = ritual.sigil ? 4 + eased * 6 : 3;
    context.lineWidth = ritual.sigil ? 1.05 : 0.9;
    if (vertices.length >= 3) {
      // The seal is derived from the actual hand movement. Its geometry can
      // never be a stock, perfectly centred magic circle.
      const step = ritualVertices ? 3 : vertices.length % 2 === 0 ? 3 : 2;
      const order = ritualVertices
        ? crossedOctagramOrder(vertices.length)
        : vertices.length >= 7
          ? Array.from({ length: vertices.length }, (_, index) => (index * step) % vertices.length)
          : vertices.map((_, index) => index);
      context.beginPath();
      order.forEach((vertexIndex, index) => {
        const vertex = vertices[vertexIndex];
        const scale = ritualVertices ? 1 : 0.84 + hash(index + cast.serial * 13) * 0.08;
        const px = x + (vertex.x - x) * scale;
        const py = y + (vertex.y - y) * scale;
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

      const extentX = Math.max(42, Math.max(...vertices.map((vertex) => Math.abs(vertex.x - x))) * (ritualVertices ? 1.18 : 1.14));
      const extentY = Math.max(32, Math.max(...vertices.map((vertex) => Math.abs(vertex.y - y))) * (ritualVertices ? 1.18 : 1.08));
      context.save();
      context.shadowBlur = ritual.sigil ? 8 : 0;
      context.setLineDash([1, 5, 2, 8]);
      context.globalAlpha *= 0.62;
      context.beginPath();
      context.ellipse(x, y, extentX, extentY, -0.035 + hash(cast.serial + 91) * 0.08, 0.18, Math.PI * 1.82);
      context.stroke();
      context.setLineDash([]);
      context.globalAlpha *= 0.55;
      context.beginPath();
      context.ellipse(x + 1.4, y - 0.8, extentX * 1.08, extentY * 1.12, 0.025, 2.65, Math.PI * 2 + 2.27);
      context.stroke();
      context.restore();
    }
    context.restore();

    if (ritual.stage === "unsealed" && ritual.sigil) {
      drawOccultMechanism(context, width, height, ritual.sigil, ritual.mechanismPhase);
    }

    context.save();
    context.globalAlpha *= guideOpacity;
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
    const invocationRadius = ritual.sigil
      ? ritual.sigil.radius * Math.min(width, height) * 1.36
      : clamp(width < 700 ? 54 : 72, Math.min(width, height) * 0.11, width < 700 ? 82 : 118);
    ["memoria", "ordo", "limen", cast.name.toLocaleLowerCase()].forEach((word, index) => {
      const angle = -Math.PI * 0.72 + index * Math.PI * 0.49 + (hash(cast.serial + index * 17) - 0.5) * 0.12;
      context.save();
      context.translate(x + Math.cos(angle) * invocationRadius, y + Math.sin(angle) * invocationRadius * 0.72);
      context.rotate(angle + Math.PI * 0.5);
      drawInkLine(context, word, 0, 0, {
        align: "center",
        color: `rgba(87,42,32,${0.38 * eased})`,
        alpha: eased,
        pressure: 0.56,
        absorption: 0.84,
        letterSpacing: 0.035,
      });
      context.restore();
    });
    drawWrapped(context, COPY[locale].hidden, width * (width < 700 ? 0.18 : 0.58), height * (width < 700 ? 0.9 : 0.84), width * (width < 700 ? 0.48 : 0.28), width < 700 ? 17 : 20, {
      maxLines: 3,
      color: `rgba(87,42,32,${0.62 * eased})`,
    });
    if (ritual.stage !== "idle") {
      context.font = handFont(locale, width < 700 ? 10 : 12.5);
      drawWrapped(
        context,
        ritual.stage === "summoned" ? COPY[locale].traceStar : COPY[locale].harmlessMechanism,
        x,
        clamp(height * 0.18, y + invocationRadius * 0.88, height * 0.88),
        width * (width < 700 ? 0.48 : 0.3),
        width < 700 ? 16 : 19,
        {
          maxLines: 2,
          color: `rgba(111,48,36,${0.66 * eased})`,
          align: "center",
        },
      );
    }
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
  parchmentRenderer: PhysicalParchmentRenderer | null,
) {
  const context = canvas.getContext("2d");
  if (!context || size.width <= 0 || size.height <= 0) return;
  canvas.dataset.parchmentRenderer = parchmentRenderer?.available ? "height-field" : "canvas-fallback";
  canvas.dataset.textRenderer = textRenderer?.available ? "troika-sdf" : "canvas-fallback";
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    parchmentRenderer?.available ? deskLayer(canvas, size) : materialLayer(canvas, size),
    0,
    0,
  );

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
  drawPalimpsestChapter(inkContext, size.width, size.height, state, content, locale);
  if (gpuText && textRenderer) {
    // Queue the awakened phrase before the GPU pass; its sigil and the user's
    // physical stroke are deliberately drawn afterwards, above static type.
    drawMagic(inkContext, size.width, size.height, state.cast, state.magicPhase, locale, state.points, state.ritual, {
      geometry: false,
      phrase: true,
    });
    INK_TEXT_COLLECTIONS.delete(inkContext);
    const textCanvas = textRenderer.renderFrame(gpuText.runs, size, inkSurface.surface);
    if (!textRenderer.available) {
      inkContext.restore();
      paintScene(canvas, size, state, content, locale, null, parchmentRenderer);
      return;
    }
    inkContext.setTransform(1, 0, 0, 1, 0, 0);
    inkContext.drawImage(textCanvas, 0, 0);
    const glyphContext = inkSurface.glyph.getContext("2d");
    if (glyphContext) {
      glyphContext.clearRect(0, 0, inkSurface.glyph.width, inkSurface.glyph.height);
      glyphContext.drawImage(textCanvas, 0, 0);
    }
    inkContext.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    absorbPalimpsestInk(inkContext, state.palimpsest.progress, inkSurface.absorption, inkSurface.capillary);
    state.ritualStrokes.forEach((stroke) => drawInkStroke(inkContext, stroke));
    drawInkStroke(inkContext, state.points);
    drawMagic(inkContext, size.width, size.height, state.cast, state.magicPhase, locale, state.points, state.ritual, {
      geometry: true,
      phrase: false,
    });
  } else {
    absorbPalimpsestInk(inkContext, state.palimpsest.progress, inkSurface.absorption, inkSurface.capillary);
    state.ritualStrokes.forEach((stroke) => drawInkStroke(inkContext, stroke));
    drawInkStroke(inkContext, state.points);
    drawMagic(inkContext, size.width, size.height, state.cast, state.magicPhase, locale, state.points, state.ritual);
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

  if (parchmentRenderer?.available) {
    const physicalSurface = parchmentRenderer.renderFrame(size, {
      albedo: inkSurface.albedo,
      height: inkSurface.surface,
      ink: inkSurface.canvas,
    }, {
      palimpsest: Math.sin(clamp(0, state.palimpsest.progress, 1) * Math.PI) * 0.16,
      mechanism: state.ritual.stage === "unsealed"
        ? Math.sin(clamp(0, state.ritual.mechanismPhase, 1) * Math.PI)
        : 0,
      mechanismCenter: state.ritual.sigil
        ? { x: state.ritual.sigil.x, y: state.ritual.sigil.y }
        : undefined,
    });
    if (!parchmentRenderer.available) {
      paintScene(canvas, size, state, content, locale, textRenderer, null);
      return;
    }
    context.save();
    context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    context.shadowColor = "rgba(0,0,0,.62)";
    context.shadowBlur = size.width < 700 ? 16 : 30;
    context.shadowOffsetX = size.width < 700 ? 2 : 7;
    context.shadowOffsetY = size.width < 700 ? 8 : 16;
    context.fillStyle = "#1a100b";
    context.fill(paperPath(size.width, size.height));
    context.restore();
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(physicalSurface, 0, 0, canvas.width, canvas.height);
    context.restore();
    return;
  }

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
        <h2>{copy.workTitle}</h2>
        <p>{copy.commissionIntro}</p>
        {content.work.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.summary}</p><dl><dt>{copy.fit}</dt><dd>{item.fit}</dd><dt>{copy.scope}</dt><dd>{item.scope}</dd><dt>{copy.outcome}</dt><dd>{item.outcome}</dd><dt>{copy.tools}</dt><dd>{item.stack}</dd></dl></article>)}
      </>
    );
  }
  if (view === "career") {
    return (
      <>
        <h2>{copy.careerTitle}</h2>
        <p>{copy.careerIntro}</p>
        {content.career.map((item) => <article key={`${item.company}-${item.period}`}><h3>{item.company}</h3><p>{item.period} — {item.role}</p><p>{item.summary}</p><ul>{item.details.map((detail) => <li key={detail}>{detail}</li>)}</ul><p>{item.stack}</p></article>)}
      </>
    );
  }
  if (view === "products") {
    return (
      <>
        <h2>{copy.productsTitle}</h2>
        <p>{copy.productsIntro}</p>
        {content.products.map((item) => <article key={item.name}><h3>{item.name}</h3><p>{item.kind}</p><p>{item.description}</p><p>{copy.purpose}: {item.purpose}</p><p>{item.stack}</p><p><a href={item.website}>{content.labels.website}</a> · <a href={item.github}>GitHub</a></p></article>)}
      </>
    );
  }
  if (view === "contact") return <><h2>{copy.contactTitle}</h2><p>{copy.letterOpening}</p><ul>{SOCIAL_LINKS.map((link) => <li key={link.href}><a href={link.href}>{link.label}</a></li>)}</ul></>;
  return <><h2>{copy.home}</h2><p>{copy.homeCopy}</p><p>{content.hero.introduction}</p><p>{copy.maxim}</p></>;
}

const STYLES = `
  @font-face {
    font-family: "Ischca IM Fell English";
    src: url("${assetUrl("fonts/IMFellEnglish-Portfolio.woff")}") format("woff");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }
  @font-face {
    font-family: "Ischca IM Fell English";
    src: url("${assetUrl("fonts/IMFellEnglish-Portfolio-Italic.woff")}") format("woff");
    font-style: italic;
    font-weight: 400;
    font-display: swap;
  }
  @font-face {
    font-family: "Ischca IM Fell English SC";
    src: url("${assetUrl("fonts/IMFellEnglishSC-Portfolio.woff")}") format("woff");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }
  @font-face {
    font-family: "Ischca Fondamento";
    src: url("${assetUrl("fonts/Fondamento-Portfolio-Italic.woff")}") format("woff");
    font-style: italic;
    font-weight: 400;
    font-display: swap;
  }
  @font-face {
    font-family: "Ischca Yuji Syuku";
    src: url("${assetUrl("fonts/YujiSyuku-Portfolio.woff")}") format("woff");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }
  @font-face {
    font-family: "Ischca Noto Serif JP";
    src: url("${assetUrl("fonts/NotoSerifJP-Portfolio.woff")}") format("woff");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }
  @font-face {
    font-family: "Ischca Noto Serif JP";
    src: url("${assetUrl("fonts/NotoSerifJP-Portfolio-Semibold.woff")}") format("woff");
    font-style: normal;
    font-weight: 600;
    font-display: swap;
  }
  .canvas-grimoire-experience {
    --grimoire-stage-height: clamp(720px, 100svh, 960px);
    position: relative;
    width: 100%;
    height: calc(var(--grimoire-stage-height) + 800svh);
    min-height: calc(720px + 800svh);
    overflow: visible;
    isolation: isolate;
    background: #0c0907;
    color: #2d1c13;
  }
  .canvas-grimoire-stage {
    position: sticky;
    z-index: 1;
    top: 0;
    width: 100%;
    height: var(--grimoire-stage-height);
    overflow: hidden;
    isolation: isolate;
    background: #0c0907;
    perspective: 1800px;
  }
  .canvas-grimoire-surface {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
    cursor: default;
  }
  .canvas-grimoire-hint {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }
  .canvas-grimoire-stage[data-verso] .canvas-grimoire-surface,
  .canvas-grimoire-stage[data-verso] .canvas-grimoire-hint {
    transform-origin: 50% 50%;
    backface-visibility: hidden;
    will-change: transform, filter, opacity;
  }
  .canvas-grimoire-stage[data-verso="entering"] .canvas-grimoire-surface,
  .canvas-grimoire-stage[data-verso="entering"] .canvas-grimoire-hint {
    animation: grimoire-folio-turn-out 3.1s cubic-bezier(.68, .01, .18, 1) both;
  }
  .canvas-grimoire-stage[data-verso="active"] .canvas-grimoire-surface,
  .canvas-grimoire-stage[data-verso="active"] .canvas-grimoire-hint,
  .canvas-grimoire-stage[data-verso="recalling"] .canvas-grimoire-surface,
  .canvas-grimoire-stage[data-verso="recalling"] .canvas-grimoire-hint {
    opacity: 0;
    transform: rotateY(-180deg) scale(.9);
  }
  .canvas-grimoire-stage[data-verso="closing"] .canvas-grimoire-surface,
  .canvas-grimoire-stage[data-verso="closing"] .canvas-grimoire-hint {
    animation: grimoire-folio-turn-in 2.2s cubic-bezier(.62, .02, .18, 1) both;
  }
  @keyframes grimoire-folio-turn-out {
    0% { opacity: 1; transform: rotateY(0deg) scale(1); filter: brightness(1); }
    35% { opacity: 1; transform: rotateY(-38deg) scale(.97); filter: brightness(.72) contrast(1.08); }
    62% { opacity: .72; transform: rotateY(-104deg) scale(.93); filter: brightness(.38) contrast(1.35); }
    100% { opacity: 0; transform: rotateY(-180deg) scale(.9); filter: brightness(.12) contrast(1.5); }
  }
  @keyframes grimoire-folio-turn-in {
    0% { opacity: 0; transform: rotateY(-180deg) scale(.9); filter: brightness(.18) contrast(1.45); }
    48% { opacity: .76; transform: rotateY(-72deg) scale(.95); filter: brightness(.6) contrast(1.18); }
    100% { opacity: 1; transform: rotateY(0deg) scale(1); filter: brightness(1) contrast(1); }
  }
  .verso-exploded {
    position: absolute;
    inset: 0;
    z-index: 8;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 48%, rgba(18, 70, 88, .22), transparent 44%),
      linear-gradient(145deg, #020608 0%, #030a0f 54%, #010304 100%);
    color: #c9f6ff;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    letter-spacing: .08em;
    isolation: isolate;
  }
  .verso-exploded[data-phase="priming"] {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
  }
  .verso-exploded::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background:
      linear-gradient(rgba(88, 222, 248, .024) 1px, transparent 1px) 0 0 / 100% 4px,
      radial-gradient(circle at 50% 50%, transparent 48%, rgba(0, 0, 0, .58) 100%);
    mix-blend-mode: screen;
  }
  .verso-exploded::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    border: 1px solid rgba(98, 224, 250, .13);
    box-shadow: inset 0 0 140px rgba(0, 3, 5, .82);
  }
  .verso-exploded[data-phase="entering"] {
    animation: verso-space-in 3.1s cubic-bezier(.68, .01, .18, 1) both;
  }
  .verso-exploded[data-phase="closing"] {
    animation: verso-space-out 2.2s cubic-bezier(.62, .02, .18, 1) both;
  }
  @keyframes verso-space-in {
    0% { opacity: 0; transform: rotateY(180deg) scale(.9); filter: brightness(.18); }
    52% { opacity: .8; transform: rotateY(68deg) scale(.95); filter: brightness(.68); }
    100% { opacity: 1; transform: rotateY(0deg) scale(1); filter: brightness(1); }
  }
  @keyframes verso-space-out {
    0% { opacity: 1; transform: rotateY(0deg) scale(1); }
    48% { opacity: .72; transform: rotateY(86deg) scale(.94); }
    100% { opacity: 0; transform: rotateY(180deg) scale(.9); }
  }
  .verso-exploded-canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
  }
  .verso-hud-header,
  .verso-layer-readout,
  .verso-telemetry,
  .verso-instruction,
  .verso-return,
  .verso-inspector,
  .verso-hold-indicator {
    position: absolute;
    z-index: 3;
  }
  .verso-hold-indicator {
    --hold-x: 0px;
    --hold-y: 0px;
    --hold-progress: 0deg;
    top: 0;
    left: 0;
    display: grid;
    width: 58px;
    height: 58px;
    place-items: center;
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
    transform: translate3d(calc(var(--hold-x) - 29px), calc(var(--hold-y) - 29px), 0) scale(.78);
    transition: opacity 90ms linear, transform 160ms cubic-bezier(.2, .8, .2, 1);
  }
  .verso-hold-indicator[data-active="true"] {
    opacity: 1;
    transform: translate3d(calc(var(--hold-x) - 29px), calc(var(--hold-y) - 29px), 0) scale(1);
  }
  .verso-hold-indicator::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: conic-gradient(from -90deg, rgba(164, 246, 255, .98) var(--hold-progress), rgba(82, 216, 244, .14) 0);
    filter: drop-shadow(0 0 7px rgba(93, 228, 255, .62));
    -webkit-mask: radial-gradient(circle, transparent 57%, #000 59%);
    mask: radial-gradient(circle, transparent 57%, #000 59%);
  }
  .verso-hold-indicator::after {
    content: "";
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #e7fcff;
    box-shadow: 0 0 12px 3px rgba(95, 229, 255, .72);
  }
  .verso-hold-indicator i {
    position: absolute;
    inset: 9px;
    border: 1px solid rgba(107, 228, 251, .24);
    border-radius: 50%;
  }
  .verso-hold-indicator span {
    position: absolute;
    top: 66px;
    left: 50%;
    width: max-content;
    color: rgba(193, 244, 253, .72);
    font-size: .48rem;
    letter-spacing: .18em;
    transform: translateX(-50%);
    text-shadow: 0 0 8px rgba(75, 214, 244, .5);
  }
  .verso-focus-viewport {
    position: absolute;
    z-index: 2;
    top: 12%;
    bottom: 12%;
    left: 2.5%;
    width: 57%;
    box-sizing: border-box;
    overflow: hidden;
    border: 1px solid rgba(106, 225, 247, .14);
    background:
      radial-gradient(ellipse at center, rgba(41, 134, 157, .1), transparent 68%),
      linear-gradient(90deg, rgba(91, 222, 248, .018) 1px, transparent 1px) 0 0 / 32px 100%,
      linear-gradient(rgba(91, 222, 248, .018) 1px, transparent 1px) 0 0 / 100% 32px;
    box-shadow: inset 0 0 90px rgba(1, 7, 10, .56), 0 0 34px rgba(11, 72, 91, .12);
    pointer-events: auto;
    animation: verso-focus-in 520ms cubic-bezier(.18, .86, .2, 1) both;
  }
  .verso-focus-viewport > canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
    cursor: grab;
  }
  .verso-focus-viewport > canvas[data-dragging="true"] { cursor: grabbing; }
  .verso-focus-viewport > canvas:focus-visible {
    outline: 1px solid rgba(122, 235, 255, .66);
    outline-offset: -8px;
  }
  .verso-focus-viewport::before,
  .verso-focus-viewport::after {
    content: "";
    position: absolute;
    pointer-events: none;
  }
  .verso-focus-viewport::before {
    inset: 7px;
    border: 1px solid rgba(107, 229, 252, .055);
  }
  .verso-focus-viewport::after {
    top: -20%;
    bottom: -20%;
    left: -8%;
    width: 20%;
    background: linear-gradient(90deg, transparent, rgba(120, 235, 255, .055), transparent);
    transform: skewX(-12deg);
    animation: verso-focus-scan 5.8s ease-in-out infinite;
  }
  .verso-focus-viewport > span {
    position: absolute;
    top: 14px;
    left: 18px;
    color: rgba(130, 226, 245, .42);
    font-size: .48rem;
    letter-spacing: .18em;
    pointer-events: none;
    text-shadow: 0 0 12px rgba(3, 10, 14, .96);
  }
  .verso-focus-viewport > small {
    position: absolute;
    z-index: 2;
    right: 18px;
    bottom: 13px;
    color: rgba(142, 224, 240, .48);
    font-size: .45rem;
    font-weight: 400;
    letter-spacing: .12em;
    pointer-events: none;
    text-shadow: 0 0 10px #02080b;
  }
  .verso-focus-viewport > small b {
    color: rgba(220, 249, 255, .76);
    font-weight: 500;
  }
  .verso-height-modes {
    position: absolute;
    z-index: 4;
    top: 11px;
    right: 14px;
    display: flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid rgba(104, 225, 249, .16);
    background: rgba(1, 8, 12, .76);
    backdrop-filter: blur(8px);
  }
  .verso-height-modes button {
    border: 0;
    padding: 6px 8px;
    background: transparent;
    color: rgba(135, 222, 239, .52);
    font: .44rem/1 ui-monospace, "SFMono-Regular", Menlo, monospace;
    letter-spacing: .12em;
    cursor: pointer;
  }
  .verso-height-modes button:hover,
  .verso-height-modes button:focus-visible {
    color: rgba(224, 250, 255, .94);
    outline: 1px solid rgba(116, 232, 254, .42);
    outline-offset: -1px;
  }
  .verso-height-modes button[aria-pressed="true"] {
    background: rgba(84, 211, 238, .14);
    color: rgba(224, 250, 255, .92);
    box-shadow: inset 0 -1px rgba(117, 232, 254, .66), 0 0 12px rgba(78, 216, 244, .12);
  }
  .verso-focus-viewport > i {
    position: absolute;
    width: 22px;
    height: 22px;
    border-color: rgba(115, 232, 254, .52);
    border-style: solid;
    pointer-events: none;
  }
  .verso-focus-viewport > i:nth-of-type(1) { top: 7px; left: 7px; border-width: 1px 0 0 1px; }
  .verso-focus-viewport > i:nth-of-type(2) { top: 7px; right: 7px; border-width: 1px 1px 0 0; }
  .verso-focus-viewport > i:nth-of-type(3) { right: 7px; bottom: 7px; border-width: 0 1px 1px 0; }
  .verso-focus-viewport > i:nth-of-type(4) { bottom: 7px; left: 7px; border-width: 0 0 1px 1px; }
  @keyframes verso-focus-in {
    from { opacity: 0; transform: scale(.97); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes verso-focus-scan {
    0%, 18% { transform: translateX(0) skewX(-12deg); opacity: 0; }
    38% { opacity: 1; }
    75%, 100% { transform: translateX(620%) skewX(-12deg); opacity: 0; }
  }
  .verso-hud-header {
    top: clamp(24px, 5vh, 52px);
    left: clamp(24px, 5vw, 70px);
    display: grid;
    gap: 7px;
    pointer-events: none;
  }
  .verso-hud-header::before,
  .verso-layer-readout::before {
    content: "";
    width: 42px;
    height: 1px;
    margin-bottom: 3px;
    background: linear-gradient(90deg, #78eaff, transparent);
    box-shadow: 0 0 12px rgba(95, 226, 255, .7);
  }
  .verso-hud-header span,
  .verso-layer-readout span,
  .verso-telemetry,
  .verso-instruction {
    color: rgba(131, 226, 245, .62);
    font-size: clamp(.56rem, .82vw, .7rem);
  }
  .verso-hud-header strong {
    color: rgba(221, 250, 255, .92);
    font-size: clamp(.9rem, 1.6vw, 1.18rem);
    font-weight: 500;
    letter-spacing: .18em;
    text-shadow: 0 0 18px rgba(84, 222, 248, .34);
  }
  .verso-layer-readout {
    top: 50%;
    right: clamp(22px, 4.5vw, 68px);
    display: grid;
    width: min(270px, 25vw);
    gap: 7px;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .verso-layer-readout strong {
    color: rgba(218, 248, 255, .94);
    font-size: clamp(.8rem, 1.3vw, 1rem);
    font-weight: 500;
    text-shadow: 0 0 16px rgba(80, 221, 250, .38);
  }
  .verso-layer-readout em {
    margin-bottom: 9px;
    color: rgba(185, 91, 69, .8);
    font-size: clamp(.57rem, .8vw, .67rem);
    font-style: normal;
  }
  .verso-layer-readout small {
    color: rgba(140, 218, 234, .54);
    font-size: clamp(.52rem, .72vw, .62rem);
    line-height: 1.35;
  }
  .verso-layer-readout .verso-layer-kind {
    width: max-content;
    margin-top: -2px;
    color: rgba(185, 91, 69, .82);
    font-size: .45rem;
    letter-spacing: .16em;
  }
  .verso-layer-readout .verso-layer-evidence {
    width: max-content;
    margin: 1px 0 5px;
    border: 1px solid rgba(118, 232, 255, .22);
    padding: 3px 5px;
    color: rgba(178, 237, 248, .7);
    font-size: .46rem;
    letter-spacing: .14em;
  }
  .verso-exploded[data-inspecting="true"] .verso-layer-readout,
  .verso-exploded[data-inspecting="true"] .verso-instruction {
    opacity: 0;
    transition: opacity 240ms ease;
  }
  .verso-inspector {
    top: clamp(86px, 12vh, 128px);
    right: clamp(24px, 4.5vw, 68px);
    bottom: clamp(94px, 12vh, 126px);
    width: min(390px, 34vw);
    box-sizing: border-box;
    overflow: auto;
    padding: 24px 28px 24px 32px;
    border: 1px solid rgba(100, 224, 248, .22);
    background:
      linear-gradient(90deg, rgba(93, 225, 251, .09) 1px, transparent 1px) 0 0 / 24px 100%,
      linear-gradient(rgba(93, 225, 251, .055) 1px, transparent 1px) 0 0 / 100% 24px,
      rgba(3, 12, 18, .82);
    box-shadow: 0 0 58px rgba(8, 61, 78, .25), inset 2px 0 rgba(105, 230, 255, .16);
    backdrop-filter: blur(11px);
    animation: verso-inspector-in 480ms cubic-bezier(.18, .86, .2, 1) both;
  }
  .verso-inspector::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(transparent, #77e9ff, transparent);
    box-shadow: 0 0 18px rgba(96, 228, 255, .68);
  }
  @keyframes verso-inspector-in {
    from { opacity: 0; transform: translateX(28px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .verso-inspector-index {
    margin-bottom: 12px;
    color: rgba(130, 226, 245, .58);
    font-size: .57rem;
    letter-spacing: .18em;
  }
  .verso-inspector-evidence {
    width: max-content;
    margin: -2px 0 10px;
    border: 1px solid rgba(117, 230, 252, .28);
    padding: 4px 7px;
    color: rgba(184, 239, 249, .74);
    font-size: .48rem;
    letter-spacing: .15em;
  }
  .verso-inspector h2 {
    margin: 0;
    color: rgba(225, 250, 255, .96);
    font-size: clamp(1rem, 1.7vw, 1.35rem);
    font-weight: 500;
    letter-spacing: .14em;
    text-shadow: 0 0 20px rgba(83, 222, 249, .4);
  }
  .verso-inspector-subtitle {
    margin: 7px 0 20px;
    color: rgba(185, 91, 69, .86);
    font-size: .62rem;
    letter-spacing: .16em;
  }
  .verso-inspector-summary {
    margin: 0 0 20px;
    color: rgba(190, 231, 239, .73);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: .77rem;
    letter-spacing: .045em;
    line-height: 1.85;
  }
  .verso-inspector dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    margin: 0 0 24px;
    background: rgba(91, 215, 239, .18);
  }
  .verso-inspector dl div {
    min-width: 0;
    padding: 10px;
    background: rgba(4, 15, 21, .92);
  }
  .verso-inspector dt {
    color: rgba(111, 210, 230, .46);
    font-size: .46rem;
  }
  .verso-inspector dd {
    margin: 5px 0 0;
    overflow-wrap: anywhere;
    color: rgba(216, 247, 252, .87);
    font-size: .57rem;
    line-height: 1.35;
  }
  .verso-inspector h3 {
    margin: 0 0 11px;
    color: rgba(132, 226, 244, .62);
    font-size: .56rem;
    font-weight: 500;
    letter-spacing: .18em;
  }
  .verso-inspector ol {
    margin: 0 0 20px;
    padding: 0;
    list-style: none;
    counter-reset: process;
  }
  .verso-inspector li {
    position: relative;
    padding: 7px 0 7px 34px;
    border-top: 1px solid rgba(91, 214, 238, .11);
    color: rgba(171, 222, 232, .68);
    font-size: .61rem;
    line-height: 1.45;
    counter-increment: process;
  }
  .verso-inspector li::before {
    content: "0" counter(process);
    position: absolute;
    left: 2px;
    color: rgba(185, 91, 69, .8);
  }
  .verso-inspector pre {
    margin: 0 0 22px;
    overflow: auto;
    padding: 13px;
    border-left: 1px solid rgba(119, 232, 253, .34);
    background: rgba(0, 5, 8, .66);
    color: rgba(158, 229, 242, .72);
    font: .56rem/1.75 ui-monospace, "SFMono-Regular", Menlo, monospace;
    letter-spacing: 0;
  }
  .verso-inspector-release {
    position: sticky;
    z-index: 2;
    top: -24px;
    display: flex;
    width: 100%;
    align-items: center;
    gap: 10px;
    margin: -8px 0 24px;
    border: 0;
    border-bottom: 1px solid rgba(105, 229, 253, .36);
    padding: 14px 0 11px;
    background: linear-gradient(90deg, rgba(3, 12, 18, .98) 72%, transparent);
    color: rgba(209, 247, 255, .86);
    font: inherit;
    font-size: .6rem;
    letter-spacing: .16em;
    cursor: pointer;
  }
  .verso-inspector-release span {
    color: rgba(185, 91, 69, .92);
    font-size: .85rem;
    transition: transform 180ms ease;
  }
  .verso-inspector-release:hover,
  .verso-inspector-release:focus-visible {
    color: #effdff;
    text-shadow: 0 0 12px rgba(97, 230, 255, .76);
    outline: none;
  }
  .verso-inspector-release:hover span,
  .verso-inspector-release:focus-visible span { transform: translateX(-4px); }
  .verso-exploded[data-inspecting="true"] .verso-exploded-canvas { cursor: default !important; }
  .verso-exploded[data-inspecting="true"] > .verso-exploded-canvas {
    opacity: .08;
    transition: opacity 360ms ease;
  }
  .verso-telemetry {
    left: clamp(24px, 5vw, 70px);
    bottom: clamp(76px, 10vh, 108px);
    display: grid;
    gap: 6px;
    pointer-events: none;
  }
  .verso-telemetry span:first-child { color: rgba(185, 91, 69, .88); }
  .verso-instruction {
    right: clamp(24px, 4.5vw, 68px);
    bottom: clamp(76px, 10vh, 108px);
    max-width: min(520px, 46vw);
    margin: 0;
    line-height: 1.5;
    text-align: right;
    pointer-events: none;
  }
  .verso-return {
    right: clamp(24px, 4.5vw, 68px);
    bottom: clamp(24px, 4vh, 46px);
    display: flex;
    align-items: center;
    gap: 12px;
    border: 0;
    padding: 8px 0 8px 12px;
    background: transparent;
    color: rgba(209, 247, 255, .86);
    font-size: clamp(.65rem, .9vw, .76rem);
    letter-spacing: .16em;
    cursor: pointer;
  }
  .verso-return i {
    position: relative;
    width: 28px;
    height: 28px;
    border: 1px solid rgba(96, 224, 250, .5);
    border-radius: 50%;
    box-shadow: 0 0 14px rgba(62, 202, 234, .18), inset 0 0 10px rgba(62, 202, 234, .12);
  }
  .verso-return i::before {
    content: "";
    position: absolute;
    top: 7px;
    left: 8px;
    width: 9px;
    height: 9px;
    border-bottom: 1px solid currentColor;
    border-left: 1px solid currentColor;
    transform: rotate(45deg);
  }
  .verso-return::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: 2px;
    left: 12px;
    height: 1px;
    background: linear-gradient(90deg, rgba(105, 230, 255, .62), transparent);
    transform: scaleX(.24);
    transform-origin: right;
    transition: transform 220ms ease;
  }
  .verso-return:hover::after,
  .verso-return:focus-visible::after { transform: scaleX(1); }
  .verso-return:hover i,
  .verso-return:focus-visible i {
    color: #e7fbff;
    border-color: rgba(132, 237, 255, .9);
    box-shadow: 0 0 24px rgba(62, 202, 234, .42), inset 0 0 14px rgba(62, 202, 234, .18);
  }
  .verso-return:focus-visible {
    outline: 1px solid rgba(112, 231, 255, .72);
    outline-offset: 7px;
  }
  .verso-return:disabled {
    cursor: wait;
    opacity: .58;
  }
  .verso-return:disabled i { animation: verso-recall-spin 1.2s linear infinite; }
  @keyframes verso-recall-spin { to { transform: rotate(-360deg); } }
  .canvas-grimoire-language {
    position: absolute;
    z-index: 4;
    top: clamp(18px, 3.8svh, 34px);
    right: clamp(24px, 4.2vw, 62px);
    color: rgba(51, 31, 21, .58);
    font-family: "Ischca IM Fell English SC", "Ischca Noto Serif JP", Georgia, serif;
    font-size: clamp(.72rem, 1.2vw, .9rem);
    letter-spacing: .12em;
    line-height: 1;
    text-decoration: none;
    text-transform: uppercase;
    transition: color 180ms ease, text-shadow 180ms ease;
  }
  .canvas-grimoire-language:hover,
  .canvas-grimoire-language:focus-visible {
    color: rgba(45, 27, 18, .92);
    text-shadow: 0 1px rgba(255, 252, 242, .45);
  }
  .canvas-grimoire-language:focus-visible {
    outline: 1px solid rgba(96, 40, 27, .72);
    outline-offset: 6px;
  }
  .canvas-grimoire-actions {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
  }
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
      --grimoire-stage-height: max(780px, 100svh);
      height: calc(var(--grimoire-stage-height) + 680svh);
      min-height: calc(780px + 680svh);
    }
    .canvas-grimoire-stage { top: 0; }
    .canvas-grimoire-language {
      top: 20px;
      right: 24px;
      font-size: .7rem;
    }
    .verso-hud-header {
      top: 22px;
      left: 22px;
    }
    .verso-layer-readout {
      top: auto;
      right: auto;
      bottom: 112px;
      left: 22px;
      width: min(70vw, 280px);
      transform: none;
    }
    .verso-layer-readout small,
    .verso-layer-readout em { display: none; }
    .verso-inspector {
      top: 51%;
      right: 18px;
      bottom: 82px;
      left: 18px;
      width: auto;
      padding: 20px 20px 22px 24px;
      background: rgba(3, 12, 18, .9);
    }
    .verso-focus-viewport {
      top: 62px;
      right: 14px;
      bottom: auto;
      left: 14px;
      width: auto;
      height: calc(44% - 62px);
      min-height: 230px;
    }
    .verso-height-modes {
      top: 36px;
      right: 10px;
    }
    .verso-height-modes button {
      padding: 5px 6px;
      font-size: .4rem;
    }
    .verso-inspector-release {
      top: -20px;
      margin-top: -7px;
    }
    .verso-inspector dl { grid-template-columns: 1fr 1fr 1fr; }
    .verso-exploded[data-inspecting="true"] .verso-hud-header,
    .verso-exploded[data-inspecting="true"] .verso-telemetry { opacity: .18; }
    .verso-telemetry {
      top: 88px;
      bottom: auto;
      left: 22px;
    }
    .verso-telemetry span:nth-child(3),
    .verso-telemetry span:nth-child(4) { display: none; }
    .verso-instruction {
      right: 22px;
      bottom: 112px;
      max-width: 48vw;
      font-size: .5rem;
    }
    .verso-return {
      right: 22px;
      bottom: 30px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .canvas-grimoire-action { scroll-behavior: auto; }
    .canvas-grimoire-stage[data-verso] .canvas-grimoire-surface,
    .canvas-grimoire-stage[data-verso] .canvas-grimoire-hint,
    .verso-exploded { animation-duration: 1ms !important; }
  }
`;

type CanvasGrimoireExperienceProps = {
  content: SiteContent;
  locale: Locale;
  alternateHref: string;
  alternateLabel: string;
};

export function CanvasGrimoireExperience({
  content,
  locale,
  alternateHref,
  alternateLabel,
}: CanvasGrimoireExperienceProps) {
  const descriptionId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hintCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const textRendererRef = useRef<PhysicalInkTextRenderer | null>(null);
  const parchmentRendererRef = useRef<PhysicalParchmentRenderer | null>(null);
  const sizeRef = useRef<CanvasSize>({ width: 0, height: 0, dpr: 1 });
  const visualRef = useRef<VisualState>({
    active: 0,
    chapterPhase: 1,
    palimpsest: { from: 0, to: 0, progress: 0 },
    magicPhase: 0,
    awakened: false,
    points: [],
    ritualStrokes: [],
    cast: { x: 0.5, y: 0.5, name: "VESTIGIUM", serial: 0 },
    ritual: { stage: "idle", sigil: null, mechanismPhase: 0, guideOpacity: 0 },
  });
  const drawingRef = useRef(false);
  const lengthRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const hintAnimationRef = useRef<number | null>(null);
  const hintModeRef = useRef<"tracing" | "burst" | null>(null);
  const paintFrameRef = useRef<number | null>(null);
  const versoTimersRef = useRef<number[]>([]);
  const reducedMotionRef = useRef(false);
  const [active, setActive] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [announcement, setAnnouncement] = useState<string>(COPY[locale].keyboard);
  const [versoPhase, setVersoPhase] = useState<"surface" | "priming" | VersoPhase>("surface");
  const [versoTrace, setVersoTrace] = useState<VersoTracePoint[]>([]);
  const [versoSources, setVersoSources] = useState<{
    albedo: HTMLCanvasElement;
    height: HTMLCanvasElement;
    ink: HTMLCanvasElement;
    absorption: HTMLCanvasElement;
    glyph: HTMLCanvasElement | null;
  } | null>(null);

  const labels = useMemo(
    () => [COPY[locale].home, COPY[locale].work, COPY[locale].career, COPY[locale].products, COPY[locale].contact],
    [locale],
  );

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintScene(
      canvas,
      sizeRef.current,
      visualRef.current,
      content,
      locale,
      textRendererRef.current,
      parchmentRendererRef.current,
    );
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
      fontFaces: locale === "ja"
        ? [
            { url: assetUrl("fonts/YujiSyuku-Portfolio.woff"), weight: 400, family: "manuscript" },
            { url: assetUrl("fonts/NotoSerifJP-Portfolio.woff"), weight: 400, family: "reference" },
            { url: assetUrl("fonts/NotoSerifJP-Portfolio-Semibold.woff"), weight: 600, family: "reference" },
          ]
        : [
            { url: assetUrl("fonts/IMFellEnglish-Portfolio.woff"), weight: 400, family: "manuscript" },
            { url: assetUrl("fonts/Fondamento-Portfolio-Italic.woff"), weight: 400, italic: true, family: "manuscript" },
            { url: assetUrl("fonts/IMFellEnglishSC-Portfolio.woff"), weight: 400, family: "reference" },
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
  }, [locale, schedulePaint]);

  useEffect(() => {
    let disposed = false;
    let instance: PhysicalParchmentRenderer | null = null;
    void PhysicalParchmentRenderer.create({
      maxDevicePixelRatio: 2,
      onInvalidate: schedulePaint,
    }).then((renderer) => {
      if (disposed) {
        renderer?.dispose();
        return;
      }
      instance = renderer;
      parchmentRendererRef.current = renderer;
      schedulePaint();
    });
    return () => {
      disposed = true;
      if (parchmentRendererRef.current === instance) parchmentRendererRef.current = null;
      instance?.dispose();
    };
  }, [schedulePaint]);

  const cancelAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const clearVersoTimers = useCallback(() => {
    versoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    versoTimersRef.current = [];
  }, []);

  const openVerso = useCallback(() => {
    clearVersoTimers();
    setVersoPhase("priming");
    if (reducedMotionRef.current) {
      setVersoPhase("active");
      return;
    }
    versoTimersRef.current = [
      window.setTimeout(() => setVersoPhase("entering"), 2380),
      window.setTimeout(() => setVersoPhase("active"), 5480),
    ];
  }, [clearVersoTimers]);

  const returnToSurface = useCallback(() => {
    clearVersoTimers();
    setVersoPhase("recalling");
    setAnnouncement(locale === "ja" ? "分解されたレイヤーをポートフォリオへ再統合しています。" : "The separated layers are returning to the portfolio.");
    if (reducedMotionRef.current) {
      setVersoPhase("surface");
      setAnnouncement(COPY[locale].keyboard);
      return;
    }
    versoTimersRef.current = [
      window.setTimeout(() => setVersoPhase("closing"), 1700),
      window.setTimeout(() => {
        setVersoPhase("surface");
        setAnnouncement(COPY[locale].keyboard);
      }, 3900),
    ];
  }, [clearVersoTimers, locale]);

  const clearTracingHint = useCallback(() => {
    const canvas = hintCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const cancelTracingHint = useCallback(() => {
    if (hintAnimationRef.current !== null) {
      cancelAnimationFrame(hintAnimationRef.current);
      hintAnimationRef.current = null;
    }
    hintModeRef.current = null;
    clearTracingHint();
  }, [clearTracingHint]);

  const playRitualBurst = useCallback((sigil: Octagram, kind: "summon" | "unseal") => {
    cancelTracingHint();
    if (reducedMotionRef.current) return;
    const canvas = hintCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const serial = sigil.serial;
    const duration = kind === "unseal" ? 1850 : 1120;
    const started = performance.now();
    let lastPaint = 0;
    hintModeRef.current = "burst";
    const animate = (now: number) => {
      const currentSigil = visualRef.current.ritual.sigil;
      if (!currentSigil || currentSigil.serial !== serial) {
        hintAnimationRef.current = null;
        hintModeRef.current = null;
        clearTracingHint();
        return;
      }
      if (now - lastPaint >= 20) {
        lastPaint = now;
        const phase = clamp(0, (now - started) / duration, 1);
        const size = sizeRef.current;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
        const mainCanvas = canvasRef.current;
        const material = mainCanvas ? inkSurfaceLayer(mainCanvas, size) : null;
        drawRitualCompletionBurst(context, size.width, size.height, sigil, phase, kind, material);
        if (phase >= 1) {
          hintAnimationRef.current = null;
          hintModeRef.current = null;
          clearTracingHint();
          return;
        }
      }
      hintAnimationRef.current = requestAnimationFrame(animate);
    };
    hintAnimationRef.current = requestAnimationFrame(animate);
  }, [cancelTracingHint, clearTracingHint]);

  const startTracingHint = useCallback(() => {
    cancelTracingHint();
    const canvas = hintCanvasRef.current;
    const context = canvas?.getContext("2d");
    const sigil = visualRef.current.ritual.sigil;
    if (!canvas || !context || !sigil || visualRef.current.ritual.stage !== "summoned") return;
    const serial = sigil.serial;
    const started = performance.now();
    let lastPaint = 0;
    hintModeRef.current = "tracing";

    const render = (phase: number) => {
      const size = sizeRef.current;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      const mainCanvas = canvasRef.current;
      const material = mainCanvas ? inkSurfaceLayer(mainCanvas, size) : null;
      drawTracingHint(context, size.width, size.height, sigil, phase, material);
    };

    if (reducedMotionRef.current) {
      render(0.07);
      return;
    }

    const animate = (now: number) => {
      const ritual = visualRef.current.ritual;
      if (ritual.stage !== "summoned" || ritual.sigil?.serial !== serial) {
        hintAnimationRef.current = null;
        hintModeRef.current = null;
        clearTracingHint();
        return;
      }
      // Leave a short silence between circuits so this reads as an invitation,
      // rather than a permanent loading spinner. The overlay is intentionally
      // capped around 30fps and never re-renders the parchment or its text.
      if (now - lastPaint >= 32) {
        lastPaint = now;
        const cycle = (now - started) % 13500;
        if (cycle >= 750 && cycle <= 12750) render((cycle - 750) / 12000);
        else clearTracingHint();
      }
      hintAnimationRef.current = requestAnimationFrame(animate);
    };
    hintAnimationRef.current = requestAnimationFrame(animate);
  }, [cancelTracingHint, clearTracingHint]);

  const selectChapter = useCallback((index: number) => {
    const next = (index + VIEW_IDS.length) % VIEW_IDS.length;
    cancelAnimation();
    cancelTracingHint();
    const wrapper = wrapperRef.current;
    const stage = stageRef.current;
    if (!wrapper || !stage) return;
    const rect = wrapper.getBoundingClientRect();
    const stickyTop = Number.parseFloat(getComputedStyle(stage).top) || 0;
    const travel = Math.max(1, wrapper.offsetHeight - stage.offsetHeight);
    const sectionStart = window.scrollY + rect.top - stickyTop;
    window.scrollTo({
      top: sectionStart + travel * (next / (VIEW_IDS.length - 1)),
      behavior: reducedMotionRef.current ? "auto" : "smooth",
    });
    setAnnouncement(labels[next]);
  }, [cancelAnimation, cancelTracingHint, labels]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotionRef.current = media.matches; };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const stage = stageRef.current;
    if (!wrapper || !stage) return;
    let frame: number | null = null;
    let needsMeasure = true;
    let sectionStart = 0;
    let travel = 1;
    let lastPaintKey = "";
    const update = () => {
      frame = null;
      if (needsMeasure) {
        const rect = wrapper.getBoundingClientRect();
        const stickyTop = Number.parseFloat(getComputedStyle(stage).top) || 0;
        sectionStart = window.scrollY + rect.top - stickyTop;
        travel = Math.max(1, wrapper.offsetHeight - stage.offsetHeight);
        needsMeasure = false;
      }
      const scrollProgress = clamp(0, (window.scrollY - sectionStart) / travel, 1);
      const position = scrollProgress * (VIEW_IDS.length - 1);
      const base = Math.min(VIEW_IDS.length - 1, Math.floor(position));
      const local = position - base;
      const rawTransitionProgress = base >= VIEW_IDS.length - 1 || local < 0.14
        ? 0
        : smoothstep(0.14, 0.98, local);
      // The sticky parchment does not move with every scroll pixel. Quantizing
      // only its internal ink phase avoids redundant full-surface GPU uploads
      // while retaining more steps than the eye can distinguish in this slow
      // transition.
      const transitionProgress = Math.round(rawTransitionProgress * 120) / 120;
      const to = transitionProgress > 0 ? Math.min(VIEW_IDS.length - 1, base + 1) : base;
      const nextActive = reducedMotionRef.current
        ? Math.min(VIEW_IDS.length - 1, Math.round(position))
        : transitionProgress >= 0.74 ? to : base;
      const state = visualRef.current;
      state.palimpsest = reducedMotionRef.current
        ? { from: nextActive, to: nextActive, progress: 0 }
        : { from: base, to, progress: transitionProgress };
      state.chapterPhase = 1;
      if (state.active !== nextActive) {
        state.active = nextActive;
        state.points = [];
        state.ritualStrokes = [];
        state.magicPhase = 0;
        state.awakened = false;
        state.ritual = { stage: "idle", sigil: null, mechanismPhase: 0, guideOpacity: 0 };
        setActive(nextActive);
        setAnnouncement(labels[nextActive]);
      }
      const paintKey = `${base}:${to}:${transitionProgress}:${nextActive}`;
      if (paintKey !== lastPaintKey) {
        lastPaintKey = paintKey;
        paint();
      }
    };
    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    const scheduleMeasure = () => {
      needsMeasure = true;
      schedule();
    };
    window.addEventListener("resize", scheduleMeasure);
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", scheduleMeasure);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [labels, paint]);

  useEffect(() => {
    const wrapper = stageRef.current;
    const canvas = canvasRef.current;
    const hintCanvas = hintCanvasRef.current;
    if (!wrapper || !canvas || !hintCanvas) return;
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
        && (visualRef.current.points.length > 0 || visualRef.current.ritualStrokes.length > 0)
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
        visualRef.current.ritualStrokes = visualRef.current.ritualStrokes.map((stroke) => stroke.map((point) => ({
          ...point,
          x: point.x * scaleX,
          y: point.y * scaleY,
          width: clamp(0.5, point.width * widthScale, 3.1),
        })));
      }
      sizeRef.current = { width, height, dpr };
      const physicalWidth = Math.round(width * dpr);
      const physicalHeight = Math.round(height * dpr);
      if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;
      }
      if (hintCanvas.width !== physicalWidth || hintCanvas.height !== physicalHeight) {
        hintCanvas.width = physicalWidth;
        hintCanvas.height = physicalHeight;
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
    cancelTracingHint();
    clearVersoTimers();
    if (paintFrameRef.current !== null) cancelAnimationFrame(paintFrameRef.current);
  }, [cancelAnimation, cancelTracingHint, clearVersoTimers]);

  useEffect(() => {
    if (versoPhase === "surface") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && versoPhase === "active") returnToSurface();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [returnToSurface, versoPhase]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const beginInk = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (versoPhase !== "surface") return;
    if (event.button !== 0 || !event.isPrimary) return;
    const tracingRitual = visualRef.current.ritual.stage === "summoned";
    cancelAnimation();
    if (!tracingRitual) cancelTracingHint();
    const point = pointFromEvent(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lengthRef.current = 0;
    visualRef.current.points = [{ ...point, width: 1.12, time: event.timeStamp }];
    if (visualRef.current.ritual.stage === "unsealed") {
      visualRef.current.ritual = { stage: "idle", sigil: null, mechanismPhase: 0, guideOpacity: 0 };
      visualRef.current.ritualStrokes = [];
      visualRef.current.awakened = false;
      visualRef.current.magicPhase = 0;
    } else if (visualRef.current.ritual.stage === "idle") {
      visualRef.current.ritualStrokes = [];
      visualRef.current.awakened = false;
      visualRef.current.magicPhase = 0;
    } else {
      // Beginning the tracing interaction dismisses any remainder of the
      // introductory apparition immediately; the user's ink now owns the seal.
      visualRef.current.ritual.guideOpacity = 0;
      if (hintModeRef.current !== "tracing") startTracingHint();
    }
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
    const size = sizeRef.current;
    const ritual = visualRef.current.ritual;
    if (ritual.stage === "summoned" && ritual.sigil) {
      if (lengthRef.current >= 8 && points.length >= 2) {
        visualRef.current.ritualStrokes = [...visualRef.current.ritualStrokes, points];
      }
      visualRef.current.points = [];
      if (!gesturesTraceOctagram(visualRef.current.ritualStrokes, ritual.sigil, size.width, size.height)) {
        setAnnouncement(COPY[locale].circleReady);
        paint();
        return;
      }
      cancelTracingHint();
      const completedStrokes = visualRef.current.ritualStrokes;
      setVersoTrace(completedStrokes.flatMap((stroke) => stroke.map((point) => ({
        x: point.x / Math.max(1, size.width),
        y: point.y / Math.max(1, size.height),
      }))));
      const sourceCanvas = canvasRef.current;
      if (sourceCanvas) {
        const sources = inkSurfaceLayer(sourceCanvas, size);
        setVersoSources({
          albedo: sources.albedo,
          height: sources.surface,
          ink: sources.canvas,
          absorption: sources.absorption,
          glyph: textRendererRef.current?.available ? sources.glyph : null,
        });
      }
      visualRef.current.points = [];
      visualRef.current.ritualStrokes = [];
      visualRef.current.magicPhase = 1;
      visualRef.current.awakened = true;
      visualRef.current.ritual = { ...ritual, stage: "unsealed", mechanismPhase: 0, guideOpacity: 1 };
      setAnnouncement(COPY[locale].mechanismOpen);
      playRitualBurst(ritual.sigil, "unseal");
      openVerso();
      if (reducedMotionRef.current) {
        visualRef.current.ritual.mechanismPhase = 1;
        paint();
        return;
      }
      const mechanismStarted = performance.now();
      const moveMechanism = (now: number) => {
        const elapsed = clamp(0, (now - mechanismStarted) / 2200, 1);
        visualRef.current.ritual.mechanismPhase = 1 - Math.pow(1 - elapsed, 3);
        paint();
        if (elapsed < 1) animationRef.current = requestAnimationFrame(moveMechanism);
        else animationRef.current = null;
      };
      animationRef.current = requestAnimationFrame(moveMechanism);
      return;
    }

    if (lengthRef.current < 72 || points.length < 5) {
      paint();
      return;
    }

    const centroid = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    const serial = visualRef.current.cast.serial + 1;
    const circle = circleFromGesture(points, size.width, size.height, serial);
    const cast = {
      x: circle?.x ?? centroid.x / points.length / Math.max(1, size.width),
      y: circle?.y ?? centroid.y / points.length / Math.max(1, size.height),
      name: circle ? "ORBIS" : gestureName(points),
      serial,
    };
    visualRef.current.cast = cast;
    visualRef.current.awakened = true;
    visualRef.current.ritual = circle
      ? { stage: "summoned", sigil: circle, mechanismPhase: 0, guideOpacity: 1 }
      : { stage: "idle", sigil: null, mechanismPhase: 0, guideOpacity: 0 };
    visualRef.current.ritualStrokes = [];
    setAnnouncement(circle ? COPY[locale].circleReady : `${COPY[locale].awake}: ${cast.name}`);
    if (circle) playRitualBurst(circle, "summon");
    const fadeGuideThenTrace = () => {
      if (!circle) return;
      if (reducedMotionRef.current) {
        visualRef.current.ritual.guideOpacity = 0;
        paint();
        startTracingHint();
        return;
      }
      const fadeStarted = performance.now();
      const fadeGuide = (now: number) => {
        const elapsed = clamp(0, (now - fadeStarted) / 1180, 1);
        visualRef.current.ritual.guideOpacity = 1 - smoothstep(0.18, 1, elapsed);
        paint();
        if (elapsed < 1) animationRef.current = requestAnimationFrame(fadeGuide);
        else {
          animationRef.current = null;
          visualRef.current.ritual.guideOpacity = 0;
          startTracingHint();
        }
      };
      animationRef.current = requestAnimationFrame(fadeGuide);
    };
    if (reducedMotionRef.current) {
      visualRef.current.magicPhase = 1;
      paint();
      fadeGuideThenTrace();
      return;
    }
    const started = performance.now();
    const animate = (now: number) => {
      const elapsed = clamp(0, (now - started) / 1050, 1);
      visualRef.current.magicPhase = 1 - Math.pow(1 - elapsed, 3);
      paint();
      if (elapsed < 1) animationRef.current = requestAnimationFrame(animate);
      else {
        animationRef.current = null;
        fadeGuideThenTrace();
      }
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

  const links = actionSpots(active, size.width || 1000);

  return (
    <section
      ref={wrapperRef}
      className="canvas-grimoire-experience"
      aria-label={locale === "ja" ? "Ischca のインタラクティブポートフォリオ" : "Ischca interactive portfolio"}
      onKeyDown={handleKeys}
    >
      <style>{STYLES}</style>
      <div
        ref={stageRef}
        className="canvas-grimoire-stage"
        data-verso={versoPhase === "surface" || versoPhase === "priming" ? undefined : versoPhase}
      >
        <canvas
          ref={canvasRef}
          className="canvas-grimoire-surface"
          role="img"
          aria-label={`${labels[active]}. ${COPY[locale].draw}`}
          aria-describedby={descriptionId}
          aria-hidden={versoPhase !== "surface" && versoPhase !== "priming"}
          tabIndex={versoPhase === "surface" ? 0 : -1}
          onPointerDown={beginInk}
          onPointerMove={moveInk}
          onPointerUp={finishInk}
          onPointerCancel={finishInk}
        />
        <canvas ref={hintCanvasRef} className="canvas-grimoire-hint" aria-hidden="true" />
        {versoPhase === "surface" && (
          <a
            className="canvas-grimoire-language"
            href={alternateHref}
            lang={locale === "ja" ? "en" : "ja"}
            hrefLang={locale === "ja" ? "en" : "ja"}
          >
            {alternateLabel}
          </a>
        )}

        {versoPhase === "surface" && links.length > 0 && (
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
        {versoPhase !== "surface" && (
          <VersoExplodedView
            phase={versoPhase}
            locale={locale}
            activeChapter={active}
            surfaceCanvas={canvasRef.current}
            albedoCanvas={versoSources?.albedo ?? null}
            heightCanvas={versoSources?.height ?? null}
            inkCanvas={versoSources?.ink ?? null}
            absorptionCanvas={versoSources?.absorption ?? null}
            glyphCanvas={versoSources?.glyph ?? null}
            trace={versoTrace}
            onReturn={returnToSurface}
          />
        )}
      </div>

      <div id={descriptionId} className="canvas-grimoire-sr">
        <p>{COPY[locale].keyboard}</p>
        <p>{COPY[locale].draw}</p>
        <ScreenReaderChapter active={active} content={content} locale={locale} />
      </div>
      <div className="canvas-grimoire-live" aria-live="polite" aria-atomic="true">{announcement}</div>
    </section>
  );
}
