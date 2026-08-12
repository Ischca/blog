import { useEffect, useRef } from "react";

export type CosmosStatus = {
  backend: "WebGPU" | "WebGL2" | "Canvas 2D" | "initializing";
  particles: number;
  fps: number;
  pipeline: string;
};

type CosmosFieldProps = {
  active: number;
  headline: [string, string];
  careerCount: number;
  productCount: number;
  onStatus: (status: CosmosStatus) => void;
};

type PointerState = { x: number; y: number; active: boolean; pressed: boolean; pulse: number };
type CosmosEngine = { destroy: () => void; updateTargets: (active: number) => void };

const palette = [
  [0.49, 0.62, 1],
  [0.71, 0.56, 1],
  [0.41, 0.88, 0.86],
  [0.56, 0.69, 1],
  [0.75, 0.84, 1],
];

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function textPoints(headline: [string, string]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200; canvas.height = 620;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [] as Array<[number, number]>;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fff";
  context.textAlign = "center"; context.textBaseline = "middle";
  context.font = '500 104px Inter, -apple-system, BlinkMacSystemFont, "Noto Sans JP", sans-serif';
  context.fillText(headline[0], 600, 255, 1040);
  context.fillText(headline[1], 600, 385, 1040);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const points: Array<[number, number]> = [];
  for (let y = 80; y < canvas.height - 80; y += 4) {
    for (let x = 50; x < canvas.width - 50; x += 4) {
      if (pixels[(y * canvas.width + x) * 4 + 3] > 90) points.push([x / canvas.width, y / canvas.height]);
    }
  }
  return points;
}

function targetsFor(active: number, count: number, headline: [string, string], careerCount: number, productCount: number) {
  const output = new Float32Array(count * 2);
  const rng = random(9701 + active * 131);
  const text = active === 0 ? textPoints(headline) : [];
  const gaussian = () => Math.sqrt(-2 * Math.log(Math.max(0.0001, rng()))) * Math.cos(Math.PI * 2 * rng());
  for (let index = 0; index < count; index += 1) {
    let x = rng(); let y = rng();
    if (active === 0 && text.length) {
      const point = text[(index * 7919) % text.length];
      x = 0.09 + point[0] * 0.82 + gaussian() * 0.00055;
      y = 0.16 + point[1] * 0.68 + gaussian() * 0.00055;
    } else if (active === 1) {
      const sides = 6; const shape = index % 4; const angle = rng() * Math.PI * 2;
      const segment = Math.floor(angle / (Math.PI * 2 / sides)); const local = (angle - segment * Math.PI * 2 / sides) / (Math.PI * 2 / sides);
      const a = segment * Math.PI * 2 / sides; const b = (segment + 1) * Math.PI * 2 / sides;
      const radius = 0.12 + shape * 0.065;
      x = 0.5 + (Math.cos(a) * (1 - local) + Math.cos(b) * local) * radius * 1.7 + gaussian() * 0.0009;
      y = 0.5 + (Math.sin(a) * (1 - local) + Math.sin(b) * local) * radius + gaussian() * 0.0009;
    } else if (active === 2) {
      const systemCount = Math.max(3, careerCount);
      const orbit = index % systemCount; const angle = rng() * Math.PI * 2;
      const radius = 0.075 + orbit * 0.055;
      if (index % 12 === 0) {
        const anchor = orbit / systemCount * Math.PI * 2 - Math.PI / 2;
        x = 0.5 + Math.cos(anchor) * radius * 1.55 + gaussian() * 0.003;
        y = 0.5 + Math.sin(anchor) * radius + gaussian() * 0.003;
      } else {
        x = 0.5 + Math.cos(angle) * radius * 1.55 + gaussian() * 0.00075;
        y = 0.5 + Math.sin(angle) * radius + gaussian() * 0.00075;
      }
    } else if (active === 3) {
      const planet = index % Math.max(2, productCount); const angle = rng() * Math.PI * 2;
      const centerX = planet % 2 === 0 ? 0.35 : 0.68; const centerY = planet % 2 === 0 ? 0.46 : 0.55;
      if (index % 5 === 0) {
        const radius = 0.105 + rng() * 0.02;
        x = centerX + Math.cos(angle) * radius * 1.7; y = centerY + Math.sin(angle) * radius * 0.42;
      } else {
        const radius = Math.sqrt(rng()) * 0.075;
        x = centerX + Math.cos(angle) * radius; y = centerY + Math.sin(angle) * radius;
      }
    } else {
      const angle = index * 0.19 + rng() * 0.4; const radius = 0.005 + (index / count) * 0.36;
      x = 0.5 + Math.cos(angle) * radius * 1.55 + gaussian() * 0.0005;
      y = 0.5 + Math.sin(angle) * radius + gaussian() * 0.0005;
    }
    output[index * 2] = Math.max(0.015, Math.min(0.985, x));
    output[index * 2 + 1] = Math.max(0.015, Math.min(0.985, y));
  }
  return output;
}

