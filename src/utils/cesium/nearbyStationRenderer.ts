import { createGeoJsonDataSource, clearDataSource } from './datasources';
import { setupStationHoverEvents } from './stationRenderer';
import { stationSensorStore } from '@/stores/StationSensorStore';
import { getBasePath } from '@/utils/env';
import {
  Cartesian3,
  Entity,
  SceneMode,
  BillboardGraphics,
  CallbackProperty,
  ConstantProperty,
  HeightReference,
  Cartographic,
  Viewer,
  sampleTerrainMostDetailed
} from 'cesium';
import type { NearbyStation } from '@/pages/Priority/types';

/**
 * Search Station Rendering Utilities
 * 기존 Billboard 시스템을 활용한 검색 정류장 렌더링
 */

const SEARCH_DATASOURCE_NAME = 'priority_stations';
let isPostRenderListenerAttached = false;
const terrainHeightCache = new Map<string, number>();
const stationElementsCache = new Map<string, HTMLDivElement>();
// 검색 정류장 선택 상태 전역 관리
let currentSelectedSearchStationId: string | null = null;

/**
 * 검색된 정류장들을 Cesium에 렌더링 (Billboard 시스템 활용)
 * @param searchFeatures - 검색 결과 GeoJSON Features
 * @param selectedStationId - 현재 선택된 정류장 ID
 */
export async function renderNearbyStations(
  nearbyStation: NearbyStation[]
): Promise<void> {
  try {

    // 기존 검색 결과 정리
    await clearNearStations();

    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) {
      console.warn('[near by station] Cesium viewer not available');
      return;
    }

    if (nearbyStation.length === 0) {
      console.log('[near by station] No search features to render');
      return;
    }

    // 검색 전용 DataSource 생성
    const dataSource = await createGeoJsonDataSource(SEARCH_DATASOURCE_NAME);

    // 검색 정류장 선택 상태 초기화
    // currentSelectedSearchStationId = selectedStationId;

    // Terrain 높이 샘플링 (기존 시스템과 동일)
    await sampleTerrainForSearchStations(nearbyStation);

    // 기존 Billboard 시스템을 활용한 Entity 생성
    nearbyStation.forEach(feature => {
      const entity = createSearchStationBillboardEntity(feature);
      dataSource.entities.add(entity);
    });

    // !!! 핵심 변경: 실시간 위치 업데이트 리스너 등록 !!!
    attachPostRenderListener();

    // 검색 결과 정류장들에 대한 센서 데이터 생성
    const searchStationIds = nearbyStation.map(nearbyStation => nearbyStation.stationId);
    stationSensorStore.generateSensorDataForSearchStations(searchStationIds);

    // 호버 이벤트 설정 (한 번만 실행)
    setupStationHoverEvents();

    console.log(`[renderSearchStations] Successfully rendered ${nearbyStation.length} search stations with Billboards`);

  } catch (error) {
    console.error('[renderSearchStations] Failed to render search stations:', error);
  }
}

/**
 * 검색 정류장들의 terrain 높이 샘플링 (기존 시스템과 동일)
 */
