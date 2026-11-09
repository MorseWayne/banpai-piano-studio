import { readFile, writeFile } from 'node:fs/promises';
import { Bone, Group, Matrix4, MeshPhysicalMaterial, Quaternion, Skeleton, SkinnedMesh, Vector3 } from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// Convert Ultraleap's Apache-2.0 GenericHand FBX into self-contained piano-scale
// GLBs. Preserve its skin weights and bone hierarchy. Bake mirrored geometry for
// the right hand so the runtime IK works with positive, uniform transforms.
if (!process.argv[2]) throw new Error('Pass the path to Ultraleap GenericHand.fbx');
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};
const bytes = await readFile(process.argv[2]);
const source = new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
source.updateMatrixWorld(true);
const mesh = source.getObjectByProperty('isSkinnedMesh', true);
const sourceBones = mesh.skeleton.bones;
const position = name => source.getObjectByName(name).getWorldPosition(new Vector3());
const wrist = position('Wrist');
const forward = position('middle_a').sub(wrist).normalize();
const across = position('index_a').sub(position('pinky_a')).normalize();
const back = new Vector3().crossVectors(across, forward).normalize();
across.crossVectors(forward, back).normalize();
const rotation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across, back, forward.negate())).invert();
const scale = 3.8 / position('middle_a').distanceTo(wrist);
const transform = new Matrix4().compose(wrist.clone().applyQuaternion(rotation).multiplyScalar(-scale), rotation, new Vector3(scale, scale, scale));

for (const side of ['left', 'right']) {
  const reflection = new Matrix4().makeScale(side === 'right' ? -1 : 1, 1, 1);
  const geometry = mesh.geometry.clone().applyMatrix4(transform.clone().multiply(mesh.matrixWorld));
  geometry.deleteAttribute('color');
  if (side === 'right') {
    geometry.applyMatrix4(reflection);
    const indices = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: geometry.attributes.position.count }, (_, index) => index);
    for (let index = 0; index < indices.length; index += 3) [indices[index + 1], indices[index + 2]] = [indices[index + 2], indices[index + 1]];
    geometry.setIndex(indices);
  }
  const worldMatrices = sourceBones.map(bone => {
    const matrix = transform.clone().multiply(bone.matrixWorld);
    const origin = new Vector3(), orientation = new Quaternion();
    matrix.decompose(origin, orientation, new Vector3());
    matrix.compose(origin, orientation, new Vector3(1, 1, 1));
    return reflection.clone().multiply(matrix).multiply(reflection);
  });
  const model = new Group();
  const bones = sourceBones.map(bone => { const copy = new Bone(); copy.name = bone.name; return copy; });
  sourceBones.forEach((bone, index) => {
    const parentIndex = sourceBones.indexOf(bone.parent);
    const local = worldMatrices[index].clone();
    if (parentIndex >= 0) {
      bones[parentIndex].add(bones[index]);
      local.premultiply(worldMatrices[parentIndex].clone().invert());
    } else model.add(bones[index]);
    local.decompose(bones[index].position, bones[index].quaternion, bones[index].scale);
  });
  const hand = new SkinnedMesh(geometry, new MeshPhysicalMaterial({ color: '#e3ddd3', roughness: .56, metalness: 0 }));
  hand.name = 'Ultraleap GenericHand';
  model.add(hand);
  model.updateMatrixWorld(true);
  hand.bind(new Skeleton(bones));
  hand.normalizeSkinWeights();
  model.userData = {
    source: 'Ultraleap UnityPlugin / GenericHand.fbx',
    license: 'Apache-2.0',
    changes: 'Converted to GLB, normalized to piano coordinates, neutral material, mirrored right-hand geometry.',
  };
  const glb = await new GLTFExporter().parseAsync(model, { binary: true, onlyVisible: true });
  await writeFile(new URL(`../public/hands/ultraleap-${side}.glb`, import.meta.url), Buffer.from(glb));
  console.log(`${side}: ${geometry.attributes.position.count} vertices, ${glb.byteLength} bytes`);
}
