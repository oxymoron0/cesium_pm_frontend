import { stationStore } from '../../stores/StationStore';
import { createGeoJsonDataSource, findDataSource, clearDataSource } from './datasources';
import type { RouteStationFeature } from '../api/types';
import type { GeoJsonDataSource } from 'cesium';
import { Color, Cartesian3, Entity, PointGraphics, CallbackProperty, ConstantProperty, HeightReference } from 'cesium';

/**
 * Station rendering utility functions
 * RouteRenderer 패턴을 따라 GeoJsonDataSource + 직접 Entity 생성 방식
 */

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
  const position = Cartesian3.fromDegrees(coords[0], coords[1]);

  return new Entity({
    id: `station_${feature.properties.station_id}`,
    name: feature.properties.station_name,
    position: position,
    point: new PointGraphics({
      // 4단계 방향별 선택 상태에 따른 동적 크기
      pixelSize: new CallbackProperty(() => {
        const isSelected = stationStore.isStationSelected(feature.properties.station_id);
        const isRouteSelected = stationStore.selectedRouteName === feature.properties.route_name;
        const isDirectionSelected = stationStore.selectedDirection === direction;

        if (isSelected) return 15; // 선택된 정류장 - 더 크게
        if (isRouteSelected && isDirectionSelected) return 10; // 선택된 노선+방향의 정류장
        if (isRouteSelected && !isDirectionSelected) return 8; // 선택된 노선의 다른 방향 정류장
        return 6; // 일반 정류장
      }, false),

      // 4단계 방향별 선택 상태에 따른 동적 색상
      color: new CallbackProperty(() => {
        const isSelected = stationStore.isStationSelected(feature.properties.station_id);
        const isRouteSelected = stationStore.selectedRouteName === feature.properties.route_name;
        const isDirectionSelected = stationStore.selectedDirection === direction;

        if (isSelected) {
          return Color.fromCssColorString('#FFD040'); // 선택된 정류장 - 노란색으로 강조
        }
        if (isRouteSelected && isDirectionSelected) {
          return Color.fromCssColorString('#00AAFF'); // 선택된 노선+방향 - 파란색 (활성)
        }
        if (isRouteSelected && !isDirectionSelected) {
          return Color.fromCssColorString('#888888'); // 선택된 노선의 다른 방향 - 연회색 (비활성)
        }
        return Color.fromCssColorString('#444444'); // 일반 정류장 - 진회색 (완전 비활성)
      }, false),

      // 고정 스타일 속성
      outlineColor: new ConstantProperty(Color.fromCssColorString('#FFFFFF')),
      outlineWidth: new ConstantProperty(2),
      heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
      disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY)
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
    const viewer = (window as any).cviewer;
    if (!viewer) return;

    // 모든 stations_ 패턴의 DataSource 제거
    const dataSourcesToRemove: any[] = [];

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
    const viewer = (window as any).cviewer;
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