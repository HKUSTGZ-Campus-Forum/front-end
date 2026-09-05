import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { MascotExpression, RigLayer, YouyouModel } from "../../types/mascot";
import { isYouyouModelUrl, validateYouyouModel } from "../../utils/mascotYouyou";
import { advanceSpring, clamp, createMesh, deformMesh, expressionPose, layerAlpha, neutralPose } from "../../utils/mascot/rigMath";

const root = new URL("../../public/mascot/youyou/v1/", import.meta.url);
const model: YouyouModel = JSON.parse(readFileSync(new URL("youyou.model.json", root), "utf8"));

describe("original Youyou assets", () => {
  it("ships the complete same-origin model with bounded transparent textures", () => {
    expect(() => validateYouyouModel(model)).not.toThrow();
    expect(model.layers.length).toBeGreaterThanOrEqual(19);
    let bytes = 0;
    for (const layer of model.layers) {
      const file = new URL(layer.texture, root);
      const header = readFileSync(file).subarray(0, 12);
      expect(header.toString("ascii", 0, 4)).toBe("RIFF");
      expect(header.toString("ascii", 8, 12)).toBe("WEBP");
      bytes += statSync(file).size;
    }
    expect(bytes).toBeLessThan(1024 * 1024);
    for (const side of ["L", "R"]) {
      expect(model.layers.some(l => l.side === side && l.fade === "eyeClose")).toBe(true);
      expect(model.layers.some(l => l.side === side && l.name.startsWith("irides"))).toBe(true);
    }
  });

  it("only selects the original renderer for its named manifest", () => {
    expect(isYouyouModelUrl("/mascot/youyou/v1/youyou.model.json?rev=1")).toBe(true);
    expect(isYouyouModelUrl("/Hiyori.model3.json")).toBe(false);
    expect(isYouyouModelUrl("/youyou.model.json.exe")).toBe(false);
  });

  it.each([
    (m: YouyouModel) => { m.anchors.eyeL = {} as typeof m.anchors.eyeL; },
    (m: YouyouModel) => { m.anchors.face.cx = NaN; },
    (m: YouyouModel) => { m.bounds = {} as typeof m.bounds; },
    (m: YouyouModel) => { m.canvas.w = 10000; },
    (m: YouyouModel) => { m.layers[0]!.texture = "../private.webp"; },
    (m: YouyouModel) => { m.layers[0]!.texture = "https://example.com/file.webp"; },
    (m: YouyouModel) => { m.layers[0]!.fade = "invalid" as RigLayer["fade"]; },
    (m: YouyouModel) => { m.layers = []; },
  ])("rejects malformed manifests before allocating graphics resources", mutate => {
    const invalid = structuredClone(model);
    mutate(invalid);
    expect(() => validateYouyouModel(invalid)).toThrow("Invalid original mascot model");
  });
});

describe("Youyou mesh and motion", () => {
  it("keeps the neutral pose registered with the approved art", () => {
    for (const layer of model.layers.filter(l => l.fade !== "mouthOpen")) {
      const mesh = createMesh(layer, model.canvas.w);
      const out = new Float32Array(mesh.base.length);
      deformMesh(layer, mesh.base, out, model.anchors, neutralPose());
      expect(Array.from(out)).toEqual(Array.from(mesh.base));
      expect(Math.max(...mesh.indices)).toBeLessThan(mesh.base.length / 2);
    }
  });

  it.each(["neutral", "happy", "thinking", "surprised", "concerned", "wink"] as MascotExpression[])(
    "keeps all %s vertices finite under extreme gaze and mouth input", expression => {
      const pose = { ...neutralPose(), ...expressionPose(expression), angleX: 1, angleY: -1, eyeX: 1, eyeY: -1, mouthOpen: 1 };
      for (const layer of model.layers) {
        const mesh = createMesh(layer, model.canvas.w);
        const out = new Float32Array(mesh.base.length);
        deformMesh(layer, mesh.base, out, model.anchors, pose, (layer.strands || []).map(() => 3));
        expect(Array.from(out).every(Number.isFinite)).toBe(true);
        expect(layerAlpha(layer, pose)).toBeGreaterThanOrEqual(0);
        expect(layerAlpha(layer, pose)).toBeLessThanOrEqual(1);
      }
    }
  );

  it("crossfades independent open and closed eyes without disappearing", () => {
    for (const side of ["L", "R"] as const) for (const open of [0, 0.1, 0.3, 0.5, 1]) {
      const pose = { ...neutralPose(), [`eyeOpen${side}`]: open };
      const base = model.layers.find(l => l.side === side && l.fade === "eyeOpen")!;
      expect(layerAlpha(base, pose) + layerAlpha({ ...base, fade: "eyeClose" }, pose)).toBeCloseTo(1);
    }
    const wink = { ...neutralPose(), ...expressionPose("wink") };
    expect(wink.eyeOpenL).toBe(0);
    expect(wink.eyeOpenR).toBe(1);
  });

  it("settles hair springs after a pointer movement and bounds non-finite input", () => {
    const spring = { x: 0, v: 0, dx: 0 };
    for (let i = 0; i < 300; i++) advanceSpring(spring, 6, 1 / 30, true);
    expect(spring.x).toBeCloseTo(6, 3);
    expect(Math.abs(spring.v)).toBeLessThan(0.001);
    expect(clamp(Infinity)).toBe(0);
    expect(clamp(NaN)).toBe(0);
    expect(clamp(5)).toBe(1);
  });
});
