import { stationStore } from '../../stores/StationStore';
import { createGeoJsonDataSource, findDataSource, clearDataSource } from './datasources';
import type { RouteStationFeature } from '../api/types';
import type { GeoJsonDataSource } from 'cesium';
import { Cartesian3, Entity, BillboardGraphics, CallbackProperty, ConstantProperty, HeightReference, Cartographic, sampleTerrainMostDetailed } from 'cesium';

/**
 * Station rendering utility functions
 * RouteRenderer 패턴을 따라 GeoJsonDataSource + 직접 Entity 생성 방식
 */

// Terrain 높이 캐시 (성능 최적화)
const terrainHeightCache = new Map<string, number>();

/**
 * 특정 노선의 모든 정류장에 대해 terrain 높이를 비동기적으로 샘플링
 * @param routeName - 노선 번호
 * @param direction - 방향
 */
export async function sampleTerrainForRoute(routeName: string, direction: 'inbound' | 'outbound'): Promise<void> {
  try {
    const viewer = (window as any).cviewer;
    if (!viewer || !viewer.terrainProvider) {
      console.warn('[sampleTerrainForRoute] Viewer or terrain provider not available');
      return;
    }

    const stationData = stationStore.getStationData(routeName, direction);
    if (!stationData?.features || stationData.features.length === 0) {
      console.warn(`[sampleTerrainForRoute] No station data for ${routeName}-${direction}`);
      return;
    }

    // 모든 정류장 위치를 Cartographic 배열로 변환
    const positions = stationData.features.map(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      return Cartographic.fromDegrees(lng, lat);
    });

    // sampleTerrainMostDetailed로 정확한 terrain 높이 획득
    const sampledPositions = await sampleTerrainMostDetailed(viewer.terrainProvider, positions);

    // 캐시에 저장
    sampledPositions.forEach((position, index) => {
      const feature = stationData.features[index];
      const [lng, lat] = feature.geometry.coordinates;
      const key = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
      const height = position.height || 0;
      terrainHeightCache.set(key, height);
    });

    // 해당 노선의 Billboard Entity 위치 업데이트
    await updateStationEntityPositions(routeName, direction);

  } catch (error) {
    console.error(`[sampleTerrainForRoute] Failed to sample terrain for ${routeName}-${direction}:`, error);
  }
}

/**
 * 캐시된 terrain 높이로 정류장 Entity 위치 업데이트
 * @param routeName - 노선 번호
 * @param direction - 방향
 */
async function updateStationEntityPositions(routeName: string, direction: 'inbound' | 'outbound'): Promise<void> {
  try {
    const dataSourceName = getStationDataSourceName(routeName, direction);
    const dataSource = findDataSource(dataSourceName);

    if (!dataSource) {
      console.warn(`[updateStationEntityPositions] DataSource not found: ${dataSourceName}`);
      return;
    }

    const stationData = stationStore.getStationData(routeName, direction);
    if (!stationData?.features) return;

    let updatedCount = 0;

    // 각 정류장 Entity의 위치를 terrain 높이로 업데이트
    stationData.features.forEach(feature => {
      const entityId = `station_${feature.properties.station_id}`;
      const entity = dataSource.entities.getById(entityId);

      if (entity) {
        const [lng, lat] = feature.geometry.coordinates;
        const key = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
        const cachedHeight = terrainHeightCache.get(key);

        if (cachedHeight !== undefined) {
          // 새로운 terrain 높이로 위치 업데이트
          entity.position = new ConstantProperty(Cartesian3.fromDegrees(lng, lat, cachedHeight));
          updatedCount++;
        }
      }
    });


  } catch (error) {
    console.error(`[updateStationEntityPositions] Failed to update positions for ${routeName}-${direction}:`, error);
  }
}

/**
 * 캐시에서 terrain 높이 조회
 * @param longitude - 경도
 * @param latitude - 위도
 * @returns 캐시된 높이 또는 0
 */
