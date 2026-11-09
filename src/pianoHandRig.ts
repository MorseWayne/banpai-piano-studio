import { Bone, Color, Float32BufferAttribute, Group, Matrix4, MeshPhysicalMaterial, Skeleton, SkinnedMesh, Vector3 } from 'three';
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import type { Cue } from './fingeringPose';
import type { Hand } from './model';

const fingerNames = ['thumb', 'index', 'middle', 'ring', 'pinky'];

export function prepareHandRig(model: Group, side: Hand) {
  const mesh = model.getObjectByProperty('isSkinnedMesh', true) as SkinnedMesh;
  const bones = [...mesh.skeleton.bones];
  const bendSign = side === 'left' ? 1 : -1;
  const chains = fingerNames.map((name, finger) => {
    const parts = finger === 0 ? ['meta', 'a', 'b', 'end'] : ['a', 'b', 'c', 'end'];
    const joints = parts.map(part => {
      const bone = model.getObjectByName(name + '_' + part) as Bone;
      if (!bone) throw new Error('Missing Ultraleap joint ' + name + '_' + part);
      return { bone, rotation: bone.quaternion.clone() };
    });
    const target = new Bone();
    target.name = name + '_piano_target';
    model.add(target);
    bones.push(target);
    const links = joints.slice(0, 3).map(({ bone }, index) => {
      const rest = new Vector3(bone.rotation.x, bone.rotation.y, bone.rotation.z);
      const spread = index === 0 ? .55 : .12;
      const thumbBase = finger === 0 && index === 0;
      const lower = new Vector3(-.15, -spread, bendSign > 0 ? -.12 : -1.55);
      const upper = new Vector3(.15, spread, bendSign > 0 ? 1.55 : .12);
      if (thumbBase) { lower.set(-.9, -.9, -.9); upper.set(.9, .9, .9); }
      return { index: bones.indexOf(bone), rotationMin: rest.clone().add(lower), rotationMax: rest.clone().add(upper) };
    }).reverse();
    return { joints, target, ik: { target: bones.indexOf(target), effector: bones.indexOf(joints[3].bone), links, iteration: 32, maxAngle: .3, blendFactor: 1 },
      tip: new Vector3(), start: new Vector3(), goal: new Vector3(), progress: 1 };
  });
  model.updateMatrixWorld(true);
  const originalSkeleton = mesh.skeleton;
  const inverses = [...originalSkeleton.boneInverses, ...chains.map(({ target }) => new Matrix4().copy(target.matrixWorld).invert())];
  mesh.bind(new Skeleton(bones, inverses), mesh.bindMatrix);
  originalSkeleton.dispose();
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  for (const original of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) original.dispose();
  mesh.material = new MeshPhysicalMaterial({
    color: '#ffffff', roughness: .62, metalness: 0, vertexColors: true,
    clearcoat: .12, clearcoatRoughness: .65, sheen: .35,
    sheenColor: '#f4e3ce', sheenRoughness: .8,
  });
  const colors = new Float32BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count * 3), 3);
  mesh.geometry.setAttribute('color', colors);
  const base = new Color('#d3c5b1');
  const accent = new Color(side === 'left' ? '#9e89b5' : '#6e9bb6');
  const color = new Color();
  const boneFingers = bones.map(bone => fingerNames.findIndex(name => bone.name.startsWith(name + '_')) + 1);
  let highlightSignature = '';

  function highlight(cues: Cue[]) {
    const signature = cues.map(cue => `${cue.note.finger}-${cue.pressed}`).join('|');
    if (signature === highlightSignature) return;
    highlightSignature = signature;
    const strength = new Map(cues.map(cue => [cue.note.finger, cue.pressed ? 1 : .8]));
    const indices = mesh.geometry.attributes.skinIndex;
    const weights = mesh.geometry.attributes.skinWeight;
    for (let vertex = 0; vertex < colors.count; vertex++) {
      let amount = 0;
      for (let joint = 0; joint < 4; joint++) {
        amount += weights.getComponent(vertex, joint) * (strength.get(boneFingers[indices.getComponent(vertex, joint)]) || 0);
      }
      color.copy(base).lerp(accent, amount);
      colors.setXYZ(vertex, color.r, color.g, color.b);
    }
    colors.needsUpdate = true;
  }
  const solver = new CCDIKSolver(mesh, chains.map(chain => chain.ik));
  return { chains, solver, highlight };
}
