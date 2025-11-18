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
  HeightReference
} from 'cesium';
import { createGeoJsonDataSource, clearDataSource } from './datasources';
import type { RoadSearchResponse, RoadFeature } from '@/pages/Priority/types';

// --- Constants ---
const ROAD_DATASOURCE_NAME = 'nearby_roads';

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
 */
function createRoadEntity(feature: RoadFeature, facilityId: string): Entity[] {
  const entities: Entity[] = [];
  const cartesianArrays = multiLineStringToCartesianArrays(feature.geometry.coordinates);

  cartesianArrays.forEach((positions, index) => {
    const entity = new Entity({
      id: `road_${facilityId}_${feature.properties.ogc_fid}_${index}`,
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
        facilityId: facilityId,
        roadName: feature.properties.rn,
        roadNameEng: feature.properties.eng_rn,
        roadCode: feature.properties.rn_cd,
        regionCode: feature.properties.sig_cd
      }
    });
    entities.push(entity);
  });

  return entities;
}


// --- Public API ---

/**
 * 단일 시설의 주변 도로 검색 결과를 렌더링
 * @param facilityId - 시설 ID
 * @param roadData - 도로 검색 결과
 */
export async function renderNearbyRoadsForFacility(
  facilityId: string,
  roadData: RoadSearchResponse
): Promise<void> {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) {
      console.error('[renderNearbyRoadsForFacility] Cesium viewer not found');
      return;
    }

    // DataSource 생성 또는 가져오기
    const roadDataSource = await createGeoJsonDataSource(ROAD_DATASOURCE_NAME);

    // 도로 Entity 생성 및 추가
    roadData.features.forEach(feature => {
      const roadEntities = createRoadEntity(feature, facilityId);
      roadEntities.forEach(entity => {
        roadDataSource.entities.add(entity);
      });
    });

    console.log(
      `[renderNearbyRoadsForFacility] Rendered ${roadData.total} road segments for facility ${facilityId}`
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
 * @param facilityId - 시설 ID
 */
export function clearNearbyRoadsForFacility(facilityId: string): void {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) return;

    const roadDataSource = viewer.dataSources.getByName(ROAD_DATASOURCE_NAME)[0];

    if (roadDataSource) {
      const entitiesToRemove = roadDataSource.entities.values.filter(
        entity => entity.properties?.facilityId?.getValue() === facilityId
      );
      entitiesToRemove.forEach(entity => roadDataSource.entities.remove(entity));
    }

    console.log(`[clearNearbyRoadsForFacility] Cleared roads for facility ${facilityId}`);
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
    console.log('[clearAllNearbyRoads] Cleared all nearby roads');
  } catch (error) {
    console.error('[clearAllNearbyRoads] Failed to clear roads:', error);
  }
}

/**
 * 도로 가시성 토글
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