function getCachedTerrainHeight(longitude: number, latitude: number): number {
  const key = `${longitude.toFixed(6)}_${latitude.toFixed(6)}`;
  return terrainHeightCache.get(key) || 0;
}

/**
 * 노선별 정류장 DataSource 이름 생성
 * @param routeName - 노선 번호
 * @param direction - 방향 (inbound/outbound)
 * @returns DataSource 이름
 */
function getStationDataSourceName(routeName: string, direction: 'inbound' | 'outbound'): string {
  return `stations_${routeName}_${direction}`;
}

/**
 * 정류장 Point Entity 생성 (RouteRenderer 패턴 따라하기)
 * @param feature - RouteStationFeature
 * @param direction - 방향 정보 (inbound/outbound)
 * @returns Cesium Entity
 */
function createStationEntity(feature: RouteStationFeature, direction: 'inbound' | 'outbound'): Entity {
  const coords = feature.geometry.coordinates; // [lng, lat]
  const basePath = import.meta.env.VITE_BASE_PATH || '/';

  // 캐시된 terrain 높이가 있으면 사용, 없으면 0 높이로 생성
  const cachedHeight = getCachedTerrainHeight(coords[0], coords[1]);
  const position = Cartesian3.fromDegrees(coords[0], coords[1], cachedHeight);

  return new Entity({
    id: `station_${feature.properties.station_id}`,
    name: feature.properties.station_name,
    position: position,
    billboard: new BillboardGraphics({
      // 상태에 따른 동적 이미지 변경
      image: new CallbackProperty(() => {
        const isSelected = stationStore.isStationSelected(feature.properties.station_id);
        const isRouteSelected = stationStore.selectedRouteName === feature.properties.route_name;
        const isDirectionSelected = stationStore.selectedDirection === direction;

        // 선택된 정류장이거나 활성 상태의 노선+방향이면 활성 아이콘
        if (isSelected || (isRouteSelected && isDirectionSelected)) {
          return `${basePath}icon/station_active.svg`;
        }
        // 그 외는 비활성 아이콘
        return `${basePath}icon/station_inactive.svg`;
      }, false),

      // 픽셀 기반 크기 사용
      sizeInMeters: new ConstantProperty(false),
      width: new CallbackProperty(() => {
        const isSelected = stationStore.isStationSelected(feature.properties.station_id);
        return isSelected ? 35 : 30; // 선택된 정류장은 조금 더 크게
      }, false),
      height: new CallbackProperty(() => {
        const isSelected = stationStore.isStationSelected(feature.properties.station_id);
        return isSelected ? 35 : 30; // 선택된 정류장은 조금 더 크게
      }, false),

      // 고정 스타일 속성 - terrain 높이를 직접 적용하므로 CLAMP_TO_GROUND 사용
      heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
      disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
      verticalOrigin: new ConstantProperty(1) // BOTTOM으로 설정하여 바닥에 맞춤
    }),

    // Entity 메타데이터 (InfoBox용)
    description: new ConstantProperty(
      `<div style="font-family: Pretendard;">` +
      `<h3>${feature.properties.station_name}</h3>` +
      `<p><strong>정류장 ID:</strong> ${feature.properties.station_id}</p>` +
      `<p><strong>ARS ID:</strong> ${feature.properties.ars_id}</p>` +
      `<p><strong>노선:</strong> ${feature.properties.route_name}</p>` +
      `<p><strong>정류장 순번:</strong> ${feature.properties.station_order}</p>` +
      `${feature.properties.dong ? `<p><strong>위치:</strong> ${feature.properties.dong}</p>` : ''}` +
      `</div>`
    )
  });
}

/**
 * 특정 노선-방향의 정류장을 렌더링 (RouteRenderer.renderRoute 패턴)
 * @param routeName - 노선 번호
 * @param direction - 방향
 */
