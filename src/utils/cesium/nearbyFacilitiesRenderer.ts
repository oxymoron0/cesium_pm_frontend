import type { BuildingFacilityData, VulnerableFacilitiesApiResponse } from '@/pages/Priority/types';
import { createGeoJsonDataSource, clearDataSource } from './datasources';
import {
  Cartesian3,
  Entity,
  PolygonGraphics,
  HeightReference,
  Cartographic,
  sampleTerrainMostDetailed,
  SceneMode,
  TerrainProvider,
  Viewer,
  Color,
  PolygonHierarchy
} from 'cesium';

// --- Type Definitions ---
export type VulnerableFacility = {
  id: string;
  rank: number;
  name: string;
  address: string;
  predictedConcentration: number;
  predictedLevel: 'good' | 'normal' | 'bad' | 'very-bad';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
};

// --- Global State and Constants ---
const FACILITY_DATASOURCE_NAME = 'vulnerable_facilities';
const FACILITY_BUILDING_OUTLINE_DATASOURCE_NAME = 'facility_building_outlines';
const terrainHeightCache = new Map<string, number>();
const facilityElementsCache = new Map<string, HTMLDivElement>();
let isFacilityPostRenderListenerAttached = false;

// 건물 윤곽선 타입
export interface BuildingGeomShape {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

// --- Utility Functions ---

/**
 * 미세먼지 레벨에 따른 스타일(색상/텍스트)을 반환합니다.
 * PriorityResult.tsx의 getLevelStyle과 동일한 색상 사용
 */
function getLevelStyle(level: VulnerableFacility['predictedLevel']): {
  text: string;
  color: string;
  borderColor: string;
  backgroundColor: string;
} {
  switch (level) {
    case 'very-bad':
      return { text: '매우나쁨', color: '#FFFFFF', borderColor: '#D32F2D', backgroundColor: '#D32F2D' };
    case 'bad':
      return { text: '나쁨', color: '#FFFFFF', borderColor: '#FF7700', backgroundColor: '#FF7700' };
    case 'normal':
      return { text: '보통', color: '#000000', borderColor: '#FFD040', backgroundColor: '#FFD040' };
    case 'good':
      return { text: '좋음', color: '#FFFFFF', borderColor: '#00C851', backgroundColor: '#00C851' };
    default:
      return { text: '미확인', color: 'gray', borderColor: 'gray', backgroundColor: 'lightgray' };
  }
}

/**
 * 시설들의 terrain 높이 샘플링 (기존 정류장 로직과 동일)
 */
async function sampleTerrainForVulnerableFacilities(facilities: VulnerableFacility[]): Promise<void> {
  try {
    const viewer = (window as unknown as { cviewer: { terrainProvider: TerrainProvider } }).cviewer;
    if (!viewer?.terrainProvider) return;

    const positions = facilities.map(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      return Cartographic.fromDegrees(lng, lat);
    });

    const sampledPositions = await sampleTerrainMostDetailed(viewer.terrainProvider, positions);

    sampledPositions.forEach((position, index) => {
      const feature = facilities[index];
      const [lng, lat] = feature.geometry.coordinates;
      const key = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
      terrainHeightCache.set(key, position.height || 0);
    });

  } catch (error) {
    console.warn('[sampleTerrainForVulnerableFacilities] Terrain sampling failed:', error);
  }
}

/**
 * 취약 시설의 HTML 엘리먼트 위치를 업데이트 (매 프레임 실행, 핵심 로직)
 */
