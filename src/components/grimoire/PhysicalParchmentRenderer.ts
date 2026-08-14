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
};

export type ParchmentSurfaceEffects = {
  /** 0 at rest, 1 at the midpoint of a palimpsest transition. */
  palimpsest?: number;
  /** Mechanical pressure released by the traced octagram. */
  mechanism?: number;
  mechanismCenter?: { x: number; y: number };
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
  uTexel: { value: import("three").Vector2 };
  uDisplacement: { value: number };
  uReliefStrength: { value: number };
  uInkDepth: { value: number };
  uPalimpsest: { value: number };
  uMechanism: { value: number };
  uMechanismCenter: { value: import("three").Vector2 };
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
  uniform vec2 uTexel;
  uniform float uReliefStrength;
  uniform float uInkDepth;

  float paperHeightAt(vec2 uv, float fallbackHeight) {
    vec4 paper = texture2D(uHeight, clamp(uv, vec2(0.0), vec2(1.0)));
    if (paper.a < 0.05) return fallbackHeight;
    return paper.r;
  }

  void main() {
    vec4 heightSample = texture2D(uHeight, vSurfaceUv);
    float paperMask = smoothstep(0.015, 0.92, heightSample.a);
    if (paperMask <= 0.001) discard;

    vec4 inkSample = texture2D(uInk, vSurfaceUv);
    float inkMask = clamp(inkSample.a, 0.0, 1.0);
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
    this.uniforms = {
      uAlbedo: { value: albedo },
      uHeight: { value: height },
      uInk: { value: ink },
      uTexel: { value: new three.Vector2(0.5, 0.5) },
      uDisplacement: { value: 0.062 },
      uReliefStrength: { value: 3.15 },
      uInkDepth: { value: 0.052 },
      uPalimpsest: { value: 0 },
      uMechanism: { value: 0 },
      uMechanismCenter: { value: new three.Vector2(0.5, 0.5) },
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
    const dimensions = imageSourceDimensions(sources.height);
    this.uniforms.uTexel.value.set(1 / dimensions.width, 1 / dimensions.height);
    this.uniforms.uPalimpsest.value = Math.max(0, Math.min(1, effects.palimpsest ?? 0));
    this.uniforms.uMechanism.value = Math.max(0, Math.min(1, effects.mechanism ?? 0));
    const center = effects.mechanismCenter ?? { x: 0.5, y: 0.5 };
    this.uniforms.uMechanismCenter.value.set(center.x, 1 - center.y);
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
  if (changed) texture.image = source;
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
