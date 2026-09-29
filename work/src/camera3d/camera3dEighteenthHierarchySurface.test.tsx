import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe,expect,it,vi} from 'vitest'
import {CameraSceneHierarchy} from './CameraSceneHierarchy'
import {addEntity,createCameraDocument,type ShapeGroup} from './model'

describe('3D Camera Eighteenth root sibling hierarchy',()=>{
 it('renders Shot/Camera units and global assets as root siblings rather than shot children',()=>{
  let document=addEntity(createCameraDocument('hierarchy'),'block','Block 1')
  document=addEntity(document,'sphere','Sphere 1')
  document.groups=[{id:'outer',name:'Outer',childIds:['inner',document.entities[1].id],shapeLocked:false,pivot:[0,0,0],rotation:[0,0,0]},{id:'inner',name:'Inner',childIds:[document.entities[0].id],shapeLocked:false,pivot:[0,0,0],rotation:[0,0,0]} as ShapeGroup]
  document.sceneTree=[document.shots[0].id,'outer']
  const html=renderToStaticMarkup(<CameraSceneHierarchy document={document} activeShotId={document.shots[0].id} selectedIds={[]} expandedGroups={new Set(['outer','inner'])} onShot={vi.fn()} onEntity={vi.fn()} onGroup={vi.fn()} onToggleGroup={vi.fn()} onAllLock={vi.fn()}/>)
  expect(html).toContain('data-root-kind="shot-camera"')
  expect(html).toContain('data-root-kind="group"')
  expect(html).toContain('data-tree-depth="2"')
  const shotEnd=html.indexOf('</div>',html.indexOf('data-root-kind="shot-camera"'))
  expect(html.indexOf('Block 1')).toBeGreaterThan(shotEnd)
  expect(html).not.toContain('aria-label="Shot 1 entities"')
 })
})
