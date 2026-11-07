import type {
  CanvasTexture,
  ColorRepresentation,
  Material,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";
import type { Text as TroikaText } from "troika-three-text";

export type PhysicalInkTextAlign = "left" | "center" | "right";

export type PhysicalInkFontFace = {
  url: string;
  /** Logical role, e.g. a handwritten manuscript face or a reference face. */
  family?: "manuscript" | "reference" | "display";
  weight?: number;
  italic?: boolean;
};

export type PhysicalInkTextRun = {
  text: string;
  /** Canvas-compatible baseline coordinate, in CSS pixels. */
  x: number;
  /** Canvas-compatible baseline coordinate, in CSS pixels. */
  y: number;
  size: number;
  color?: ColorRepresentation;
  alpha?: number;
  align?: PhysicalInkTextAlign;
  maxWidth?: number;
  /** CSS-pixel line height. Troika receives the equivalent em multiplier. */
  lineHeight?: number;
  letterSpacing?: number;
  weight?: number;
  italic?: boolean;
  /** Selects a font role without exposing asset URLs to layout code. */
  family?: "manuscript" | "reference" | "display";
  /** Canvas-compatible clockwise rotation, in radians. */
  rotation?: number;
  /** 0 is a dry kiss, 1 is a deeply pressed nib. */
  pressure?: number;
  /** Amount of pigment captured by fibres and pores. */
  absorption?: number;
  /** Stable per-run variation; never advances with animation frames. */
  seed?: number;
  locale?: "ja" | "en";
  whiteSpace?: "normal" | "nowrap";
  overflowWrap?: "normal" | "break-word";
  /**
   * Canvas2D font shorthand for the same run. The caller writes the run with
   * it while the SDF glyphs are still being generated, so text never vanishes.
   */
  font?: string;
};

export type PhysicalInkFrameSize = {
  width: number;
  height: number;
  dpr?: number;
};

export type PhysicalInkTextRendererOptions = {
  fontFaces: readonly PhysicalInkFontFace[];
  /** A paper-height map. A deterministic fibrous map is generated when omitted. */
  paperRelief?: CanvasImageSource;
  maxDevicePixelRatio?: number;
  onInvalidate?: () => void;
};

type InkUniforms = {
  pressure: { value: number };
  absorption: { value: number };
  slant: { value: number };
  seed: { value: number };
  relief: { value: CanvasTexture<CanvasImageSource> };
  reliefTexel: { value: Vector2 };
  resolution: { value: Vector2 };
  dpr: { value: number };
};

type InkMesh = TroikaText & {
  userData: TroikaText["userData"] & {
    inkLayoutKey?: string;
    inkReadyLayoutKey?: string;
    inkQueuedFrame?: number;
    inkMaxWidth?: number;
    inkUniforms?: InkUniforms;
    inkBaseMaterial?: MeshBasicMaterial;
  };
};

type InkLayout = {
  key: string;
  face: Required<PhysicalInkFontFace>;
  weight: number;
  italic: boolean;
  align: PhysicalInkTextAlign;
  maxWidth: number;
  lineHeight: number | "normal";
  sdfGlyphSize: number;
};

type Runtime = typeof import("three");
type TroikaRuntime = typeof import("troika-three-text");
type InkShader = {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
};

const DEFAULT_INK = "#2d1c13";
const RELIEF_SIZE = 512;

const PHYSICAL_FRAGMENT_DEFS = /* glsl */ `
uniform sampler2D uPhysicalPaperRelief;
uniform vec2 uPhysicalPaperTexel;
uniform vec2 uPhysicalResolution;
uniform float uPhysicalDpr;
uniform float uPhysicalPressure;
uniform float uPhysicalAbsorption;
uniform float uPhysicalSeed;

float physicalReliefAt(vec2 uv) {
  return texture2D(uPhysicalPaperRelief, clamp(uv, vec2(0.0), vec2(1.0))).r;
}
`;

const PHYSICAL_FRAGMENT_SHADE = /* glsl */ `
// gl_FragCoord is converted to top-left page UVs. The relief map is uploaded
// without WebGL's usual Y flip, so the same fibre remains under a mark as the
// viewport and DPR change.
vec2 physicalPaperUv = vec2(
  gl_FragCoord.x / max(1.0, uPhysicalResolution.x),
  1.0 - gl_FragCoord.y / max(1.0, uPhysicalResolution.y)
);
float physicalHeight = physicalReliefAt(physicalPaperUv);
float physicalPressed = clamp(uPhysicalPressure, 0.0, 1.0);
float physicalPore = smoothstep(0.22, 0.82, physicalHeight);
float physicalRunVariation = fract(sin(uPhysicalSeed * 17.137 + 4.71) * 43758.5453);
float physicalUptake = mix(1.0 - uPhysicalAbsorption * 0.085, 1.0, physicalPore);
physicalUptake *= mix(0.985, 1.0, physicalRunVariation);
// This pass only produces the pigment/pressure mask. Lighting and the actual
// height discontinuity are applied later by PhysicalParchmentRenderer, once,
// to the combined paper + ink field.
gl_FragColor.rgb *= 1.0 - physicalPressed * 0.025;
gl_FragColor.a *= clamp(
  physicalUptake * mix(0.94, 1.0, physicalPressed),
  0.72,
  1.0
);
`;

/**
 * A retained Troika/Three text layer for the grimoire canvas.
 *
 * `beginFrame -> queueText* -> render` deliberately mirrors an immediate-mode
 * Canvas renderer while retaining and recycling async SDF meshes underneath.
 * This lets the existing scene migrate one drawing helper at a time.
 */
export class PhysicalInkTextRenderer {
  readonly canvas: HTMLCanvasElement;

  private readonly three: Runtime;
  private readonly Text: TroikaRuntime["Text"];
  private readonly scene: Scene;
  private readonly camera: OrthographicCamera;
  private readonly renderer: WebGLRenderer;
  private readonly fontFaces: readonly Required<PhysicalInkFontFace>[];
  private readonly onInvalidate?: () => void;
  private readonly maxDpr: number;
  private readonly meshes: InkMesh[] = [];
  private readonly uniforms = new Set<InkUniforms>();
  private reliefTexture: CanvasTexture<CanvasImageSource>;
  private reliefSource: CanvasImageSource;
  private reliefWidth: number;
  private reliefHeight: number;
  private pending: PhysicalInkTextRun[] = [];
  private frameSerial = 0;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private disposed = false;
  private contextLost = false;
  private shaderFailed = false;
  private scheduledFrame: number | null = null;
  private readonly handleContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    if (this.scheduledFrame !== null) cancelAnimationFrame(this.scheduledFrame);
    this.scheduledFrame = null;
    this.onInvalidate?.();
  };
  private readonly handleContextRestored = () => {
    this.contextLost = false;
    this.shaderFailed = false;
    this.reliefTexture.needsUpdate = true;
    this.meshes.forEach((mesh) => {
      const material = mesh.userData.inkBaseMaterial;
      if (material) material.needsUpdate = true;
    });
    this.scheduleRender();
  };

  private constructor(
    canvas: HTMLCanvasElement,
    three: Runtime,
    troika: TroikaRuntime,
    options: PhysicalInkTextRendererOptions,
  ) {
    this.canvas = canvas;
    this.three = three;
    this.Text = troika.Text;
    this.onInvalidate = options.onInvalidate;
    this.maxDpr = Math.max(1, options.maxDevicePixelRatio ?? 2);
    this.fontFaces = options.fontFaces.map((face) => ({
      url: face.url,
      family: face.family ?? "manuscript",
      weight: face.weight ?? 400,
      italic: face.italic ?? false,
    }));
    if (this.fontFaces.length === 0) {
      throw new Error("PhysicalInkTextRenderer requires at least one font face.");
    }

    this.scene = new three.Scene();
    this.camera = new three.OrthographicCamera(0, 1, 1, 0, -10, 10);
    this.camera.position.z = 1;
    this.reliefSource = options.paperRelief ?? createPaperReliefCanvas();
    const reliefDimensions = imageSourceDimensions(this.reliefSource);
    this.reliefWidth = reliefDimensions.width;
    this.reliefHeight = reliefDimensions.height;
    this.reliefTexture = this.createReliefTexture(this.reliefSource);
    this.renderer = new three.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = three.SRGBColorSpace;
    this.renderer.autoClear = true;
    this.renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      this.shaderFailed = true;
      const details = [
        gl.getProgramInfoLog(program),
        gl.getShaderInfoLog(vertexShader),
        gl.getShaderInfoLog(fragmentShader),
      ].filter(Boolean).join("\n");
      console.error("Physical ink shader could not be compiled.", details);
      this.onInvalidate?.();
    };
    canvas.addEventListener("webglcontextlost", this.handleContextLost);
    canvas.addEventListener("webglcontextrestored", this.handleContextRestored);
    canvas.style.pointerEvents = "none";
    canvas.style.userSelect = "none";
  }

  static async create(
    options: PhysicalInkTextRendererOptions,
  ): Promise<PhysicalInkTextRenderer | null> {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }
    try {
      const [three, troika] = await Promise.all([
        import("three"),
        import("troika-three-text"),
      ]);
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      return new PhysicalInkTextRenderer(canvas, three, troika, options);
    } catch (error) {
      // Canvas2D remains the caller's progressive fallback. A missing WebGL
      // context or blocked dynamic chunk must never take the parchment down.
      console.warn("Physical ink text renderer is unavailable; using Canvas2D.", error);
      return null;
    }
  }

  static isSupported(): boolean {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  }

  /** False tells the caller to keep using its Canvas2D text fallback. */
  get available(): boolean {
    return !this.disposed && !this.contextLost && !this.shaderFailed;
  }

  resize(
    width: number,
    height: number,
    devicePixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
  ): void {
    if (this.disposed) return;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = Math.min(this.maxDpr, Math.max(1, devicePixelRatio));
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.camera.left = 0;
    this.camera.right = this.width;
    this.camera.top = this.height;
    this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();
    this.uniforms.forEach((uniforms) => {
      uniforms.resolution.value.set(this.width * this.dpr, this.height * this.dpr);
      uniforms.dpr.value = this.dpr;
    });
    this.scheduleRender();
  }

  setPaperRelief(source: CanvasImageSource): void {
    if (this.disposed) return;
    if (source === this.reliefSource) {
      const dimensions = imageSourceDimensions(source);
      if (dimensions.width !== this.reliefWidth || dimensions.height !== this.reliefHeight) {
        this.reliefWidth = dimensions.width;
        this.reliefHeight = dimensions.height;
        this.reliefTexture.needsUpdate = true;
        this.updateReliefTexelUniforms();
      }
      return;
    }
    const previous = this.reliefTexture;
    this.reliefSource = source;
    const dimensions = imageSourceDimensions(source);
    this.reliefWidth = dimensions.width;
    this.reliefHeight = dimensions.height;
    this.reliefTexture = this.createReliefTexture(source);
    this.uniforms.forEach((uniforms) => {
      const dimensions = imageSourceDimensions(this.reliefTexture.image);
      uniforms.relief.value = this.reliefTexture;
      uniforms.reliefTexel.value.set(
        1 / dimensions.width,
        1 / dimensions.height,
      );
    });
    previous.dispose();
    this.scheduleRender();
  }

  beginFrame(): void {
    this.frameSerial += 1;
    this.pending = [];
  }

  queueText(run: PhysicalInkTextRun): void {
    this.queueRuns([run]);
  }

  /**
   * Runs queued in the current frame whose SDF glyphs are still being
   * generated. The caller writes these with Canvas2D until they are ready.
   */
  get pendingRuns(): readonly PhysicalInkTextRun[] {
    return this.pending;
  }

  render(): void {
    if (!this.available) return;
    this.meshes.forEach((mesh) => {
      if (mesh.userData.inkQueuedFrame !== this.frameSerial) mesh.visible = false;
    });
    this.renderer.render(this.scene, this.camera);
  }

  draw(runs: readonly PhysicalInkTextRun[]): void {
    this.beginFrame();
    this.queueRuns(runs);
    this.render();
  }

  /**
   * Immediate-mode bridge for CanvasGrimoireExperience. The returned canvas has
   * physical-pixel dimensions and a transparent framebuffer, ready for an
   * immediate `CanvasRenderingContext2D.drawImage` in the same frame.
   */
  renderFrame(
    runs: readonly PhysicalInkTextRun[],
    size: PhysicalInkFrameSize,
    paperRelief?: CanvasImageSource,
  ): HTMLCanvasElement {
    const dpr = size.dpr ?? (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
    const effectiveDpr = Math.min(this.maxDpr, Math.max(1, dpr));
    if (size.width !== this.width || size.height !== this.height || effectiveDpr !== this.dpr) {
      this.resize(size.width, size.height, dpr);
    }
    if (paperRelief) this.setPaperRelief(paperRelief);
    this.draw(runs);
    return this.canvas;
  }

  clear(): void {
    if (this.disposed) return;
    this.beginFrame();
    this.meshes.forEach((mesh) => { mesh.visible = false; });
    this.renderer.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.scheduledFrame !== null) cancelAnimationFrame(this.scheduledFrame);
    this.scheduledFrame = null;
    this.meshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.dispose();
      mesh.userData.inkBaseMaterial?.dispose();
    });
    this.meshes.length = 0;
    this.uniforms.clear();
    this.reliefTexture.dispose();
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored);
    this.renderer.dispose();
  }

  private createMesh(): InkMesh {
    const mesh = new this.Text() as InkMesh;
    const baseMaterial = new this.three.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const reliefDimensions = imageSourceDimensions(this.reliefTexture.image);
    const uniforms: InkUniforms = {
      pressure: { value: 0.52 },
      absorption: { value: 0.62 },
      seed: { value: 0 },
      slant: { value: 0 },
      relief: { value: this.reliefTexture },
      reliefTexel: {
        value: new this.three.Vector2(
          1 / reliefDimensions.width,
          1 / reliefDimensions.height,
        ),
      },
      resolution: { value: new this.three.Vector2(this.width * this.dpr, this.height * this.dpr) },
      dpr: { value: this.dpr },
    };
    const troikaDerive = mesh.createDerivedMaterial.bind(mesh);
    mesh.createDerivedMaterial = (material: Material) => {
      const derived = troikaDerive(material);
      const troikaCacheKey = derived.customProgramCacheKey.bind(derived);
      derived.onBeforeCompile = (shader) => upgradeInkShader(shader as unknown as InkShader, uniforms);
      derived.customProgramCacheKey = () => `${troikaCacheKey()}|physical-ink-v1`;
      return derived;
    };
    mesh.material = baseMaterial;
    mesh.userData.inkUniforms = uniforms;
    mesh.userData.inkBaseMaterial = baseMaterial;
    // Canvas call sites position text by alphabetic baseline. Troika's numeric
    // zero anchors the top of the block, so use its explicit first-line
    // baseline anchor to keep the existing manuscript composition intact.
    mesh.anchorY = "top-baseline";
    mesh.gpuAccelerateSDF = true;
    mesh.renderOrder = 20;
    this.uniforms.add(uniforms);
    this.meshes.push(mesh);
    this.scene.add(mesh);
    return mesh;
  }

  private queueRuns(runs: readonly PhysicalInkTextRun[]): void {
    if (this.disposed) return;
    const entries = runs
      .filter((run) => run.text && run.alpha !== 0 && run.size > 0)
      .map((run) => ({ run, layout: this.layoutFor(run) }));

    // Meshes are matched by layout rather than by draw order. A chapter change
    // or palimpsest transition reorders the runs; matching by layout keeps the
    // finished SDF geometry instead of re-typesetting every line.
    const idle = new Map<string, InkMesh[]>();
    this.meshes.forEach((mesh) => {
      const key = mesh.userData.inkLayoutKey;
      if (!key || mesh.userData.inkQueuedFrame === this.frameSerial) return;
      const meshes = idle.get(key);
      if (meshes) meshes.push(mesh);
      else idle.set(key, [mesh]);
    });
    const unmatched: typeof entries = [];
    entries.forEach((entry) => {
      const mesh = idle.get(entry.layout.key)?.pop();
      if (mesh) this.assignMesh(mesh, entry.run, entry.layout);
      else unmatched.push(entry);
    });
    const spare = this.meshes.filter((mesh) => mesh.userData.inkQueuedFrame !== this.frameSerial);
    unmatched.forEach((entry) => {
      this.assignMesh(spare.shift() ?? this.createMesh(), entry.run, entry.layout);
    });
  }

  private assignMesh(mesh: InkMesh, run: PhysicalInkTextRun, layout: InkLayout): void {
    mesh.userData.inkQueuedFrame = this.frameSerial;
    this.configureMesh(mesh, run, layout);
    if (mesh.userData.inkReadyLayoutKey !== layout.key) this.pending.push(run);
  }

  private layoutFor(run: PhysicalInkTextRun): InkLayout {
    const weight = Math.max(100, Math.min(900, run.weight ?? 400));
    const italic = run.italic ?? false;
    const face = nearestFontFace(this.fontFaces, weight, italic, run.family ?? "manuscript");
    const align = run.align ?? "left";
    const maxWidth = run.maxWidth && run.maxWidth > 0 ? run.maxWidth : Number.POSITIVE_INFINITY;
    const lineHeight = run.lineHeight ? run.lineHeight / run.size : "normal";
    // Body-sized type never needs a 128px field. Halving it for small runs
    // quarters the atlas area that most Japanese glyphs occupy.
    const sdfGlyphSize = run.size >= 22 ? 128 : 64;
    const key = JSON.stringify([
      run.text,
      run.size,
      maxWidth,
      lineHeight,
      run.letterSpacing ?? 0,
      align,
      weight,
      italic,
      run.family ?? "manuscript",
      face.url,
      run.locale ?? "en",
      run.whiteSpace ?? "normal",
      run.overflowWrap ?? "break-word",
      sdfGlyphSize,
    ]);
    return { key, face, weight, italic, align, maxWidth, lineHeight, sdfGlyphSize };
  }

  private configureMesh(mesh: InkMesh, run: PhysicalInkTextRun, layout: InkLayout): void {
    const { key: layoutKey, face, weight, italic, align, maxWidth, lineHeight } = layout;

    if (mesh.userData.inkLayoutKey !== layoutKey) {
      mesh.userData.inkLayoutKey = layoutKey;
      mesh.visible = false;
      mesh.text = run.text;
      mesh.font = face.url;
      mesh.lang = run.locale ?? "en";
      mesh.fontSize = run.size;
      mesh.fontWeight = weight >= 600 ? "bold" : "normal";
      mesh.fontStyle = italic ? "italic" : "normal";
      mesh.letterSpacing = run.letterSpacing ?? 0;
      mesh.lineHeight = lineHeight;
      mesh.maxWidth = maxWidth;
      mesh.whiteSpace = run.whiteSpace ?? "normal";
      mesh.overflowWrap = run.overflowWrap ?? "break-word";
      mesh.textAlign = align;
      mesh.anchorX = align;
      mesh.anchorY = "top-baseline";
      mesh.sdfGlyphSize = layout.sdfGlyphSize;
      mesh.scale.set(1, 1, 1);
      mesh.userData.inkMaxWidth = maxWidth;

      // Troika only uses fontWeight/fontStyle for its fallback resolver. When
      // the supplied face is lighter or upright, carry the missing character
      // into SDF space: a restrained same-ink outline for weight, and a vertex
      // shear for an italic hand.
      const missingWeight = Math.max(0, weight - face.weight);
      mesh.outlineWidth = missingWeight > 0 ? run.size * missingWeight / 45_000 : 0;
      mesh.glyphGeometryDetail = italic && !face.italic ? 2 : 1;
      mesh.sync(() => {
        if (mesh.userData.inkLayoutKey === layoutKey) {
          const bounds = mesh.textRenderInfo?.blockBounds;
          const blockWidth = bounds ? Math.max(0, bounds[2] - bounds[0]) : 0;
          const requestedWidth = mesh.userData.inkMaxWidth ?? Number.POSITIVE_INFINITY;
          mesh.scale.x = Number.isFinite(requestedWidth) && blockWidth > requestedWidth
            ? requestedWidth / blockWidth
            : 1;
          mesh.userData.inkReadyLayoutKey = layoutKey;
          mesh.visible = mesh.userData.inkQueuedFrame === this.frameSerial;
        }
        this.scheduleRender();
      });
    } else {
      mesh.visible = mesh.userData.inkReadyLayoutKey === layoutKey;
    }

    const color = run.color ?? DEFAULT_INK;
    const alpha = Math.max(0, Math.min(1, run.alpha ?? 1));
    mesh.color = color;
    mesh.fillOpacity = alpha;
    mesh.outlineColor = color;
    mesh.outlineOpacity = alpha;
    mesh.position.set(run.x, this.height - run.y, 0);
    mesh.rotation.z = -(run.rotation ?? 0);

    const uniforms = mesh.userData.inkUniforms;
    if (uniforms) {
      uniforms.pressure.value = Math.max(0, Math.min(1, run.pressure ?? pressureForWeight(weight)));
      uniforms.absorption.value = Math.max(0, Math.min(1, run.absorption ?? 0.62));
      uniforms.seed.value = run.seed ?? stableTextSeed(run.text);
      uniforms.slant.value = italic && !face.italic ? 0.15 : 0;
    }
  }

  private createReliefTexture(source: CanvasImageSource): CanvasTexture<CanvasImageSource> {
    const texture = new this.three.CanvasTexture(source);
    texture.colorSpace = this.three.NoColorSpace;
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = this.three.LinearFilter;
    texture.magFilter = this.three.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  private updateReliefTexelUniforms(): void {
    const dimensions = imageSourceDimensions(this.reliefTexture.image);
    this.uniforms.forEach((uniforms) => {
      uniforms.reliefTexel.value.set(
        1 / dimensions.width,
        1 / dimensions.height,
      );
    });
  }

  /** Re-upload a same-sized mutable relief canvas after its pixels change. */
  markPaperReliefDirty(): void {
    if (this.disposed) return;
    this.reliefTexture.needsUpdate = true;
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.disposed || this.scheduledFrame !== null) return;
    this.onInvalidate?.();
    this.scheduledFrame = requestAnimationFrame(() => {
      this.scheduledFrame = null;
      this.render();
    });
  }
}

