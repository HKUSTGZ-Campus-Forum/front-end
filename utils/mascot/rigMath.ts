// Mesh deformation and eye clipping conventions adapted from Anime2.5DRig (MIT).
// See public/mascot/THIRD_PARTY_NOTICES.txt for upstream attribution.
import type { MascotExpression, RigAnchors, RigLayer, RigPose } from "../../types/mascot";

export const clamp = (value: number, min = -1, max = 1): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 0;
export const smooth = (value: number): number => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export function neutralPose(): RigPose {
  return {
    angleX: 0, angleY: 0, angleZ: 0, eyeX: 0, eyeY: 0,
    eyeOpenL: 1, eyeOpenR: 1, irisScale: 1, brow: 0, browAngle: 0,
    mouthOpen: 0, mouthForm: 0, body: 0, armY: 0, breath: 0, breathHead: 0,
  };
}

export function expressionPose(expression: MascotExpression): Partial<RigPose> {
  switch (expression) {
    case "happy": return { eyeOpenL: 0, eyeOpenR: 0, brow: 0.3, mouthForm: 0.65, mouthOpen: 0.45 };
    case "thinking": return { eyeOpenL: 0.8, eyeOpenR: 0.8, brow: 0.15, browAngle: 0.12, angleZ: -0.25, eyeY: -0.2 };
    case "surprised": return { brow: 0.7, irisScale: 0.85, mouthOpen: 0.65, angleY: -0.12 };
    case "concerned": return { brow: 0.3, browAngle: -0.45, eyeOpenL: 0.82, eyeOpenR: 0.82, angleZ: 0.2 };
    case "wink": return { eyeOpenL: 0, eyeOpenR: 1, brow: 0.18, mouthForm: 0.55, mouthOpen: 0.35, angleZ: 0.2 };
    default: return {};
  }
}

export function layerAlpha(layer: RigLayer, pose: RigPose): number {
  const eye = layer.side === "L" ? pose.eyeOpenL : pose.eyeOpenR;
  if (layer.fade === "eyeOpen") return smooth((eye - 0.235) / 0.15);
  if (layer.fade === "eyeClose") return 1 - smooth((eye - 0.235) / 0.15);
  if (layer.fade === "mouthOpen") return smooth((pose.mouthOpen - 0.12) / 0.16);
  if (layer.fade === "mouthClose") return 1 - smooth((pose.mouthOpen - 0.12) / 0.16);
  return 1;
}

export function createMesh(layer: Pick<RigLayer, "x" | "y" | "w" | "h" | "phys">, canvasWidth: number) {
  const cell = (layer.phys ? 25 : 36) * Math.max(0.6, canvasWidth / 768);
  const nx = Math.min(100, Math.max(2, Math.ceil(layer.w / cell)));
  const ny = Math.min(100, Math.max(2, Math.ceil(layer.h / cell)));
  const base = new Float32Array((nx + 1) * (ny + 1) * 2);
  const uv = new Float32Array(base.length);
  const indices = new Uint16Array(nx * ny * 6);
  let k = 0;
  for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) {
    base[k] = layer.x + layer.w * x / nx;
    base[k + 1] = layer.y + layer.h * y / ny;
    uv[k] = x / nx;
    uv[k + 1] = y / ny;
    k += 2;
  }
  k = 0;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const a = y * (nx + 1) + x;
    indices.set([a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1], k);
    k += 6;
  }
  return { base, uv, indices };
}

export interface HairSpring { x: number; v: number; dx: number }
export function advanceSpring(spring: HairSpring, target: number, dt: number, soft: boolean): void {
  const step = clamp(dt, 0, 1 / 30);
  const stiffness = soft ? 22 : 70;
  const damping = soft ? 5 : 11;
  spring.v += (-stiffness * (spring.x - target) - damping * spring.v) * step;
  spring.x += spring.v * step;
  spring.dx = -(spring.x - target) * (soft ? 2.0 : 1.6);
}