function attachPointer(field: HTMLElement, canvas: HTMLCanvasElement, pointer: PointerState) {
  const locate = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / Math.max(1, rect.width);
    pointer.y = (event.clientY - rect.top) / Math.max(1, rect.height);
    pointer.active = pointer.x >= 0 && pointer.x <= 1 && pointer.y >= 0 && pointer.y <= 1;
  };
  const move = (event: PointerEvent) => locate(event);
  const down = (event: PointerEvent) => { locate(event); pointer.pressed = true; pointer.pulse = 1; };
  const up = () => { pointer.pressed = false; };
  const leave = () => { pointer.active = false; pointer.pressed = false; };
  field.addEventListener("pointermove", move); field.addEventListener("pointerdown", down); field.addEventListener("pointerup", up); field.addEventListener("pointerleave", leave);
  return () => { field.removeEventListener("pointermove", move); field.removeEventListener("pointerdown", down); field.removeEventListener("pointerup", up); field.removeEventListener("pointerleave", leave); };
}

async function createWebGPU(canvas: HTMLCanvasElement, pointer: PointerState, initialActive: number, headline: [string, string], careerCount: number, productCount: number, onStatus: CosmosFieldProps["onStatus"]): Promise<CosmosEngine> {
  const gpu = (navigator as Navigator & { gpu?: any }).gpu;
  if (!gpu) throw new Error("WebGPU unavailable");
  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("WebGPU adapter unavailable");
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu") as any;
  if (!context) throw new Error("WebGPU context unavailable");
  const usage = (globalThis as any).GPUBufferUsage; const stage = (globalThis as any).GPUShaderStage;
  if (!usage || !stage) throw new Error("WebGPU constants unavailable");
  const count = 100_000; let active = initialActive; let stopped = false; let animation = 0;
  const state = new Float32Array(count * 4); const initialTargets = targetsFor(initialActive, count, headline, careerCount, productCount);
  for (let index = 0; index < count; index += 1) { state[index * 4] = initialTargets[index * 2]; state[index * 4 + 1] = initialTargets[index * 2 + 1]; }
  const particles = device.createBuffer({ size: state.byteLength, usage: usage.STORAGE | usage.COPY_DST });
  const targets = device.createBuffer({ size: count * 8, usage: usage.STORAGE | usage.COPY_DST });
  const uniforms = device.createBuffer({ size: 48, usage: usage.UNIFORM | usage.COPY_DST });
  device.queue.writeBuffer(particles, 0, state);
  const updateTargets = (next: number) => { active = next; device.queue.writeBuffer(targets, 0, targetsFor(next, count, headline, careerCount, productCount)); };
  updateTargets(active);

  const computeModule = device.createShaderModule({ code: `
    struct Particle { position: vec2f, velocity: vec2f }
    struct Params { pointer: vec4f, config: vec4f, color: vec4f }
    @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
    @group(0) @binding(1) var<storage, read> targets: array<vec2f>;
    @group(0) @binding(2) var<uniform> params: Params;
    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) id: vec3u) {
      if (id.x >= ${count}u) { return; }
      var particle = particles[id.x];
      let destination = targets[id.x];
      let step = params.config.z;
      let targetDelta = destination - particle.position;
      let targetDistance = length(targetDelta);
      let spring = mix(0.00032, 0.00078, smoothstep(0.0, 0.22, targetDistance));
      var velocity = particle.velocity + targetDelta * spring * step;
      let pointerDelta = params.pointer.xy - particle.position;
      let corrected = vec2f(pointerDelta.x * params.config.x, pointerDelta.y);
      let distance = max(length(corrected), 0.012);
      let influence = exp(-distance * 6.2) * params.pointer.z;
      velocity += normalize(pointerDelta + vec2f(0.00001)) * influence * 0.00052 * step;
      velocity += vec2f(-pointerDelta.y, pointerDelta.x) * influence * 0.000025 * step;
      let noise = fract(sin(f32(id.x) * 12.9898 + params.config.y * 0.05) * 43758.5453) - 0.5;
      velocity += vec2f(noise, -noise) * min(targetDistance * 5.0, 1.0) * 0.0000012 * step;
      velocity *= pow(0.946, step);
      particle.position += velocity * step;
      particle.velocity = velocity;
      particles[id.x] = particle;
    }
  ` });
  const renderModule = device.createShaderModule({ code: `
    struct Particle { position: vec2f, velocity: vec2f }
    struct Params { pointer: vec4f, config: vec4f, color: vec4f }
    @group(0) @binding(0) var<storage, read> particles: array<Particle>;
    @group(0) @binding(2) var<uniform> params: Params;
    struct Output { @builtin(position) position: vec4f, @location(0) uv: vec2f, @location(1) intensity: f32 }
    @vertex fn vertexMain(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> Output {
      let corners = array<vec2f, 6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
      let corner = corners[vertex]; let particle = particles[instance];
      let clip = vec2f(particle.position.x * 2.0 - 1.0, 1.0 - particle.position.y * 2.0);
      var output: Output; output.position = vec4f(clip + corner * params.config.w * vec2f(1.0 / params.config.x, 1.0), 0, 1);
      output.uv = corner;
      let randomValue = fract(sin(f32(instance) * 91.17) * 12415.13);
      output.intensity = select(0.22 + randomValue * 0.20, 0.60, randomValue > 0.992); return output;
    }
    @fragment fn fragmentMain(input: Output) -> @location(0) vec4f {
      let distance = length(input.uv); if (distance > 1.0) { discard; }
      let alpha = (1.0 - smoothstep(0.08, 1.0, distance)) * input.intensity * 0.48;
      return vec4f(params.color.rgb, alpha);
    }
  ` });
  const computeLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: stage.COMPUTE, buffer: { type: "storage" } },
    { binding: 1, visibility: stage.COMPUTE, buffer: { type: "read-only-storage" } },
    { binding: 2, visibility: stage.COMPUTE, buffer: { type: "uniform" } },
  ] });
  const renderLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: stage.VERTEX, buffer: { type: "read-only-storage" } },
    { binding: 2, visibility: stage.VERTEX | stage.FRAGMENT, buffer: { type: "uniform" } },
  ] });
  const computePipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }), compute: { module: computeModule, entryPoint: "main" } });
  const format = gpu.getPreferredCanvasFormat();
  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
    vertex: { module: renderModule, entryPoint: "vertexMain" }, fragment: { module: renderModule, entryPoint: "fragmentMain", targets: [{ format, blend: { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" } } }] },
    primitive: { topology: "triangle-list" },
  });
  const computeGroup = device.createBindGroup({ layout: computeLayout, entries: [{ binding: 0, resource: { buffer: particles } }, { binding: 1, resource: { buffer: targets } }, { binding: 2, resource: { buffer: uniforms } }] });
  const renderGroup = device.createBindGroup({ layout: renderLayout, entries: [{ binding: 0, resource: { buffer: particles } }, { binding: 2, resource: { buffer: uniforms } }] });
  context.configure({ device, format, alphaMode: "premultiplied" });
  const resize = () => { const rect = canvas.getBoundingClientRect(); const ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.max(1, Math.round(rect.width * ratio)); canvas.height = Math.max(1, Math.round(rect.height * ratio)); };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  let previous = performance.now(); let frames = 0; let lastStatus = previous;
  const draw = (now: number) => {
    if (stopped) return; const delta = Math.min(40, now - previous); previous = now; frames += 1;
    pointer.pulse = Math.max(0, pointer.pulse - delta * 0.0018);
    const force = pointer.active ? (pointer.pressed ? -1.35 : 0.46 + pointer.pulse * 1.15) : 0;
    const color = palette[active] ?? palette[0];
    const step = Math.max(0.45, Math.min(1.5, delta / 16.667));
    const data = new Float32Array([pointer.x, pointer.y, force, pointer.pulse, canvas.width / Math.max(1, canvas.height), now * 0.001, step, 1.65 / Math.max(1, canvas.height), color[0], color[1], color[2], 1]);
    device.queue.writeBuffer(uniforms, 0, data);
    const encoder = device.createCommandEncoder(); const compute = encoder.beginComputePass(); compute.setPipeline(computePipeline); compute.setBindGroup(0, computeGroup); compute.dispatchWorkgroups(Math.ceil(count / 256)); compute.end();
    const render = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" }] });
    render.setPipeline(renderPipeline); render.setBindGroup(0, renderGroup); render.draw(6, count); render.end(); device.queue.submit([encoder.finish()]);
    if (now - lastStatus > 650) { onStatus({ backend: "WebGPU", particles: count, fps: Math.round(frames * 1000 / (now - lastStatus)), pipeline: "compute + instanced quads" }); frames = 0; lastStatus = now; }
    animation = requestAnimationFrame(draw);
  };
  animation = requestAnimationFrame(draw);
  return { updateTargets, destroy: () => { stopped = true; cancelAnimationFrame(animation); observer.disconnect(); particles.destroy(); targets.destroy(); uniforms.destroy(); device.destroy?.(); } };
}

function shader(gl: WebGL2RenderingContext, type: number, source: string) {
  const item = gl.createShader(type); if (!item) throw new Error("Shader allocation failed");
  gl.shaderSource(item, source); gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(item) ?? "Shader compile failed");
  return item;
}

