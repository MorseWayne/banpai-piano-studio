import { Group, LatheGeometry, MathUtils, Mesh, MeshPhysicalMaterial, Vector2, Vector3 } from 'three';
import { fingerOffset, keyX, type FingerPose } from './fingeringPose';
import type { Hand } from './model';
import { prepareHandRig } from './pianoHandRig';

const whiteContactZ = [2.18, .76, .69, .88, 1.65];

export function createPianoHand(model: Group, side: Hand) {
  const { chains, solver, highlight } = prepareHandRig(model, side);
  const hand = new Group();
  hand.add(model);
  hand.visible = false;
  const profile = [[1.02, 0], [1.05, .08], [1.06, .45], [1.12, .6], [1.3, 4.5]];
  const cuff = new Mesh(new LatheGeometry(profile.map(([radius, z]) => new Vector2(radius, z)), 48),
    new MeshPhysicalMaterial({ color: side === 'left' ? '#746f83' : '#5c7484', roughness: .88, sheen: .5, sheenRoughness: .8 }));
  cuff.rotation.x = Math.PI / 2;
  cuff.scale.set(1, 1, .65);
  cuff.position.set(0, -.12, .8);
  cuff.castShadow = true;
  hand.add(cuff);
  const palm = new Vector3();
  let initialized = false;

  function pose(target: FingerPose | undefined, blend: number) {
    if (!target?.fingers.length) { hand.visible = false; initialized = false; return; }
    const firstPose = !initialized;
    if (firstPose) blend = 1;
    initialized = true;
    hand.visible = true;
    const blackFraction = target.fingers.filter(({ note }) => !Number.isInteger(keyX(note.midi))).length / target.fingers.length;
    palm.lerp(new Vector3(target.center, 1.75 + .25 * blackFraction, 6 - blackFraction * 1.2), blend);
    hand.position.copy(palm);
    highlight(target.fingers);

    chains.forEach((chain, index) => {
      const { tip, goal, start } = chain;
      const cue = target.fingers.find(item => item.note.finger === index + 1);
      const x = cue ? keyX(cue.note.midi) : target.center + fingerOffset(side, index + 1);
      const black = !!cue && !Number.isInteger(x);
      const y = (black ? .52 : 0) + (cue?.pressed ? .12 : cue ? .38 : .95);
      const contactZ = whiteContactZ[index] - (cue || index === 0 ? 0 : .8);
      const contact = new Vector3(x, y, black ? .32 : contactZ);
      if (firstPose) { tip.copy(contact); goal.copy(contact); chain.progress = 1; }
      else {
        if (goal.distanceToSquared(contact) > .0001) {
          start.copy(tip);
          goal.copy(contact);
          chain.progress = 0;
        }
        chain.progress = MathUtils.lerp(chain.progress, 1, blend);
        const progress = MathUtils.smoothstep(chain.progress, 0, 1);
        tip.lerpVectors(start, goal, progress);
        const travel = Math.hypot(goal.x - start.x, goal.z - start.z);
        tip.y += Math.sin(Math.PI * progress) * Math.min(.6, travel * .18);
      }
      chain.target.position.copy(tip).sub(palm);
      chain.ik.blendFactor = cue ? 1 : .55;
      for (const joint of chain.joints) joint.bone.quaternion.copy(joint.rotation);
    });
    // Preserve the authored hierarchy and let Three.js solve rotation-only IK.
    // Rest rotations prevent accumulated twist when jumping between exercises.
    hand.updateMatrixWorld(true);
    solver.update();
  }
  return { model: hand, pose, thumb: chains[0].joints[2].bone };
}
