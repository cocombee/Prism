import { expect, it } from 'vitest'
import { visiblePortCells } from './nodePortOcclusion'
const rect = { left:100, top:100, right:132, bottom:132 }
const visible = (cells: ReturnType<typeof visiblePortCells>, x:number,y:number) => cells.some(r => x>=r.left && x<r.right && y>=r.top && y<r.bottom)
it('keeps uncovered port content and clips behind its own or overlapping nodes without XOR leaks', () => {
  const cells=visiblePortCells(rect,[{left:116,top:80,right:200,bottom:160},{left:120,top:110,right:190,bottom:140}],1)
  expect(visible(cells,8,16)).toBe(true)
  expect(visible(cells,24,16)).toBe(false)
  expect(visible(cells,24,24)).toBe(false)
  expect(visible(visiblePortCells(rect,[],1),24,16)).toBe(true)
})
it('uses local units at canvas zoom and preserves unoccluded reveal overflow', () => {
  const scaled=visiblePortCells({left:200,top:200,right:264,bottom:264},[{left:232,top:180,right:400,bottom:320}],2)
  expect(visible(scaled,8,16)).toBe(true)
  expect(visible(scaled,24,16)).toBe(false)
  expect(visible(visiblePortCells(rect,[],1),-20,16)).toBe(true)
  expect(visiblePortCells(rect,[],0)).toEqual([])
})
