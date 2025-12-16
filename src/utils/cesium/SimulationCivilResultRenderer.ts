import {
  Cartesian3,
  Entity,
  BillboardGraphics,
  HeightReference,
  ConstantProperty,
  Color,
  Cartographic,
  sampleTerrainMostDetailed,
  Viewer
} from 'cesium';
import { createGeoJsonDataSource, findDataSource } from './datasources';
import { getBasePath } from '@/utils/env';
// CivilResult 컴포넌트의 StationRow 타입 사용
import type { StationRow } from '@/pages/Simulation/components/SimulationCivilResult';

const DATASOURCE_NAME = 'simulation_civil_result_stations';
const terrainHeightCache = new Map<string, number>();

// 시민용 시뮬레이션 정류장 선택 상태 관리
let currentSelectedStationId: number | null = null;

/**
 * 현재 선택된 시민용 정류장 ID 조회
 */
export function getSelectedCivilStationId(): number | null {
  return currentSelectedStationId;
}

/**
 * 시민용 정류장 선택 상태 업데이트
 */
export function setSelectedCivilStationId(stationId: number | null): void {
  currentSelectedStationId = stationId;
}

function getCachedTerrainHeight(longitude: number, latitude: number): number {
  const key = `${longitude.toFixed(6)}_${latitude.toFixed(6)}`;
  return terrainHeightCache.get(key) || 0;
}

/**
 * 지형 높이 샘플링 (초기 로드 시 1회 실행)
 */
async function sampleTerrainForCivilStations(rows: StationRow[]): Promise<void> {
  try {
    const viewer = (window as unknown as { cviewer: Viewer }).cviewer;
    if (!viewer?.terrainProvider || rows.length === 0) return;

    // Cartographic 배열 생성
    const positions = rows.map(row => Cartographic.fromDegrees(row.point[0], row.point[1]));
    
    // 지형 높이 샘플링
    const sampledPositions = await sampleTerrainMostDetailed(viewer.terrainProvider, positions);

    // 캐시 저장
    sampledPositions.forEach((position, index) => {
      const [lng, lat] = rows[index].point;
      const key = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
      terrainHeightCache.set(key, position.height || 0);
    });
  } catch (error) {
    console.error('[sampleTerrainForCivilStations] Failed:', error);
  }
}

/**
 * 시민용 시뮬레이션 결과 정류장 렌더링
 */
export async function renderCivilResultStations(rows: StationRow[]): Promise<void> {
  try {
    const viewer = window.cviewer;
    if (!viewer) return;

    // 지형 높이 계산 (비동기)
    await sampleTerrainForCivilStations(rows);

    let dataSource = findDataSource(DATASOURCE_NAME);
    if (!dataSource) {
      dataSource = await createGeoJsonDataSource(DATASOURCE_NAME);
    }

    dataSource.entities.removeAll();

    const basePath = getBasePath();

    rows.forEach((row) => {
      const [lng, lat] = row.point;
      const cachedHeight = getCachedTerrainHeight(lng, lat);
      const position = Cartesian3.fromDegrees(lng, lat, cachedHeight);
      
      // ID는 문자열로 변환하여 Entity ID에 사용
      // const stationIdStr = String(row.id).padStart(2, '0');

      const entity = new Entity({
        id: `station_${row.id}`, // Entity ID format
        name: row.name,
        position: position,
        billboard: new BillboardGraphics({
          image: new ConstantProperty(`${basePath}icon/station_active.svg`),
          sizeInMeters: new ConstantProperty(false),
          width: new ConstantProperty(30),
          height: new ConstantProperty(30),
          heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
          disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY), // 지형에 가려지지 않게 함
          verticalOrigin: new ConstantProperty(1), // Bottom
          color: new ConstantProperty(Color.WHITE)
        }),
        // InfoBox 등에 표시될 설명 (HTML)
        description: new ConstantProperty(
          `<div style="font-family: Pretendard; padding: 10px;">` +
          `<h3 style="margin: 0 0 8px 0;">${row.name}</h3>` +
          `<p style="margin: 4px 0;"><strong>측정시간:</strong> ${row.time}</p>` +
          `<p style="margin: 4px 0;"><strong>농도:</strong> ${row.pm10} μg/m³</p>` +
          `</div>`
        ),
        // Custom Properties
        properties: {
          stationId: row.id,
          stationName: row.name,
          time: row.time,
          pm10: row.pm10,
          isCivilResult: true
        }
      });

      dataSource.entities.add(entity);
    });

    dataSource.show = true;
    console.log(`[CivilResultRenderer] Rendered ${rows.length} stations.`);

  } catch (error) {
    console.error('[CivilResultRenderer] Rendering failed:', error);
  }
}

/**
 * 렌더링된 정류장 제거
 */
export function clearCivilResultStations(): void {
  try {
    const viewer = window.cviewer;
    if (!viewer) return;

    const dataSource = findDataSource(DATASOURCE_NAME);
    if (dataSource) {
      viewer.dataSources.remove(dataSource);
    }

    terrainHeightCache.clear();
    currentSelectedStationId = null;
    
  } catch (error) {
    console.error('[CivilResultRenderer] Clear failed:', error);
  }
}