export function deformMesh(
  layer: RigLayer, base: Float32Array, out: Float32Array,
  anchors: RigAnchors, pose: RigPose, hairOffsets: readonly number[] = [],
): void {
  const a = anchors, p = pose, fs = a.faceScale;
  const name = layer.name.replace(/_(l|r)$/, "").replace(/_\d+$/, "");
  const eye = layer.side === "L" ? a.eyeL : layer.side === "R" ? a.eyeR : null;
  const open = layer.side === "L" ? p.eyeOpenL : p.eyeOpenR;
  const az = p.angleZ * 0.07, cz = Math.cos(az), sz = Math.sin(az);
  const ab = p.body * 0.028, cb = Math.cos(ab), sb = Math.sin(ab);
  for (let k = 0; k < base.length; k += 2) {
    let x = base[k]!, y = base[k + 1]!;
    if (layer.fade === "eyeOpen" && eye) {
      if (name === "irides") {
        x = eye.icx + (x - eye.icx) * p.irisScale + p.eyeX * 11 * fs;
        y = eye.icy + (y - eye.icy) * p.irisScale + p.eyeY * 6 * fs;
        y = eye.closeY + (y - eye.closeY) * (1 - 0.8 * smooth((0.32 - open) / 0.32));
      } else y = eye.closeY + (y - eye.closeY) * (1 - 0.85 * (1 - open));
    }
    if (name === "eyebrow") {
      y += (-p.brow * 9 + (1 - open) * 3.5) * fs;
      const th = p.browAngle * (layer.side === "L" ? 1 : -1) * 0.3;
      const rx = x - (layer.x + layer.w / 2), ry = y - (layer.y + layer.h / 2);
      x += rx * (Math.cos(th) - 1) - ry * Math.sin(th);
      y += rx * Math.sin(th) + ry * (Math.cos(th) - 1);
    }
    if (layer.fade === "mouthOpen") {
      y = a.mouth.y0 + (y - a.mouth.y0) * (0.45 + 0.55 * p.mouthOpen);
      const q = Math.pow(Math.abs(x - a.mouth.cx) / ((a.mouth.x1 - a.mouth.x0) / 2 + 4), 1.5);
      y -= p.mouthForm * 6 * fs * (q - 0.35);
    }
    if (name === "face" && y > a.mouth.cy) {
      y += p.mouthOpen * 5 * fs * smooth((y - a.mouth.cy) / Math.max(1, a.face.y1 - a.mouth.cy));
    }
    let headWeight = layer.group === "head" ? 1 : 0.16;
    if (name === "neck") headWeight = 0.55 * smooth((a.neckBottom - y) / Math.max(1, a.neckBottom - a.neckTop));
    const rx = x - a.neckPivot.cx, ry = y - a.neckPivot.cy;
    x += (rx * cz - ry * sz - rx) * headWeight;
    y += (rx * sz + ry * cz - ry) * headWeight;
    x += headWeight * fs * (p.angleX * (14 + 40 * (layer.depth - 1)) + p.angleX * (a.neckPivot.cy - y) * 0.028);
    y += headWeight * fs * (-p.angleY * (9 + 30 * (layer.depth - 1)) - p.angleY * (layer.depth - 1) * (y - a.face.cy) * 0.05);
    y -= (layer.group === "body" ? p.breath * 2 : p.breathHead * 1.6) * fs;
    if (name === "topwear") x = a.neckPivot.cx + (x - a.neckPivot.cx) * (1 + p.breath * 0.002);
    if (name === "handwear") {
      const weight = smooth((base[k + 1]! - layer.y) / layer.h * 1.15);
      y -= p.armY * 22 * fs * weight;
      x += p.armY * 6 * fs * weight * (x < a.neckPivot.cx ? 1 : -1);
    }
    if (layer.strands?.length && hairOffsets.length) {
      let weightSum = 0, offset = 0;
      const sigma = Math.max(25, layer.w / layer.strands.length * 0.65);
      layer.strands.forEach((strand, index) => {
        const weight = Math.exp(-Math.pow((base[k]! - strand.x) / sigma, 2));
        const u = clamp((base[k + 1]! - strand.rootY) / Math.max(1, strand.tipY - strand.rootY), 0, 1);
        offset += weight * hairOffsets[index]! * Math.pow(u, 2);
        weightSum += weight;
      });
      const dx = weightSum > 0.00001 ? offset / weightSum : 0;
      x += dx;
      y += Math.abs(dx) * 0.08;
    }
    const bx = x - a.bodyPivot.cx, by = y - a.bodyPivot.cy;
    out[k] = a.bodyPivot.cx + bx * cb - by * sb;
    out[k + 1] = a.bodyPivot.cy + bx * sb + by * cb;
  }
}
