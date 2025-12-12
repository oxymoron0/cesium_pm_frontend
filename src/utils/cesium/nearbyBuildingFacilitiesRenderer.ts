/**
 * Nearby Building Facilities Renderer
 * 건물 시설물을 Cesium에 렌더링합니다.
 * - Point 좌표 기반: 하얀색 사각형 폴리곤 (10m x 10m)
 * - 지면 위 0.5m에 평면으로 렌더링
 */

import {
  Cartesian3,
  Color,
  Entity,
  PolygonGraphics,
  Viewer,
  ColorMaterialProperty,
  HeightReference,
  PolygonHierarchy
} from 'cesium';
import { createGeoJsonDataSource, clearDataSource } from './datasources';

// --- Type Definitions ---
export interface BuildingFacilityFeature {
  type: 'Feature';
  geometry: {
    type: 'MultiPolygon';
    coordinates: number[][][][]; // MultiPolygon: [polygon][ring][point][lng/lat]
  };
  properties: {
    id: string;
    lod1_shape_id: number;
    height: number;
    ground_level: number;
    distance_m: number;
    name?: string;
    [key: string]: unknown;
  };
}

export interface BuildingFacilitiesResponse {
  type: 'FeatureCollection';
  features: BuildingFacilityFeature[];
  total: number;
}

// --- Constants ---
const BUILDING_DATASOURCE_NAME = 'nearby_building_facilities';

// 건물 폴리곤 스타일
const BUILDING_STYLES = {
  color: Color.WHITE.withAlpha(1.0), // 하얀색 반투명
  outline: true,
  outlineColor: Color.WHITE, // 하얀색 외곽선
  outlineWidth: 2
};

// --- Helper Functions ---

/**
 * Polygon/MultiPolygon 좌표를 Cesium PolygonHierarchy 배열로 변환
 * 3중 배열(Polygon)과 4중 배열(MultiPolygon) 모두 지원
 */
function createPolygonHierarchies(
  coords: number[][][] | number[][][][]
): PolygonHierarchy[] {
  console.log('[nearbyBuildingFacilitiesRenderer] createPolygonHierarchies input:', coords);
  const hierarchies: PolygonHierarchy[] = [];

  if (!coords || coords.length === 0) return hierarchies;

  let polygons: number[][][][] = [];

  // 타입 가드: 4중 배열인지 3중 배열인지 확인 (coords[0][0]이 배열이면 4중)
  // Polygon: [Ring][Point][lat,lng] -> coords[0][0] is number
  // MultiPolygon: [Polygon][Ring][Point][lat,lng] -> coords[0][0] is array
  const firstElement = coords[0];
  const secondElement = Array.isArray(firstElement) ? firstElement[0] : undefined;
  const isMultiPolygon = Array.isArray(secondElement) && Array.isArray(secondElement[0]);
  console.log('[nearbyBuildingFacilitiesRenderer] isMultiPolygon:', isMultiPolygon);

  if (isMultiPolygon) {
    polygons = coords as number[][][][];
  } else {
    // 단일 Polygon이면 MultiPolygon 형태로 래핑
    polygons = [coords as number[][][]];
  }

  for (const polygonRings of polygons) {
    if (polygonRings.length === 0) continue;

    // 첫 번째 ring은 외곽선 (exterior)
    const exteriorRing = polygonRings[0];
    const exteriorPositions = exteriorRing.map(([lng, lat]) =>
      Cartesian3.fromDegrees(lng, lat)
    );

    // 나머지 ring들은 구멍 (holes)
    const holes = polygonRings.slice(1).map(holeRing =>
      new PolygonHierarchy(
        holeRing.map(([lng, lat]) => Cartesian3.fromDegrees(lng, lat))
      )
    );

    const hierarchy = new PolygonHierarchy(exteriorPositions, holes);
    hierarchies.push(hierarchy);
  }

  return hierarchies;
}

/**
 * 건물 시설물 Feature를 Cesium Entity로 변환 (MultiPolygon)
 * MultiPolygon의 각 폴리곤을 별도 Entity로 생성
 * @param feature - 건물 Feature
 * @param facilityId - 시설 composite key (${id}_${type})
 */