function upgradeInkShader(shader: InkShader, uniforms: InkUniforms): void {
  shader.uniforms.uPhysicalPaperRelief = uniforms.relief;
  shader.uniforms.uPhysicalPaperTexel = uniforms.reliefTexel;
  shader.uniforms.uPhysicalResolution = uniforms.resolution;
  shader.uniforms.uPhysicalDpr = uniforms.dpr;
  shader.uniforms.uPhysicalPressure = uniforms.pressure;
  shader.uniforms.uPhysicalAbsorption = uniforms.absorption;
  shader.uniforms.uPhysicalSeed = uniforms.seed;
  shader.uniforms.uPhysicalSlant = uniforms.slant;

  shader.vertexShader = `uniform float uPhysicalSlant;\n${shader.vertexShader}`
    .replace(
      "position = uTroikaOrient * position;",
      "position = uTroikaOrient * position;\nposition.x += position.y * uPhysicalSlant;",
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(/void\s+main\s*\(\s*\)\s*\{/, `${PHYSICAL_FRAGMENT_DEFS}\n$&`)
    .replace(
      "gl_FragColor.a *= edgeAlpha;",
      `gl_FragColor.a *= edgeAlpha;\n${PHYSICAL_FRAGMENT_SHADE}`,
    );
}

function nearestFontFace(
  faces: readonly Required<PhysicalInkFontFace>[],
  weight: number,
  italic: boolean,
  family: Required<PhysicalInkFontFace>["family"],
): Required<PhysicalInkFontFace> {
  const matchingFamily = faces.filter((face) => face.family === family);
  const candidates = matchingFamily.length > 0 ? matchingFamily : faces;
  return candidates.reduce((best, candidate) => {
    const bestScore = Math.abs(best.weight - weight) + (best.italic === italic ? 0 : 1_000);
    const score = Math.abs(candidate.weight - weight) + (candidate.italic === italic ? 0 : 1_000);
    return score < bestScore ? candidate : best;
  });
}

function pressureForWeight(weight: number): number {
  return Math.max(0.32, Math.min(0.82, 0.34 + (weight - 300) / 1_150));
}

function stableTextSeed(text: string): number {
  let seed = 2_166_136_261;
  for (const glyph of text) {
    seed ^= glyph.codePointAt(0) ?? 0;
    seed = Math.imul(seed, 16_777_619);
  }
  return (seed >>> 0) / 4_294_967_295;
}

function imageSourceDimensions(source: CanvasImageSource): { width: number; height: number } {
  const measurable = source as CanvasImageSource & {
    width?: number;
    height?: number;
    videoWidth?: number;
    videoHeight?: number;
    displayWidth?: number;
    displayHeight?: number;
  };
  return {
    width: Math.max(1, measurable.width ?? measurable.videoWidth ?? measurable.displayWidth ?? 1),
    height: Math.max(1, measurable.height ?? measurable.videoHeight ?? measurable.displayHeight ?? 1),
  };
}

function reliefHash(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + 19.19) * 43_758.545_312_3;
  return value - Math.floor(value);
}

function smoothNoise(x: number, y: number, scale: number): number {
  const px = x / scale;
  const py = y / scale;
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const tx = px - x0;
  const ty = py - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const top = reliefHash(x0, y0) * (1 - sx) + reliefHash(x0 + 1, y0) * sx;
  const bottom = reliefHash(x0, y0 + 1) * (1 - sx) + reliefHash(x0 + 1, y0 + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

function createPaperReliefCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = RELIEF_SIZE;
  canvas.height = RELIEF_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: false });
  if (!context) return canvas;
  const image = context.createImageData(RELIEF_SIZE, RELIEF_SIZE);

  for (let y = 0; y < RELIEF_SIZE; y += 1) {
    for (let x = 0; x < RELIEF_SIZE; x += 1) {
      const broad = smoothNoise(x, y, 72);
      const mids = smoothNoise(x + 91, y - 37, 23);
      const pores = smoothNoise(x - 53, y + 67, 5.5);
      const laidLines = Math.sin(x * 0.24 + smoothNoise(x, y, 31) * 4.4) * 0.026;
      const crossedFibres = Math.sin((x * 0.11 + y) * 0.38) * 0.012;
      const pinhole = reliefHash(x, y) > 0.993 ? -0.16 : 0;
      const height = Math.max(
        0,
        Math.min(1, 0.48 + broad * 0.19 + mids * 0.095 + pores * 0.045 + laidLines + crossedFibres + pinhole),
      );
      const value = Math.round(height * 255);
      const index = (y * RELIEF_SIZE + x) * 4;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}
