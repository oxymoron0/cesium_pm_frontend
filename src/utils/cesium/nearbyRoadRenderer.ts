/**
 * Nearby Road Renderer
 * 도로 검색 결과를 Cesium에 렌더링합니다.
 * - MultiLineString 도로: CorridorGraphics (반투명 연두색 폴리곤, 진한 녹색 외곽선)
 * - 지면 위 0.5m에 평면으로 렌더링
 */

import {
  Cartesian3,
  Color,
  Entity,
  CorridorGraphics,
  Viewer,
  ColorMaterialProperty,
  HeightReference,
  ConstantProperty
} from 'cesium';
import { createGeoJsonDataSource, clearDataSource } from './datasources';
import type { RoadSearchResponse, RoadFeature } from '@/pages/Priority/types';

// --- Constants ---
const ROAD_DATASOURCE_NAME = 'nearby_roads';

// 도로명별 렌더링 상태 추적 (전역)
const renderedRoads: Map<string, Set<string>> = new Map(); // roadName -> Set<facilityId>

// 시설별 도로 추적 (전역)
const facilityRoads: Map<string, Set<string>> = new Map(); // facilityId -> Set<roadName>

// 도로 스타일
const ROAD_STYLES = {
  width: 10, // 복도 폭 (미터)
  color: Color.fromCssColorString('#7CFC00').withAlpha(0.5), // 반투명 연두색
  outline: true, // 외곽선 표시
  outlineColor: Color.fromCssColorString('#4CAF50'), // 진한 녹색 외곽선
  outlineWidth: 1
};

// --- Helper Functions ---

/**
 * MultiLineString 좌표를 Cartesian3 배열로 변환
 */
function multiLineStringToCartesianArrays(coordinates: number[][][]): Cartesian3[][] {
  return coordinates.map(lineString =>
    lineString.map(([lng, lat, alt = 0]) => Cartesian3.fromDegrees(lng, lat, alt))
  );
}

/**
 * 도로 Feature를 Cesium Entity로 변환 (Corridor 사용)
 * - 도로명 기반 Entity ID: `road_{roadName}_{segmentIndex}`
 */
function createRoadEntity(feature: RoadFeature, facilityId: string): Entity[] {
  const entities: Entity[] = [];
  const cartesianArrays = multiLineStringToCartesianArrays(feature.geometry.coordinates);
  const roadName = feature.properties.rn;

  cartesianArrays.forEach((positions, index) => {
    const entity = new Entity({
      id: `road_${roadName}_${index}`,
      corridor: new CorridorGraphics({
        positions: positions,
        width: ROAD_STYLES.width,
        material: new ColorMaterialProperty(ROAD_STYLES.color),
        outline: ROAD_STYLES.outline,
        outlineColor: new ColorMaterialProperty(ROAD_STYLES.outlineColor),
        extrudedHeight: undefined, // 돌출 높이 없음 (평면)
        heightReference: HeightReference.CLAMP_TO_GROUND
      }),
      properties: {
        roadName: roadName,
        roadNameEng: feature.properties.eng_rn,
        roadCode: feature.properties.rn_cd,
        regionCode: feature.properties.sig_cd,
        facilityIds: new ConstantProperty([facilityId]) // 초기 시설 ID
      }
    });
    entities.push(entity);
  });

  return entities;
}


// --- Public API ---

/**
 * 단일 시설의 주변 도로 검색 결과를 렌더링
 * - 도로명 기반 중복 방지: 이미 렌더링된 도로는 시설 ID만 추가
 * @param facilityId - 시설 ID
 * @param roadData - 도로 검색 결과
 */
