import { Bone, Group, LatheGeometry, Matrix4, Mesh, MeshStandardMaterial, Quaternion, SkinnedMesh, Vector2, Vector3 } from 'three';
import { fingerOffset, keyX, type FingerPose } from './fingeringPose';
import type { Hand } from './model';

const fingerNames = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
const whiteContactZ = [2.18, .76, .69, .88, 1.65];
const scale = 42;
const up = new Vector3(0, 1, 0);

// These WebXR assets expose each tracked joint as a sibling in armature space.
// Source: https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets/profiles/generic-hand
export function createPianoHand(model: Group, side: Hand) {
  const sign = side === 'right' ? 1 : -1;
  const basis = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(
    new Vector3(0, sign, 0), new Vector3(0, 0, 1), new Vector3(sign, 0, 0)));
  const inverse = basis.clone().invert();
  const wrist = model.getObjectByName('wrist')!.position.clone();
  model.quaternion.copy(basis);
  model.scale.setScalar(scale);
  const hand = new Group();
  hand.add(model);
  hand.visible = false;
  // The supplied mesh ends at the joint. A cuff covers its open wrist as
  // the forearm leaves the player's edge of the view.
  const profile = [[1.11, 0], [1.17, .06], [1.17, .46], [1.14, .50], [1.22, .60], [1.38, 3.6], [1.42, 5]];
  const cuff = new Mesh(new LatheGeometry(profile.map(([radius, z]) => new Vector2(radius, z)), 48),
    new MeshStandardMaterial({ color: side === 'left' ? '#665868' : '#4a5d73', roughness: .97 }));
  cuff.rotation.set(Math.PI / 2, 0, -sign * .07, 'ZXY');
  cuff.scale.set(1, 1, .72);
  cuff.castShadow = true;
  hand.add(cuff);
  model.traverse(object => {
    if (object instanceof SkinnedMesh) {
      object.castShadow = true;
      object.frustumCulled = false;
      const material = object.material as MeshStandardMaterial;
      material.color.set('#d1a38d');
      material.roughness = .78;
    }
  });
  const chains = fingerNames.map((name, index) => {
    const parts = index === 0 ? ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip']
      : ['phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'];
    const joints = parts.map(part => {
      const bone = model.getObjectByName(name + '-' + part) as Bone;
      const rest = bone.position.clone().sub(wrist).applyQuaternion(basis).multiplyScalar(scale);
      return { bone, rest, rotation: bone.quaternion.clone() };
    });
    const lengths = joints.slice(1).map((joint, i) => joint.rest.distanceTo(joints[i].rest));
    return { joints, lengths, tip: new Vector3() };
  });
  const palm = new Vector3();

  function pose(target: FingerPose | undefined, blend: number) {
    if (!target) { hand.visible = false; return; }
    if (!hand.visible) blend = 1;
    hand.visible = true;
    const blackFraction = target.fingers.filter(({ note }) => !Number.isInteger(keyX(note.midi))).length / target.fingers.length;
    palm.lerp(new Vector3(target.center, 1.91 + .25 * blackFraction, 6.0 - blackFraction * 1.2), blend);
    cuff.position.set(palm.x, palm.y - .13, palm.z + .23);
    model.position.copy(wrist).applyQuaternion(basis).multiplyScalar(-scale).add(palm);

    chains.forEach(({ joints, lengths, tip }, i) => {
      const finger = i + 1;
      const cue = target.fingers.find(item => item.note.finger === finger);
      const x = cue ? keyX(cue.note.midi) : target.center + fingerOffset(side, finger);
      const black = !!cue && !Number.isInteger(x);
      const surface = black ? .52 : 0;
      const y = surface + (cue?.pressed ? .12 : cue ? .45 : .72);
      tip.lerp(new Vector3(x, y, black ? .32 : whiteContactZ[i]), blend);

      // Solve the proximal joint and the two shorter distal segments as a bent
      // two-link chain. Preserve bone lengths even for unplayable imported spans.
      const root = joints[0].rest;
      const direction = tip.clone().sub(palm).sub(root);
      const [a, b, c] = lengths;
      const distance = Math.max(Math.abs(a - b - c) + .001, Math.min(a + b + c - .001, direction.length()));
      direction.normalize();
      const along = (a * a - (b + c) ** 2 + distance ** 2) / (2 * distance);
      const normal = up.clone().addScaledVector(direction, -up.dot(direction)).normalize();
      const bend = root.clone().addScaledVector(direction, along).addScaledVector(normal, Math.sqrt(Math.max(0, a * a - along * along)));
      const end = root.clone().addScaledVector(direction, distance);
      const points = [root, bend, bend.clone().lerp(end, b / (b + c)), end];
      joints.forEach(({ bone, rotation }, j) => {
        bone.position.copy(points[j]).divideScalar(scale).applyQuaternion(inverse).add(wrist);
        const k = Math.min(j, 2);
        const from = joints[k + 1].rest.clone().sub(joints[k].rest).applyQuaternion(inverse).normalize();
        const to = points[k + 1].clone().sub(points[k]).applyQuaternion(inverse).normalize();
        bone.quaternion.setFromUnitVectors(from, to).multiply(rotation);
      });
    });
  }
  return { model: hand, pose };
}
