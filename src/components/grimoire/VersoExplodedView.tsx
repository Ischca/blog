import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";
import type { Locale } from "../../content/site";

export type VersoPhase = "priming" | "entering" | "active" | "recalling" | "closing";

export type VersoTracePoint = {
  x: number;
  y: number;
};

type Props = {
  phase: VersoPhase;
  locale: Locale;
  activeChapter: number;
  surfaceCanvas: HTMLCanvasElement | null;
  albedoCanvas: HTMLCanvasElement | null;
  heightCanvas: HTMLCanvasElement | null;
  inkCanvas: HTMLCanvasElement | null;
  absorptionCanvas: HTMLCanvasElement | null;
  glyphCanvas: HTMLCanvasElement | null;
  trace: readonly VersoTracePoint[];
  onReturn: () => void;
};

type Runtime = typeof import("three");

type LayerKind = "output" | "resource" | "resource-group" | "runtime" | "capture" | "schematic";
type HeightInspectionMode = "raw" | "enhanced" | "shaded";

type LayerDefinition = {
  id: string;
  title: string;
  subtitle: string;
  kind: LayerKind;
  color: string;
  lines: readonly string[];
  render: "surface" | "vellum" | "height" | "ink" | "glyph" | "state" | "trace" | "source";
  evidence: string;
  detail: {
    ja: string;
    en: string;
    metrics: readonly (readonly [string, string])[];
    pipeline: readonly string[];
    code: readonly string[];
  };
};

type LayerMesh = Mesh<PlaneGeometry, MeshBasicMaterial> & {
  userData: {
    layerIndex: number;
    homeX: number;
    homeY: number;
    offsetX: number;
    offsetY: number;
    offsetZ: number;
  };
};

type SceneRuntime = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  group: Group;
  layers: LayerMesh[];
  textures: CanvasTexture[];
  stars: Points;
  starMaterial: PointsMaterial;
  raycaster: Raycaster;
  pointer: Vector2;
  dispose: () => void;
};

type LayerSources = {
  surface: HTMLCanvasElement;
  albedo: HTMLCanvasElement | null;
  height: HTMLCanvasElement | null;
  ink: HTMLCanvasElement | null;
  absorption: HTMLCanvasElement | null;
  glyph: HTMLCanvasElement | null;
};

const CYAN = "#76e8ff";
const PALE = "#d8f8ff";
const AMBER = "#f0b468";
const RUST = "#b95b45";
const INSPECTION_HOLD_MS = 1500;

const LAYER_KIND_LABELS: Record<LayerKind, string> = {
  output: "RENDER OUTPUT",
  resource: "LIVE RESOURCE",
  "resource-group": "RESOURCE GROUP",
  runtime: "RUNTIME STATE",
  capture: "CAPTURED DATA",
  schematic: "ARCHITECTURE SCHEMATIC",
};