export async function renderNearbyRoadsForFacility(
  facilityId: string,
  roadData: RoadSearchResponse
): Promise<void> {
  try {
    // 빈 데이터 체크
    if (!roadData || !roadData.features || roadData.features.length === 0) {
      console.log(`[renderNearbyRoadsForFacility] No roads to render for facility ${facilityId}`);
      return;
    }

    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) {
      console.error('[renderNearbyRoadsForFacility] Cesium viewer not found');
      return;
    }

    // DataSource 생성 또는 가져오기
    const roadDataSource = await createGeoJsonDataSource(ROAD_DATASOURCE_NAME);

    // 시설의 도로 Set 초기화
    if (!facilityRoads.has(facilityId)) {
      facilityRoads.set(facilityId, new Set());
    }

    // 도로명별로 그룹화 (중복 제거)
    const roadsByName = new Map<string, RoadFeature>();
    
    roadData.features.forEach(feature => {
      const roadName = feature.properties.rn;
      if (!roadsByName.has(roadName)) {
        roadsByName.set(roadName, feature);
      }
    });

    console.log(
      `[renderNearbyRoadsForFacility] Processing ${roadsByName.size} unique roads for facility ${facilityId}`
    );

    // 각 도로 처리
    roadsByName.forEach((feature, roadName) => {
      // 시설에 도로 추가
      facilityRoads.get(facilityId)!.add(roadName);

      // 이미 렌더링된 도로인지 확인
      if (renderedRoads.has(roadName)) {
        // 기존 Entity에 시설 ID 추가
        const existingFacilities = renderedRoads.get(roadName)!;
        existingFacilities.add(facilityId);

        // Entity properties 업데이트
        const cartesianArrays = multiLineStringToCartesianArrays(feature.geometry.coordinates);
        cartesianArrays.forEach((_, index) => {
          const entityId = `road_${roadName}_${index}`;
          const entity = roadDataSource.entities.getById(entityId);
          if (entity && entity.properties) {
            const currentIds = (entity.properties.facilityIds?.getValue(new Date()) as string[]) || [];
            if (!currentIds.includes(facilityId)) {
              entity.properties.facilityIds = new ConstantProperty([...currentIds, facilityId]);
            }
          }
        });

        console.log(
          `[renderNearbyRoadsForFacility] Road "${roadName}" already rendered, added facility ${facilityId}`
        );
      } else {
        // 새 도로 렌더링
        const roadEntities = createRoadEntity(feature, facilityId);
        roadEntities.forEach(entity => {
          roadDataSource.entities.add(entity);
        });

        // 렌더링 상태 추적
        renderedRoads.set(roadName, new Set([facilityId]));

        console.log(`[renderNearbyRoadsForFacility] Rendered new road "${roadName}"`);
      }
    });

    console.log(
      `[renderNearbyRoadsForFacility] Completed rendering for facility ${facilityId}`
    );
  } catch (error) {
    console.error('[renderNearbyRoadsForFacility] Failed to render roads:', error);
  }
}

/**
 * 여러 시설의 주변 도로 검색 결과를 렌더링
 * @param roadDataMap - 시설 ID를 키로 하는 도로 검색 결과 Map
 */
export async function renderNearbyRoadsMultiple(
  roadDataMap: Map<string, RoadSearchResponse>
): Promise<void> {
  try {
    const promises = Array.from(roadDataMap.entries()).map(([facilityId, roadData]) =>
      renderNearbyRoadsForFacility(facilityId, roadData)
    );

    await Promise.all(promises);
    console.log(`[renderNearbyRoadsMultiple] Rendered roads for ${roadDataMap.size} facilities`);
  } catch (error) {
    console.error('[renderNearbyRoadsMultiple] Failed to render roads:', error);
  }
}

/**
 * 특정 시설의 도로 렌더링 제거
 * - 다른 시설이 공유하는 도로는 유지하고 시설 ID만 제거
 * @param facilityId - 시설 ID
 */