function program(gl: WebGL2RenderingContext, vertex: string, fragment: string, transformFeedback?: string[]) {
  const item = gl.createProgram(); if (!item) throw new Error("Program allocation failed");
  gl.attachShader(item, shader(gl, gl.VERTEX_SHADER, vertex)); gl.attachShader(item, shader(gl, gl.FRAGMENT_SHADER, fragment));
  if (transformFeedback) gl.transformFeedbackVaryings(item, transformFeedback, gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(item); if (!gl.getProgramParameter(item, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(item) ?? "Program link failed"); return item;
}

function createWebGL2(canvas: HTMLCanvasElement, pointer: PointerState, initialActive: number, headline: [string, string], careerCount: number, productCount: number, onStatus: CosmosFieldProps["onStatus"]): CosmosEngine {
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, powerPreference: "high-performance" });
  if (!gl) throw new Error("WebGL2 unavailable");
  const count = 48_000; let active = initialActive; let stopped = false; let animation = 0; let sourceIndex = 0;
  const state = new Float32Array(count * 4); const initialTargets = targetsFor(initialActive, count, headline, careerCount, productCount);
  for (let index = 0; index < count; index += 1) { state[index * 4] = initialTargets[index * 2]; state[index * 4 + 1] = initialTargets[index * 2 + 1]; }
  const stateBuffers = [gl.createBuffer(), gl.createBuffer()]; const targetBuffer = gl.createBuffer();
  if (!stateBuffers[0] || !stateBuffers[1] || !targetBuffer) throw new Error("WebGL buffer allocation failed");
  stateBuffers.forEach((buffer) => { gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, state, gl.DYNAMIC_COPY); });
  gl.bindBuffer(gl.ARRAY_BUFFER, targetBuffer); gl.bufferData(gl.ARRAY_BUFFER, targetsFor(active, count, headline, careerCount, productCount), gl.DYNAMIC_DRAW);
  const updateProgram = program(gl, `#version 300 es
    precision highp float; layout(location=0) in vec2 a_position; layout(location=1) in vec2 a_velocity; layout(location=2) in vec2 a_target;
    uniform vec4 u_pointer; uniform vec3 u_config; out vec2 v_position; out vec2 v_velocity;
    void main(){ float step=u_config.z; vec2 targetDelta=a_target-a_position; float targetDistance=length(targetDelta); float spring=mix(.00032,.00078,smoothstep(0.0,.22,targetDistance)); vec2 velocity=a_velocity+targetDelta*spring*step; vec2 delta=u_pointer.xy-a_position; vec2 corrected=vec2(delta.x*u_config.x,delta.y); float distance=max(length(corrected),.012); float influence=exp(-distance*6.2)*u_pointer.z; velocity+=normalize(delta+vec2(.00001))*influence*.00052*step; velocity+=vec2(-delta.y,delta.x)*influence*.000025*step; float noise=fract(sin(float(gl_VertexID)*12.9898+u_config.y*.05)*43758.5453)-.5; velocity+=vec2(noise,-noise)*min(targetDistance*5.0,1.0)*.0000012*step; velocity*=pow(.946,step); v_position=a_position+velocity*step; v_velocity=velocity; }
  `, `#version 300 es
    precision mediump float; out vec4 color; void main(){color=vec4(0.0);}
  `, ["v_position", "v_velocity"]);
  const renderProgram = program(gl, `#version 300 es
    precision highp float; layout(location=0) in vec2 a_position; uniform float u_size; out float v_intensity;
    void main(){gl_Position=vec4(a_position.x*2.0-1.0,1.0-a_position.y*2.0,0,1);gl_PointSize=u_size;float randomValue=fract(sin(float(gl_VertexID)*91.17)*12415.13);v_intensity=randomValue>.992?.60:.22+randomValue*.20;}
  `, `#version 300 es
    precision highp float; in float v_intensity; uniform vec3 u_color; out vec4 color;
    void main(){float d=length(gl_PointCoord-.5)*2.0;if(d>1.0)discard;float alpha=(1.0-smoothstep(.08,1.0,d))*v_intensity*.48;color=vec4(u_color,alpha);}
  `);
  const vaos = stateBuffers.map((buffer) => {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.bindBuffer(gl.ARRAY_BUFFER, targetBuffer); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8, 0); return vao;
  });
  const updateTargets = (next: number) => { active = next; gl.bindBuffer(gl.ARRAY_BUFFER, targetBuffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, targetsFor(next, count, headline, careerCount, productCount)); };
  const resize = () => { const rect = canvas.getBoundingClientRect(); const ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.max(1, Math.round(rect.width * ratio)); canvas.height = Math.max(1, Math.round(rect.height * ratio)); gl.viewport(0, 0, canvas.width, canvas.height); };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  let previous = performance.now(); let frames = 0; let lastStatus = previous;
  const draw = (now: number) => {
    if (stopped) return; const delta = Math.min(40, now - previous); previous = now; frames += 1; pointer.pulse = Math.max(0, pointer.pulse - delta * .0018);
    const force = pointer.active ? (pointer.pressed ? -1.35 : .46 + pointer.pulse * 1.15) : 0; const destinationIndex = 1 - sourceIndex; const step = Math.max(.45, Math.min(1.5, delta / 16.667));
    gl.useProgram(updateProgram); gl.uniform4f(gl.getUniformLocation(updateProgram, "u_pointer"), pointer.x, pointer.y, force, pointer.pulse); gl.uniform3f(gl.getUniformLocation(updateProgram, "u_config"), canvas.width / Math.max(1, canvas.height), now * .001, step);
    gl.bindVertexArray(vaos[sourceIndex]); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, stateBuffers[destinationIndex]); gl.enable(gl.RASTERIZER_DISCARD); gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, count); gl.endTransformFeedback(); gl.disable(gl.RASTERIZER_DISCARD); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(renderProgram); const color = palette[active] ?? palette[0]; gl.uniform3f(gl.getUniformLocation(renderProgram, "u_color"), color[0], color[1], color[2]); gl.uniform1f(gl.getUniformLocation(renderProgram, "u_size"), Math.min(2.2, devicePixelRatio * 1.1)); gl.bindVertexArray(vaos[destinationIndex]); gl.drawArrays(gl.POINTS, 0, count);
    sourceIndex = destinationIndex;
    if (now - lastStatus > 650) { onStatus({ backend: "WebGL2", particles: count, fps: Math.round(frames * 1000 / (now - lastStatus)), pipeline: "transform feedback" }); frames = 0; lastStatus = now; }
    animation = requestAnimationFrame(draw);
  };
  animation = requestAnimationFrame(draw);
  return { updateTargets, destroy: () => { stopped = true; cancelAnimationFrame(animation); observer.disconnect(); vaos.forEach((vao) => gl.deleteVertexArray(vao)); stateBuffers.forEach((buffer) => gl.deleteBuffer(buffer)); gl.deleteBuffer(targetBuffer); gl.deleteProgram(updateProgram); gl.deleteProgram(renderProgram); } };
}