export async function renderStationsByDirection(
  routeName: string,
  direction: 'inbound' | 'outbound'
): Promise<void> {
  try {
    console.log(`[renderStationsByDirection] 정류장 렌더링 시작: ${routeName}-${direction}`);

    // StationStore에서 데이터 조회
    const stationData = stationStore.getStationData(routeName, direction);
    if (!stationData?.features || stationData.features.length === 0) {
      console.warn(`[renderStationsByDirection] 정류장 데이터가 없습니다: ${routeName}-${direction}`);
      return;
    }

    const dataSourceName = getStationDataSourceName(routeName, direction);

    // GeoJsonDataSource 가져오기 또는 생성 (RouteRenderer 패턴)
    let dataSource = findDataSource(dataSourceName) as GeoJsonDataSource;
    if (!dataSource) {
      dataSource = await createGeoJsonDataSource(dataSourceName);
      // 기본적으로 모든 정류장 DataSource는 숨김 상태로 생성
      dataSource.show = false;
    }

    // 기존 entities 중복 확인 (RouteRenderer 패턴)
    const existingStations = stationData.features.filter(feature => {
      const entityId = `station_${feature.properties.station_id}`;
      return dataSource.entities.getById(entityId) !== undefined;
    });

    if (existingStations.length > 0) {
      console.log(`[renderStationsByDirection] ${existingStations.length}개 정류장이 이미 존재합니다: ${routeName}-${direction}`);
      return;
    }

    // 각 정류장에 대해 Point Entity 직접 생성 후 DataSource에 추가 (direction 정보 전달)
    for (const feature of stationData.features) {
      const stationEntity = createStationEntity(feature, direction);
      dataSource.entities.add(stationEntity);
    }

    console.log(`[renderStationsByDirection] 정류장 렌더링 완료: ${routeName}-${direction} (${stationData.features.length}개)`);

  } catch (error) {
    console.error(`[renderStationsByDirection] 렌더링 실패: ${routeName}-${direction}:`, error);
  }
}

/**
 * 특정 노선의 모든 방향 정류장 렌더링
 * @param routeName - 노선 번호
 */
export async function renderStationsByRoute(routeName: string): Promise<void> {
  try {
    console.log(`[renderStationsByRoute] 노선별 정류장 렌더링 시작: ${routeName}`);

    const directions: ('inbound' | 'outbound')[] = ['inbound', 'outbound'];

    // 양방향 데이터가 있는지 확인하고 렌더링
    for (const direction of directions) {
      if (stationStore.hasStationData(routeName, direction)) {
        await renderStationsByDirection(routeName, direction);
      } else {
        console.log(`[renderStationsByRoute] 데이터 없음: ${routeName}-${direction}`);
      }
    }

    console.log(`[renderStationsByRoute] 노선별 정류장 렌더링 완료: ${routeName}`);

  } catch (error) {
    console.error(`[renderStationsByRoute] 렌더링 실패: ${routeName}:`, error);
  }
}

/**
 * 현재 선택된 노선의 정류장 렌더링
 */
export async function renderSelectedRouteStations(): Promise<void> {
  const selectedRouteName = stationStore.selectedRouteName;

  if (!selectedRouteName) {
    console.log('[renderSelectedRouteStations] 선택된 노선이 없습니다');
    return;
  }

  await renderStationsByRoute(selectedRouteName);
}

/**
 * 모든 정류장 렌더링 (RouteRenderer.renderAllRoutes 패턴)
 */
export async function renderAllStations(): Promise<void> {
  try {
    console.log('[renderAllStations] 모든 정류장 렌더링 시작');

    // StationStore의 모든 데이터 순회
    const routeNames = Array.from(new Set(
      Array.from(stationStore.stationDataMap.keys())
        .map(key => key.split('-')[0]) // 'route-direction' → 'route'
    ));

    if (routeNames.length === 0) {
      console.warn('[renderAllStations] StationStore에 데이터가 없습니다');
      return;
    }

    // 각 노선별로 렌더링
    for (const routeName of routeNames) {
      await renderStationsByRoute(routeName);
    }

    console.log(`[renderAllStations] 모든 정류장 렌더링 완료 (${routeNames.length}개 노선)`);

  } catch (error) {
    console.error('[renderAllStations] 렌더링 실패:', error);
  }
}

