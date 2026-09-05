export type MascotExpression = "neutral" | "happy" | "thinking" | "surprised" | "concerned" | "wink";
export type MascotActivity = "idle" | "thinking" | "speaking" | "error";
export type MascotMotion = "greeting" | "nod";

export interface MascotRendererOptions {
  modelUrl: string;
  scale?: number;
  position?: [number, number];
  onTap?: (area: string) => void;
  onError?: (error: Error) => void;
}

export interface MascotRenderer {
  readonly isMounted: boolean;
  mount(canvas: HTMLCanvasElement, options: MascotRendererOptions): Promise<void>;
  resize(): void;
  playReaction(): boolean;
  setMouthOpen(value: number): boolean;
  setPaused?(paused: boolean): void;
  setExpression?(expression: MascotExpression): void;
  setActivity?(activity: MascotActivity): void;
  playMotion?(motion: MascotMotion): boolean;
  dispose(): void;
}

export interface RigBounds { x0: number; x1: number; y0: number; y1: number }
export interface RigPoint { cx: number; cy: number }
export interface RigEye extends RigBounds { icx: number; icy: number; closeY: number }
export interface RigAnchors {
  face: RigBounds & RigPoint;
  mouth: RigBounds & RigPoint;
  eyeL: RigEye;
  eyeR: RigEye;
  neckPivot: RigPoint;
  bodyPivot: RigPoint;
  neckTop: number;
  neckBottom: number;
  faceScale: number;
}

export interface RigLayer {
  name: string;
  texture: string;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  group: "head" | "body";
  phys?: "hair" | null;
  side?: "L" | "R" | null;
  fade?: "eyeOpen" | "eyeClose" | "mouthOpen" | "mouthClose" | null;
  strands?: { x: number; rootY: number; tipY: number }[] | null;
}

export interface YouyouModel {
  format: "unikorn-rig";
  version: 1;
  name: string;
  canvas: { w: number; h: number };
  bounds: RigBounds;
  anchors: RigAnchors;
  layers: RigLayer[];
}

export interface RigPose {
  angleX: number;
  angleY: number;
  angleZ: number;
  eyeX: number;
  eyeY: number;
  eyeOpenL: number;
  eyeOpenR: number;
  irisScale: number;
  brow: number;
  browAngle: number;
  mouthOpen: number;
  mouthForm: number;
  body: number;
  armY: number;
  breath: number;
  breathHead: number;
}