async function sampleTerrainForSearchStations(features: NearbyStation[]): Promise<void> {
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
  nearbyStation: NearbyStation
): Entity {
  const [lng, lat] = nearbyStation.geometry.coordinates;
  const stationId = nearbyStation.stationId;
  const entityId = `station_${stationId}`;
  const basePath = getBasePath();

  // Terrain 높이 적용 (기존 시스템과 동일한 키 형식)
  const key = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
  const cachedHeight = terrainHeightCache.get(key) || 0;
  const position = Cartesian3.fromDegrees(lng, lat, cachedHeight);
  
  const viewer = (window as unknown as { cviewer: Viewer }).cviewer;

  let element = stationElementsCache.get(entityId);

  if (!element) {
    // 새 엘리먼트 생성 및 스타일 설정
    element = document.createElement('div');
    element.id = `html_tag_${entityId}`; // 디버깅 용이성을 위해 ID 추가
    element.style.position = 'absolute';
    element.style.pointerEvents = 'auto'; 
    element.style.transform = 'translateX(-50%)';
    element.style.whiteSpace = 'nowrap';
    element.style.overflow = 'visible';
    element.style.display = 'none'; // 초기에는 숨김 처리
    element.style.zIndex = '2';
    element.innerHTML = `<div class="station-tag-container scale-110 shadow-lg" style="display: inline-flex; justify-content: center; align-items: center; gap: 4px; border-radius: 26.87px; border: 1px solid #F12124; background: white; padding: 2px 6px 2px 8px; transition: all 0.3s ease; pointer-events: auto; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">
                          <span class="station-name" style="color: #DC5449; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard; font-size: 12px; font-weight: 700; line-height: normal;">
                            ${nearbyStation.stationName}
                          </span>
                        </div>`; // (기존 HTML 구조 유지)

    stationElementsCache.set(entityId, element);
    if (viewer && viewer.container) {
        viewer.container.appendChild(element); 
    }
  }
  

  return new Entity({
    id: entityId, // StationHtmlRenderer 호환을 위해 기존 ID 형식 사용
    name: nearbyStation.stationName,
    position: position,
    billboard: new BillboardGraphics({
      // 검색 결과 전용 스타일링 - 전역 선택 상태 참조
      image: new CallbackProperty(() => {
        return `${basePath}icon/station_active.svg`; // 선택된 검색 정류장
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
      `<h3>${nearbyStation.stationName}</h3>` +
      `<p><strong>정류장 ID:</strong> ${nearbyStation.stationId}</p>` +
      // `<span class="station-name" style="color: '#DC5449'; text-align: center; font-variant-numeric: lining-nums tabular-nums; font-family: Pretendard; font-size: 12px; font-weight: 700; line-height: normal;">
      //     ${nearbyStation.stationName}
      //  </span>` +
      `</div>`
    ),

    // 검색 결과 메타데이터
    properties: {
      stationId: stationId,
      stationName: nearbyStation.stationName,
      arsId: '',
      routeName: '',
      isSearchResult: true
    }
  });
}

/**
 * postRender 리스너를 뷰어에 한 번만 등록합니다.
 */
function attachPostRenderListener(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewer = (window as unknown as { cviewer: any }).cviewer;
  if (!viewer || isPostRenderListenerAttached) return;

  // postRender 이벤트: Cesium이 렌더링을 마칠 때마다 호출됩니다.
  viewer.scene.postRender.addEventListener(updateHtmlElementPositions);
  isPostRenderListenerAttached = true;
  console.log('[attachPostRenderListener] PostRender listener attached for HTML station tags.');
}

/**
 * HTML 엘리먼트의 화면 위치를 업데이트하는 함수 (매 프레임 실행)
 */
function updateHtmlElementPositions(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewer = (window as unknown as { cviewer: any }).cviewer;
  if (!viewer) return;

  const scene = viewer.scene;
  const cameraPosition = viewer.camera.positionWC;

  stationElementsCache.forEach((element, entityId) => {
    const dataSource = viewer.dataSources.getByName(SEARCH_DATASOURCE_NAME)?.[0];
    const entity = dataSource?.entities.getById(entityId);
    
    if (!entity || !entity.position) return;
    
    const cartesianPosition = entity.position.getValue(viewer.clock.currentTime);
    if (!cartesianPosition) return;

    // 카메라와의 거리가 멀거나 정류장이 지구 반대편에 있을 경우 렌더링을 멈추기 위한 검사
    const distance = Cartesian3.distance(cartesianPosition, cameraPosition);
    // 예시: 100km (100,000m) 이상 떨어지면 숨김
    if (distance > 100000 || scene.mode !== SceneMode.SCENE3D) { 
        element.style.display = 'none';
        return;
    }

    // 3D 좌표를 2D 화면 좌표로 변환
    const screenPosition = scene.cartesianToCanvasCoordinates(cartesianPosition);

    if (screenPosition) {
      // 화면 좌표가 유효하고 카메라 시야각 내에 있는지 확인
      // isPointVisible 대신, Cesium 내부의 Billboard 렌더링 로직과 유사하게 간단한 경계 체크를 수행할 수 있음
      
      // 여기서 화면 밖으로 완전히 벗어난 경우도 체크할 수 있지만, 
      // Billboard의 `disableDepthTestDistance` 등을 고려하여 간단하게 화면 내에 있는지 확인

      const left = screenPosition.x;
      const top = screenPosition.y;

      // 엘리먼트 표시 및 위치 업데이트
      element.style.display = 'block';
      // Billboard 이미지의 중심을 기준으로 아래쪽에 위치하도록 조정
      // Billboard 크기를 고려하여 (예: 30px 높이) 약간 아래로 offset 설정 가능. 여기서는 Billboard 바로 아래로 가정.
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      
      // Billboard의 'verticalOrigin: 1 (BOTTOM)'을 고려하여, 
      // Billboard의 '아래쪽'에 HTML 엘리먼트가 위치하도록 정렬을 더 세밀하게 조정할 수 있습니다.
      // 현재 스타일의 `translateX(-50%)`는 중심을 맞추는 역할을 합니다.
      
    } else {
      element.style.display = 'none'; // 화면 밖에 있으면 숨김
    }
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
export async function clearNearStations(): Promise<void> {
  try {
    console.log('[clearSearchStations] Clearing search station rendering');

    // 전역 선택 상태 초기화
    currentSelectedSearchStationId = null;
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (viewer && viewer.container) {
        stationElementsCache.forEach(element => { // 'stationElementsCache'로 수정했다고 가정
            viewer.container.removeChild(element);
        });
    }
    stationElementsCache.clear();
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

