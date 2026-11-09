import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, Color, DirectionalLight, Group, HemisphereLight, Mesh,
  MathUtils, MeshPhysicalMaterial, MeshStandardMaterial, OrthographicCamera, PCFShadowMap, PMREMGenerator,
  Scene, SkinnedMesh, Texture, Vector3, WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPianoHand } from './pianoHand';
import { keyX, type HandFrame } from './fingeringPose';
import type { Hand } from './model';

const ivory = new Color('#f5efe4'), ebony = new Color('#272b30');
const handColors = { left: new Color('#c4a1dd'), right: new Color('#91b4ed') };
const playedColor = new Color('#8fc5a9');
const whiteGeometry = () => new RoundedBoxGeometry(.975, .42, 6.25, 2, .048);
const blackGeometry = () => new RoundedBoxGeometry(.645, .56, 4.03, 2, .045);

function release(group: Group | Scene) {
  const geometries = new Set<BoxGeometry>(), materials = new Set<MeshStandardMaterial>(), textures = new Set<Texture>();
  group.traverse(node => {
    if (!(node instanceof Mesh)) return;
    geometries.add(node.geometry);
    for (const item of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(item);
      Object.values(item).forEach(value => { if (value instanceof Texture) textures.add(value); });
    }
    if (node instanceof SkinnedMesh) node.skeleton.dispose();
  });
  geometries.forEach(item => item.dispose());
  materials.forEach(item => item.dispose());
  textures.forEach(item => item.dispose());
}

export type PianoView = 'player' | 'overhead';
interface Inspection { hand: Hand; elevation: number; zoom: number; fraction: number }

