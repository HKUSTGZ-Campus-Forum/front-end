import type {
  MascotActivity, MascotExpression, MascotMotion, MascotRenderer, MascotRendererOptions,
  RigBounds, RigLayer, RigPose, YouyouModel,
} from "../types/mascot";
import {
  advanceSpring, clamp, createMesh, deformMesh, expressionPose, layerAlpha,
  neutralPose, type HairSpring,
} from "./mascot/rigMath";

interface Drawable {
  layer: RigLayer;
  base: Float32Array;
  current: Float32Array;
  position: WebGLBuffer;
  uv: WebGLBuffer;
  indices: WebGLBuffer;
  count: number;
  texture: WebGLTexture;
  springs: { stiff: HairSpring; soft: HairSpring }[];
}

export const YOUYOU_MODEL_URL = "/mascot/youyou/v1/youyou.model.json";

export function isYouyouModelUrl(url: string): boolean {
  return /\/youyou\.model\.json(?:[?#]|$)/i.test(url);
}

export function validateYouyouModel(value: unknown): asserts value is YouyouModel {
  const model = value as YouyouModel | null;
  const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  const fields = (value: unknown, keys: string[]) => value !== null && typeof value === "object" &&
    keys.every((key) => finite((value as Record<string, unknown>)[key]));
  const bounds = (value: unknown) => fields(value, ["x0", "x1", "y0", "y1"]) &&
    (value as RigBounds).x1 > (value as RigBounds).x0 &&
    (value as RigBounds).y1 > (value as RigBounds).y0;
  if (!model || model.format !== "unikorn-rig" || model.version !== 1 ||
      !model.canvas || !finite(model.canvas.w) || !finite(model.canvas.h) ||
      model.canvas.w <= 0 || model.canvas.h <= 0 || model.canvas.w > 4096 || model.canvas.h > 4096 ||
      !bounds(model.bounds) ||
      !model.anchors || !["face", "mouth"].every((key) => {
        const anchor = model.anchors[key as "face" | "mouth"];
        return bounds(anchor) && fields(anchor, ["cx", "cy"]);
      }) || !["eyeL", "eyeR"].every((key) => {
        const anchor = model.anchors[key as "eyeL" | "eyeR"];
        return bounds(anchor) && fields(anchor, ["icx", "icy", "closeY"]);
      }) || !fields(model.anchors.neckPivot, ["cx", "cy"]) || !fields(model.anchors.bodyPivot, ["cx", "cy"]) ||
      !finite(model.anchors.faceScale) || model.anchors.faceScale <= 0 ||
      !finite(model.anchors.neckTop) || !finite(model.anchors.neckBottom) ||
      !Array.isArray(model.layers) || !model.layers.length || model.layers.length > 80 ||
      !model.layers.every((layer) => layer && typeof layer.name === "string" &&
        typeof layer.texture === "string" && /^[a-z0-9_-]+\.webp$/.test(layer.texture) &&
        [layer.x, layer.y, layer.w, layer.h, layer.depth].every(finite) &&
        layer.w > 0 && layer.h > 0 && layer.w <= 4096 && layer.h <= 4096 &&
        ["head", "body"].includes(layer.group) &&
        [undefined, null, "L", "R"].includes(layer.side) &&
        [undefined, null, "hair"].includes(layer.phys) &&
        [undefined, null, "eyeOpen", "eyeClose", "mouthOpen", "mouthClose"].includes(layer.fade) &&
        (!layer.strands || (Array.isArray(layer.strands) && layer.strands.length <= 12 &&
          layer.strands.every((s) => [s.x, s.rootY, s.tipY].every(finite)))))) {
    throw new Error("Invalid original mascot model");
  }
}

export class YouyouMascotRenderer implements MascotRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private model: YouyouModel | null = null;
  private drawables: Drawable[] = [];
  private abort: AbortController | null = null;
  private generation = 0;
  private frame = 0;
  private lastTime = 0;
  private paused = false;
  private media: MediaQueryList | null = null;
  private options: MascotRendererOptions | null = null;
  private expression: MascotExpression = "neutral";
  private expressionUntil = 0;
  private activity: MascotActivity = "idle";
  private mouth = 0;
  private look = { x: 0, y: 0 };
  private pose = neutralPose();
  private nextBlink = 0;
  private blinkStart = -1;
  private reactionStart = -1;
  private reactionIndex = 0;
  private motion: MascotMotion = "greeting";
  private attributes: { position: number; uv: number } | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  get isMounted(): boolean { return this.model !== null && this.gl !== null; }
  get supportsLipSync(): boolean { return this.isMounted; }

  async mount(canvas: HTMLCanvasElement, options: MascotRendererOptions): Promise<void> {
    this.dispose();
    const generation = this.generation;
    const controller = new AbortController();
    this.abort = controller;
    this.canvas = canvas;
    this.options = options;
    const url = new URL(options.modelUrl, window.location.href);
    if (url.origin !== window.location.origin) throw new Error("Original mascot assets must be same-origin");
    const bitmaps: ImageBitmap[] = [];
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
      if (!response.ok) throw new Error(`Mascot model HTTP ${response.status}`);
      const model: unknown = await response.json();
      validateYouyouModel(model);
      const assets = await Promise.allSettled(model.layers.map(async (layer) => {
        try {
          const res = await fetch(new URL(layer.texture, url), { signal: controller.signal, credentials: "omit" });
          if (!res.ok) throw new Error(`Mascot texture HTTP ${res.status}`);
          const bitmap = await createImageBitmap(await res.blob(), { premultiplyAlpha: "none" });
          bitmaps.push(bitmap);
          if (bitmap.width !== layer.w || bitmap.height !== layer.h) throw new Error("Mascot texture dimensions mismatch");
          return bitmap;
        } catch (error) { controller.abort(); throw error; }
      }));
      const failed = assets.find((asset) => asset.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      if (generation !== this.generation) return;
      const gl = canvas.getContext("webgl", { alpha: true, stencil: true, antialias: true, premultipliedAlpha: true });
      if (!gl) throw new Error("WebGL is unavailable");
      this.gl = gl;
      this.model = model;
      this.initializeProgram(gl);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      model.layers.forEach((layer, index) => {
        const asset = assets[index]!;
        if (asset.status === "fulfilled") this.addDrawable(layer, asset.value);
      });
      this.media = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.media.addEventListener("change", this.handleMotionPreference);
      document.addEventListener("visibilitychange", this.handleVisibility);
      window.addEventListener("pointermove", this.handlePointer, { passive: true });
      window.addEventListener("blur", this.handleBlur);
      canvas.addEventListener("pointerup", this.handleTap);
      canvas.addEventListener("webglcontextlost", this.handleContextLost);
      this.nextBlink = performance.now() + 2200;
      this.resize();
      this.requestDraw();
    } catch (error) {
      if (generation === this.generation) this.dispose();
      throw error;
    } finally { bitmaps.forEach((bitmap) => bitmap.close()); }
  }

  private initializeProgram(gl: WebGLRenderingContext): void {
    const shaders: WebGLShader[] = [];
    const shader = (type: number, source: string) => {
      const value = gl.createShader(type);
      if (!value) throw new Error("Cannot allocate mascot shader");
      shaders.push(value);
      gl.shaderSource(value, source);
      gl.compileShader(value);
      if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value) || "Mascot shader failed");
      return value;
    };
    this.program = gl.createProgram();
    if (!this.program) throw new Error("Cannot allocate mascot program");
    try {
      gl.attachShader(this.program, shader(gl.VERTEX_SHADER,
        "attribute vec2 aPos; attribute vec2 aUV; uniform vec2 uViewport; uniform vec2 uCenter; uniform float uScale; varying vec2 vUV; void main(){ vUV=aUV; vec2 c=((aPos-uCenter)*uScale+uViewport*0.5)/uViewport*2.0-1.0; gl_Position=vec4(c.x,-c.y,0.0,1.0); }"));
      gl.attachShader(this.program, shader(gl.FRAGMENT_SHADER,
        "precision mediump float; varying vec2 vUV; uniform sampler2D uTex; uniform float uCut; uniform float uAlpha; void main(){ vec4 c=texture2D(uTex,vUV); if(c.a<uCut) discard; gl_FragColor=vec4(c.rgb*c.a,c.a)*uAlpha; }"));
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error("Mascot shader link failed");
      gl.useProgram(this.program);
      this.attributes = { position: gl.getAttribLocation(this.program, "aPos"), uv: gl.getAttribLocation(this.program, "aUV") };
      for (const name of ["uViewport", "uCenter", "uScale", "uCut", "uAlpha"]) this.uniforms[name] = gl.getUniformLocation(this.program, name);
    } finally { shaders.forEach((value) => gl.deleteShader(value)); }
  }

  private addDrawable(layer: RigLayer, bitmap: ImageBitmap): void {
    const gl = this.gl!;
    const mesh = createMesh(layer, this.model!.canvas.w);
    const position = gl.createBuffer(), uv = gl.createBuffer(), indices = gl.createBuffer(), texture = gl.createTexture();
    if (!position || !uv || !indices || !texture) {
      gl.deleteBuffer(position); gl.deleteBuffer(uv); gl.deleteBuffer(indices); gl.deleteTexture(texture);
      throw new Error("Cannot allocate mascot mesh");
    }
    const drawable: Drawable = {
      layer, base: mesh.base, current: new Float32Array(mesh.base), position, uv, indices,
      count: mesh.indices.length, texture,
      springs: (layer.strands || []).map(() => ({ stiff: { x: 0, v: 0, dx: 0 }, soft: { x: 0, v: 0, dx: 0 } })),
    };
    this.drawables.push(drawable);
    gl.bindBuffer(gl.ARRAY_BUFFER, uv);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uv, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // ImageBitmap decoding is unpremultiplied; the fragment shader premultiplies once.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    for (const filter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, filter, gl.LINEAR);
    for (const wrap of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, wrap, gl.CLAMP_TO_EDGE);
  }

  resize(): void {
    if (!this.canvas || !this.gl) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    this.requestDraw();
  }

  lookAt(x: number, y: number): void {
    this.look = { x: clamp(x), y: clamp(y) };
    this.requestDraw();
  }
  setExpression(expression: MascotExpression): void {
    this.expression = expression;
    this.expressionUntil = 0;
    this.requestDraw();
  }
  setActivity(activity: MascotActivity): void {
    this.activity = activity;
    this.setExpression(activity === "thinking" ? "thinking" : activity === "error" ? "concerned" : "neutral");
    if (activity === "error") this.expressionUntil = performance.now() + 4500;
  }
  setMouthOpen(value: number): boolean {
    this.mouth = clamp(value, 0, 1);
    this.requestDraw();
    return this.isMounted;
  }
  playReaction(): boolean {
    if (!this.isMounted) return false;
    this.setExpression(this.reactionIndex++ % 2 ? "wink" : "happy");
    this.playMotion("greeting");
    this.expressionUntil = this.reactionStart + 2200;
    return true;
  }
  playMotion(motion: MascotMotion): boolean {
    if (!this.isMounted) return false;
    this.motion = motion;
    this.reactionStart = performance.now();
    this.requestDraw();
    return true;
  }
  setPaused(paused: boolean): void {
    this.paused = paused;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastTime = 0;
    if (!paused) this.requestDraw();
  }

  private handleVisibility = (): void => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastTime = 0;
    if (!document.hidden) this.requestDraw();
  };
  private handleMotionPreference = (): void => { this.handleVisibility(); };
  private handlePointer = (event: PointerEvent): void => {
    if (this.paused || event.pointerType === "touch" || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.lookAt((event.clientX - rect.left - rect.width / 2) / Math.max(280, window.innerWidth * 0.42),
      (event.clientY - rect.top - rect.height * 0.22) / Math.max(220, window.innerHeight * 0.4));
  };
  private handleBlur = (): void => { this.lookAt(0, 0); };
  private handleTap = (event: PointerEvent): void => {
    if (event.button === 0 && !this.paused) this.options?.onTap?.("body");
  };
  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.setPaused(true);
    this.options?.onError?.(new Error("Mascot graphics context lost"));
  };

  private requestDraw(): void {
    if (this.frame || !this.isMounted || this.paused || document.hidden) return;
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number): void => {
    this.frame = 0;
    if (!this.isMounted || this.paused || document.hidden) return;
    const reduced = Boolean(this.media?.matches);
    if (!reduced && this.lastTime && now - this.lastTime < 1000 / 30) { this.requestDraw(); return; }
    const dt = Math.min(1 / 30, this.lastTime ? (now - this.lastTime) / 1000 : 1 / 30);
    this.lastTime = now;
    if (this.expressionUntil && now >= this.expressionUntil) {
      this.expression = this.activity === "thinking" ? "thinking" : "neutral";
      this.expressionUntil = 0;
    }
    const target = { ...neutralPose(), ...expressionPose(this.expression) };
    target.eyeX = this.look.x;
    target.eyeY += this.look.y * 0.8;
    target.mouthOpen = Math.max(target.mouthOpen, this.mouth);
    if (!reduced) {
      const t = now / 1000;
      target.angleX += this.look.x * 0.8 + 0.06 * Math.sin(t * 0.43);
      target.angleY -= this.look.y * 0.45;
      target.angleZ += 0.045 * Math.sin(t * 0.35);
      target.body = 0.075 * Math.sin(t * 0.36);
      target.breath = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 3.8);
      target.breathHead = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 3.8 - 0.6);
      if (this.reactionStart >= 0) {
        const age = (now - this.reactionStart) / 1000;
        if (age < 1.5) {
          if (this.motion === "greeting") target.armY = Math.sin(age / 1.5 * Math.PI) * 0.7;
          target.angleY += Math.sin(age * 6) * 0.18;
        }
        else this.reactionStart = -1;
      }
      if (now >= this.nextBlink && this.blinkStart < 0) {
        this.blinkStart = now; this.nextBlink = now + 2800 + Math.random() * 3000;
      }
      if (this.blinkStart >= 0) {
        const age = now - this.blinkStart;
        const open = age < 65 ? 1 - age / 65 : age < 105 ? 0 : Math.min(1, (age - 105) / 110);
        target.eyeOpenL = Math.min(target.eyeOpenL, open);
        target.eyeOpenR = Math.min(target.eyeOpenR, open);
        if (age >= 215) this.blinkStart = -1;
      }
    }
    for (const key of Object.keys(target) as (keyof RigPose)[]) {
      const speed = key === "eyeOpenL" || key === "eyeOpenR" ? 34 : 13;
      this.pose[key] += (target[key] - this.pose[key]) * (reduced ? 1 : Math.min(1, dt * speed));
    }
    this.draw(dt, now, reduced);
    if (!reduced) this.requestDraw();
  };

  private draw(dt: number, now: number, reduced: boolean): void {
    const gl = this.gl!, canvas = this.canvas!, model = this.model!, a = model.anchors;
    gl.useProgram(this.program);
    gl.enableVertexAttribArray(this.attributes!.position);
    gl.enableVertexAttribArray(this.attributes!.uv);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.uniform2f(this.uniforms.uViewport!, canvas.width, canvas.height);
    gl.uniform2f(this.uniforms.uCenter!, (model.bounds.x0 + model.bounds.x1) / 2, (model.bounds.y0 + model.bounds.y1) / 2);
    gl.uniform1f(this.uniforms.uScale!, Math.min(canvas.width / (model.bounds.x1 - model.bounds.x0), canvas.height / (model.bounds.y1 - model.bounds.y0)) * 0.94);
    const head = (this.pose.angleX * 14 + this.pose.angleZ * 0.07 * (a.neckPivot.cy - a.face.cy)) * a.faceScale;
    for (const drawable of this.drawables) {
      const layer = drawable.layer;
      const offsets = drawable.springs.map((spring, i) => {
        if (reduced) return 0;
        const wind = Math.sin(now / 1000 * 0.8 + i * 1.37) * a.faceScale;
        advanceSpring(spring.stiff, head + wind, dt, false);
        advanceSpring(spring.soft, head + wind, dt, true);
        return (spring.stiff.dx * 0.75 + spring.soft.dx * 0.25) * 0.8;
      });
      const alpha = layerAlpha(layer, this.pose);
      const mask = layer.name.startsWith("eyewhite");
      if (alpha < 0.004 && !mask) continue;
      deformMesh(layer, drawable.base, drawable.current, a, this.pose, offsets);
      gl.uniform1f(this.uniforms.uAlpha!, alpha);
      gl.uniform1f(this.uniforms.uCut!, mask ? 0.25 : 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, drawable.position);
      gl.bufferData(gl.ARRAY_BUFFER, drawable.current, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(this.attributes!.position, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, drawable.uv);
      gl.vertexAttribPointer(this.attributes!.uv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawable.indices);
      gl.bindTexture(gl.TEXTURE_2D, drawable.texture);
      if (mask) {
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.ALWAYS, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      } else if (layer.name.startsWith("irides")) {
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.EQUAL, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      }
      gl.drawElements(gl.TRIANGLES, drawable.count, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.STENCIL_TEST);
    }
  }

  dispose(): void {
    this.generation++;
    this.abort?.abort(); this.abort = null;
    cancelAnimationFrame(this.frame); this.frame = 0;
    this.media?.removeEventListener("change", this.handleMotionPreference); this.media = null;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.handleVisibility);
    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", this.handlePointer);
      window.removeEventListener("blur", this.handleBlur);
    }
    this.canvas?.removeEventListener("pointerup", this.handleTap);
    this.canvas?.removeEventListener("webglcontextlost", this.handleContextLost);
    if (this.gl) {
      for (const drawable of this.drawables) {
        this.gl.deleteTexture(drawable.texture);
        this.gl.deleteBuffer(drawable.position); this.gl.deleteBuffer(drawable.uv); this.gl.deleteBuffer(drawable.indices);
      }
      this.gl.deleteProgram(this.program);
    }
    this.drawables = []; this.gl = null; this.program = null; this.model = null;
    this.canvas = null; this.options = null; this.attributes = null; this.uniforms = {};
    this.lastTime = 0; this.pose = neutralPose(); this.look = { x: 0, y: 0 };
    this.expression = "neutral"; this.activity = "idle"; this.expressionUntil = 0;
    this.mouth = 0; this.blinkStart = -1; this.reactionStart = -1;
    this.paused = false;
  }
}
