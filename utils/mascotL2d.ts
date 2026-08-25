import type { L2D, ParamInfo } from "l2d/dist/index.js";

const MOUTH_PARAMETER_IDS = ["ParamMouthOpenY", "PARAM_MOUTH_OPEN_Y"] as const;

export interface L2dMascotRendererOptions {
  modelUrl: string;
  position?: [x: number, y: number];
  scale?: number;
  volume?: number;
  onTap?: (areaName: string) => void;
}

export function normalizeMouthOpenValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function resolveMouthParameterId(
  parameters: readonly Pick<ParamInfo, "id">[]
): string | null {
  const ids = new Set(parameters.map((parameter) => parameter.id));
  return MOUTH_PARAMETER_IDS.find((id) => ids.has(id)) ?? null;
}

export function pickMotionGroup(
  motions: Readonly<Record<string, readonly string[]>>,
  random: () => number = Math.random
): string | null {
  const reactiveGroups = Object.entries(motions)
    .filter(([group, files]) => group.toLowerCase() !== "idle" && files.length > 0)
    .map(([group]) => group);
  const groups = reactiveGroups.length
    ? reactiveGroups
    : Object.entries(motions)
        .filter(([, files]) => files.length > 0)
        .map(([group]) => group);

  if (!groups.length) return null;
  const index = Math.min(groups.length - 1, Math.floor(random() * groups.length));
  return groups[index] ?? null;
}

export class L2dMascotRenderer {
  private instance: L2D | null = null;
  private mouthParameterId: string | null = null;

  get isMounted(): boolean {
    return this.instance !== null;
  }

  get supportsLipSync(): boolean {
    return this.mouthParameterId !== null;
  }

  async mount(
    canvas: HTMLCanvasElement,
    options: L2dMascotRendererOptions
  ): Promise<void> {
    this.dispose();

    const { init } = await import("l2d/dist/index.js");
    const instance = init(canvas);
    this.instance = instance;
    instance.on("tap", (areaName) => options.onTap?.(areaName));

    try {
      await instance.load({
        path: options.modelUrl,
        position: options.position,
        scale: options.scale,
        volume: options.volume ?? 0,
        logLevel: "warn",
      });
    } catch (error) {
      if (this.instance === instance) this.instance = null;
      instance.destroy();
      throw error;
    }

    if (this.instance !== instance) {
      instance.destroy();
      return;
    }
    this.mouthParameterId = resolveMouthParameterId(instance.getParams());
  }

  resize(): void {
    this.instance?.resize();
  }

  playReaction(random: () => number = Math.random): boolean {
    if (!this.instance) return false;
    const group = pickMotionGroup(this.instance.getMotions(), random);
    if (group === null) return false;
    this.instance.playMotion(group, undefined, 3);

    const expressions = this.instance.getExpressions();
    if (expressions.length > 0) {
      const index = Math.min(
        expressions.length - 1,
        Math.floor(random() * expressions.length)
      );
      this.instance.setExpression(expressions[index]);
    }
    return true;
  }

  setMouthOpen(value: number): boolean {
    if (!this.instance || !this.mouthParameterId) return false;
    this.instance.setParams({
      [this.mouthParameterId]: normalizeMouthOpenValue(value),
    });
    return true;
  }

  dispose(): void {
    this.mouthParameterId = null;
    this.instance?.destroy();
    this.instance = null;
  }
}