function createCanvas2D(canvas: HTMLCanvasElement, pointer: PointerState, initialActive: number, headline: [string, string], careerCount: number, productCount: number, onStatus: CosmosFieldProps["onStatus"]): CosmosEngine {
  const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas unavailable");
  const count = 720; let active = initialActive; let stopped = false; let animation = 0; let targets = targetsFor(active, count, headline, careerCount, productCount);
  const particles = Array.from({ length: count }, (_, index) => ({ x: targets[index * 2], y: targets[index * 2 + 1], vx: 0, vy: 0 }));
  const updateTargets = (next: number) => { active = next; targets = targetsFor(next, count, headline, careerCount, productCount); };
  const resize = () => { const rect = canvas.getBoundingClientRect(); const ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.max(1, Math.round(rect.width * ratio)); canvas.height = Math.max(1, Math.round(rect.height * ratio)); context.setTransform(ratio, 0, 0, ratio, 0, 0); };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize(); let frames = 0; let lastStatus = performance.now();
  let previous = performance.now();
  const draw = (now: number) => { if (stopped) return; const width = canvas.clientWidth; const height = canvas.clientHeight; const step = Math.max(.45, Math.min(1.5, (now - previous) / 16.667)); previous = now; context.clearRect(0, 0, width, height); const color = palette[active] ?? palette[0]; context.fillStyle = `rgb(${color.map((value) => Math.round(value * 255)).join(",")})`;
    particles.forEach((particle, index) => { const tx = targets[index * 2] - particle.x; const ty = targets[index * 2 + 1] - particle.y; const targetDistance = Math.hypot(tx, ty); const spring = .0022 + Math.min(1, targetDistance / .22) * .0036; let vx = particle.vx + tx * spring * step; let vy = particle.vy + ty * spring * step; const dx = pointer.x - particle.x; const dy = pointer.y - particle.y; const distance = Math.max(.015, Math.hypot(dx, dy)); if (pointer.active) { const force = (pointer.pressed ? -1 : 1) * Math.exp(-distance * 6) * .0012 * step; vx += dx / distance * force; vy += dy / distance * force; } const damping = Math.pow(.88, step); vx *= damping; vy *= damping; particle.vx = vx; particle.vy = vy; particle.x += vx * step; particle.y += vy * step; context.globalAlpha = .07 + index % 7 * .014; context.fillRect(particle.x * width, particle.y * height, 1.1, 1.1); }); context.globalAlpha = 1; frames += 1; if (now - lastStatus > 650) { onStatus({ backend: "Canvas 2D", particles: count, fps: Math.round(frames * 1000 / (now - lastStatus)), pipeline: "CPU fallback" }); frames = 0; lastStatus = now; } animation = requestAnimationFrame(draw); };
  animation = requestAnimationFrame(draw); return { updateTargets, destroy: () => { stopped = true; cancelAnimationFrame(animation); observer.disconnect(); } };
}

