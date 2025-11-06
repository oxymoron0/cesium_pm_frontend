import { createGeoJsonDataSource, clearDataSource } from './datasources'; 
import {
  Cartesian3,
  Entity,
  BillboardGraphics,
  ConstantProperty,
  HeightReference,
  Cartographic,
  sampleTerrainMostDetailed,
  SceneMode,
  TerrainProvider,
  Viewer
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
const terrainHeightCache = new Map<string, number>();
const facilityElementsCache = new Map<string, HTMLDivElement>();
let isFacilityPostRenderListenerAttached = false;

// --- Utility Functions ---

/**
 * 미세먼지 레벨에 따른 스타일(색상/텍스트)을 반환합니다.
 */
function getLevelStyle(level: VulnerableFacility['predictedLevel']): {
  text: string;
  color: string;
  borderColor: string;
  backgroundColor: string;
} {
  switch (level) {
    case 'good':
      return { text: '좋음', color: '#FFF', borderColor: '#1E90FF', backgroundColor: '#87CEEB' };
    case 'normal':
      return { text: '보통', color: '#FFF', borderColor: '#FF7700', backgroundColor: '#FF7700' };
    case 'bad':
      return { text: '나쁨', color: '#FFF', borderColor: '#FF4500', backgroundColor: '#FF8C00' };
    case 'very-bad':
      return { text: '매우 나쁨', color: '#FFF', borderColor: '#D32F2D', backgroundColor: '#D32F2D' };
    default:
      return { text: '미확인', color: 'gray', borderColor: 'gray', backgroundColor: 'lightgray' };
  }
}

/**
 * 시설들의 terrain 높이 샘플링 (기존 정류장 로직과 동일)
 */
async function sampleTerrainForVulnerableFacilities(facilities: VulnerableFacility[]): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // 2. 3D 좌표를 2D 화면 좌표로 변환
    const screenPosition = scene.cartesianToCanvasCoordinates(cartesianPosition);

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
  if (!viewer || isFacilityPostRenderListenerAttached) return;

  viewer.scene.postRender.addEventListener(updateFacilityHtmlElementPositions);
  isFacilityPostRenderListenerAttached = true;
  console.log('[attachFacilityPostRenderListener] PostRender listener attached for facility tags.');
}

/**
 * 취약 시설 Billboard Entity 생성 및 HTML 엘리먼트 생성/추가
 * - 박스를 살짝 올리고 표시용 화살표 추가 반영
 */
function createFacilityBillboardEntity(
  facility: VulnerableFacility
): Entity {
  const [lng, lat] = facility.geometry.coordinates;
  const facilityId = facility.id;
  const entityId = `facility_${facilityId}`;

  // Terrain 높이 적용 + 태그가 지면 위로 뜨도록 약간의 오프셋 (1m)
  const key = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
  const cachedHeight = terrainHeightCache.get(key) || 0;
  const position = Cartesian3.fromDegrees(lng, lat, cachedHeight + 1); // 지면보다 살짝 위에

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewer = (window as unknown as { cviewer: Viewer }).cviewer;

  // 1. HTML 엘리먼트 생성 및 캐시
  let element = facilityElementsCache.get(entityId);
  const styles = getLevelStyle(facility.predictedLevel);

  if (!element) {
    element = document.createElement('div');
    element.id = `html_tag_${entityId}`;
    element.style.position = 'absolute';
    // Pointer Events 변경: 기본적으로 마우스 이벤트를 통과시킵니다.
    element.style.pointerEvents = 'none'; 
    element.style.whiteSpace = 'nowrap';
    element.style.overflow = 'visible';
    element.style.display = 'none';
    // z-index: Cesium Canvas 위에서 다른 UI 요소보다 높게 설정 (Cesium 3D 순위와는 무관)
    element.style.zIndex = '3';

    // HTML 구조 (화살표 추가)
    element.innerHTML = `
      <div class="absolute top-0 left-0 z-10 w-full h-full overflow-visible pointer-events-none whitespace-nowrap"
           data-facility-id="${facilityId}"
           style="position: relative;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  transform: translate(-50%, calc(-100% - 12px)); /* 박스 + 화살표 높이 고려 */
                  user-select: none;">

        <div style="background: rgba(0, 0, 0, 0.8);
                    color: white;
                    border: 1px solid #C4C6C6;
                    border-radius: 12px;
                    padding: 4px 16px 8px 24px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
                    /* 화살표와의 간격 */
                    margin-bottom: 0;
                    min-width: 140px;
                    display: flex;
                    flex-direction: column;
                    font-family: Pretendard, sans-serif;
                    position: relative;">
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
                    border-left: 8px solid transparent; /* 삼각형 너비 조절 */
                    border-right: 8px solid transparent; /* 삼각형 너비 조절 */
                    border-top: 10px solid #C4C6C6; /* 삼각형 높이, 배경색과 동일 */
                    /* position: absolute; */ /* 부모 요소가 flex이므로 필요 없음 */
                    /* bottom: -10px; */ /* 부모 요소의 transform에 의해 위치 조정 */
                    /* left: 50%; */
                    /* transform: translateX(-50%); */
                    z-index: 1;">
        </div>

        <div style="position: absolute; 
                    bottom: -15px; /* 화살표 높이 + 네모와의 간격 고려 */
                    left: 50%; 
                    width: 6px; 
                    height: 6px; 
                    background: none; 
                    border: 2px solid #FFD700; /* 노란색 테두리 */
                    transform: translateX(-50%); 
                    ">
        </div>
      </div>
    `;

    facilityElementsCache.set(entityId, element);
    if (viewer && viewer.container) {
      viewer.container.appendChild(element);
    }
  }

  // 2. Cesium Entity 생성 (Billboard는 Hitbox 또는 작은 아이콘으로 사용)
  return new Entity({
    id: entityId,
    name: facility.name,
    position: position,
    billboard: new BillboardGraphics({
      image: new ConstantProperty('./icon/small_yellow_square.svg'), // 적절한 이미지 경로
      width: new ConstantProperty(1), // 매우 작게 설정하여 HTML이 주도하게 함
      height: new ConstantProperty(1), // 매우 작게 설정하여 HTML이 주도하게 함
      heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
    }),

    properties: {
      facilityId: facilityId,
      facilityName: facility.name,
      isFacility: true
    }
  });
}

// --- Exported Functions ---

/**
 * 취약 시설들을 Cesium에 렌더링 (Billboard Entity + postRender HTML 태그)
 */
export async function renderVulnerableFacilities(
  facilities: VulnerableFacility[]
): Promise<void> {
  try {
    await clearVulnerableFacilities();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer) {
      console.warn('[Vulnerable Facility] Cesium viewer not available');
      return;
    }

    if (facilities.length === 0) {
      console.log('[Vulnerable Facility] No facilities to render');
      return;
    }

    // DataSource 생성
    const dataSource = await createGeoJsonDataSource(FACILITY_DATASOURCE_NAME);

    // Terrain 높이 샘플링
    await sampleTerrainForVulnerableFacilities(facilities);

    // Entity 및 HTML 엘리먼트 생성
    facilities.forEach(facility => {
      const entity = createFacilityBillboardEntity(facility);
      dataSource.entities.add(entity);
    });

    // 실시간 위치 업데이트 리스너 등록 (핵심!)
    attachFacilityPostRenderListener();

    console.log(`[renderVulnerableFacilities] Successfully rendered ${facilities.length} facilities.`);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    terrainHeightCache.clear();

  } catch (error) {
    console.error('[clearVulnerableFacilities] Failed to clear facilities:', error);
  }
}