function updateFacilityHtmlElementPositions(): void {
  const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
  if (!viewer) return;

  const scene = viewer.scene;
  const cameraPosition = viewer.camera.positionWC;

  facilityElementsCache.forEach((element, entityId) => {
    const dataSource = viewer.dataSources.getByName(FACILITY_DATASOURCE_NAME)?.[0];
    const entity = dataSource?.entities.getById(entityId);

    if (!entity || !entity.position) {
      element.style.display = 'none';
      return;
    }

    const cartesianPosition = entity.position.getValue(viewer.clock.currentTime);
    if (!cartesianPosition) {
      element.style.display = 'none';
      return;
    }

    // 1. 거리 체크 (너무 멀거나 지구 반대편이면 숨김)
    const distance = Cartesian3.distance(cartesianPosition, cameraPosition);
    if (distance > 100000 || scene.mode !== SceneMode.SCENE3D) {
      element.style.display = 'none';
      return;
    }

    // 건물 높이만큼 위로 올린 위치 계산
    const cartographic = Cartographic.fromCartesian(cartesianPosition);
    const buildingHeight = 25; // 건물 높이 (미터)
    cartographic.height += buildingHeight;
    const adjustedPosition = Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height
    );

    // 2. 조정된 3D 좌표를 2D 화면 좌표로 변환
    const screenPosition = scene.cartesianToCanvasCoordinates(adjustedPosition);

    if (screenPosition) {
      // 3. 화면 좌표 업데이트
      const left = screenPosition.x;
      const top = screenPosition.y;

      element.style.display = 'block';
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;

    } else {
      element.style.display = 'none'; // 화면 밖에 있으면 숨김
    }
  });
}

/**
 * postRender 리스너를 뷰어에 한 번만 등록합니다.
 */
function attachFacilityPostRenderListener(): void {
  const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
  if (!viewer || isFacilityPostRenderListenerAttached) return;

  viewer.scene.postRender.addEventListener(updateFacilityHtmlElementPositions);
  isFacilityPostRenderListenerAttached = true;
  console.log('[attachFacilityPostRenderListener] PostRender listener attached for facility tags.');
}

/**
 * 취약 시설 Entity 생성 (HTML 제외)
 */
function createFacilityEntity(
  facility: VulnerableFacility
): Entity {
  const [lng, lat] = facility.geometry.coordinates;
  const facilityId = facility.id;
  const entityId = `facility_${facilityId}`;

  // Terrain 높이 적용 + 태그가 지면 위로 뜨도록 약간의 오프셋 (1m)
  const key = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
  const cachedHeight = terrainHeightCache.get(key) || 0;
  const position = Cartesian3.fromDegrees(lng, lat, cachedHeight + 1);

  return new Entity({
    id: entityId,
    name: facility.name,
    position: position,
    polygon: {
      heightReference: HeightReference.CLAMP_TO_GROUND,
    },
    properties: {
      facilityId: facilityId,
      facilityName: facility.name,
      isFacility: true
    }
  });
}

/**
 * 취약 시설 HTML 엘리먼트 생성
 */
function createFacilityHtmlElement(facility: VulnerableFacility): void {
  const facilityId = facility.id;
  const entityId = `facility_${facilityId}`;
  const viewer = (window as unknown as { cviewer: Viewer }).cviewer;

  if (!viewer) return;

  let element = facilityElementsCache.get(entityId);
  const styles = getLevelStyle(facility.predictedLevel);

  if (!element) {
    element = document.createElement('div');
    element.id = `html_tag_${entityId}`;
    element.style.position = 'absolute';
    element.style.pointerEvents = 'none';
    element.style.whiteSpace = 'nowrap';
    element.style.overflow = 'visible';
    element.style.display = 'none';
    element.style.zIndex = '3';

    element.innerHTML = `
      <div class="absolute top-0 left-0 z-10 w-full h-full overflow-visible pointer-events-none whitespace-nowrap"
            data-facility-id="${facilityId}"
            style="position: relative;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  transform: translate3d(-50%, calc(-100% - 12px), 0);
                  will-change: transform;
                  backface-visibility: hidden;
                  -webkit-backface-visibility: hidden;
                  user-select: none;">

        <div style="background: rgba(0, 0, 0, 0.8);
                    color: white;
                    border: 1px solid #C4C6C6;
                    border-radius: 12px;
                    padding: 4px 16px 8px 24px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
                    margin-bottom: 0;
                    min-width: 140px;
                    display: flex;
                    flex-direction: column;
                    font-family: Pretendard, sans-serif;
                    position: relative;
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    transform: translateZ(0);">
          <span style="background: white;
                          position: absolute;
                          color: black;
                          border: 1px solid #C4C6C6;
                          border-radius: 50%;
                          width: 22px;
                          height: 22px;
                          line-height: 20px;
                          top: -1px;
                          left: -1px;
                          text-align: center;
                          font-weight: 700;
                          font-size: 12px;">
              ${facility.rank}
          </span>
          <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 700; font-size: 14px; line-height: 22px; text-align: center; word-break: keep-all;">
              ${facility.name}
            </span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 4px;">
            <div style="font-size: 12px; color: #ccc; margin: 0 0 8px -6px;">
                미세먼지
            </div>
            <div style="background: ${styles.borderColor};
                        color: black;
                        border: 2px solid ${styles.borderColor};
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        margin: 0 0 0 -6px;
                        line-height: 50px;
                        text-align: center;
                        font-weight: 700;
                        font-size: 12px;">
                ${styles.text}
            </div>
          </div>
        </div>

        <div style="width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 10px solid #C4C6C6;
                    z-index: 1;">
        </div>
      </div>
    `;

    facilityElementsCache.set(entityId, element);
    if (viewer.container) {
      viewer.container.appendChild(element);
    }
  }
}

