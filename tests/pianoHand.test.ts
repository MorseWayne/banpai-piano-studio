import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Object3D, Vector3 } from 'three';
import { createPianoHand } from '../src/pianoHand';
import { fingerOffset, keyX } from '../src/fingeringPose';

describe('Ultraleap piano hand articulation', () => {
  it.each(['left', 'right'] as const)('preserves %s finger bone lengths while curling and changing keys', async side => {
    const bytes = readFileSync(new URL(`../public/hands/ultraleap-${side}.glb`, import.meta.url));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const { scene } = await new GLTFLoader().parseAsync(buffer, '');
    const hand = createPianoHand(scene, side);
    const bones = new Map<string, Object3D>();
    hand.model.traverse(object => { bones.set(object.name, object); });
    const chains = ['thumb', 'index', 'middle', 'ring', 'pinky'].map(finger =>
      (finger === 'thumb' ? ['meta', 'a', 'b', 'end'] : ['a', 'b', 'c', 'end'])
        .map(part => bones.get(finger + '_' + part)!));
    const lengths = chains.map(chain => chain.slice(1).map(joint => joint.position.length()));
    for (const [midi, finger] of [[60, 3], [60, 2], [60, 1], [61, 1], [64, 3], [67, 5]]) {
      hand.pose({ center: side === 'left' ? -1 : 1, fingers: [{
        note: { id: 'test', midi, hand: side, finger, beat: 0, duration: 1 }, pressed: true,
      }] }, .4);
      chains.forEach((chain, fingerIndex) => chain.slice(1).forEach((joint, index) => {
        expect(joint.position.length()).toBeCloseTo(lengths[fingerIndex][index], 5);
        expect(joint.quaternion.toArray().every(Number.isFinite)).toBe(true);
      }));
    }
    const pitches = side === 'right' ? [60, 62, 64, 65, 67] : [67, 65, 64, 62, 60];
    for (const [index, midi] of pitches.entries()) {
      hand.pose({ center: 2, fingers: [{
        note: { id: 'contact', midi, hand: side, finger: index + 1, beat: 0, duration: 1 }, pressed: true,
      }] }, 1);
      hand.model.updateMatrixWorld(true);
      const tip = chains[index][3].getWorldPosition(new Vector3());
      expect(Math.abs(tip.x - keyX(midi))).toBeLessThan(.1);
      expect(Math.abs(tip.y - .12)).toBeLessThan(.1);
      expect(Math.abs(tip.z - [2.18, .76, .69, .88, 1.65][index])).toBeLessThan(.1);
    }
    for (const finger of [1, 2, 3, 4, 5]) {
      hand.pose({ center: keyX(61) - fingerOffset(side, finger), fingers: [{
        note: { id: 'black-key', midi: 61, hand: side, finger, beat: 0, duration: 1 }, pressed: true,
      }] }, 1);
      hand.model.updateMatrixWorld(true);
      const tip = chains[finger - 1][3].getWorldPosition(new Vector3());
      expect(tip.distanceTo(new Vector3(.5, .64, .32))).toBeLessThan(.15);
    }
    hand.pose(undefined, 1);
    expect(hand.model.visible).toBe(false);
  });
});
