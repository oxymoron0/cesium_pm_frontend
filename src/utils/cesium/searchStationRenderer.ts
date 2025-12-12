import { createGeoJsonDataSource, clearDataSource } from './datasources';
import { setupStationHoverEvents } from './stationRenderer';
import { stationSensorStore } from '@/stores/StationSensorStore';
import { stationStore } from '@/stores/StationStore';
import type { RouteStationFeature } from '../api/types';
import {
  Cartesian3,
  Entity,
  BillboardGraphics,
  CallbackProperty,
  ConstantProperty,
  HeightReference,
  Cartographic,
  sampleTerrainMostDetailed
} from 'cesium';

/**
 * Search Station Rendering Utilities
 * 기존 Billboard 시스템을 활용한 검색 정류장 렌더링
 */

const SEARCH_DATASOURCE_NAME = 'search_stations';
const terrainHeightCache = new Map<string, number>();

// 검색 정류장 선택 상태 전역 관리
let currentSelectedSearchStationId: string | null = null;

/**
 * stationStore에서 정류장의 direction 정보 조회
 * @param stationId - 정류장 ID
 * @param routeName - 노선명
 * @returns direction 정보 또는 null
 */
function findStationDirection(
  stationId: string,
  routeName: string
): { direction: 'inbound' | 'outbound'; directionName: string } | null {
  // 해당 노선의 inbound/outbound 데이터에서 정류장 검색
  const directions: Array<'inbound' | 'outbound'> = ['inbound', 'outbound'];

  for (const direction of directions) {
    const stationData = stationStore.getStationData(routeName, direction);
    if (stationData) {
      const found = stationData.features.find(
        feature => feature.properties.station_id === stationId
      );
      if (found) {
        return {
          direction,
          directionName: stationData.direction_name
        };
      }
    }
  }

  return null;
}

/**
 * 검색된 정류장들을 Cesium에 렌더링 (Billboard 시스템 활용)
 * @param searchFeatures - 검색 결과 GeoJSON Features
 * @param selectedStationId - 현재 선택된 정류장 ID
 */
export async function renderSearchStations(
  searchFeatures: RouteStationFeature[],
  selectedStationId: string | null = null
): Promise<void> {
  try {
    console.log('[renderSearchStations] Starting Billboard render with', searchFeatures.length, 'stations');

    // 기존 검색 결과 정리
    await clearSearchStations();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: any }).cviewer;
    if (!viewer) {
      console.warn('[renderSearchStations] Cesium viewer not available');
      return;
    }

    if (searchFeatures.length === 0) {
      console.log('[renderSearchStations] No search features to render');
      return;
    }

    // 검색 전용 DataSource 생성
    const dataSource = await createGeoJsonDataSource(SEARCH_DATASOURCE_NAME);

    // 검색 정류장 선택 상태 초기화
    currentSelectedSearchStationId = selectedStationId;

    // Terrain 높이 샘플링 (기존 시스템과 동일)
    await sampleTerrainForSearchStations(searchFeatures);

    // 기존 Billboard 시스템을 활용한 Entity 생성
    searchFeatures.forEach(feature => {
      const entity = createSearchStationBillboardEntity(feature);
      dataSource.entities.add(entity);
    });

    // 검색 결과 정류장들에 대한 센서 데이터 생성
    const searchStationIds = searchFeatures.map(feature => feature.properties.station_id);
    stationSensorStore.generateSensorDataForSearchStations(searchStationIds);

    // 호버 이벤트 설정 (한 번만 실행)
    setupStationHoverEvents();

    console.log(`[renderSearchStations] Successfully rendered ${searchFeatures.length} search stations with Billboards`);

  } catch (error) {
    console.error('[renderSearchStations] Failed to render search stations:', error);
  }
}

/**
 * 검색 정류장들의 terrain 높이 샘플링 (기존 시스템과 동일)
 */
async function sampleTerrainForSearchStations(features: RouteStationFeature[]): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: { terrainProvider: any } }).cviewer;
    if (!viewer?.terrainProvider) return;

    const positions = features.map(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      return Cartographic.fromDegrees(lng, lat);
    });

    const sampledPositions = await sampleTerrainMostDetailed(viewer.terrainProvider, positions);

    sampledPositions.forEach((position, index) => {
      const feature = features[index];
      const [lng, lat] = feature.geometry.coordinates;
      const key = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
      terrainHeightCache.set(key, position.height || 0);
    });

  } catch (error) {
    console.warn('[sampleTerrainForSearchStations] Terrain sampling failed:', error);
  }
}

