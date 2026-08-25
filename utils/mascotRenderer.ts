export type MascotRendererKind = "live2d" | "three";

export interface MascotRendererOptions {
  modelUrl: string;
  position?: [x: number, y: number];
  scale?: number;
  volume?: number;
  onTap?: (areaName: string) => void;
}

export interface MascotRenderer {
  readonly isMounted: boolean;
  readonly supportsLipSync: boolean;
  mount(
    canvas: HTMLCanvasElement,
    options: MascotRendererOptions
  ): Promise<void>;
  resize(): void;
  playReaction(random?: () => number): boolean;
  setMouthOpen(value: number): boolean;
  dispose(): void;
}

export function normalizeMascotRendererKind(
  value: unknown
): MascotRendererKind {
  return String(value).toLowerCase() === "three" ? "three" : "live2d";
}
