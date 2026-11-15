import type {
  CanvasTexture,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";

export type ParchmentFrameSize = {
  width: number;
  height: number;
  dpr?: number;
};

export type ParchmentSurfaceSources = {
  albedo: CanvasImageSource;
  height: CanvasImageSource;
  ink: CanvasImageSource;
  /** A small, soft copy of the ink, for the opening scorch as it tightens. */
  scorchSoft?: CanvasImageSource;
  /** A far softer copy, for writing still deep in the skin. */
  scorchHaze?: CanvasImageSource;
};

export type ParchmentSurfaceEffects = {
  /** 0 at rest, 1 at the midpoint of a palimpsest transition. */
  palimpsest?: number;
  /** Mechanical pressure released by the traced octagram. */
  mechanism?: number;
  mechanismCenter?: { x: number; y: number };
  /** The opening scorch: 0 is the blank page, 1 the settled ink. */
  scorch?: number;
};

export type PhysicalParchmentRendererOptions = {
  maxDevicePixelRatio?: number;
  onInvalidate?: () => void;
};

type Runtime = typeof import("three");

type SurfaceUniforms = {
  uAlbedo: { value: CanvasTexture<CanvasImageSource> };
  uHeight: { value: CanvasTexture<CanvasImageSource> };
  uInk: { value: CanvasTexture<CanvasImageSource> };
  uScorchSoft: { value: CanvasTexture<CanvasImageSource> };
  uScorchHaze: { value: CanvasTexture<CanvasImageSource> };
  uTexel: { value: import("three").Vector2 };
  uDisplacement: { value: number };
  uReliefStrength: { value: number };
  uInkDepth: { value: number };
  uPalimpsest: { value: number };
  uMechanism: { value: number };
  uMechanismCenter: { value: import("three").Vector2 };
  uScorch: { value: number };
  uAspect: { value: number };
};

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vSurfaceUv;
  uniform sampler2D uHeight;
  uniform sampler2D uInk;
  uniform float uDisplacement;
  uniform float uInkDepth;
  uniform float uPalimpsest;
  uniform float uMechanism;
  uniform vec2 uMechanismCenter;

  void main() {
    vSurfaceUv = uv;
    vec4 heightSample = texture2D(uHeight, uv);
    float ink = texture2D(uInk, uv).a;
    float combinedHeight = heightSample.r - ink * uInkDepth;
    vec3 displaced = position;
    displaced.z += (combinedHeight - 0.5) * uDisplacement * heightSample.a;
    // Rewriting never turns a page. Instead the vellum briefly tightens and
    // buckles as if a scraper had passed over the skin. The released mechanism
    // leaves a still smaller radial pulse in the material itself.
    float edgeDistance = abs(uv.x - 0.5) * 2.0;
    float memoryWave = sin(uv.y * 13.0 + uv.x * 4.0) * 0.0075;
    displaced.z += uPalimpsest * (memoryWave + pow(edgeDistance, 3.0) * 0.018) * heightSample.a;
    float mechanismWave = sin(length(uv - uMechanismCenter) * 42.0 - uMechanism * 8.0);
    displaced.z += mechanismWave * uMechanism * 0.0028 * heightSample.a;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vSurfaceUv;
  uniform sampler2D uAlbedo;
  uniform sampler2D uHeight;
  uniform sampler2D uInk;
  uniform sampler2D uScorchSoft;
  uniform sampler2D uScorchHaze;
  uniform vec2 uTexel;
  uniform float uReliefStrength;
  uniform float uInkDepth;
  uniform float uScorch;
  uniform float uAspect;

  float paperHeightAt(vec2 uv, float fallbackHeight) {
    vec4 paper = texture2D(uHeight, clamp(uv, vec2(0.0), vec2(1.0)));
    if (paper.a < 0.05) return fallbackHeight;
    return paper.r;
  }

  float scorchHash(vec2 point) {
    point = fract(point * vec2(127.1, 311.7));
    point += dot(point, point + 19.19);
    return fract(point.x * point.y);
  }

  float scorchNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 blend = fract(point);
    blend = blend * blend * (3.0 - 2.0 * blend);
    return mix(
      mix(scorchHash(cell), scorchHash(cell + vec2(1.0, 0.0)), blend.x),
      mix(scorchHash(cell + vec2(0.0, 1.0)), scorchHash(cell + vec2(1.0, 1.0)), blend.x),
      blend.y
    );
  }

  float scorchFlow(vec2 point) {
    return scorchNoise(point) * 0.55
      + scorchNoise(point * 2.03 + 7.1) * 0.3
      + scorchNoise(point * 4.07 + 3.7) * 0.15;
  }

  // A multiplier on the paper, in linear colour: toasted, then brown, then
  // charred.
  vec3 scorchTint(float amount) {
    vec3 tint = mix(vec3(1.0), vec3(0.84, 0.64, 0.4), smoothstep(0.0, 0.32, amount));
    tint = mix(tint, vec3(0.46, 0.26, 0.12), smoothstep(0.28, 0.68, amount));
    return mix(tint, vec3(0.12, 0.065, 0.035), smoothstep(0.66, 1.0, amount));
  }

  void main() {
    vec4 heightSample = texture2D(uHeight, vSurfaceUv);
    float paperMask = smoothstep(0.015, 0.92, heightSample.a);
    if (paperMask <= 0.001) discard;

    vec4 inkSample = texture2D(uInk, vSurfaceUv);
    float sharpInk = clamp(inkSample.a, 0.0, 1.0);
    // The opening scorch. Heat from behind the skin browns it where the
    // writing will be, the stain tightens into the strokes, and the ink takes
    // over from the char. Until then there is no ink and no relief.
    vec2 scorchPage = vec2(vSurfaceUv.x * uAspect, vSurfaceUv.y);
    float scorchAge = 1.0;
    float focus = 1.0;
    float surfaced = 1.0;
    float stain = 0.0;
    if (uScorch < 1.0) {
      scorchAge = uScorch - 0.05 - (scorchFlow(scorchPage * 7.0) - 0.5) * 0.11;
      focus = 1.0 - pow(1.0 - smoothstep(0.0, 0.9, scorchAge), 2.6);
      // Deep in the skin the writing is only a haze; it tightens through the
      // soft copy before the strokes themselves surface.
      float haze = clamp(texture2D(uScorchHaze, vSurfaceUv).a * 2.2, 0.0, 1.0);
      float soft = texture2D(uScorchSoft, vSurfaceUv).a;
      stain = pow(mix(soft, haze, smoothstep(0.3, 0.85, 1.0 - focus)), 0.7) * smoothstep(0.0, 0.06, scorchAge);
      surfaced = smoothstep(0.6, 0.99, focus);
    }
    float inkMask = sharpInk * surfaced;
    float centerHeight = heightSample.r;
    float heightL = paperHeightAt(vSurfaceUv - vec2(uTexel.x, 0.0), centerHeight);
    float heightR = paperHeightAt(vSurfaceUv + vec2(uTexel.x, 0.0), centerHeight);
    float heightU = paperHeightAt(vSurfaceUv + vec2(0.0, uTexel.y), centerHeight);
    float heightD = paperHeightAt(vSurfaceUv - vec2(0.0, uTexel.y), centerHeight);
    // Screen derivatives recover the local ink depression without four more
    // texture samples. Paper and pigment still share a single final normal.
    float combinedGradientX = (heightL - heightR) + dFdx(inkMask) * uInkDepth * 2.0;
    float combinedGradientY = (heightD - heightU) + dFdy(inkMask) * uInkDepth * 2.0;

    vec3 surfaceNormal = normalize(vec3(
      combinedGradientX * uReliefStrength,
      combinedGradientY * uReliefStrength,
      1.0
    ));
    vec3 fixedLight = normalize(vec3(-0.46, 0.58, 0.82));
    vec3 halfVector = normalize(fixedLight + vec3(0.0, 0.0, 1.0));
    float diffuse = clamp(dot(surfaceNormal, fixedLight), -0.18, 1.0);
    float grazing = pow(1.0 - max(surfaceNormal.z, 0.0), 2.0);
    float paperSpecular = pow(max(dot(surfaceNormal, halfVector), 0.0), 18.0) * 0.055;
    float inkSpecular = pow(max(dot(surfaceNormal, halfVector), 0.0), 42.0) * 0.026;
    float localSlope = length(vec2(combinedGradientX, combinedGradientY));
    float microOcclusion = clamp(1.0 - localSlope * 3.6, 0.76, 1.0);

    vec3 paperColor = texture2D(uAlbedo, vSurfaceUv).rgb;
    float paperLight = 0.78 + diffuse * 0.24 - grazing * 0.06;
    vec3 color = paperColor * paperLight * microOcclusion + paperSpecular;

    // The pigment and the parchment share the combined height normal. The ink
    // therefore creates a real normal discontinuity in the finished surface,
    // rather than receiving an unrelated bevel after the paper is rendered.
    vec3 pigment = inkSample.rgb;
    float absorbedInk = clamp(pow(inkMask, 0.72) * (1.04 + (1.0 - heightSample.r) * 0.075), 0.0, 1.0);
    vec3 litPigment = pigment * (0.63 + diffuse * 0.16) + inkSpecular;
    color = mix(color, litPigment, absorbedInk);
    color *= 1.0 - inkMask * 0.028;

    if (uScorch < 1.0) {
      // A light toast while the writing is deep, darker as it tightens. The
      // stain and the char are both gone at the end, which is the settled page.
      float mottle = 0.7 + 0.6 * scorchFlow(scorchPage * 26.0);
      float toasted = stain * mottle * (0.42 + 0.46 * focus) * (1.0 - smoothstep(0.55, 0.92, scorchAge));
      float charred = sharpInk * smoothstep(0.18, 0.7, focus) * (1.0 - surfaced);
      color *= scorchTint(clamp(toasted + charred, 0.0, 1.0));
    }

    gl_FragColor = vec4(color, paperMask);
    #include <colorspace_fragment>
  }
`;

/**
 * Renders parchment and ink as one height field.
 *
 * The paper and every inscription are sampled by the same fragment shader.
 * Macro height also displaces a subdivided plane, while fine fibres remain in
 * the normal field so the result stays affordable on mobile GPUs.
 */
export class PhysicalParchmentRenderer {
  readonly canvas: HTMLCanvasElement;

  private readonly renderer: WebGLRenderer;
  private readonly scene: Scene;
  private readonly camera: OrthographicCamera;
  private readonly geometry: PlaneGeometry;
  private readonly material: ShaderMaterial;
  private readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly uniforms: SurfaceUniforms;
  private readonly maxDpr: number;
  private readonly onInvalidate?: () => void;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private disposed = false;
  private contextLost = false;
  private shaderFailed = false;
  private hasSources = false;

  private readonly handleContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    this.onInvalidate?.();
  };

  private readonly handleContextRestored = () => {
    this.contextLost = false;
    this.shaderFailed = false;
    this.material.needsUpdate = true;
    this.uniforms.uAlbedo.value.needsUpdate = true;
    this.uniforms.uHeight.value.needsUpdate = true;
    this.uniforms.uInk.value.needsUpdate = true;
    this.uniforms.uScorchSoft.value.needsUpdate = true;
    this.uniforms.uScorchHaze.value.needsUpdate = true;
    this.onInvalidate?.();
  };

  private constructor(
    canvas: HTMLCanvasElement,
    three: Runtime,
    options: PhysicalParchmentRendererOptions,
  ) {
    this.canvas = canvas;
    this.maxDpr = Math.max(1, options.maxDevicePixelRatio ?? 2);
    this.onInvalidate = options.onInvalidate;

    const placeholder = createPlaceholderCanvas();
    const albedo = createTexture(three, placeholder, true);
    const height = createTexture(three, placeholder, false);
    const ink = createTexture(three, placeholder, true);
    const scorchSoft = createTexture(three, placeholder, false);
    const scorchHaze = createTexture(three, placeholder, false);
    this.uniforms = {
      uAlbedo: { value: albedo },
      uHeight: { value: height },
      uInk: { value: ink },
      uScorchSoft: { value: scorchSoft },
      uScorchHaze: { value: scorchHaze },
      uTexel: { value: new three.Vector2(0.5, 0.5) },
      uDisplacement: { value: 0.062 },
      uReliefStrength: { value: 3.15 },
      uInkDepth: { value: 0.052 },
      uPalimpsest: { value: 0 },
      uMechanism: { value: 0 },
      uMechanismCenter: { value: new three.Vector2(0.5, 0.5) },
      uScorch: { value: 1 },
      uAspect: { value: 1 },
    };

    this.renderer = new three.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = three.SRGBColorSpace;
    this.renderer.toneMapping = three.NoToneMapping;
    this.renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      this.shaderFailed = true;
      const details = [
        gl.getProgramInfoLog(program),
        gl.getShaderInfoLog(vertexShader),
        gl.getShaderInfoLog(fragmentShader),
      ].filter(Boolean).join("\n");
      console.error("Physical parchment shader could not be compiled.", details);
      this.onInvalidate?.();
    };

    this.scene = new three.Scene();
    this.camera = new three.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.set(0.026, -0.034, 2.8);
    this.camera.lookAt(0, 0, 0);
    this.geometry = new three.PlaneGeometry(2, 2, 112, 84);
    this.material = new three.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: three.DoubleSide,
    });
    this.mesh = new three.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    canvas.addEventListener("webglcontextlost", this.handleContextLost);
    canvas.addEventListener("webglcontextrestored", this.handleContextRestored);
    canvas.style.pointerEvents = "none";
    canvas.setAttribute("aria-hidden", "true");
  }

  static async create(
    options: PhysicalParchmentRendererOptions = {},
  ): Promise<PhysicalParchmentRenderer | null> {
    if (typeof window === "undefined" || typeof document === "undefined") return null;
    try {
      const three = await import("three");
      const canvas = document.createElement("canvas");
      return new PhysicalParchmentRenderer(canvas, three, options);
    } catch (error) {
      console.warn("Physical parchment renderer is unavailable; using Canvas2D.", error);
      return null;
    }
  }

  get available(): boolean {
    return !this.disposed && !this.contextLost && !this.shaderFailed;
  }

  /** True once the real page is on the GPU and the blank parchment can be shown. */
  get hasFrame(): boolean {
    return this.available && this.hasSources;
  }

  renderFrame(
    size: ParchmentFrameSize,
    sources: ParchmentSurfaceSources,
    effects: ParchmentSurfaceEffects = {},
  ): HTMLCanvasElement {
    if (!this.available) return this.canvas;
    this.resize(size.width, size.height, size.dpr);
    updateTexture(this.uniforms.uAlbedo.value, sources.albedo);
    updateTexture(this.uniforms.uHeight.value, sources.height);
    updateTexture(this.uniforms.uInk.value, sources.ink, true);
    if (sources.scorchSoft) updateTexture(this.uniforms.uScorchSoft.value, sources.scorchSoft, true);
    if (sources.scorchHaze) updateTexture(this.uniforms.uScorchHaze.value, sources.scorchHaze, true);
    const dimensions = imageSourceDimensions(sources.height);
    this.uniforms.uTexel.value.set(1 / dimensions.width, 1 / dimensions.height);
    this.uniforms.uPalimpsest.value = Math.max(0, Math.min(1, effects.palimpsest ?? 0));
    this.uniforms.uMechanism.value = Math.max(0, Math.min(1, effects.mechanism ?? 0));
    const center = effects.mechanismCenter ?? { x: 0.5, y: 0.5 };
    this.uniforms.uMechanismCenter.value.set(center.x, 1 - center.y);
    this.uniforms.uScorch.value = Math.max(0, Math.min(1, effects.scorch ?? 1));
    this.hasSources = true;
    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  /**
   * Advances the opening scorch over the textures already on the GPU. Returns
   * null before the first full frame: rendering then would allocate every
   * texture at the placeholder's size and the real page could never fit.
   */
  renderScorch(progress: number): HTMLCanvasElement | null {
    if (!this.hasFrame) return null;
    this.uniforms.uScorch.value = Math.max(0, Math.min(1, progress));
    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored);
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
    this.uniforms.uAlbedo.value.dispose();
    this.uniforms.uHeight.value.dispose();
    this.uniforms.uInk.value.dispose();
    this.uniforms.uScorchSoft.value.dispose();
    this.uniforms.uScorchHaze.value.dispose();
    this.renderer.dispose();
  }

  private resize(width: number, height: number, requestedDpr = window.devicePixelRatio || 1) {
    const dpr = Math.min(this.maxDpr, Math.max(1, requestedDpr));
    if (width === this.width && height === this.height && dpr === this.dpr) return;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    const aspect = this.width / this.height;
    this.uniforms.uAspect.value = aspect;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();
    this.mesh.scale.set(aspect, 1, 1);
  }
}

function createTexture(
  three: Runtime,
  source: CanvasImageSource,
  color: boolean,
): CanvasTexture<CanvasImageSource> {
  const texture = new three.CanvasTexture(source);
  texture.colorSpace = color ? three.SRGBColorSpace : three.NoColorSpace;
  texture.flipY = true;
  texture.generateMipmaps = false;
  texture.minFilter = three.LinearFilter;
  texture.magFilter = three.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function updateTexture(
  texture: CanvasTexture<CanvasImageSource>,
  source: CanvasImageSource,
  mutable = false,
) {
  const changed = texture.image !== source;
  if (changed) {
    // A texture's GPU storage is fixed at its first upload. A page of another
    // size needs new storage, or it would be written over the old page.
    const previous = imageSourceDimensions(texture.image);
    const next = imageSourceDimensions(source);
    if (previous.width !== next.width || previous.height !== next.height) texture.dispose();
    texture.image = source;
  }
  if (changed || mutable) texture.needsUpdate = true;
}

function createPlaceholderCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "rgba(255,255,255,1)";
    context.fillRect(0, 0, 2, 2);
  }
  return canvas;
}

function imageSourceDimensions(source: CanvasImageSource) {
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
