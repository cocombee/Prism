import * as THREE from 'three'
import { voxelPartsFor } from './interaction'
import { transformAnchor, type EntityKind, type EvaluatedFrame, type Vec3 } from './model'

export const sceneGeometryFor = (kind: EntityKind, dimensions: Vec3) => kind === 'sphere'
  ? new THREE.SphereGeometry(dimensions[0] / 2, 32, 24)
  : kind === 'column'
    ? new THREE.CylinderGeometry(dimensions[0] / 2, dimensions[0] / 2, dimensions[1], 32, 1, false)
    : new THREE.BoxGeometry(...dimensions)

export function sceneEntityObject(entity: EvaluatedFrame['entities'][number]): THREE.Object3D {
  const parts = voxelPartsFor(entity.kind); const anchor = transformAnchor(entity.transform); const root = new THREE.Group()
  root.name = entity.name; root.userData.entityId = entity.id; root.userData.transformAnchor = anchor
  root.position.set(...entity.transform.position); root.rotation.set(...entity.transform.rotation.map(THREE.MathUtils.degToRad) as Vec3); root.scale.set(...entity.transform.scale)
  if (parts) {
    const assembly = new THREE.Group(); assembly.name = `${entity.name}-geometry`; assembly.userData.entityId = entity.id
    const authoredColor = entity.kind === 'camera' ? '#8d78d6' : entity.color
    for (const part of parts) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...part.size), new THREE.MeshStandardMaterial({ color: part.color || authoredColor, roughness: .78, metalness: .02 }))
      mesh.name = part.role; mesh.position.set(...part.center); mesh.userData.entityId = entity.id; mesh.castShadow = true; mesh.receiveShadow = true; assembly.add(mesh)
    }
    assembly.position.set(-anchor[0], -anchor[1] - (entity.kind === 'human' ? entity.dimensions[1] / 2 : 0), -anchor[2]); root.add(assembly)
    return root
  }
  const mesh = new THREE.Mesh(sceneGeometryFor(entity.kind, entity.dimensions), new THREE.MeshStandardMaterial({ color: entity.color, roughness: .78, metalness: .02 }))
  mesh.userData.entityId = entity.id; mesh.name = `${entity.name}-geometry`; mesh.position.set(-anchor[0], -anchor[1], -anchor[2]); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh)
  return root
}

export function rebuildSceneContent(group: THREE.Group, frame: EvaluatedFrame, includeCameras = true) {
  group.clear()
  for (const entity of frame.entities) if (includeCameras || entity.kind !== 'camera') group.add(sceneEntityObject(entity))
  for (const object of frame.objects || []) {
    const root = new THREE.Group(); root.name = object.name; root.userData.structuredObjectId = object.id
    for (const part of object.parts) {
      const mesh = new THREE.Mesh(sceneGeometryFor(part.kind, part.dimensions), new THREE.MeshStandardMaterial({ color: object.color, roughness: .78, metalness: .02 }))
      mesh.name = part.name || part.id; mesh.userData.structuredObjectId = object.id; mesh.userData.structuredPartId = part.id
      mesh.matrixAutoUpdate = false; mesh.matrix.copy(part.worldMatrix); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh)
    }
    group.add(root)
  }
}