const LAYERS: readonly LayerDefinition[] = [
  {
    id: "surface",
    title: "SURFACE COMPOSITE",
    subtitle: "FINAL WEBGL + CANVAS COMPOSITE",
    kind: "output",
    color: PALE,
    lines: ["ALBEDO + RELIEF + PIGMENT", "LIVE CANVAS FRAME"],
    render: "surface",
    evidence: "LIVE FRAME",
    detail: {
      ja: "閲覧者が実際に見ていた最終フレームです。紙のalbedo・height・inkをPhysicalParchmentRendererへ渡し、同一のWebGLシェーダーで変位、法線、照明、顔料を合成します。WebGLが使えない場合だけCanvas 2Dへフォールバックします。",
      en: "The final frame the visitor was actually viewing. Albedo, height, and ink buffers are passed to PhysicalParchmentRenderer, where one WebGL shader combines displacement, normals, lighting, and pigment. Canvas 2D is the fallback path only.",
      metrics: [["PRIMARY", "WEBGL"], ["FALLBACK", "CANVAS 2D"], ["COLOUR", "SRGB"]],
      pipeline: ["Build paper-fixed albedo and height buffers", "Render SDF text into the ink surface", "Apply absorption and groove masks", "Render the combined height and pigment field"],
      code: ["parchmentRenderer.renderFrame(size, {", "  albedo: inkSurface.albedo, height: inkSurface.surface,", "  ink: inkSurface.canvas,", "});"]
    },
  },
  {
    id: "vellum",
    title: "VELLUM MESH",
    subtitle: "LIVE ALBEDO + EXACT MESH SCHEMATIC",
    kind: "resource-group",
    color: CYAN,
    lines: ["112 × 84 SUBDIVISIONS", "18,816 TRIANGLES"],
    render: "vellum",
    evidence: "LIVE ALBEDO / TOPOLOGY SCHEMATIC",
    detail: {
      ja: "背景は実際にシェーダーへ渡される無照明のalbedo bufferです。重ねた格子は実メッシュと同じ112×84分割を示す正確な模式図であり、albedo自体に焼き込まれた線ではありません。",
      en: "The background is the unlit albedo buffer actually sent to the shader. The overlaid grid is an exact 112 × 84 topology schematic of the real mesh; it is not baked into the albedo.",
      metrics: [["SUBDIVISIONS", "112 × 84"], ["VERTICES", "9,605"], ["TRIANGLES", "18,816"]],
      pipeline: ["Generate the edge-masked vellum albedo", "Upload it as an sRGB texture", "Create a 112 × 84 PlaneGeometry", "Displace that geometry from the height buffer"],
      code: ["this.geometry = new three.PlaneGeometry(2, 2, 112, 84);", "updateTexture(this.uniforms.uAlbedo.value, sources.albedo);", "displaced.z += (combinedHeight - 0.5) * uDisplacement * heightSample.a;"]
    },
  },
  {
    id: "height",
    title: "HEIGHT BUFFER",
    subtitle: "LIVE uHeight TEXTURE",
    kind: "resource",
    color: CYAN,
    lines: ["R = PAPER HEIGHT", "A = PAPER MASK"],
    render: "height",
    evidence: "LIVE RESOURCE / RAW",
    detail: {
      ja: "GPUへuHeightとして渡す実際のCanvas textureです。R channelが紙の高さ、A channelが紙面maskです。法線画像は保存せず、この高さを隣接4点でサンプリングし、最終段でink alphaの画面微分を加えて再構築します。",
      en: "The actual Canvas texture uploaded as uHeight. Its R channel stores paper height and A stores the paper mask. No normal map is stored: four neighbouring height samples are combined with screen derivatives of ink alpha at the final shading stage.",
      metrics: [["R CHANNEL", "HEIGHT"], ["A CHANNEL", "PAPER MASK"], ["DISPLACE", "0.062"]],
      pipeline: ["Build broad thickness and fold values", "Blend in photographic micro-relief", "Sample four neighbouring heights in the shader", "Add the ink gradient and normalize"],
      code: ["float heightL = paperHeightAt(vSurfaceUv - vec2(uTexel.x, 0.0), centerHeight);", "float combinedGradientX = (heightL - heightR) + dFdx(inkMask) * uInkDepth * 2.0;", "vec3 surfaceNormal = normalize(vec3(combinedGradientX * uReliefStrength, combinedGradientY * uReliefStrength, 1.0));"]
    },
  },
  {
    id: "ink",
    title: "PHYSICAL INK",
    subtitle: "LIVE PIGMENT + ABSORPTION BUFFERS",
    kind: "resource-group",
    color: AMBER,
    lines: ["PAPER HEIGHT − INK DEPTH", "CAPILLARY UPTAKE"],
    render: "ink",
    evidence: "02 LIVE BUFFERS",
    detail: {
      ja: "左が実際のpigment alpha、右が紙に固定されたabsorption maskです。手描き線は入力pressure・速度・ペン角度から幅を計算し、文字はrun単位のpressure/absorptionを受けます。最終的な凹みはink alpha×0.052として紙の高さから引かれます。",
      en: "Left is the actual pigment alpha; right is the paper-fixed absorption mask. Hand-drawn width uses input pressure, speed, and nib angle, while text receives pressure and absorption per text run. Final depth subtracts ink alpha × 0.052 from paper height.",
      metrics: [["INK DEPTH", "0.052"], ["USER NIB", "0.68–2.65 PX"], ["MASK", "PAPER-FIXED"]],
      pipeline: ["Rasterize static text and user strokes", "Erase pigment through the relief-derived absorption mask", "Apply darker deposits from paper grooves", "Mix lit pigment into the shared surface shader"],
      code: ["targetWidth = clamp(0.68, nibContact * speed * (0.88 + pressure * 0.22), 2.65);", "inkContext.globalCompositeOperation = \"destination-out\";", "inkContext.drawImage(inkSurface.absorption, 0, 0);"]
    },
  },
  {
    id: "glyphs",
    title: "SDF GLYPHS",
    subtitle: "LIVE TROIKA GPU OUTPUT",
    kind: "resource",
    color: PALE,
    lines: ["FONT → SDF → PRESSURE MASK", "YUJI / IM FELL"],
    render: "glyph",
    evidence: "LIVE GPU OUTPUT",
    detail: {
      ja: "Troikaが生成した実際のSDF文字出力です。glyph coverageへrun単位のpressureとabsorption、同じ紙のrelief sampleを適用した後、ink bufferへ合成します。凹みと最終照明は次段のPhysicalParchmentRendererが担当します。",
      en: "The actual SDF text output produced by Troika. Glyph coverage receives per-run pressure and absorption plus samples from the shared paper relief before entering the ink buffer. PhysicalParchmentRenderer applies depth and final lighting afterward.",
      metrics: [["SDF GLYPH", "128 PX"], ["MAX DPR", "2"], ["FONTS", "LOCAL WOFF"]],
      pipeline: ["Select a local subset font for the run", "Generate and retain Troika SDF meshes", "Modulate coverage with run pressure and paper uptake", "Composite the GPU result into the pigment buffer"],
      code: ["mesh.gpuAccelerateSDF = true;", "mesh.sdfGlyphSize = run.size >= 22 ? 128 : 64;", "const textCanvas = textRenderer.renderFrame(gpuText.runs, size, inkSurface.surface);"]
    },
  },
  {
    id: "scroll",
    title: "SCROLL STATE",
    subtitle: "PALIMPSEST TIMELINE",
    kind: "runtime",
    color: CYAN,
    lines: ["SCROLL → PHASE → SECTION", "120 QUANTIZED STEPS"],
    render: "state",
    evidence: "SECTION STATE / STATE-MACHINE SCHEMATIC",
    detail: {
      ja: "単一の描画面上でプロフィールの各セクションを切り替える時間軸です。スクロール量を、現在のセクション、局所進行度、前後の描画状態へ変換します。",
      en: "A timeline that transitions between portfolio sections on one drawing surface. Scroll distance becomes the active section, local progress, and a pair of adjoining render states.",
      metrics: [["SECTIONS", "05"], ["STEPS", "120"], ["EASING", "SMOOTHSTEP"]],
      pipeline: ["Normalize travel through the sticky section", "Resolve the current and next sections", "Apply smoothstep after the first 14%", "Quantize the transition to increments of 1/120"],
      code: ["const position = scrollProgress * (VIEW_IDS.length - 1);", "const rawTransitionProgress = smoothstep(0.14, 0.98, local);", "const transitionProgress = Math.round(rawTransitionProgress * 120) / 120;"]
    },
  },
  {
    id: "ritual",
    title: "RITUAL TRACE",
    subtitle: "GESTURE RECOGNITION",
    kind: "capture",
    color: RUST,
    lines: ["MULTI-STROKE OCTAGRAM", "TOLERANCE-SAMPLED PATH"],
    render: "trace",
    evidence: "CAPTURED INPUT",
    detail: {
      ja: "実際に完成判定を通過した筆画の記録です。円の閉路検出後、画面pixel空間で交差八芒星の8線分を6区間ずつに分け、複数筆画を合算して許容距離内のcoverageを検証します。",
      en: "The strokes that actually passed completion. After circle detection, the crossed octagram's eight segments are divided into six bins in screen-pixel space; coverage accumulates across multiple strokes within a bounded tolerance.",
      metrics: [["SEGMENTS", "8 × 6 BINS"], ["TOLERANCE", "6–11 PX"], ["COVERAGE", "> 72%"]],
      pipeline: ["Detect a sufficiently closed circle", "Reveal the crossed guide", "Accumulate segment coverage", "Trigger completion only after full tracing"],
      code: ["const tolerance = clamp(6, radius * 0.09, 11);", "const binsPerSegment = 6;", "return substantiallyTraced === coverage.length && totalCoverage > 0.72;"]
    },
  },
  {
    id: "source",
    title: "SOURCE GRAPH",
    subtitle: "EXECUTION STRUCTURE",
    kind: "schematic",
    color: CYAN,
    lines: ["ASTRO → REACT → THREE.JS", "TROIKA + GLSL + CANVAS"],
    render: "source",
    evidence: "ARCHITECTURE SCHEMATIC",
    detail: {
      ja: "実行構造を示す模式図です。Astroが日英の静的HTMLを生成し、React islandはclient:loadでhydrateされます。ThreeとTroikaはhydrate後に非同期importされ、紙面用の二つのGPU rendererを初期化します。隠しインタラクションの完了を待って読み込む構成ではありません。",
      en: "A schematic of the real execution structure. Astro emits bilingual static HTML and the React island hydrates with client:load. Three and Troika are asynchronously imported after hydration to initialize the two surface GPU renderers; loading does not wait for the optional hidden interaction.",
      metrics: [["SHELL", "ASTRO STATIC"], ["HYDRATION", "CLIENT:LOAD"], ["SURFACE GPU", "02 RENDERERS"]],
      pipeline: ["Astro generates /ja and /en HTML", "React hydrates the interactive portfolio", "PhysicalInkTextRenderer imports Three and Troika", "PhysicalParchmentRenderer imports Three and composites the surface"],
      code: ["<CanvasGrimoireExperience client:load />", "const [three, troika] = await Promise.all([import(\"three\"), import(\"troika-three-text\")]);", "const physicalSurface = parchmentRenderer.renderFrame(size, sources);"]
    },
  },
] as const;

const COPY = {
  ja: {
    title: "RUNTIME / LIVE STRUCTURE",
    eyebrow: "ポートフォリオを構成する実行レイヤー",
    instruction: "空間をドラッグして回転 · レイヤーを長押しして検査 · スクロールで分解幅を変更",
    return: "RETURN TO SURFACE",
    recalling: "RECALLING LAYERS",
    chapter: "SECTION",
    layer: "ACTIVE NODE",
    hold: "HOLD TO INSPECT",
    inspect: "LAYER INSPECTION",
    pipeline: "PROCESS TRACE",
    release: "BACK TO ALL LAYERS",
    focus: "ISOLATED NODE / 2D INSPECTION",
    inspectHelp: "ドラッグで移動 · ホイール／ピンチで拡縮 · ダブルクリックでリセット",
    heightProbe: "カーソル位置の高さと派生法線を解析",
  },
  en: {
    title: "RUNTIME / LIVE STRUCTURE",
    eyebrow: "RUNTIME LAYERS OF THIS PORTFOLIO",
    instruction: "DRAG SPACE TO ORBIT · HOLD A LAYER TO INSPECT · SCROLL TO EXPLODE",
    return: "RETURN TO SURFACE",
    recalling: "RECALLING LAYERS",
    chapter: "SECTION",
    layer: "ACTIVE NODE",
    hold: "HOLD TO INSPECT",
    inspect: "LAYER INSPECTION",
    pipeline: "PROCESS TRACE",
    release: "BACK TO ALL LAYERS",
    focus: "ISOLATED NODE / 2D INSPECTION",
    inspectHelp: "DRAG TO PAN · SCROLL / PINCH TO ZOOM · DOUBLE-CLICK TO RESET",
    heightProbe: "PROBE HEIGHT AND DERIVED NORMAL AT THE CURSOR",
  },
} as const;