export function clearNearbyRoadsForFacility(facilityId: string): void {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) return;

    const roadDataSource = viewer.dataSources.getByName(ROAD_DATASOURCE_NAME)[0];
    if (!roadDataSource) return;

    // 시설의 도로 목록 가져오기
    const roads = facilityRoads.get(facilityId);
    if (!roads || roads.size === 0) {
      console.log(`[clearNearbyRoadsForFacility] No roads to clear for facility ${facilityId}`);
      return;
    }

    const roadsToRemove: string[] = [];
    const roadsToUpdate: string[] = [];

    roads.forEach(roadName => {
      const facilities = renderedRoads.get(roadName);
      if (!facilities) return;

      // 시설 ID 제거
      facilities.delete(facilityId);

      if (facilities.size === 0) {
        // 마지막 시설이면 도로 Entity 제거
        roadsToRemove.push(roadName);
        renderedRoads.delete(roadName);
      } else {
        // 다른 시설이 공유 중이면 Entity properties만 업데이트
        roadsToUpdate.push(roadName);
      }
    });

    // Entity 제거
    roadsToRemove.forEach(roadName => {
      let segmentIndex = 0;
      let entity = roadDataSource.entities.getById(`road_${roadName}_${segmentIndex}`);
      while (entity) {
        roadDataSource.entities.remove(entity);
        segmentIndex++;
        entity = roadDataSource.entities.getById(`road_${roadName}_${segmentIndex}`);
      }
    });

    // Entity properties 업데이트
    roadsToUpdate.forEach(roadName => {
      let segmentIndex = 0;
      let entity = roadDataSource.entities.getById(`road_${roadName}_${segmentIndex}`);
      while (entity) {
        if (entity.properties) {
          const currentIds = (entity.properties.facilityIds?.getValue(new Date()) as string[]) || [];
          const updatedIds = currentIds.filter((id: string) => id !== facilityId);
          entity.properties.facilityIds = new ConstantProperty(updatedIds);
        }
        segmentIndex++;
        entity = roadDataSource.entities.getById(`road_${roadName}_${segmentIndex}`);
      }
    });

    // 시설 도로 목록 제거
    facilityRoads.delete(facilityId);

    console.log(
      `[clearNearbyRoadsForFacility] Cleared roads for facility ${facilityId}: ` +
      `${roadsToRemove.length} removed, ${roadsToUpdate.length} updated`
    );
  } catch (error) {
    console.error('[clearNearbyRoadsForFacility] Failed to clear roads:', error);
  }
}

/**
 * 모든 도로 렌더링 제거
 */
export function clearAllNearbyRoads(): void {
  try {
    clearDataSource(ROAD_DATASOURCE_NAME);
    renderedRoads.clear();
    facilityRoads.clear();
    console.log('[clearAllNearbyRoads] Cleared all nearby roads and tracking data');
  } catch (error) {
    console.error('[clearAllNearbyRoads] Failed to clear roads:', error);
  }
}

/**
 * 도로 가시성 토글 (전체)
 * @param visible - 표시 여부
 */
export function toggleNearbyRoadsVisibility(visible: boolean): void {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) return;

    const roadDataSource = viewer.dataSources.getByName(ROAD_DATASOURCE_NAME)[0];

    if (roadDataSource) {
      roadDataSource.show = visible;
    }

    console.log(`[toggleNearbyRoadsVisibility] Set visibility to ${visible}`);
  } catch (error) {
    console.error('[toggleNearbyRoadsVisibility] Failed to toggle visibility:', error);
  }
}

/**
 * 특정 도로의 가시성 토글
 * @param roadName - 도로명
 * @param visible - 표시 여부
 */
export function toggleRoadVisibility(roadName: string, visible: boolean): void {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) {
      console.error('[toggleRoadVisibility] Cesium viewer not found');
      return;
    }

    const roadDataSource = viewer.dataSources.getByName(ROAD_DATASOURCE_NAME)[0];
    if (!roadDataSource) {
      console.error('[toggleRoadVisibility] Road data source not found');
      return;
    }

    // 도로의 모든 세그먼트 Entity 찾아서 show 속성 변경
    let segmentIndex = 0;
    let entity = roadDataSource.entities.getById(`road_${roadName}_${segmentIndex}`);

    while (entity) {
      entity.show = visible;
      segmentIndex++;
      entity = roadDataSource.entities.getById(`road_${roadName}_${segmentIndex}`);
    }

    console.log(`[toggleRoadVisibility] Set road "${roadName}" visibility to ${visible}`);
  } catch (error) {
    console.error('[toggleRoadVisibility] Failed to toggle road visibility:', error);
  }
}

/**
 * 렌더링된 모든 도로명 목록 가져오기
 * @returns 도로명 배열
 */
export function getRenderedRoadNames(): string[] {
  return Array.from(renderedRoads.keys());
}

/**
 * 특정 도로가 렌더링되어 있는지 확인
 * @param roadName - 도로명
 * @returns 렌더링 여부
 */
export function isRoadRendered(roadName: string): boolean {
  return renderedRoads.has(roadName);
}