function createBuildingFacilityEntity(
  feature: BuildingFacilityFeature,
  facilityId: string
): Entity[] {
  const entities: Entity[] = [];
  const multiPolygonCoords = feature.geometry.coordinates;

  console.log(`[createBuildingFacilityEntity] Creating entities for facility ${facilityId}, building ${feature.properties.id}`);

  const hierarchies = createPolygonHierarchies(multiPolygonCoords);

  // 각 폴리곤을 별도 Entity로 생성
  hierarchies.forEach((hierarchy, index) => {
    const entityId = `building_${facilityId}_${feature.properties.id}_${index}`;
    const isMain = feature.properties.id.includes("main");

    const entity = new Entity({
      id: entityId,
      polygon: new PolygonGraphics({
        hierarchy: hierarchy,
        material: new ColorMaterialProperty(
          isMain ? Color.fromCssColorString('#FF0040') : BUILDING_STYLES.color
        ),
        outline: BUILDING_STYLES.outline,
        outlineColor: new ColorMaterialProperty(BUILDING_STYLES.outlineColor),
        outlineWidth: BUILDING_STYLES.outlineWidth,

        // 지형에 딱 붙게 설정
        heightReference: HeightReference.CLAMP_TO_GROUND,

        // 지형으로부터 상대적인 높이로 돌출
        extrudedHeight: feature.properties.height,
        extrudedHeightReference: HeightReference.RELATIVE_TO_GROUND
      }),
      properties: {
        facilityId: facilityId, // composite key (${id}_${type})
        buildingId: feature.properties.id,
        lod1_shape_id: feature.properties.lod1_shape_id,
        height: feature.properties.height,
        ground_level: feature.properties.ground_level,
        distance_m: feature.properties.distance_m
      }
    });

    entities.push(entity);
  });

  console.log(`[createBuildingFacilityEntity] Created ${entities.length} entity/entities for building ${feature.properties.id}`);

  return entities;
}

// --- Public API ---

/**
 * 단일 시설의 주변 건물 시설물 검색 결과를 렌더링
 * @param facilityId - 시설 composite key (${id}_${type})
 * @param buildingData - 건물 시설물 검색 결과
 */
export async function renderNearbyBuildingFacilitiesForFacility(
  facilityId: string,
  buildingData: BuildingFacilitiesResponse
): Promise<void> {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) {
      console.error('[renderNearbyBuildingFacilitiesForFacility] Cesium viewer not found');
      return;
    }

    // 건물 렌더링 전 depth test 활성화
    viewer.scene.globe.depthTestAgainstTerrain = true;

    console.log(`[renderNearbyBuildingFacilitiesForFacility] === RENDERING START ===`);
    console.log(`[renderNearbyBuildingFacilitiesForFacility] Facility ID: ${facilityId}`);
    console.log(`[renderNearbyBuildingFacilitiesForFacility] Total buildings: ${buildingData.total}`);
    console.log('[renderNearbyBuildingFacilitiesForFacility] Building features:', buildingData.features.map(f => ({
      id: f.properties.id,
      lod1_shape_id: f.properties.lod1_shape_id,
      height: f.properties.height,
      distance_m: f.properties.distance_m
    })));

    // DataSource 생성 또는 가져오기
    const buildingDataSource = await createGeoJsonDataSource(BUILDING_DATASOURCE_NAME);
    console.log(`[renderNearbyBuildingFacilitiesForFacility] DataSource: ${buildingDataSource.name}, show: ${buildingDataSource.show}`);

    let totalEntitiesAdded = 0;
    // 건물 Entity 생성 및 추가
    buildingData.features.forEach((feature, index) => {
      console.log(`[renderNearbyBuildingFacilitiesForFacility] Processing feature ${index + 1}/${buildingData.features.length}`);

      // createBuildingFacilityEntity는 Entity 배열을 반환 (MultiPolygon의 각 폴리곤마다)
      const buildingEntities = createBuildingFacilityEntity(feature, facilityId);

      buildingEntities.forEach(entity => {
        buildingDataSource.entities.add(entity);
        totalEntitiesAdded++;
      });
    });

    console.log(
      `[renderNearbyBuildingFacilitiesForFacility] Successfully rendered ${buildingData.total} building facilities (${totalEntitiesAdded} entities) for facility ${facilityId}`
    );
    console.log(`[renderNearbyBuildingFacilitiesForFacility] Total entities in dataSource: ${buildingDataSource.entities.values.length}`);
  } catch (error) {
    console.error('[renderNearbyBuildingFacilitiesForFacility] Failed to render building facilities:', error);
  }
}

