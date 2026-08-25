import type {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Clock,
  Group,
  Material,
  Mesh,
  OrthographicCamera,
  Scene,
  Texture,
  WebGLRenderer,
} from "three";
import type {
  MascotRenderer,
  MascotRendererOptions,
} from "~/utils/mascotRenderer";

const REACTION_CLIPS = ["Celebrate", "EatTOK", "Drag"] as const;

export function pickThreeReactionClip(
  availableClips: readonly string[],
  random: () => number = Math.random
): string | null {
  const available = new Map(
    availableClips.map((name) => [name.toLowerCase(), name])
  );
  const candidates = REACTION_CLIPS.map((name) =>
    available.get(name.toLowerCase())
  ).filter((name): name is string => Boolean(name));

  if (!candidates.length) return null;
  const index = Math.min(
    candidates.length - 1,
    Math.floor(Math.max(0, random()) * candidates.length)
  );
  return candidates[index] ?? null;
}

export class ThreeMascotRenderer implements MascotRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private camera: OrthographicCamera | null = null;
  private model: Group | null = null;
  private mixer: AnimationMixer | null = null;
  private clock: Clock | null = null;
  private clips = new Map<string, AnimationClip>();
  private currentAction: AnimationAction | null = null;
  private reactionTimer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private loopOnce = 2200;
  private loopRepeat = 2201;
  private onTap: ((areaName: string) => void) | undefined;

  get isMounted(): boolean {
    return this.model !== null;
  }

  get supportsLipSync(): boolean {
    return false;
  }

  async mount(
    canvas: HTMLCanvasElement,
    options: MascotRendererOptions
  ): Promise<void> {
    this.dispose();
    const generation = this.generation;
    const [three, loaderModule] = await Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
    ]);

    if (generation !== this.generation) return;

    const renderer = new three.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = three.SRGBColorSpace;
    renderer.toneMapping = three.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new three.Scene();
    const camera = new three.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    const hemisphere = new three.HemisphereLight(0xffffff, 0x4b5563, 2.4);
    const keyLight = new three.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2.5, 3.5, 5);
    const fillLight = new three.DirectionalLight(0x8ec5ff, 1.1);
    fillLight.position.set(-3, 1.5, 2);
    scene.add(hemisphere, keyLight, fillLight);

    this.canvas = canvas;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.clock = new three.Clock();
    this.loopOnce = three.LoopOnce;
    this.loopRepeat = three.LoopRepeat;
    this.onTap = options.onTap;
    canvas.addEventListener("pointerup", this.handleTap);
    this.resize();

    try {
      const loader = new loaderModule.GLTFLoader();
      const gltf = await loader.loadAsync(options.modelUrl);
      if (generation !== this.generation) {
        this.disposeObject(gltf.scene);
        return;
      }

      const bounds = new three.Box3().setFromObject(gltf.scene);
      const size = bounds.getSize(new three.Vector3());
      const center = bounds.getCenter(new three.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) {
        throw new Error("Mascot GLB has invalid bounds");
      }

      const userScale = Number.isFinite(options.scale)
        ? Math.max(0.01, Number(options.scale))
        : 1;
      const fitScale = (1.92 / size.y) * userScale;
      const [positionX, positionY] = options.position ?? [0, 0];
      gltf.scene.scale.setScalar(fitScale);
      gltf.scene.position.set(
        -center.x * fitScale + positionX,
        -center.y * fitScale + positionY,
        -center.z * fitScale
      );
      scene.add(gltf.scene);

      this.model = gltf.scene;
      this.mixer = new three.AnimationMixer(gltf.scene);
      this.clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
      this.playClip("Idle", true);
      renderer.setAnimationLoop(this.renderFrame);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  resize(): void {
    if (!this.canvas || !this.renderer || !this.camera) return;
    const width = Math.max(1, this.canvas.clientWidth || this.canvas.width);
    const height = Math.max(1, this.canvas.clientHeight || this.canvas.height);
    const aspect = width / height;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  playReaction(random: () => number = Math.random): boolean {
    const clipName = pickThreeReactionClip([...this.clips.keys()], random);
    if (!clipName) return false;
    this.playClip(clipName, false);
    return true;
  }

  setMouthOpen(_value: number): boolean {
    return false;
  }

  dispose(): void {
    this.generation += 1;
    clearTimeout(this.reactionTimer);
    this.reactionTimer = undefined;
    this.canvas?.removeEventListener("pointerup", this.handleTap);
    this.renderer?.setAnimationLoop(null);
    this.mixer?.stopAllAction();
    if (this.model && this.mixer) this.mixer.uncacheRoot(this.model);
    if (this.model) this.disposeObject(this.model);
    this.scene?.clear();
    this.renderer?.dispose();
    this.clock?.stop();

    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.model = null;
    this.mixer = null;
    this.clock = null;
    this.clips.clear();
    this.currentAction = null;
    this.onTap = undefined;
  }

  private readonly handleTap = (): void => {
    this.onTap?.("Body");
  };

  private readonly renderFrame = (): void => {
    if (!this.renderer || !this.scene || !this.camera || !this.clock) return;
    this.mixer?.update(Math.min(this.clock.getDelta(), 0.1));
    this.renderer.render(this.scene, this.camera);
  };

  private playClip(name: string, loop: boolean): void {
    if (!this.mixer) return;
    const clip = this.clips.get(name);
    if (!clip) return;

    clearTimeout(this.reactionTimer);
    const action = this.mixer.clipAction(clip);
    if (this.currentAction !== action) this.currentAction?.fadeOut(0.18);
    action.reset();
    action.enabled = true;
    action.clampWhenFinished = !loop;
    action.setLoop(loop ? this.loopRepeat : this.loopOnce, loop ? Infinity : 1);
    action.fadeIn(0.18).play();
    this.currentAction = action;

    if (!loop) {
      this.reactionTimer = setTimeout(() => {
        this.playClip("Idle", true);
      }, Math.max(300, clip.duration * 1000 + 80));
    }
  }

  private disposeObject(root: Group): void {
    root.traverse((object) => {
      const mesh = object as Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : [];
      materials.forEach((material) => this.disposeMaterial(material));
    });
  }

  private disposeMaterial(material: Material): void {
    Object.values(material).forEach((value) => {
      const texture = value as Texture;
      if (texture?.isTexture) texture.dispose();
    });
    material.dispose();
  }
}