const CHAPTERS = ["PROFILE", "PRODUCTS", "SERVICES", "EXPERIENCE", "CONTACT"];

export function VersoExplodedView({
  phase,
  locale,
  activeChapter,
  surfaceCanvas,
  albedoCanvas,
  heightCanvas,
  inkCanvas,
  absorptionCanvas,
  glyphCanvas,
  trace,
  onReturn,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const returnButtonRef = useRef<HTMLButtonElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const holdIndicatorRef = useRef<HTMLDivElement>(null);
  const inspectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const inspectionZoomRef = useRef<HTMLSpanElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const phaseRef = useRef(phase);
  const explosionRef = useRef(1);
  const targetExplosionRef = useRef(1);
  const inspectedRef = useRef<number | null>(null);
  const selectedRef = useRef(LAYERS.length - 1);
  const [selected, setSelected] = useState(LAYERS.length - 1);
  const [inspected, setInspected] = useState<number | null>(null);
  const [heightInspectionMode, setHeightInspectionMode] = useState<HeightInspectionMode>("raw");
  const copy = COPY[locale];

  const selectLayer = useCallback((index: number) => {
    if (selectedRef.current === index) return;
    selectedRef.current = index;
    setSelected(index);
  }, []);

  const inspectLayer = useCallback((index: number | null) => {
    inspectedRef.current = index;
    setInspected(index);
    if (index !== null) selectLayer(index);
  }, [selectLayer]);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === "recalling" || phase === "closing") {
      inspectLayer(null);
      targetExplosionRef.current = 0;
      runtimeRef.current?.layers.forEach((layer) => {
        layer.userData.offsetX = 0;
        layer.userData.offsetY = 0;
        layer.userData.offsetZ = 0;
      });
    } else if (phase === "active") {
      targetExplosionRef.current = Math.max(1, targetExplosionRef.current);
    }
  }, [inspectLayer, phase]);

  useEffect(() => {
    if (phase === "active") returnButtonRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (inspected !== null) inspectionCanvasRef.current?.focus({ preventScroll: true });
  }, [inspected]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || inspectedRef.current === null) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      inspectLayer(null);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [inspectLayer]);

  useEffect(() => {
    const canvas = inspectionCanvasRef.current;
    if (inspected === null || !canvas || !surfaceCanvas) return;
    const definition = LAYERS[inspected];
    const sources = { surface: surfaceCanvas, albedo: albedoCanvas, height: heightCanvas, ink: inkCanvas, absorption: absorptionCanvas, glyph: glyphCanvas };
    const source = definition.render === "height" && sources.height
      ? drawHeightInspectionTexture(sources.height, heightInspectionMode, 2048, 1152)
      : drawLayerTexture(definition, trace, activeChapter, sources, 2048, 1152, true);
    const heightProbe = definition.render === "height" && sources.height
      ? createHeightProbeData(sources.height)
      : null;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    let resizeObserver: ResizeObserver | null = null;
    let frame = 0;
    let cssWidth = 1;
    let cssHeight = 1;
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    let lastPointer: { x: number; y: number } | null = null;
    let pinchDistance = 0;
    let pinchZoom = 1;
    let probeX = 0;
    let probeY = 0;
    let probePlaced = false;

    const scheduleDraw = () => {
      if (frame) return;
      frame = requestAnimationFrame(draw);
    };
    const draw = () => {
      frame = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
      const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, cssWidth, cssHeight);
      const fit = Math.min(cssWidth * 0.92 / source.width, cssHeight * 0.84 / source.height);
      const displayScale = fit * zoom;
      const drawWidth = source.width * displayScale;
      const drawHeight = source.height * displayScale;
      const drawX = cssWidth / 2 + panX - drawWidth / 2;
      const drawY = cssHeight / 2 + panY - drawHeight / 2;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(source, drawX, drawY, drawWidth, drawHeight);
      if (heightProbe && sources.height) {
        drawHeightProbe(context, sources.height, heightProbe, probeX, probeY, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        }, { width: cssWidth, height: cssHeight });
      }
      if (inspectionZoomRef.current) inspectionZoomRef.current.textContent = `${Math.round(zoom * 100)}%`;
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssWidth = Math.max(1, rect.width);
      cssHeight = Math.max(1, rect.height);
      if (!probePlaced) {
        probeX = cssWidth * 0.54;
        probeY = cssHeight * 0.48;
        probePlaced = true;
      }
      scheduleDraw();
    };
    const zoomAt = (nextZoom: number, x: number, y: number) => {
      const clamped = clamp(0.75, nextZoom, 5);
      const ratio = clamped / zoom;
      panX = x - cssWidth / 2 - (x - cssWidth / 2 - panX) * ratio;
      panY = y - cssHeight / 2 - (y - cssHeight / 2 - panY) * ratio;
      zoom = clamped;
      scheduleDraw();
    };
    const pointerDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointers.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top });
      lastPointer = { x: event.clientX, y: event.clientY };
      if (pointers.size === 2) {
        const [first, second] = [...pointers.values()];
        pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
        pinchZoom = zoom;
      }
      canvas.setPointerCapture(event.pointerId);
      canvas.dataset.dragging = "true";
    };
    const pointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (heightProbe) {
        probeX = event.clientX - rect.left;
        probeY = event.clientY - rect.top;
        probePlaced = true;
        scheduleDraw();
      }
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top });
      if (pointers.size >= 2) {
        const [first, second] = [...pointers.values()];
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const centerX = (first.x + second.x) / 2;
        const centerY = (first.y + second.y) / 2;
        if (pinchDistance > 0) zoomAt(pinchZoom * distance / pinchDistance, centerX, centerY);
      } else if (lastPointer) {
        panX += event.clientX - lastPointer.x;
        panY += event.clientY - lastPointer.y;
        scheduleDraw();
      }
      lastPointer = { x: event.clientX, y: event.clientY };
    };
    const pointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      lastPointer = null;
      pinchDistance = 0;
      canvas.dataset.dragging = "false";
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(zoom * Math.exp(-event.deltaY * 0.0014), event.clientX - rect.left, event.clientY - rect.top);
    };
    const reset = () => {
      zoom = 1;
      panX = 0;
      panY = 0;
      scheduleDraw();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "+" || event.key === "=") zoomAt(zoom * 1.2, cssWidth / 2, cssHeight / 2);
      else if (event.key === "-") zoomAt(zoom / 1.2, cssWidth / 2, cssHeight / 2);
      else if (event.key === "0") reset();
      else if (event.key === "ArrowLeft") panX += 34;
      else if (event.key === "ArrowRight") panX -= 34;
      else if (event.key === "ArrowUp") panY += 34;
      else if (event.key === "ArrowDown") panY -= 34;
      else return;
      event.preventDefault();
      scheduleDraw();
    };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("dblclick", reset);
    canvas.addEventListener("keydown", keyDown);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("dblclick", reset);
      canvas.removeEventListener("keydown", keyDown);
    };
  }, [absorptionCanvas, activeChapter, albedoCanvas, glyphCanvas, heightCanvas, heightInspectionMode, inkCanvas, inspected, surfaceCanvas, trace]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !surfaceCanvas) return;
    let cancelled = false;
    let animation = 0;
    let resizeObserver: ResizeObserver | null = null;
    let removeEvents = () => {};

    void import("three").then((three) => {
      if (cancelled) return;
      const runtime = createScene(three, canvas, {
        surface: surfaceCanvas,
        albedo: albedoCanvas,
        height: heightCanvas,
        ink: inkCanvas,
        absorption: absorptionCanvas,
        glyph: glyphCanvas,
      }, trace, activeChapter);
      runtimeRef.current = runtime;

      let width = 1;
      let height = 1;
      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        runtime.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
        runtime.renderer.setSize(width, height, false);
        runtime.camera.aspect = width / height;
        runtime.camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      resize();

      let activePointer: number | null = null;
      let lastX = 0;
      let lastY = 0;
      let draggedLayer: LayerMesh | null = null;
      const dragPlane = new three.Plane();
      const dragPlaneNormal = new three.Vector3();
      const dragPlaneOrigin = new three.Vector3();
      const dragIntersection = new three.Vector3();
      let previousDragWorldPoint: import("three").Vector3 | null = null;
      let orbiting = false;
      let velocityX = 0;
      let velocityY = 0;
      let hoverX = 0;
      let hoverY = 0;
      let hoverDirty = false;
      let holding: {
        pointerId: number;
        layer: LayerMesh;
        startX: number;
        startY: number;
        startedAt: number;
      } | null = null;
      const setIndicator = (x: number, y: number, progress: number, active: boolean) => {
        const indicator = holdIndicatorRef.current;
        if (!indicator) return;
        indicator.style.setProperty("--hold-x", `${x}px`);
        indicator.style.setProperty("--hold-y", `${y}px`);
        indicator.style.setProperty("--hold-progress", `${clamp(0, progress, 1) * 360}deg`);
        indicator.dataset.active = active ? "true" : "false";
      };
      const setPointer = (clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        runtime.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        runtime.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        runtime.raycaster.setFromCamera(runtime.pointer, runtime.camera);
      };
      const hitLayer = (clientX: number, clientY: number) => {
        setPointer(clientX, clientY);
        const hits = runtime.raycaster.intersectObjects(runtime.layers, false);
        return (hits[0]?.object as LayerMesh | undefined) ?? null;
      };
      const beginLayerDrag = (layer: LayerMesh, clientX: number, clientY: number) => {
        runtime.camera.getWorldDirection(dragPlaneNormal);
        layer.getWorldPosition(dragPlaneOrigin);
        dragPlane.setFromNormalAndCoplanarPoint(dragPlaneNormal, dragPlaneOrigin);
        setPointer(clientX, clientY);
        previousDragWorldPoint = runtime.raycaster.ray.intersectPlane(dragPlane, dragIntersection)
          ? dragIntersection.clone()
          : null;
      };
      const moveLayerInScreenPlane = (layer: LayerMesh, clientX: number, clientY: number) => {
        setPointer(clientX, clientY);
        if (!previousDragWorldPoint || !runtime.raycaster.ray.intersectPlane(dragPlane, dragIntersection)) return;
        runtime.group.updateWorldMatrix(true, false);
        const previousLocal = runtime.group.worldToLocal(previousDragWorldPoint.clone());
        const currentLocal = runtime.group.worldToLocal(dragIntersection.clone());
        layer.userData.offsetX += currentLocal.x - previousLocal.x;
        layer.userData.offsetY += currentLocal.y - previousLocal.y;
        layer.userData.offsetZ += currentLocal.z - previousLocal.z;
        previousDragWorldPoint.copy(dragIntersection);
      };
      const pointerDown = (event: PointerEvent) => {
        if (phaseRef.current !== "active" || inspectedRef.current !== null || event.button !== 0) return;
        activePointer = event.pointerId;
        lastX = event.clientX;
        lastY = event.clientY;
        const hit = hitLayer(event.clientX, event.clientY);
        orbiting = !hit;
        draggedLayer = null;
        if (hit && inspectedRef.current === null) {
          velocityX = 0;
          velocityY = 0;
          selectLayer(hit.userData.layerIndex);
          holding = {
            pointerId: event.pointerId,
            layer: hit,
            startX: event.clientX,
            startY: event.clientY,
            startedAt: performance.now(),
          };
          const rect = canvas.getBoundingClientRect();
          setIndicator(event.clientX - rect.left, event.clientY - rect.top, 0, true);
        }
        canvas.setPointerCapture(event.pointerId);
      };
      const pointerMove = (event: PointerEvent) => {
        if (activePointer === null) {
          hoverX = event.clientX;
          hoverY = event.clientY;
          hoverDirty = true;
          return;
        }
        if (event.pointerId !== activePointer) return;
        if (holding) {
          const distance = Math.hypot(event.clientX - holding.startX, event.clientY - holding.startY);
          if (distance <= 9) return;
          draggedLayer = holding.layer;
          holding = null;
          setIndicator(0, 0, 0, false);
          beginLayerDrag(draggedLayer, event.clientX, event.clientY);
          lastX = event.clientX;
          lastY = event.clientY;
          canvas.style.cursor = "grabbing";
          return;
        }
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        if (draggedLayer) {
          moveLayerInScreenPlane(draggedLayer, event.clientX, event.clientY);
        } else if (orbiting) {
          velocityY = dx * 0.0032;
          velocityX = dy * 0.0026;
          runtime.group.rotation.y += velocityY;
          runtime.group.rotation.x += velocityX;
        }
      };
      const pointerUp = (event: PointerEvent) => {
        if (event.pointerId !== activePointer) return;
        holding = null;
        setIndicator(0, 0, 0, false);
        activePointer = null;
        draggedLayer = null;
        previousDragWorldPoint = null;
        orbiting = false;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      };
      const wheel = (event: WheelEvent) => {
        if (phaseRef.current !== "active" || inspectedRef.current !== null) return;
        event.preventDefault();
        targetExplosionRef.current = clamp(0.58, targetExplosionRef.current + event.deltaY * 0.0011, 2.25);
      };
      canvas.addEventListener("pointerdown", pointerDown);
      canvas.addEventListener("pointermove", pointerMove);
      canvas.addEventListener("pointerup", pointerUp);
      canvas.addEventListener("pointercancel", pointerUp);
      canvas.addEventListener("wheel", wheel, { passive: false });
      removeEvents = () => {
        canvas.removeEventListener("pointerdown", pointerDown);
        canvas.removeEventListener("pointermove", pointerMove);
        canvas.removeEventListener("pointerup", pointerUp);
        canvas.removeEventListener("pointercancel", pointerUp);
        canvas.removeEventListener("wheel", wheel);
      };

      let previous = performance.now();
      let frameCount = 0;
      let fpsStarted = previous;
      let primed = false;
      let inspectionPaused = false;
      const render = (now: number) => {
        if (document.hidden) {
          previous = now;
          animation = requestAnimationFrame(render);
          return;
        }
        if (phaseRef.current === "priming" && primed) {
          previous = now;
          animation = requestAnimationFrame(render);
          return;
        }
        if (phaseRef.current === "priming") primed = true;
        if (inspectedRef.current !== null && inspectionPaused) {
          previous = now;
          animation = requestAnimationFrame(render);
          return;
        }
        inspectionPaused = inspectedRef.current !== null;
        const delta = Math.min(0.05, (now - previous) / 1000);
        previous = now;
        frameCount += 1;
        if (now - fpsStarted >= 750) {
          if (fpsRef.current) fpsRef.current.textContent = `${Math.round(frameCount * 1000 / (now - fpsStarted))} FPS`;
          frameCount = 0;
          fpsStarted = now;
        }

        if (hoverDirty && activePointer === null && inspectedRef.current === null && phaseRef.current === "active") {
          hoverDirty = false;
          const hover = hitLayer(hoverX, hoverY);
          canvas.style.cursor = hover ? "grab" : "move";
          if (hover) selectLayer(hover.userData.layerIndex);
        }
        if (holding) {
          const progress = (now - holding.startedAt) / INSPECTION_HOLD_MS;
          const rect = canvas.getBoundingClientRect();
          setIndicator(holding.startX - rect.left, holding.startY - rect.top, progress, true);
          if (progress >= 1) {
            const completed = holding;
            holding = null;
            activePointer = null;
            setIndicator(0, 0, 0, false);
            if (canvas.hasPointerCapture(completed.pointerId)) canvas.releasePointerCapture(completed.pointerId);
            inspectLayer(completed.layer.userData.layerIndex);
            canvas.style.cursor = "default";
          }
        }

        const phaseNow = phaseRef.current;
        const target = phaseNow === "recalling" || phaseNow === "closing"
          ? 0
          : targetExplosionRef.current;
        explosionRef.current = damp(explosionRef.current, target, phaseNow === "recalling" ? 7.2 : 4.4, delta);
        velocityX *= Math.pow(0.025, delta);
        velocityY *= Math.pow(0.025, delta);
        if (!orbiting && phaseNow === "active" && inspectedRef.current === null) {
          runtime.group.rotation.x += velocityX;
          runtime.group.rotation.y += velocityY;
        }
        if (phaseNow === "recalling" || phaseNow === "closing") {
          runtime.group.rotation.x = damp(runtime.group.rotation.x, -0.055, 5.6, delta);
          runtime.group.rotation.y = damp(runtime.group.rotation.y, 0, 5.6, delta);
        }
        const spread = explosionRef.current;
        const inspectedNow = inspectedRef.current;
        const inspectedZ = 1.25;
        const viewHeight = 2 * Math.tan(runtime.camera.fov * Math.PI / 360) * (runtime.camera.position.z - inspectedZ);
        const viewWidth = viewHeight * runtime.camera.aspect;
        const compactInspection = width < 760;
        const fittedScale = compactInspection
          ? Math.min(viewWidth * 0.88 / 7.4, viewHeight * 0.38 / (7.4 / (16 / 9)))
          : Math.min(viewWidth * 0.57 / 7.4, viewHeight * 0.76 / (7.4 / (16 / 9)));
        if (inspectedNow !== null) {
          velocityX = 0;
          velocityY = 0;
          runtime.group.rotation.x = damp(runtime.group.rotation.x, 0, 7.5, delta);
          runtime.group.rotation.y = damp(runtime.group.rotation.y, 0, 7.5, delta);
          runtime.group.rotation.z = damp(runtime.group.rotation.z, 0, 7.5, delta);
        }
        runtime.layers.forEach((layer, index) => {
          const centered = index - (runtime.layers.length - 1) / 2;
          const targetZ = inspectedNow === index
            ? inspectedZ
            : inspectedNow === null
              ? centered * 0.56 * spread + layer.userData.offsetZ
              : -4.5 - index * 0.08;
          const recalled = phaseNow === "recalling" || phaseNow === "closing";
          const targetX = recalled ? 0 : inspectedNow === index ? (compactInspection ? 0 : -viewWidth * 0.205) : layer.userData.homeX + layer.userData.offsetX;
          const targetY = recalled ? 0 : inspectedNow === index ? (compactInspection ? viewHeight * 0.245 : 0) : layer.userData.homeY + layer.userData.offsetY;
          const targetScale = inspectedNow === index ? fittedScale : inspectedNow === null ? 1 : 0.68;
          layer.position.x = damp(layer.position.x, targetX, recalled ? 8.4 : 10.5, delta);
          layer.position.y = damp(layer.position.y, targetY, recalled ? 8.4 : 10.5, delta);
          layer.position.z = damp(layer.position.z, targetZ, recalled ? 8.8 : 6.2, delta);
          layer.rotation.z = damp(layer.rotation.z, recalled || inspectedNow === index ? 0 : centered * 0.006, 6, delta);
          layer.scale.x = damp(layer.scale.x, targetScale, 7.5, delta);
          layer.scale.y = damp(layer.scale.y, targetScale, 7.5, delta);
          layer.renderOrder = inspectedNow === index ? 100 : LAYERS.length - index;
          const material = layer.material;
          const normalOpacity = index === 0 ? 0.3 : 0.76;
          const inspectedOpacity = inspectedNow === null ? normalOpacity : 0;
          material.opacity = inspectedNow !== null
            ? 0
            : damp(material.opacity, recalled ? (index === 0 ? 0.88 : 0.38) : inspectedOpacity, 5, delta);
          const intendedBlending = inspectedNow === index || index === 0 ? three.NormalBlending : three.AdditiveBlending;
          if (material.blending !== intendedBlending) {
            material.blending = intendedBlending;
            material.needsUpdate = true;
          }
        });

        runtime.stars.rotation.z += delta * 0.015;
        runtime.stars.rotation.y = runtime.group.rotation.y * -0.08;
        runtime.starMaterial.opacity = inspectedNow === null ? 0.32 + Math.sin(now * 0.0012) * 0.08 : 0.12;
        runtime.renderer.render(runtime.scene, runtime.camera);
        animation = requestAnimationFrame(render);
      };
      animation = requestAnimationFrame(render);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animation);
      resizeObserver?.disconnect();
      removeEvents();
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, [absorptionCanvas, activeChapter, albedoCanvas, glyphCanvas, heightCanvas, inkCanvas, inspectLayer, selectLayer, surfaceCanvas, trace]);

  const activeLayer = LAYERS[selected] ?? LAYERS[0];
  const inspectedLayer = inspected === null ? null : LAYERS[inspected];
  const recalling = phase === "recalling" || phase === "closing";

  return (
    <section className="verso-exploded" aria-label={copy.title} data-phase={phase} data-inspecting={inspectedLayer ? "true" : "false"}>
      <canvas ref={canvasRef} className="verso-exploded-canvas" aria-hidden="true" />
      {inspectedLayer && (
        <div className="verso-focus-viewport">
          <canvas
            ref={inspectionCanvasRef}
            tabIndex={0}
            aria-label={`${inspectedLayer.title}. ${copy.inspectHelp}`}
          />
          <span>{inspectedLayer.render === "height" ? `uHeight / ${heightInspectionMode.toUpperCase()}` : copy.focus}</span>
          {inspectedLayer.render === "height" && (
            <div className="verso-height-modes" role="group" aria-label="Height buffer view">
              {(["raw", "enhanced", "shaded"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={heightInspectionMode === mode}
                  onClick={() => setHeightInspectionMode(mode)}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <small>
            {inspectedLayer.render === "height" ? copy.heightProbe : copy.inspectHelp}
            {inspectedLayer.render === "height" && heightInspectionMode !== "raw" ? " · VIEW ONLY / NOT STORED" : ""}
            {" · "}<b ref={inspectionZoomRef}>100%</b>
          </small>
          <i /><i /><i /><i />
        </div>
      )}
      <div ref={holdIndicatorRef} className="verso-hold-indicator" data-active="false" aria-hidden="true">
        <i /><span>{copy.hold}</span>
      </div>
      <header className="verso-hud-header">
        <span>{copy.eyebrow}</span>
        <strong>{copy.title}</strong>
      </header>
      <aside className="verso-layer-readout" aria-live="polite">
        <span>{copy.layer} / {String(selected + 1).padStart(2, "0")}</span>
        <strong>{activeLayer.title}</strong>
        <em>{activeLayer.subtitle}</em>
        <small className="verso-layer-kind">{LAYER_KIND_LABELS[activeLayer.kind]}</small>
        <small className="verso-layer-evidence">{activeLayer.evidence}</small>
        {activeLayer.lines.map((line) => <small key={line}>{line}</small>)}
      </aside>
      <div className="verso-telemetry" aria-hidden="true">
        <span>WEBGL / LIVE</span>
        <span>{copy.chapter} {String(activeChapter + 1).padStart(2, "0")} / {CHAPTERS[activeChapter]}</span>
        <span>DPR {typeof window === "undefined" ? "—" : Math.min(window.devicePixelRatio || 1, 1.35).toFixed(2)}</span>
        <span ref={fpsRef}>— FPS</span>
      </div>
      {inspectedLayer && (
        <aside className="verso-inspector" aria-live="polite">
          <div className="verso-inspector-index">{LAYER_KIND_LABELS[inspectedLayer.kind]} / {String((inspected ?? 0) + 1).padStart(2, "0")}</div>
          <div className="verso-inspector-evidence">{inspectedLayer.evidence}</div>
          <h2>{inspectedLayer.title}</h2>
          <p className="verso-inspector-subtitle">{inspectedLayer.subtitle}</p>
          <p className="verso-inspector-summary">{inspectedLayer.detail[locale]}</p>
          <dl>
            {inspectedLayer.detail.metrics.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          <h3>{copy.pipeline}</h3>
          <ol>{inspectedLayer.detail.pipeline.map((step) => <li key={step}>{step}</li>)}</ol>
          <pre aria-label="Implementation excerpt"><code>{inspectedLayer.detail.code.join("\n")}</code></pre>
        </aside>
      )}
      <p className="verso-instruction">{copy.instruction}</p>
      <button
        ref={returnButtonRef}
        className="verso-return"
        type="button"
        onClick={inspectedLayer ? () => inspectLayer(null) : onReturn}
        disabled={recalling || phase === "entering" || phase === "priming"}
      >
        <i aria-hidden="true" />
        <span>{recalling ? copy.recalling : inspectedLayer ? copy.release : copy.return}</span>
      </button>
    </section>
  );
}

function createScene(
  three: Runtime,
  canvas: HTMLCanvasElement,
  sources: LayerSources,
  trace: readonly VersoTracePoint[],
  activeChapter: number,
): SceneRuntime {
  const renderer = new three.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: window.devicePixelRatio <= 1.5,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x02070b, 1);
  renderer.outputColorSpace = three.SRGBColorSpace;
  const scene = new three.Scene();
  scene.fog = new three.FogExp2(0x02070b, 0.048);
  const camera = new three.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 0.1, 10.6);
  const group = new three.Group();
  group.rotation.set(-0.12, -0.5, 0.018);
  scene.add(group);

  const textures: CanvasTexture[] = [];
  const layers: LayerMesh[] = [];
  const aspect = 16 / 9;
  LAYERS.forEach((definition, index) => {
    const layerCanvas = drawLayerTexture(definition, trace, activeChapter, sources);
    const texture = new three.CanvasTexture(layerCanvas);
    texture.colorSpace = three.SRGBColorSpace;
    texture.minFilter = three.LinearFilter;
    texture.magFilter = three.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    textures.push(texture);
    const material = new three.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: index === 0 ? 0.3 : 0.76,
      depthWrite: false,
      side: three.DoubleSide,
      blending: index === 0 ? three.NormalBlending : three.AdditiveBlending,
    });
    const geometry = new three.PlaneGeometry(7.4, 7.4 / aspect, index === 1 ? 28 : 1, index === 1 ? 18 : 1);
    const mesh = new three.Mesh(geometry, material) as LayerMesh;
    mesh.position.z = (index - (LAYERS.length - 1) / 2) * 0.56;
    mesh.renderOrder = LAYERS.length - index;
    mesh.userData = {
      layerIndex: index,
      homeX: (index - (LAYERS.length - 1) / 2) * 0.09,
      homeY: Math.sin(index * 1.7) * 0.075,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
    };
    layers.push(mesh);
    group.add(mesh);
  });

  const starPositions = new Float32Array(260 * 3);
  for (let index = 0; index < 260; index += 1) {
    const seed = hash(index * 17.31 + 4.2);
    starPositions[index * 3] = (hash(index * 7.13) - 0.5) * 24;
    starPositions[index * 3 + 1] = (hash(index * 11.91) - 0.5) * 14;
    starPositions[index * 3 + 2] = -4 - seed * 18;
  }
  const starGeometry = new three.BufferGeometry();
  starGeometry.setAttribute("position", new three.BufferAttribute(starPositions, 3));
  const starMaterial = new three.PointsMaterial({
    color: 0x76e8ff,
    size: 0.025,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    blending: three.AdditiveBlending,
  });
  const stars = new three.Points(starGeometry, starMaterial);
  scene.add(stars);

  const grid = new three.GridHelper(24, 32, 0x15485a, 0x0b2632);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -7;
  (grid.material as import("three").Material).transparent = true;
  (grid.material as import("three").Material).opacity = 0.28;
  scene.add(grid);

  const raycaster = new three.Raycaster();
  const pointer = new three.Vector2();
  const dispose = () => {
    layers.forEach((layer) => {
      layer.geometry.dispose();
      layer.material.dispose();
    });
    textures.forEach((texture) => texture.dispose());
    starGeometry.dispose();
    starMaterial.dispose();
    (grid.geometry as import("three").BufferGeometry).dispose();
    (grid.material as import("three").Material).dispose();
    renderer.dispose();
  };
  return { renderer, scene, camera, group, layers, textures, stars, starMaterial, raycaster, pointer, dispose };
}

function drawLayerTexture(
  definition: LayerDefinition,
  trace: readonly VersoTracePoint[],
  activeChapter: number,
  sources: LayerSources,
  width = 1024,
  height = 576,
  inspection = false,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.scale(width / 1280, height / 720);
  const color = definition.color;
  context.clearRect(0, 0, 1280, 720);
  if (definition.render === "surface") context.drawImage(sources.surface, 0, 0, 1280, 720);
  else if (definition.render === "vellum" && sources.albedo) drawSourceBuffer(context, sources.albedo, color, 0.92);
  else if (definition.render === "height" && sources.height) drawHeightBuffer(context, sources.height);
  else if (definition.render === "ink") drawInkBuffers(context, sources.ink, sources.absorption);
  else if (definition.render === "glyph" && sources.glyph) drawSourceBuffer(context, sources.glyph, color, 0.94);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1.2;
  context.globalAlpha = 0.72;
  drawCorners(context, 42, 40, 1196, 640);
  context.font = "500 18px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.letterSpacing = "3px";
  context.fillText(`${String(LAYERS.indexOf(definition) + 1).padStart(2, "0")} / ${definition.title}`, 62, 76);
  context.globalAlpha = 0.4;
  context.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
  definition.lines.forEach((line, index) => context.fillText(line, 62, 108 + index * 22));
  context.globalAlpha = 0.68;

  context.globalAlpha = 0.52;
  context.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText(definition.evidence, 990, 76);
  if (definition.render === "vellum" && inspection) drawMeshTopology(context);
  if (definition.render === "ink" && !sources.ink) drawInkField(context);
  if (definition.render === "glyph" && !sources.glyph) drawGlyphField(context);
  if (definition.render === "state") drawStateField(context, activeChapter);
  if (definition.render === "trace") drawTraceField(context, trace);
  if (definition.render === "source") drawSourceField(context);
  return canvas;
}

function drawCorners(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const length = 32;
  [[x, y, 1, 1], [x + width, y, -1, 1], [x, y + height, 1, -1], [x + width, y + height, -1, -1]].forEach(([cx, cy, sx, sy]) => {
    context.beginPath();
    context.moveTo(cx + sx * length, cy);
    context.lineTo(cx, cy);
    context.lineTo(cx, cy + sy * length);
    context.stroke();
  });
}

function drawSourceBuffer(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  tint: string,
  alpha: number,
) {
  context.save();
  context.globalAlpha = alpha;
  context.drawImage(source, 0, 0, 1280, 720);
  context.globalCompositeOperation = "source-atop";
  context.globalAlpha = 0.12;
  context.fillStyle = tint;
  context.fillRect(0, 0, 1280, 720);
  context.restore();
}

function drawHeightBuffer(context: CanvasRenderingContext2D, source: HTMLCanvasElement) {
  context.save();
  context.globalAlpha = 1;
  context.drawImage(source, 0, 0, 1280, 720);
  context.restore();
}

type HeightProbeData = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

type CanvasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function drawHeightInspectionTexture(
  source: HTMLCanvasElement,
  mode: HeightInspectionMode,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  if (mode === "raw") {
    context.drawImage(source, 0, 0, width, height);
    return canvas;
  }
  if (mode === "enhanced") {
    context.filter = "grayscale(1) contrast(1.8)";
    context.drawImage(source, 0, 0, width, height);
    context.filter = "none";
    return canvas;
  }

  const sample = document.createElement("canvas");
  sample.width = Math.min(1024, width);
  sample.height = Math.max(1, Math.round(sample.width * height / width));
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) return canvas;
  sampleContext.drawImage(source, 0, 0, sample.width, sample.height);
  const input = sampleContext.getImageData(0, 0, sample.width, sample.height);
  const output = sampleContext.createImageData(sample.width, sample.height);
  const heightAt = (x: number, y: number) => {
    const safeX = Math.max(0, Math.min(sample.width - 1, x));
    const safeY = Math.max(0, Math.min(sample.height - 1, y));
    return input.data[(safeY * sample.width + safeX) * 4] / 255;
  };
  const lightLength = Math.hypot(-0.46, 0.58, 0.82);
  const lightX = -0.46 / lightLength;
  const lightY = 0.58 / lightLength;
  const lightZ = 0.82 / lightLength;
  for (let y = 0; y < sample.height; y += 1) {
    for (let x = 0; x < sample.width; x += 1) {
      const index = (y * sample.width + x) * 4;
      const alpha = input.data[index + 3];
      if (alpha === 0) continue;
      const gradientX = (heightAt(x - 1, y) - heightAt(x + 1, y)) * 3.15;
      const gradientY = (heightAt(x, y + 1) - heightAt(x, y - 1)) * 3.15;
      const normalLength = Math.hypot(gradientX, gradientY, 1);
      const diffuse = gradientX / normalLength * lightX
        + gradientY / normalLength * lightY
        + 1 / normalLength * lightZ;
      const tone = Math.round(clamp(0, 0.22 + diffuse * 0.76, 1) * 255);
      output.data[index] = tone;
      output.data[index + 1] = tone;
      output.data[index + 2] = tone;
      output.data[index + 3] = alpha;
    }
  }
  sampleContext.putImageData(output, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(sample, 0, 0, width, height);
  return canvas;
}

function createHeightProbeData(source: HTMLCanvasElement): HeightProbeData | null {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 216;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return {
    width: canvas.width,
    height: canvas.height,
    pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
  };
}

function drawHeightProbe(
  context: CanvasRenderingContext2D,
  rawSource: HTMLCanvasElement,
  data: HeightProbeData,
  pointerX: number,
  pointerY: number,
  sourceRect: CanvasRect,
  viewport: { width: number; height: number },
) {
  const u = (pointerX - sourceRect.x) / sourceRect.width;
  const v = (pointerY - sourceRect.y) / sourceRect.height;
  if (u < 0 || u > 1 || v < 0 || v > 1) return;
  const sampleX = Math.round(u * (data.width - 1));
  const sampleY = Math.round(v * (data.height - 1));
  const channelAt = (x: number, y: number, channel: number) => {
    const safeX = Math.max(0, Math.min(data.width - 1, x));
    const safeY = Math.max(0, Math.min(data.height - 1, y));
    return data.pixels[(safeY * data.width + safeX) * 4 + channel] / 255;
  };
  const height = channelAt(sampleX, sampleY, 0);
  const alpha = channelAt(sampleX, sampleY, 3);
  const gradientX = height <= 0 || alpha <= 0.01
    ? 0
    : (channelAt(sampleX - 1, sampleY, 0) - channelAt(sampleX + 1, sampleY, 0)) * 3.15;
  const gradientY = height <= 0 || alpha <= 0.01
    ? 0
    : (channelAt(sampleX, sampleY + 1, 0) - channelAt(sampleX, sampleY - 1, 0)) * 3.15;
  const normalLength = Math.hypot(gradientX, gradientY, 1);
  const normalX = gradientX / normalLength;
  const normalY = gradientY / normalLength;
  const normalZ = 1 / normalLength;
  const radius = clamp(54, Math.min(viewport.width, viewport.height) * 0.12, 88);

  context.save();
  context.beginPath();
  context.arc(pointerX, pointerY, radius, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = "rgba(1, 8, 12, .82)";
  context.fillRect(pointerX - radius, pointerY - radius, radius * 2, radius * 2);
  const sourceWidth = rawSource.width * (radius * 2 / sourceRect.width) / 2.15;
  const sourceHeight = rawSource.height * (radius * 2 / sourceRect.height) / 2.15;
  context.filter = "grayscale(1) contrast(2.15)";
  context.drawImage(
    rawSource,
    u * rawSource.width - sourceWidth / 2,
    v * rawSource.height - sourceHeight / 2,
    sourceWidth,
    sourceHeight,
    pointerX - radius,
    pointerY - radius,
    radius * 2,
    radius * 2,
  );
  context.filter = "none";
  context.strokeStyle = "rgba(118, 232, 255, .12)";
  context.lineWidth = 0.75;
  for (let offset = -radius; offset <= radius; offset += 18) {
    context.beginPath();
    context.moveTo(pointerX - radius, pointerY + offset);
    context.lineTo(pointerX + radius, pointerY + offset);
    context.stroke();
    context.beginPath();
    context.moveTo(pointerX + offset, pointerY - radius);
    context.lineTo(pointerX + offset, pointerY + radius);
    context.stroke();
  }
  context.restore();

  context.save();
  context.strokeStyle = alpha > 0.01 ? "rgba(126, 236, 255, .9)" : "rgba(185, 91, 69, .72)";
  context.lineWidth = 1.25;
  context.shadowColor = "rgba(86, 224, 251, .62)";
  context.shadowBlur = 10;
  context.beginPath();
  context.arc(pointerX, pointerY, radius, 0, Math.PI * 2);
  context.stroke();
  context.shadowBlur = 0;
  context.globalAlpha = 0.62;
  context.beginPath();
  context.moveTo(pointerX - 11, pointerY);
  context.lineTo(pointerX + 11, pointerY);
  context.moveTo(pointerX, pointerY - 11);
  context.lineTo(pointerX, pointerY + 11);
  context.stroke();
  context.globalAlpha = alpha > 0.01 ? 0.94 : 0.35;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(pointerX, pointerY);
  context.lineTo(pointerX + normalX * radius * 0.58, pointerY - normalY * radius * 0.58);
  context.stroke();

  const panelWidth = 178;
  const panelHeight = 91;
  const panelX = pointerX + radius + panelWidth + 18 < viewport.width
    ? pointerX + radius + 12
    : Math.max(12, pointerX - radius - panelWidth - 12);
  const panelY = clamp(12, pointerY - panelHeight / 2, viewport.height - panelHeight - 12);
  context.fillStyle = "rgba(1, 9, 14, .88)";
  context.fillRect(panelX, panelY, panelWidth, panelHeight);
  context.strokeStyle = "rgba(112, 228, 251, .26)";
  context.lineWidth = 1;
  context.strokeRect(panelX + 0.5, panelY + 0.5, panelWidth - 1, panelHeight - 1);
  context.shadowBlur = 0;
  context.fillStyle = "rgba(125, 229, 249, .64)";
  context.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText(alpha > 0.01 ? "DERIVED PAPER NORMAL / NOT STORED" : "OUTSIDE PAPER MASK", panelX + 10, panelY + 15);
  context.fillStyle = "rgba(216, 248, 255, .82)";
  context.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText(`UV     ${u.toFixed(3)} / ${v.toFixed(3)}`, panelX + 10, panelY + 34);
  context.fillText(`R / A  ${height.toFixed(3)} / ${alpha.toFixed(3)}`, panelX + 10, panelY + 49);
  context.fillText(`dH     ${gradientX.toFixed(3)} / ${gradientY.toFixed(3)}`, panelX + 10, panelY + 64);
  context.fillText(`N      ${normalX.toFixed(2)} / ${normalY.toFixed(2)} / ${normalZ.toFixed(2)}`, panelX + 10, panelY + 79);
  context.restore();
}

function drawInkBuffers(
  context: CanvasRenderingContext2D,
  ink: HTMLCanvasElement | null,
  absorption: HTMLCanvasElement | null,
) {
  context.save();
  context.fillStyle = "rgba(1, 7, 10, .78)";
  context.fillRect(72, 154, 552, 476);
  context.fillRect(656, 154, 552, 476);
  if (ink) {
    context.globalAlpha = 0.94;
    context.drawImage(ink, 72, 154, 552, 476);
  }
  if (absorption) {
    context.globalAlpha = 1;
    context.filter = "grayscale(1) contrast(2.1) brightness(2.5)";
    context.drawImage(absorption, 656, 154, 552, 476);
  }
  context.filter = "none";
  context.strokeStyle = "rgba(118, 232, 255, .32)";
  context.strokeRect(72, 154, 552, 476);
  context.strokeRect(656, 154, 552, 476);
  context.fillStyle = "rgba(216, 248, 255, .72)";
  context.font = "12px ui-monospace, monospace";
  context.fillText("PIGMENT BUFFER / RGBA", 84, 178);
  context.fillText("ABSORPTION MASK / ALPHA", 668, 178);
  context.restore();
}

function drawMeshTopology(context: CanvasRenderingContext2D) {
  context.save();
  context.strokeStyle = "rgba(118,232,255,.16)";
  context.lineWidth = 0.65;
  const left = 78;
  const top = 154;
  const width = 1130;
  const height = 476;
  for (let column = 0; column <= 112; column += 4) {
    const x = left + width * column / 112;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, top + height);
    context.stroke();
  }
  for (let row = 0; row <= 84; row += 4) {
    const y = top + height * row / 84;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(left + width, y);
    context.stroke();
  }
  context.fillStyle = "rgba(216,248,255,.68)";
  context.font = "11px ui-monospace, monospace";
  context.fillText("TOPOLOGY PREVIEW / EVERY FOURTH GRID LINE", 82, 650);
  context.restore();
}

function drawInkField(context: CanvasRenderingContext2D) {
  context.globalAlpha = 0.48;
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(110, 510);
  context.bezierCurveTo(330, 130, 690, 640, 1160, 260);
  context.stroke();
  for (let index = 0; index < 170; index += 1) {
    const t = index / 169;
    const x = 110 + t * 1050;
    const y = 510 - Math.sin(t * Math.PI) * 260 + Math.sin(t * 10) * 72;
    context.globalAlpha = hash(index * 9.2) * 0.42;
    context.beginPath();
    context.arc(x + (hash(index) - 0.5) * 26, y + (hash(index * 2) - 0.5) * 22, 0.6 + hash(index * 4) * 2.1, 0, Math.PI * 2);
    context.fill();
  }
}

function drawGlyphField(context: CanvasRenderingContext2D) {
  const glyphs = ["A", "g", "R", "界", "S", "f", "&", "雲", "M", "π", "I", "文"];
  glyphs.forEach((glyph, index) => {
    const column = index % 6;
    const row = Math.floor(index / 6);
    const x = 130 + column * 190;
    const y = 280 + row * 230;
    context.globalAlpha = 0.22 + index * 0.025;
    context.strokeRect(x - 38, y - 82, 115, 130);
    context.font = `${72 + (index % 3) * 8}px Georgia, serif`;
    context.fillText(glyph, x, y + 12);
    context.font = "12px ui-monospace, monospace";
    context.fillText(`SDF ${String(index).padStart(3, "0")}`, x - 34, y + 70);
  });
}

function drawStateField(context: CanvasRenderingContext2D, activeChapter: number) {
  const left = 110;
  const right = 1160;
  const y = 390;
  context.globalAlpha = 0.28;
  context.beginPath();
  context.moveTo(left, y);
  context.lineTo(right, y);
  context.stroke();
  CHAPTERS.forEach((chapter, index) => {
    const x = left + (right - left) * index / (CHAPTERS.length - 1);
    context.globalAlpha = index === activeChapter ? 0.95 : 0.3;
    context.beginPath();
    context.arc(x, y, index === activeChapter ? 15 : 7, 0, Math.PI * 2);
    context.stroke();
    context.font = "12px ui-monospace, monospace";
    context.fillText(`0${index + 1} ${chapter}`, x - 58, y + (index % 2 ? 52 : -34));
  });
  context.globalAlpha = 0.62;
  context.fillText("smoothstep(0.14, 0.98, local)", 485, 560);
}

function drawTraceField(context: CanvasRenderingContext2D, trace: readonly VersoTracePoint[]) {
  const points = trace.length > 2
    ? trace
    : Array.from({ length: 9 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 0.75;
        return { x: 0.5 + Math.cos(angle) * 0.23, y: 0.52 + Math.sin(angle) * 0.32 };
      });
  context.globalAlpha = 0.78;
  context.lineWidth = 2;
  context.beginPath();
  points.forEach((point, index) => {
    const x = 170 + point.x * 940;
    const y = 130 + point.y * 500;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  points.filter((_, index) => index % Math.max(1, Math.floor(points.length / 42)) === 0).forEach((point, index) => {
    const x = 170 + point.x * 940;
    const y = 130 + point.y * 500;
    context.globalAlpha = 0.28 + hash(index) * 0.6;
    context.beginPath();
    context.arc(x, y, 2.2, 0, Math.PI * 2);
    context.fill();
  });
}

function drawSourceField(context: CanvasRenderingContext2D) {
  const nodes = [
    ["ASTRO", 170, 210],
    ["REACT", 430, 210],
    ["CANVAS", 690, 210],
    ["THREE.JS", 950, 210],
    ["TROIKA SDF", 300, 500],
    ["GLSL", 640, 500],
    ["WEBGL", 980, 500],
  ] as const;
  context.globalAlpha = 0.35;
  [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [2, 5], [5, 6], [3, 6]].forEach(([from, to]) => {
    context.beginPath();
    context.moveTo(nodes[from][1], nodes[from][2]);
    context.lineTo(nodes[to][1], nodes[to][2]);
    context.stroke();
  });
  nodes.forEach(([label, x, y], index) => {
    context.globalAlpha = 0.78;
    context.strokeRect(x - 74, y - 24, 148, 48);
    context.font = "14px ui-monospace, monospace";
    context.fillText(label, x - label.length * 4.4, y + 5);
    context.globalAlpha = 0.3;
    context.fillText(`0x${(index * 7919 + 4096).toString(16).toUpperCase()}`, x - 35, y + 47);
  });
  context.globalAlpha = 0.48;
  context.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
  [
    "physicalHeight = physicalReliefAt(physicalPaperUv);",
    "combinedHeight = heightSample.r - ink * uInkDepth;",
    "state.palimpsest = { from, to, progress };",
    "gesturesTraceOctagram(ritualStrokes, sigil, width, height);",
  ].forEach((line, index) => context.fillText(line, 112, 620 + index * 18));
}

function damp(current: number, target: number, lambda: number, delta: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}

function clamp(minimum: number, value: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hash(value: number) {
  return Math.abs(Math.sin(value * 12.9898) * 43758.5453) % 1;
}