/**
 * 여러 시설의 주변 건물 시설물 검색 결과를 렌더링
 * @param buildingDataMap - 시설 ID를 키로 하는 건물 시설물 검색 결과 Map
 */
export async function renderNearbyBuildingFacilitiesMultiple(
  buildingDataMap: Map<string, BuildingFacilitiesResponse>
): Promise<void> {
  try {
    const promises = Array.from(buildingDataMap.entries()).map(([facilityId, buildingData]) =>
      renderNearbyBuildingFacilitiesForFacility(facilityId, buildingData)
    );

    await Promise.all(promises);
    console.log(`[renderNearbyBuildingFacilitiesMultiple] Rendered building facilities for ${buildingDataMap.size} facilities`);
  } catch (error) {
    console.error('[renderNearbyBuildingFacilitiesMultiple] Failed to render building facilities:', error);
  }
}

/**
 * 특정 시설의 건물 시설물 렌더링 제거
 * @param facilityId - 시설 composite key (${id}_${type})
 */
export function clearNearbyBuildingFacilitiesForFacility(facilityId: string): void {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) return;

    const buildingDataSource = viewer.dataSources.getByName(BUILDING_DATASOURCE_NAME)[0];

    if (buildingDataSource) {
      console.log(`[clearNearbyBuildingFacilitiesForFacility] === CLEARING START ===`);
      console.log(`[clearNearbyBuildingFacilitiesForFacility] Facility ID: ${facilityId}`);
      console.log(`[clearNearbyBuildingFacilitiesForFacility] Total entities before clear: ${buildingDataSource.entities.values.length}`);

      const entitiesToRemove = buildingDataSource.entities.values.filter(
        entity => entity.properties?.facilityId?.getValue() === facilityId
      );

      console.log(`[clearNearbyBuildingFacilitiesForFacility] Entities to remove: ${entitiesToRemove.length}`);
      console.log(`[clearNearbyBuildingFacilitiesForFacility] Entities being removed:`, entitiesToRemove.map(e => e.id));

      entitiesToRemove.forEach(entity => buildingDataSource.entities.remove(entity));

      console.log(`[clearNearbyBuildingFacilitiesForFacility] Total entities after clear: ${buildingDataSource.entities.values.length}`);
    } else {
      console.warn(`[clearNearbyBuildingFacilitiesForFacility] DataSource not found for facility ${facilityId}`);
    }

    console.log(`[clearNearbyBuildingFacilitiesForFacility] === CLEARING END ===`);
  } catch (error) {
    console.error('[clearNearbyBuildingFacilitiesForFacility] Failed to clear building facilities:', error);
  }
}

/**
 * 모든 건물 시설물 렌더링 제거
 */
export function clearAllNearbyBuildingFacilities(): void {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;

    clearDataSource(BUILDING_DATASOURCE_NAME);

    // 모든 건물 제거 후 depth test 비활성화
    if (viewer) {
      viewer.scene.globe.depthTestAgainstTerrain = false;
    }

    console.log('[clearAllNearbyBuildingFacilities] Cleared all nearby building facilities');
  } catch (error) {
    console.error('[clearAllNearbyBuildingFacilities] Failed to clear building facilities:', error);
  }
}

/**
 * 건물 시설물 가시성 토글
 * @param visible - 표시 여부
 */
export function toggleNearbyBuildingFacilitiesVisibility(visible: boolean): void {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) return;

    const buildingDataSource = viewer.dataSources.getByName(BUILDING_DATASOURCE_NAME)[0];

    if (buildingDataSource) {
      buildingDataSource.show = visible;
    }

    console.log(`[toggleNearbyBuildingFacilitiesVisibility] Set visibility to ${visible}`);
  } catch (error) {
    console.error('[toggleNearbyBuildingFacilitiesVisibility] Failed to toggle visibility:', error);
  }
}
