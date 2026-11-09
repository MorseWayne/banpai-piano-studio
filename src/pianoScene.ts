import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, Group, HemisphereLight, Mesh,
  MeshStandardMaterial, OrthographicCamera, PCFShadowMap, Scene, SkinnedMesh, Vector3, WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPianoHand } from './pianoHand';
import { keyX, type HandFrame } from './fingeringPose';
import type { Hand } from './model';

const ivory = new Color('#f5efe4'), ebony = new Color('#272b30');
const handColors = { left: new Color('#c4a1dd'), right: new Color('#91b4ed') };
const playedColor = new Color('#8fc5a9');
const whiteGeometry = () => new RoundedBoxGeometry(.975, .42, 6.25, 2, .048);
const blackGeometry = () => new RoundedBoxGeometry(.645, .56, 4.03, 2, .045);

function release(group: Group | Scene) {
  const geometries = new Set<BoxGeometry>(), materials = new Set<MeshStandardMaterial>();
  group.traverse(node => {
    if (!(node instanceof Mesh)) return;
    geometries.add(node.geometry);
    for (const item of Array.isArray(node.material) ? node.material : [node.material]) materials.add(item);
    if (node instanceof SkinnedMesh) node.skeleton.dispose();
  });
  geometries.forEach(item => item.dispose());
  materials.forEach(item => item.dispose());
}

export function makePianoScene(canvas: HTMLCanvasElement, low: number, high: number, width: number, height: number) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const scene = new Scene();
  const left = keyX(low) - .5, right = keyX(high) + .5, center = (left + right) / 2;
  const aspect = width / height;
  const span = Math.max(right - left + .72, aspect * 8.8);
  const depth = span / aspect;
  const camera = new OrthographicCamera(-span / 2, span / 2, depth / 2, -depth / 2, .1, 100);
  camera.position.set(center, 19, 13.3);
  camera.lookAt(center, 0, 1.35);
  camera.updateMatrixWorld();
  scene.add(new HemisphereLight('#fff5e9', '#889694', 1.48), new AmbientLight('#ffffff', .22));
  const light = new DirectionalLight('#fff9f0', 2.08);
  light.position.set(center - 6, 18, 1);
  light.target.position.set(center, 0, 0);
  light.castShadow = true;
  Object.assign(light.shadow.camera, { left: -span / 2 - 3, right: span / 2 + 3, top: 9, bottom: -9 });
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.radius = 3;
  light.shadow.normalBias = .025;
  scene.add(light, light.target);

  const boardWidth = right - left;
  function casing(x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
    const mesh = new Mesh(new RoundedBoxGeometry(w, h, d, 2, .055), new MeshStandardMaterial({ color, roughness: .6 }));
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  casing(center, -.48, -.35, boardWidth + .47, .42, 7.15, '#323638');
  casing(center, .22, -3.71, boardWidth + .47, .77, .8, '#403a37');
  casing(center, .13, -3.23, boardWidth, .21, .18, '#9a5b57');
  for (const x of [left - .115, right + .115]) casing(x, -.05, -.33, .23, .73, 7.14, '#594942');
  const white = whiteGeometry(), black = blackGeometry();
  const keys = Array.from({ length: high - low + 1 }, (_, i) => {
    const midi = low + i, x = keyX(midi), dark = !Number.isInteger(x);
    const mesh = new Mesh(dark ? black : white, new MeshStandardMaterial({ color: dark ? ebony : ivory, roughness: dark ? .39 : .57 }));
    const y = dark ? .24 : -.21;
    mesh.position.set(x, y, dark ? -1.25 : -.075);
    mesh.castShadow = dark;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return { mesh, midi, y, dark };
  });

  // Align the actual audio-ui keyboard's hit area with the projected key faces.
  const upper = new Vector3(left, .52, -3.265).project(camera);
  const lower = new Vector3(right, -.12, 3.05).project(camera);
  const inputRect = { left: (upper.x + 1) * width / 2, top: (1 - upper.y) * height / 2,
    width: (lower.x - upper.x) * width / 2, height: (upper.y - lower.y) * height / 2 };
  let closed = false, animation = 0, settleUntil = 0, lastTime = 0;
  let frame: HandFrame = { cues: [], hands: {} }, down = new Set<number>(), signature = '';
  const rigs: Partial<Record<Hand, ReturnType<typeof createPianoHand>>> = {};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(now: number) {
    animation = 0;
    const dt = Math.min(.08, (now - lastTime) / 1000);
    lastTime = now;
    const blend = reducedMotion ? 1 : 1 - Math.exp(-Math.max(.008, dt) * 23);
    for (const side of ['left', 'right'] as const) rigs[side]?.pose(frame.hands[side], blend);
    for (const { mesh, midi, y, dark } of keys) {
      const cue = frame.cues.find(item => item.note.midi === midi);
      const pressed = down.has(midi) || !!cue?.pressed;
      mesh.position.y += ((y - (pressed ? .15 : 0)) - mesh.position.y) * blend;
      const color = cue ? handColors[cue.note.hand] : pressed ? playedColor : dark ? ebony : ivory;
      mesh.material.color.lerp(color, blend);
    }
    renderer.render(scene, camera);
    if (!reducedMotion && now < settleUntil) animation = requestAnimationFrame(draw);
  }
  function invalidate() {
    settleUntil = performance.now() + 290;
    if (!closed && !animation) animation = requestAnimationFrame(draw);
  }
  const loader = new GLTFLoader();
  const ready = Promise.all((['left', 'right'] as const).map(async side => {
    const { scene: model } = await loader.loadAsync('/hands/' + side + '.glb');
    if (closed) { release(model); return; }
    rigs[side] = createPianoHand(model, side);
    scene.add(rigs[side].model);
    invalidate();
  }));
  invalidate();
  return {
    ready, inputRect,
    update(next: HandFrame, pressed: Set<number>) {
      const key = (c: HandFrame['cues'][number]) => c.note.id + Number(c.pressed);
      const id = [next.cues.map(key), next.hands.left?.fingers.map(key), next.hands.right?.fingers.map(key), [...pressed]].join('|');
      if (id === signature) return;
      signature = id;
      frame = next; down = pressed;
      invalidate();
    },
    dispose() {
      closed = true;
      cancelAnimationFrame(animation);
      release(scene);
      light.shadow.dispose();
      renderer.dispose();
    },
  };
}
