import {
  Model,
  Primitive,
  PointPrimitiveCollection,
  BillboardCollection,
  LabelCollection,
  Cesium3DTileset,
  PolylineCollection,
  PrimitiveCollection
} from 'cesium';

/**
 * Cesium에서 Scene.primitives에 추가될 수 있는 일반적인 객체 타입들
 */
export type CesiumPrimitive =
  | Model
  | Primitive
  | PointPrimitiveCollection
  | BillboardCollection
  | LabelCollection
  | Cesium3DTileset
  | PolylineCollection
  | PrimitiveCollection;

/**
 * Primitive 그룹 관리 유틸리티
 *
 * DataSource와 달리 Primitive는 viewer.scene.primitives에 직접 추가되므로
 * 그룹 단위 관리를 위한 별도의 Map 구조 사용
 */

interface PrimitiveGroup {
  name: string
  primitives: CesiumPrimitive[]
  show: boolean
}

const primitiveGroups = new Map<string, PrimitiveGroup>()

/**
 * 새로운 Primitive 그룹을 생성하는 함수
 * @param name - 그룹 이름
 * @returns PrimitiveGroup 인스턴스
 * @throws 이미 존재하는 name이면 에러 발생
 */
export function createPrimitiveGroup(name: string): PrimitiveGroup {
  const viewer = window.cviewer

  if (!viewer) {
    throw new Error('[createPrimitiveGroup] window.cviewer가 준비되지 않았습니다.')
  }

  if (primitiveGroups.has(name)) {
    throw new Error(`[createPrimitiveGroup] 이미 존재하는 그룹 name: ${name}`)
  }

  const group: PrimitiveGroup = {
    name,
    primitives: [],
    show: true
  }

  primitiveGroups.set(name, group)
  console.log(`[createPrimitiveGroup] 새 Primitive 그룹 생성: ${name}`)
  return group
}

/**
 * Primitive 그룹을 이름으로 검색하는 함수
 * @param name - 그룹 이름
 * @returns PrimitiveGroup 또는 undefined
 */
export function findPrimitiveGroup(name: string): PrimitiveGroup | undefined {
  return primitiveGroups.get(name)
}

/**
 * Primitive를 그룹에 추가하는 함수
 * @param groupName - 그룹 이름
 * @param primitive - 추가할 Primitive 인스턴스
 * @returns 추가 성공 여부
 */
export function addPrimitive(groupName: string, primitive: CesiumPrimitive): boolean {
  const viewer = window.cviewer

  if (!viewer) {
    console.warn('[addPrimitive] window.cviewer가 준비되지 않았습니다.')
    return false
  }

  const group = primitiveGroups.get(groupName)

  if (!group) {
    console.warn(`[addPrimitive] 그룹을 찾을 수 없습니다: ${groupName}`)
    return false
  }

  // scene.primitives에 추가
  viewer.scene.primitives.add(primitive)

  // 그룹 배열에 추가
  group.primitives.push(primitive)
  
  // 그룹 show 상태 반영
  if ('show' in primitive) {
    primitive.show = group.show
  }

  console.log(`[addPrimitive] Primitive 추가: ${groupName} (총 ${group.primitives.length}개)`)
  return true
}

/**
 * Primitive 그룹을 제거하는 함수
 * @param name - 제거할 그룹 이름
 * @returns 제거 성공 여부
 */
export function removePrimitiveGroup(name: string): boolean {
  const viewer = window.cviewer

  if (!viewer) {
    console.warn('[removePrimitiveGroup] window.cviewer가 준비되지 않았습니다.')
    return false
  }

  const group = primitiveGroups.get(name)

  if (!group) {
    console.warn(`[removePrimitiveGroup] 그룹을 찾을 수 없습니다: ${name}`)
    return false
  }

  // scene.primitives에서 모든 Primitive 제거
  group.primitives.forEach(primitive => {
    viewer.scene.primitives.remove(primitive)
  })

  // Map에서 제거
  primitiveGroups.delete(name)

  console.log(`[removePrimitiveGroup] Primitive 그룹 제거: ${name} (${group.primitives.length}개)`)
  return true
}

/**
 * Primitive 그룹의 모든 Primitive를 제거하는 함수 (그룹은 유지)
 * @param name - 정리할 그룹 이름
 */
export function clearPrimitiveGroup(name: string): void {
  const viewer = window.cviewer

  if (!viewer) {
    console.warn('[clearPrimitiveGroup] window.cviewer가 준비되지 않았습니다.')
    return
  }

  const group = primitiveGroups.get(name)

  if (!group) {
    console.warn(`[clearPrimitiveGroup] 그룹을 찾을 수 없습니다: ${name}`)
    return
  }

  // scene.primitives에서 모든 Primitive 제거
  group.primitives.forEach(primitive => {
    viewer.scene.primitives.remove(primitive)
  })

  // 배열만 비우기 (그룹은 유지)
  group.primitives = []

  console.log(`[clearPrimitiveGroup] Primitive 그룹 정리: ${name}`)
}


/**
 * Primitive를 그룹에서 제거하는 함수
 * @param groupName - 그룹 이름
 * @param primitive - 제거할 Primitive 인스턴스
 * @returns 제거 성공 여부
 */
export function removePrimitive(groupName: string, primitive: CesiumPrimitive): boolean {
  const viewer = window.cviewer

  if (!viewer) {
    console.warn('[removePrimitive] window.cviewer가 준비되지 않았습니다.')
    return false
  }

  const group = primitiveGroups.get(groupName)

  if (!group) {
    console.warn(`[removePrimitive] 그룹을 찾을 수 없습니다: ${groupName}`)
    return false
  }

  // scene.primitives에서 제거
  viewer.scene.primitives.remove(primitive)

  // 그룹 배열에서 제거
  const index = group.primitives.indexOf(primitive)
  if (index > -1) {
    group.primitives.splice(index, 1)
    console.log(`[removePrimitive] Primitive 제거: ${groupName} (남은 개수: ${group.primitives.length})`)
    return true
  }

  console.warn(`[removePrimitive] Primitive를 그룹에서 찾을 수 없습니다: ${groupName}`)
  return false
}

/**
 * 모든 Primitive 그룹 목록 반환
 * @returns 그룹 이름 배열
 */
export function listPrimitiveGroups(): string[] {
  return Array.from(primitiveGroups.keys())
}

/**
 * Primitive 그룹 정보 조회
 * @param name - 그룹 이름
 * @returns 그룹 정보 (이름, Primitive 개수, 표시 여부)
 */
export function getPrimitiveGroupInfo(name: string): { name: string; count: number; show: boolean } | undefined {
  const group = primitiveGroups.get(name)

  if (!group) {
    return undefined
  }

  return {
    name: group.name,
    count: group.primitives.length,
    show: group.show
  }
}

/**
 * 모든 Primitive 그룹 제거
 */
export function removeAllPrimitiveGroups(): void {
  const viewer = window.cviewer

  if (!viewer) {
    console.warn('[removeAllPrimitiveGroups] window.cviewer가 준비되지 않았습니다.')
    return
  }

  primitiveGroups.forEach((group, name) => {
    group.primitives.forEach(primitive => {
      viewer.scene.primitives.remove(primitive)
    })
    console.log(`[removeAllPrimitiveGroups] 그룹 제거: ${name}`)
  })

  primitiveGroups.clear()
  console.log('[removeAllPrimitiveGroups] 모든 Primitive 그룹 제거 완료')
}