// --- Exported Functions ---

/**
 * MultiPolygon 좌표를 Cesium PolygonHierarchy 배열로 변환
 */
function createPolygonHierarchiesFromMultiPolygon(
  multiPolygonCoords: number[][][][]
): PolygonHierarchy[] {
  const hierarchies: PolygonHierarchy[] = [];

  for (const polygonRings of multiPolygonCoords) {
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
 * 주 건물 윤곽선 Entity 생성
 */
function createBuildingOutlineEntity(
  facilityId: string,
  geomShape: BuildingGeomShape,
  // borderColor: string
): Entity[] {
  const entities: Entity[] = [];
  const hierarchies = createPolygonHierarchiesFromMultiPolygon(geomShape.coordinates);

  hierarchies.forEach((hierarchy, index) => {
    const entity = new Entity({
      id: `facility_outline_${facilityId}_${index}`,
      polygon: new PolygonGraphics({
        hierarchy: hierarchy,
        material: Color.fromCssColorString('#FF0040').withAlpha(0.4),
        heightReference: HeightReference.CLAMP_TO_GROUND
      }),
      polyline: {
        positions: hierarchy.positions,
        clampToGround: true,
        width: 8,
        material: Color.fromCssColorString('#FF0040'),
      },
      properties: {
        facilityId: facilityId,
        type: 'building_outline'
      }
    });
    entities.push(entity);
  });
  return entities;
}
/**
 * 취약 시설들을 Cesium에 렌더링 (Billboard Entity + postRender HTML 태그)
 * @param facilities - 취약 시설 목록
 * @param vulnerableFacilitiesApiData - 취약시설 API 응답 데이터 (optional)
 */
export async function renderVulnerableFacilities(
  facilities: VulnerableFacility[],
  vulnerableFacilitiesApiData?: VulnerableFacilitiesApiResponse
): Promise<void> {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) {
      console.warn('[Vulnerable Facility] Cesium viewer not available');
      return;
    }

    if (facilities.length === 0) {
      console.log('[Vulnerable Facility] No facilities to render');
      return;
    }

    // DataSource 생성 또는 재사용
    const dataSource = await createGeoJsonDataSource(FACILITY_DATASOURCE_NAME);

    // 기존 entities 완전 제거 (중복 방지)
    dataSource.entities.removeAll();

    // Terrain 높이 샘플링
    await sampleTerrainForVulnerableFacilities(facilities);

    // Entity만 생성 (HTML은 별도로 생성)
    facilities.forEach(facility => {
      const entity = createFacilityEntity(facility);
      dataSource.entities.add(entity);
    });

    // 건물 형상 정보 Map 생성 (내부에서 생성)
    const buildingGeomMap = new Map<string, { geomShape: BuildingGeomShape; borderColor: string }>();

    if (vulnerableFacilitiesApiData) {
      // 모든 등급에서 건물 형상 정보 추출
      Object.values(vulnerableFacilitiesApiData.facilities_by_grade).forEach((facilityArray: BuildingFacilityData[]) => {
        facilityArray?.forEach((facility: BuildingFacilityData) => {
          if (facility.geom_shape && facility.geom_shape.coordinates) {
            // 해당 시설의 예측 등급에 따른 색상 가져오기
            const vulnerableFacility = facilities.find(f => f.id === facility.id.toString());
            if (vulnerableFacility) {
              const levelStyle = getLevelStyle(vulnerableFacility.predictedLevel);
              buildingGeomMap.set(facility.id.toString(), {
                geomShape: facility.geom_shape,
                borderColor: levelStyle.borderColor
              });
            }
          }
        });
      });
    }

    // 건물 윤곽선 렌더링 (buildingGeomMap이 생성된 경우)
    if (buildingGeomMap.size > 0) {
      const buildingOutlineDataSource = await createGeoJsonDataSource(FACILITY_BUILDING_OUTLINE_DATASOURCE_NAME);
      buildingOutlineDataSource.entities.removeAll();

      facilities.forEach(facility => {
        const buildingGeom = buildingGeomMap.get(facility.id);
        if (buildingGeom) {
          const outlineEntities = createBuildingOutlineEntity(
            facility.id,
            buildingGeom.geomShape,
            // buildingGeom.borderColor
          );
          outlineEntities.forEach(entity => buildingOutlineDataSource.entities.add(entity));
        }
      });

      console.log(`[renderVulnerableFacilities] Rendered ${buildingOutlineDataSource.entities.values.length} building outlines`);
    }

    console.log(`[renderVulnerableFacilities] Successfully rendered ${facilities.length} facilities (entities only).`);

  } catch (error) {
    console.error('[renderVulnerableFacilities] Failed to render facilities:', error);
  }
}