/**
 * 특정 노선의 모든 정류장 DataSource 제거 (RouteRenderer.clearAllRoutes 패턴)
 * @param routeName - 노선 번호
 */
export function clearStationsByRoute(routeName: string): void {
  try {
    const directions: ('inbound' | 'outbound')[] = ['inbound', 'outbound'];

    for (const direction of directions) {
      const dataSourceName = getStationDataSourceName(routeName, direction);
      clearDataSource(dataSourceName);
    }

    console.log(`[clearStationsByRoute] 정류장 DataSource 정리 완료: ${routeName}`);

  } catch (error) {
    console.error(`[clearStationsByRoute] 정리 실패: ${routeName}:`, error);
  }
}

/**
 * 모든 정류장 DataSource 제거
 */
export function clearAllStations(): void {
  try {
    const viewer = window.cviewer;
    if (!viewer) return;

    // 모든 stations_ 패턴의 DataSource 제거
    const dataSourcesToRemove: GeoJsonDataSource[] = [];

    for (let i = 0; i < viewer.dataSources.length; i++) {
      const dataSource = viewer.dataSources.get(i);
      if (dataSource.name.startsWith('stations_')) {
        dataSourcesToRemove.push(dataSource);
      }
    }

    dataSourcesToRemove.forEach(dataSource => {
      viewer.dataSources.remove(dataSource);
    });

    console.log(`[clearAllStations] 모든 정류장 DataSource 제거 완료 (${dataSourcesToRemove.length}개)`);

  } catch (error) {
    console.error('[clearAllStations] 제거 실패:', error);
  }
}

/**
 * 정류장 표시/숨김 토글
 * @param routeName - 노선 번호
 * @param show - 표시 여부
 */
export function toggleStationVisibility(routeName: string, show: boolean): void {
  try {
    const directions: ('inbound' | 'outbound')[] = ['inbound', 'outbound'];

    for (const direction of directions) {
      const dataSourceName = getStationDataSourceName(routeName, direction);
      const dataSource = findDataSource(dataSourceName);

      if (dataSource) {
        dataSource.show = show;
      }
    }

    console.log(`[toggleStationVisibility] 정류장 ${show ? '표시' : '숨김'}: ${routeName}`);

  } catch (error) {
    console.error(`[toggleStationVisibility] 토글 실패: ${routeName}:`, error);
  }
}

/**
 * 모든 정류장 숨김
 */
export function hideAllStations(): void {
  try {
    const viewer = window.cviewer;
    if (!viewer) return;

    // 모든 stations_ 패턴의 DataSource 숨김
    for (let i = 0; i < viewer.dataSources.length; i++) {
      const dataSource = viewer.dataSources.get(i);
      if (dataSource.name.startsWith('stations_')) {
        dataSource.show = false;
      }
    }

    console.log('[hideAllStations] 모든 정류장 숨김 처리 완료');

  } catch (error) {
    console.error('[hideAllStations] 숨김 실패:', error);
  }
}

/**
 * 특정 노선만 표시하고 나머지는 숨김
 * @param routeName - 표시할 노선 번호
 */
export function showOnlyStationsForRoute(routeName: string): void {
  try {
    // 1. 먼저 모든 정류장 숨김
    hideAllStations();

    // 2. 선택된 노선만 표시
    toggleStationVisibility(routeName, true);

    console.log(`[showOnlyStationsForRoute] ${routeName} 노선 정류장만 표시`);

  } catch (error) {
    console.error(`[showOnlyStationsForRoute] 표시 실패: ${routeName}:`, error);
  }
}