/**
 * 검색 정류장 Billboard Entity 생성 (기존 시스템 패턴 활용)
 */
function createSearchStationBillboardEntity(
  feature: RouteStationFeature
): Entity {
  const [lng, lat] = feature.geometry.coordinates;
  const stationId = feature.properties.station_id;
  const basePath = import.meta.env.VITE_BASE_PATH || '/';

  // Terrain 높이 적용 (기존 시스템과 동일한 키 형식)
  const key = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
  const cachedHeight = terrainHeightCache.get(key) || 0;
  const position = Cartesian3.fromDegrees(lng, lat, cachedHeight);

  return new Entity({
    id: `station_${stationId}`, // StationHtmlRenderer 호환을 위해 기존 ID 형식 사용
    name: feature.properties.station_name,
    position: position,
    billboard: new BillboardGraphics({
      // 검색 결과 전용 스타일링 - 전역 선택 상태 참조
      image: new CallbackProperty(() => {
        if (currentSelectedSearchStationId === stationId) {
          return `${basePath}icon/station_active.svg`; // 선택된 검색 정류장
        }
        return `${basePath}icon/station_inactive.svg`; // 검색 결과 정류장
      }, false),

      sizeInMeters: new ConstantProperty(false),
      width: new CallbackProperty(() => {
        return currentSelectedSearchStationId === stationId ? 35 : 30;
      }, false),
      height: new CallbackProperty(() => {
        return currentSelectedSearchStationId === stationId ? 35 : 30;
      }, false),

      // 기존 시스템과 동일한 설정
      heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
      disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
      verticalOrigin: new ConstantProperty(1) // BOTTOM
    }),

    // InfoBox용 메타데이터
    description: new ConstantProperty(
      `<div style="font-family: Pretendard;">` +
      `<h3>${feature.properties.station_name}</h3>` +
      `<p><strong>정류장 ID:</strong> ${feature.properties.station_id}</p>` +
      `<p><strong>ARS ID:</strong> ${feature.properties.ars_id}</p>` +
      `<p><strong>노선:</strong> ${feature.properties.route_name}</p>` +
      `<p><strong>검색 결과</strong></p>` +
      `</div>`
    ),

    // 검색 결과 메타데이터 (direction 정보 포함)
    properties: (() => {
      const directionInfo = findStationDirection(stationId, feature.properties.route_name);
      return {
        stationId: stationId,
        stationName: feature.properties.station_name,
        arsId: feature.properties.ars_id,
        routeName: feature.properties.route_name,
        direction: directionInfo?.direction || null,
        directionName: directionInfo?.directionName || null,
        isSearchResult: true
      };
    })()
  });
}

/**
 * 검색 정류장 선택 상태 업데이트
 */
export function updateSearchStationSelection(selectedStationId: string | null): void {
  try {
    // 전역 선택 상태 업데이트
    currentSelectedSearchStationId = selectedStationId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: any }).cviewer;
    if (!viewer) return;

    const dataSource = viewer.dataSources.getByName(SEARCH_DATASOURCE_NAME);
    if (dataSource.length === 0) return;

    // CallbackProperty가 다음 프레임에서 자동으로 업데이트됨
    console.log(`[updateSearchStationSelection] Updated selection to: ${selectedStationId}`);

  } catch (error) {
    console.error('[updateSearchStationSelection] Failed to update selection:', error);
  }
}

/**
 * 검색 정류장 렌더링 정리
 */
export async function clearSearchStations(): Promise<void> {
  try {
    console.log('[clearSearchStations] Clearing search station rendering');

    // 전역 선택 상태 초기화
    currentSelectedSearchStationId = null;

    // DataSource 정리
    await clearDataSource(SEARCH_DATASOURCE_NAME);

    // 캐시 정리
    terrainHeightCache.clear();

  } catch (error) {
    console.error('[clearSearchStations] Failed to clear search stations:', error);
  }
}

/**
 * 현재 선택된 검색 정류장 ID 조회
 */
export function getCurrentSelectedSearchStationId(): string | null {
  return currentSelectedSearchStationId;
}