/**
 * 취약 시설 렌더링 정리 (HTML 엘리먼트 제거 및 리스너 해제)
 */
export async function clearVulnerableFacilities(): Promise<void> {
  try {
    console.log('[clearVulnerableFacilities] Clearing facility rendering');

    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (viewer && viewer.container) {
      // HTML 엘리먼트 제거
      facilityElementsCache.forEach(element => {
        viewer.container.removeChild(element);
      });

      // PostRender 리스너 제거
      if (isFacilityPostRenderListenerAttached) {
        viewer.scene.postRender.removeEventListener(updateFacilityHtmlElementPositions);
        isFacilityPostRenderListenerAttached = false;
        console.log('[clearVulnerableFacilities] PostRender listener removed.');
      }
    }

    // 캐시 및 DataSource 정리
    facilityElementsCache.clear();
    await clearDataSource(FACILITY_DATASOURCE_NAME);
    await clearDataSource(FACILITY_BUILDING_OUTLINE_DATASOURCE_NAME);
    terrainHeightCache.clear();

  } catch (error) {
    console.error('[clearVulnerableFacilities] Failed to clear facilities:', error);
  }
}

/**
 * 취약 시설 HTML 태그 표시
 * @param facilities - 표시할 취약 시설 목록
 */
export function showFacilityHtmlTags(facilities: VulnerableFacility[]): void {
  try {
    console.log('[showFacilityHtmlTags] Showing HTML tags for facilities');

    // HTML 엘리먼트 생성
    facilities.forEach(facility => {
      createFacilityHtmlElement(facility);
    });

    // PostRender 리스너 등록
    attachFacilityPostRenderListener();

    console.log(`[showFacilityHtmlTags] Successfully showed ${facilities.length} facility HTML tags`);
  } catch (error) {
    console.error('[showFacilityHtmlTags] Failed to show facility HTML tags:', error);
  }
}

/**
 * 취약 시설 HTML 태그 숨김
 */
export function hideFacilityHtmlTags(): void {
  try {
    console.log('[hideFacilityHtmlTags] Hiding facility HTML tags');

    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (viewer && viewer.container) {
      // HTML 엘리먼트 제거
      facilityElementsCache.forEach(element => {
        if (element.parentNode === viewer.container) {
          viewer.container.removeChild(element);
        }
      });

      // PostRender 리스너 제거
      if (isFacilityPostRenderListenerAttached) {
        viewer.scene.postRender.removeEventListener(updateFacilityHtmlElementPositions);
        isFacilityPostRenderListenerAttached = false;
        console.log('[hideFacilityHtmlTags] PostRender listener removed.');
      }
    }

    // 캐시 정리
    facilityElementsCache.clear();

    console.log('[hideFacilityHtmlTags] Successfully hid facility HTML tags');
  } catch (error) {
    console.error('[hideFacilityHtmlTags] Failed to hide facility HTML tags:', error);
  }
}