export function makePianoScene(canvas: HTMLCanvasElement, low: number, high: number, width: number, height: number, view: PianoView = 'player', inspection: Inspection | null = null) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  const scene = new Scene();
  // Three.js's studio environment is adapted upstream from Google's model-viewer.
  // Generate it locally so the desktop app also works offline.
  const environment = new RoomEnvironment();
  const generator = new PMREMGenerator(renderer);
  const lighting = generator.fromScene(environment, .04);
  scene.environment = lighting.texture;
  scene.environmentIntensity = .32;
  environment.dispose();
  generator.dispose();
  const left = keyX(low) - .5, right = keyX(high) + .5, center = (left + right) / 2;
  const aspect = width / height;
  const span = Math.max(right - left + 1.2, aspect * 6.4);
  const depth = span / aspect;
  const camera = new OrthographicCamera(-span / 2, span / 2, depth / 2, -depth / 2, .1, 100);
  const detailCamera = new OrthographicCamera(-5, 5, 3, -3, .1, 100);
  const detailFocus = new Vector3();
  let mainWidth = width;
  camera.position.set(center, view === 'overhead' ? 28 : 14, view === 'overhead' ? 5 : 18);
  camera.lookAt(center, 0, .8);
  camera.updateMatrixWorld();
  scene.add(new HemisphereLight('#eef4ff', '#43494e', .65), new AmbientLight('#ffffff', .08));
  const light = new DirectionalLight('#fff1dd', 2.3);
  light.position.set(center - 8, 15, 6);
  light.target.position.set(center, 0, 0);
  light.castShadow = true;
  Object.assign(light.shadow.camera, { left: -span / 2 - 3, right: span / 2 + 3, top: 9, bottom: -9 });
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.radius = 3;
  light.shadow.normalBias = .025;
  scene.add(light, light.target);
  const rim = new DirectionalLight('#d8e8f4', 1.1);
  rim.position.set(center + 8, 8, -5);
  rim.target.position.set(center, 1, 3);
  scene.add(rim, rim.target);

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
    const mesh = new Mesh(dark ? black : white, new MeshPhysicalMaterial({
      color: dark ? ebony : ivory, roughness: dark ? .3 : .38,
      clearcoat: .28, clearcoatRoughness: .26,
    }));
    const y = dark ? .24 : -.21;
    mesh.position.set(x, y, dark ? -1.25 : -.075);
    mesh.castShadow = dark;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return { mesh, midi, y, dark };
  });

  // Align the actual audio-ui keyboard's hit area with the projected key faces.
  function projectKeys() {
    const upper = new Vector3(left, .52, -3.265).project(camera);
    const lower = new Vector3(right, -.12, 3.05).project(camera);
    return { left: (upper.x + 1) * mainWidth / 2, top: (1 - upper.y) * height / 2,
      width: (lower.x - upper.x) * mainWidth / 2, height: (upper.y - lower.y) * height / 2 };
  }
  let closed = false, animation = 0, settleUntil = 0, lastTime = 0;
  let frame: HandFrame = { cues: [], hands: {} }, down = new Set<number>(), signature = '';
  const rigs: Partial<Record<Hand, ReturnType<typeof createPianoHand>>> = {};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(now: number) {
    animation = 0;
    const dt = Math.min(.08, (now - lastTime) / 1000);
    lastTime = now;
    const blend = reducedMotion ? 1 : MathUtils.damp(0, 1, 23, Math.max(.008, dt));
    for (const side of ['left', 'right'] as const) rigs[side]?.pose(frame.hands[side], blend);
    for (const { mesh, midi, y, dark } of keys) {
      const cue = frame.cues.find(item => item.note.midi === midi);
      const pressed = down.has(midi) || !!cue?.pressed;
      mesh.position.y += ((y - (pressed ? .15 : 0)) - mesh.position.y) * blend;
      const color = pressed ? playedColor : cue ? handColors[cue.note.hand] : dark ? ebony : ivory;
      mesh.material.color.lerp(color, blend);
    }
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, mainWidth, height);
    renderer.setScissor(0, 0, mainWidth, height);
    renderer.setClearColor('#263630', 0);
    renderer.render(scene, camera);
    if (inspection) {
      const detailHand = inspection.hand;
      const rig = rigs[detailHand];
      const other = rigs[detailHand === 'left' ? 'right' : 'left'];
      const otherVisible = other?.model.visible;
      // Follow the thumb joint itself so raising or zooming the camera keeps
      // the contact area in frame, including fingers tucked below the palm.
      if (rig) rig.thumb.getWorldPosition(detailFocus);
      else detailFocus.set(center, .5, 3);
      detailFocus.y += .95;
      detailCamera.position.set(detailFocus.x + (detailHand === 'left' ? 12 : -12),
        detailFocus.y + Math.tan(MathUtils.degToRad(inspection.elevation)) * 12, detailFocus.z - 2.2);
      detailCamera.lookAt(detailFocus);
      detailCamera.updateMatrixWorld();
      if (other) other.model.visible = false;
      renderer.setViewport(mainWidth, 0, width - mainWidth, height);
      renderer.setScissor(mainWidth, 0, width - mainWidth, height);
      renderer.setClearColor('#32423d', 1);
      renderer.render(scene, detailCamera);
      if (other) other.model.visible = otherVisible!;
    }
    renderer.setScissorTest(false);
    if (!reducedMotion && now < settleUntil) animation = requestAnimationFrame(draw);
  }
  function invalidate() {
    settleUntil = performance.now() + 290;
    if (!closed && !animation) animation = requestAnimationFrame(draw);
  }
  const loader = new GLTFLoader();
  const ready = Promise.all((['left', 'right'] as const).map(async side => {
    const { scene: model } = await loader.loadAsync('/hands/ultraleap-' + side + '.glb');
    if (closed) { release(model); return; }
    rigs[side] = createPianoHand(model, side);
    scene.add(rigs[side].model);
    invalidate();
  }));
  function setView(next: PianoView, detail: Inspection | null = null) {
    inspection = detail;
    mainWidth = inspection ? Math.round(width * (1 - inspection.fraction)) : width;
    const mainAspect = mainWidth / height;
    camera.position.set(center, next === 'overhead' ? 28 : 14, next === 'overhead' ? 5 : 18);
    camera.lookAt(center, 0, next === 'overhead' ? 2 : .8);
    const visibleSpan = Math.max(right - left + 1.2, mainAspect * (next === 'overhead' ? 9 : 6.4));
    camera.left = -visibleSpan / 2;
    camera.right = visibleSpan / 2;
    camera.top = visibleSpan / mainAspect / 2;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const detailAspect = (width - mainWidth) / height;
    const detailHeight = Math.max(5.4, 8.5 / Math.max(.1, detailAspect)) / (inspection?.zoom ?? 1);
    detailCamera.top = detailHeight / 2;
    detailCamera.bottom = -detailHeight / 2;
    detailCamera.left = -detailHeight * detailAspect / 2;
    detailCamera.right = detailHeight * detailAspect / 2;
    detailCamera.updateProjectionMatrix();
    invalidate();
    return projectKeys();
  }
  setView(view, inspection);
  return {
    ready, inputRect: projectKeys(), setView,
    update(next: HandFrame, pressed: Set<number>) {
      const key = (c: HandFrame['cues'][number]) => [c.note.id, c.note.midi, c.note.hand, c.note.finger, Number(c.pressed)].join(':');
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
      lighting.dispose();
      renderer.dispose();
    },
  };
}