export function CosmosField({ active, headline, careerCount, productCount, onStatus }: CosmosFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const engineRef = useRef<CosmosEngine | null>(null); const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => { engineRef.current?.updateTargets(active); }, [active]);
  useEffect(() => {
    const canvas = canvasRef.current; const field = canvas?.parentElement; if (!canvas || !field) return;
    let cancelled = false; const pointer: PointerState = { x: .5, y: .5, active: false, pressed: false, pulse: 0 }; const detach = attachPointer(field, canvas, pointer);
    onStatus({ backend: "initializing", particles: 0, fps: 0, pipeline: "selecting renderer" });
    const start = async () => {
      let engine: CosmosEngine;
      try { engine = await createWebGPU(canvas, pointer, activeRef.current, headline, careerCount, productCount, onStatus); }
      catch {
        try { engine = createWebGL2(canvas, pointer, activeRef.current, headline, careerCount, productCount, onStatus); }
        catch { engine = createCanvas2D(canvas, pointer, activeRef.current, headline, careerCount, productCount, onStatus); }
      }
      if (cancelled) engine.destroy(); else { engineRef.current = engine; engine.updateTargets(activeRef.current); }
    };
    void start();
    return () => { cancelled = true; detach(); engineRef.current?.destroy(); engineRef.current = null; };
  }, [careerCount, headline, onStatus, productCount]);
  return <canvas ref={canvasRef} className="flux-canvas" aria-hidden="true" />;
}
